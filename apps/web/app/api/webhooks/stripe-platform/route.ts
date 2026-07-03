import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { getPlatformStripe } from '@/lib/stripe'
import { SchoolSubscriptionStatus } from '@/lib/prisma-client/enums'

// POST /api/webhooks/stripe-platform
// Martial's own Stripe account — schools paying Martial's SaaS subscription.
// Fully separate from /api/webhooks/stripe (per-school webhooks, schools charging their members).
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const stripe = getPlatformStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_PLATFORM_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  const HANDLED_EVENTS = new Set([
    'checkout.session.completed',
    'invoice.paid',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ])
  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  // ── Idempotency ──────────────────────────────────────────────────────────
  // Starts PROCESSING; only flips to PROCESSED once the handler below fully
  // completes. A crash mid-handler leaves the row PROCESSING/FAILED, so a
  // Stripe retry of the same event.id falls through and reprocesses instead
  // of being silently treated as an already-handled duplicate.
  try {
    await prisma.stripeWebhookEvent.create({
      data: { eventId: event.id, type: event.type, status: 'PROCESSING' },
    })
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code !== 'P2002') throw err
    const existing = await prisma.stripeWebhookEvent.findUnique({ where: { eventId: event.id } })
    if (existing?.status === 'PROCESSED') {
      return NextResponse.json({ received: true })
    }
    // status is PROCESSING or FAILED — a prior attempt never finished; fall through and reprocess.
  }

  try {
    await handleEvent(event, stripe)
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    })
  } catch (err) {
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: 'FAILED', error: err instanceof Error ? err.message : String(err) },
    }).catch(() => {})
    console.error('[stripe-platform webhook] handler failed:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function mapStripeStatus(status: Stripe.Subscription.Status): SchoolSubscriptionStatus {
  switch (status) {
    case 'trialing':           return SchoolSubscriptionStatus.TRIALING
    case 'active':              return SchoolSubscriptionStatus.ACTIVE
    case 'incomplete':          return SchoolSubscriptionStatus.INCOMPLETE
    case 'incomplete_expired':  return SchoolSubscriptionStatus.INCOMPLETE_EXPIRED
    case 'past_due':            return SchoolSubscriptionStatus.PAST_DUE
    case 'unpaid':               return SchoolSubscriptionStatus.UNPAID
    case 'paused':               return SchoolSubscriptionStatus.PAUSED
    case 'canceled':             return SchoolSubscriptionStatus.CANCELED
    default:                     return SchoolSubscriptionStatus.INACTIVE
  }
}

function fromUnix(sec?: number | null) {
  return sec ? new Date(sec * 1000) : null
}

// Recent Stripe API versions moved current_period_end off Subscription
// onto each SubscriptionItem (a subscription can have multiple items with
// different periods) — we only ever attach a single price, so the first item's period applies.
function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  return fromUnix(subscription.items.data[0]?.current_period_end)
}

// Same API change moved the subscription id off Invoice onto invoice.parent.subscription_details.
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const sub = invoice.parent?.subscription_details?.subscription
  if (!sub) return null
  return typeof sub === 'string' ? sub : sub.id
}

async function upsertFromSubscription(schoolId: string, subscription: Stripe.Subscription) {
  const billingCycle = subscription.metadata?.billingCycle || undefined
  const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
  const status = mapStripeStatus(subscription.status)
  const currentPeriodEnd = subscriptionPeriodEnd(subscription)
  const trialEndsAt = fromUnix(subscription.trial_end)

  await prisma.schoolSubscription.upsert({
    where: { schoolId },
    create: {
      schoolId,
      billingCycle,
      status,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd,
      trialEndsAt,
    },
    update: {
      ...(billingCycle && { billingCycle }),
      status,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd,
      trialEndsAt,
    },
  })
}

async function handleEvent(event: Stripe.Event, stripe: Stripe) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const schoolId = session.metadata?.schoolId
      if (!schoolId) {
        throw new Error(`checkout.session.completed missing metadata.schoolId (session ${session.id})`)
      }
      if (!session.subscription) break
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await upsertFromSubscription(schoolId, subscription)
      break
    }

    // Renewal payments — skip the very first invoice, already handled by checkout.session.completed
    case 'invoice.paid':
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoiceSubscriptionId(invoice)
      if (!subscriptionId || invoice.billing_reason === 'subscription_create') break
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const schoolId = subscription.metadata?.schoolId
      if (!schoolId) break
      await upsertFromSubscription(schoolId, subscription)
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subscriptionId = invoiceSubscriptionId(invoice)
      if (!subscriptionId) break
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const schoolId = subscription.metadata?.schoolId
      if (!schoolId) break
      await upsertFromSubscription(schoolId, subscription)
      break
    }

    // Carries the full subscription object already — covers plan/status changes from the billing portal
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const schoolId = subscription.metadata?.schoolId
      if (!schoolId) break
      await upsertFromSubscription(schoolId, subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const schoolId = subscription.metadata?.schoolId
      if (!schoolId) break
      await prisma.schoolSubscription.updateMany({
        where: { schoolId },
        data: { status: SchoolSubscriptionStatus.CANCELED, cancelledAt: new Date() },
      })
      break
    }
  }
}
