import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { MembershipStatus } from '@/lib/prisma-client/client'

// POST /api/webhooks/stripe
// Each school registers this URL in their Stripe dashboard.
// We look up the school from session/subscription metadata, then verify the signature
// using that school's webhookSecret.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  // Parse without verification first to read schoolId from metadata
  let unverified: { type: string; data: { object: Record<string, unknown> } }
  try {
    unverified = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const HANDLED_EVENTS = new Set([
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.deleted',
    'customer.subscription.updated',
  ])

  if (!HANDLED_EVENTS.has(unverified.type)) {
    return NextResponse.json({ received: true })
  }

  // Extract schoolId from metadata (present on checkout.session and subscription_data)
  const obj = unverified.data.object as Record<string, unknown>
  const metadata = (obj.metadata ?? obj.subscription_details ?? {}) as Record<string, string>
  const subscriptionMeta = (obj.subscription_data as Record<string, unknown> | undefined)?.metadata as Record<string, string> | undefined

  const schoolId = metadata?.schoolId ?? subscriptionMeta?.schoolId
  if (!schoolId)
    return NextResponse.json({ error: 'Missing schoolId in metadata' }, { status: 400 })

  // Load school's stripe config to verify signature
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { stripeSecretKey: true, stripeWebhookSecret: true },
  })
  if (!school?.stripeSecretKey || !school?.stripeWebhookSecret)
    return NextResponse.json({ error: 'School Stripe not configured' }, { status: 400 })

  // Verify Stripe signature
  const stripe = getStripe(school.stripeSecretKey)
  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, school.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  switch (event.type) {

    // ── One-time payment OR subscription first payment ─────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as {
        metadata?: Record<string, string>
        payment_status?: string
        subscription?: string
        customer?: string
      }
      const { membershipId, planType } = session.metadata ?? {}
      if (!membershipId) break

      if (session.payment_status !== 'paid') break

      await prisma.$transaction(async (tx) => {
        const membership = await tx.membership.findUnique({
          where: { id: membershipId },
          select: { userId: true, schoolId: true, status: true, plan: { select: { validityDays: true } } },
        })
        if (!membership || membership.status !== 'PENDING') return

        const endDate = planType !== 'SUBSCRIPTION' && membership.plan?.validityDays
          ? new Date(Date.now() + membership.plan.validityDays * 86_400_000)
          : undefined

        await tx.membership.update({
          where: { id: membershipId },
          data: {
            status:          MembershipStatus.ACTIVE,
            startDate:       new Date(),
            ...(endDate && { endDate }),
            ...(session.subscription && { stripeSubId: session.subscription }),
            ...(session.customer     && { stripeCustomerId: String(session.customer) }),
          },
        })
        await tx.schoolMember.updateMany({
          where: { userId: membership.userId, schoolId: membership.schoolId },
          data:  { status: 'ACTIVE' },
        })
      })
      break
    }

    // ── Subscription renewed (next billing cycle paid) ─────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as {
        subscription?: string
        customer?: string
        id?: string
        billing_reason?: string
      }
      if (!invoice.subscription) break
      // Skip the initial invoice (already handled by checkout.session.completed)
      if (invoice.billing_reason === 'subscription_create') break

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: invoice.subscription },
        select: { id: true, plan: { select: { billingCycle: true } } },
      })
      if (!membership) break

      // Extend endDate by one billing period or keep null (indefinite)
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          status:          MembershipStatus.ACTIVE,
          stripeInvoiceId: invoice.id ?? null,
        },
      })
      break
    }

    // ── Subscription payment failed ────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string }
      if (!invoice.subscription) break

      await prisma.membership.updateMany({
        where:  { stripeSubId: invoice.subscription },
        data:   { status: MembershipStatus.PAUSED },
      })
      break
    }

    // ── Subscription cancelled (from Stripe dashboard or API) ─────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string; cancel_at_period_end?: boolean }
      await prisma.membership.updateMany({
        where: { stripeSubId: sub.id },
        data:  { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
      })
      break
    }

    // ── Subscription updated (pause, plan change, etc.) ───────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as { id: string; status: string; cancel_at_period_end?: boolean }
      let newStatus: MembershipStatus | undefined
      if (sub.status === 'active')   newStatus = MembershipStatus.ACTIVE
      if (sub.status === 'paused')   newStatus = MembershipStatus.PAUSED
      if (sub.status === 'canceled') newStatus = MembershipStatus.CANCELLED
      if (sub.cancel_at_period_end)  newStatus = MembershipStatus.CANCELLED

      if (newStatus) {
        await prisma.membership.updateMany({
          where: { stripeSubId: sub.id },
          data:  { status: newStatus },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
