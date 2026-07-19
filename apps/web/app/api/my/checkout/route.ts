import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { createRevolutOrder } from '@/lib/revolut'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'

// POST /api/my/checkout — create a checkout session for a membership plan
// Supports Stripe (one-time + subscription) and Revolut (one-time)
export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { planId, provider = 'STRIPE' } = await req.json() as { planId: string; provider?: string }
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: {
      id: true, schoolId: true, name: true, price: true, currency: true,
      planType: true, billingCycle: true, validityDays: true,
      isPublic: true, isActive: true, paymentMethods: true, stripePriceId: true,
    },
  })
  if (!plan || !plan.isPublic || !plan.isActive)
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const useRevolut = provider === 'REVOLUT' || (!plan.paymentMethods.includes('STRIPE') && plan.paymentMethods.includes('REVOLUT'))

  if (!useRevolut && !plan.paymentMethods.includes('STRIPE'))
    return NextResponse.json({ error: 'No online payment method available for this plan' }, { status: 400 })

  // No SchoolMember requirement here — a brand-new user with no prior relationship
  // to the school can check out directly. The webhook creates the SchoolMember
  // (status ACTIVE) once the payment actually succeeds; see /api/webhooks/stripe
  // and /api/webhooks/revolut. The one exception is ARCHIVED: staff removed this
  // person for a reason, and the webhook deliberately won't reactivate that status
  // (see the ARCHIVED guard there) — so don't take their money for an activation
  // that will never happen. They need to contact the school first.
  const archivedMember = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: plan.schoolId, status: 'ARCHIVED' },
    select: { id: true },
  })
  if (archivedMember) {
    return NextResponse.json(
      { error: 'Your membership at this school was archived — please contact the school before purchasing a plan' },
      { status: 403 },
    )
  }

  const existing = await prisma.membership.findFirst({
    where: { userId: dbUser.id, planId: plan.id, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
  })
  if (existing) {
    // Revolut still pre-creates a PENDING row before redirecting to checkout, so a
    // stale one left over from an abandoned order isn't a real commitment (nothing
    // was ever paid) — clear it so the student can retry instead of getting stuck
    // behind it. PENDING from a CASH/BANK_TRANSFER request is a real pending admin
    // approval and must still block a duplicate. Stripe no longer pre-creates a
    // membership at all (see below), so a stale Stripe row can't occur here.
    const isStaleRevolutAttempt = existing.status === 'PENDING' && existing.paymentMethod === PaymentMethod.REVOLUT
    if (isStaleRevolutAttempt) {
      await prisma.membership.delete({ where: { id: existing.id } })
    } else {
      return NextResponse.json({ error: 'Already have this plan' }, { status: 409 })
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: plan.schoolId },
    select: { stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true, name: true },
  })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Revolut path ────────────────────────────────────────────────────────────
  if (useRevolut) {
    if (!school?.revolutSecretKey)
      return NextResponse.json({ error: 'School has not configured Revolut' }, { status: 400 })
    // Webhook must be registered (revolutWebhookSecret set) before we accept payments —
    // otherwise the webhook handler would have to process unsigned notifications.
    if (!school.revolutWebhookSecret)
      return NextResponse.json({ error: 'School has not activated Revolut yet — the webhook must be registered first' }, { status: 400 })

    const membership = await prisma.membership.create({
      data: {
        userId:        dbUser.id,
        schoolId:      plan.schoolId,
        planId:        plan.id,
        planName:      plan.name,
        price:         plan.price,
        currency:      plan.currency,
        paymentMethod: PaymentMethod.REVOLUT,
        status:        MembershipStatus.PENDING,
        startDate:     new Date(),
      },
    })

    const order = await createRevolutOrder({
      secretKey:        school.revolutSecretKey,
      amount:           Math.round(Number(plan.price) * 100),
      currency:         plan.currency ?? 'EUR',
      merchantOrderRef: membership.id,
      description:      `${school.name} — ${plan.name}`,
      email:            dbUser.email ?? undefined,
      successUrl:       `${origin}/my/membership?checkout=success`,
      cancelUrl:        `${origin}/my/membership?checkout=cancelled`,
      metadata: {
        membershipId: membership.id,
        schoolId:     plan.schoolId,
        userId:       dbUser.id,
        planId:       plan.id,
        planType:     plan.planType,
      },
    })

    await prisma.membership.update({
      where: { id: membership.id },
      data:  { revolutOrderId: order.id },
    })

    return NextResponse.json({ url: order.checkout_url })
  }

  // ── Stripe path ─────────────────────────────────────────────────────────────
  // No membership row is pre-created here — an abandoned/cancelled checkout should
  // leave no trace. The webhook creates the membership only once payment actually
  // succeeds (see /api/webhooks/stripe).
  if (!school?.stripeSecretKey)
    return NextResponse.json({ error: 'School has not configured Stripe' }, { status: 400 })

  const stripe   = getStripe(school.stripeSecretKey)
  const currency = (plan.currency ?? 'EUR').toLowerCase()
  const isSubscription = plan.planType === 'SUBSCRIPTION'

  const intervalMap: Record<string, { interval: 'day' | 'week' | 'month' | 'year'; interval_count: number }> = {
    monthly:      { interval: 'month', interval_count: 1 },
    quarterly:    { interval: 'month', interval_count: 3 },
    annual:       { interval: 'year',  interval_count: 1 },
    'two-weekly': { interval: 'week',  interval_count: 2 },
  }

  const metadata = {
    schoolId:     plan.schoolId,
    userId:       dbUser.id,
    planId:       plan.id,
    planType:     plan.planType,
    planName:     plan.name,
    price:        String(plan.price),
    currency:     plan.currency,
    validityDays: plan.validityDays != null ? String(plan.validityDays) : '',
  }

  let session
  if (isSubscription) {
    const billingInterval = intervalMap[plan.billingCycle] ?? { interval: 'month' as const, interval_count: 1 }
    session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: dbUser.email ?? undefined,
      line_items: [{
        price_data: {
          currency,
          unit_amount: Math.round(Number(plan.price) * 100),
          recurring: { interval: billingInterval.interval, interval_count: billingInterval.interval_count },
          product_data: { name: plan.name, description: `${school.name} — membership` },
        },
        quantity: 1,
      }],
      subscription_data: { metadata },
      metadata,
      success_url: `${origin}/my/membership?checkout=success`,
      cancel_url:  `${origin}/my/membership?checkout=cancelled`,
    })
  } else {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: dbUser.email ?? undefined,
      line_items: [{
        price_data: {
          currency,
          unit_amount: Math.round(Number(plan.price) * 100),
          product_data: { name: plan.name, description: `${school.name} — membership` },
        },
        quantity: 1,
      }],
      metadata,
      success_url: `${origin}/my/membership?checkout=success`,
      cancel_url:  `${origin}/my/membership?checkout=cancelled`,
    })
  }

  return NextResponse.json({ url: session.url })
}
