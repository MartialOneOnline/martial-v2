import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { createRevolutOrder } from '@/lib/revolut'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'

// POST /api/my/checkout — create a checkout session for a membership plan
// Supports Stripe (one-time + subscription) and Revolut (one-time)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true, name: true, email: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { planId } = await req.json() as { planId: string }
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

  const { provider = 'STRIPE' } = await req.json().then(b => b).catch(() => ({})) as { provider?: string }
  const useRevolut = provider === 'REVOLUT' || (!plan.paymentMethods.includes('STRIPE') && plan.paymentMethods.includes('REVOLUT'))

  if (!useRevolut && !plan.paymentMethods.includes('STRIPE'))
    return NextResponse.json({ error: 'No online payment method available for this plan' }, { status: 400 })

  const member = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: plan.schoolId },
  })
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const existing = await prisma.membership.findFirst({
    where: { userId: dbUser.id, planId: plan.id, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
  })
  if (existing) return NextResponse.json({ error: 'Already have this plan' }, { status: 409 })

  const school = await prisma.school.findUnique({
    where: { id: plan.schoolId },
    select: { stripeSecretKey: true, revolutSecretKey: true, name: true },
  })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Revolut path ────────────────────────────────────────────────────────────
  if (useRevolut) {
    if (!school?.revolutSecretKey)
      return NextResponse.json({ error: 'School has not configured Revolut' }, { status: 400 })

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
  if (!school?.stripeSecretKey)
    return NextResponse.json({ error: 'School has not configured Stripe' }, { status: 400 })

  const membership = await prisma.membership.create({
    data: {
      userId:        dbUser.id,
      schoolId:      plan.schoolId,
      planId:        plan.id,
      planName:      plan.name,
      price:         plan.price,
      currency:      plan.currency,
      paymentMethod: PaymentMethod.STRIPE,
      status:        MembershipStatus.PENDING,
      startDate:     new Date(),
    },
  })

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
    membershipId: membership.id,
    schoolId:     plan.schoolId,
    userId:       dbUser.id,
    planId:       plan.id,
    planType:     plan.planType,
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
