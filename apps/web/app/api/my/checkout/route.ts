import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'

// POST /api/my/checkout — create a Stripe Checkout Session for a membership plan
// Supports one-time payment (SINGLE_PASS/TRIAL) and recurring subscriptions (SUBSCRIPTION)
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

  if (!plan.paymentMethods.includes('STRIPE'))
    return NextResponse.json({ error: 'Stripe not accepted for this plan' }, { status: 400 })

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
    select: { stripeSecretKey: true, name: true },
  })
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
  const origin   = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const currency = (plan.currency ?? 'EUR').toLowerCase()

  const isSubscription = plan.planType === 'SUBSCRIPTION'

  // Build billing_cycle_anchor interval for Stripe
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
          recurring: {
            interval:       billingInterval.interval,
            interval_count: billingInterval.interval_count,
          },
          product_data: {
            name:        plan.name,
            description: `${school.name} — membership`,
          },
        },
        quantity: 1,
      }],
      subscription_data: { metadata },
      metadata,
      success_url: `${origin}/my/membership?checkout=success`,
      cancel_url:  `${origin}/my/membership?checkout=cancelled`,
    })
  } else {
    // One-time: SINGLE_PASS or TRIAL
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: dbUser.email ?? undefined,
      line_items: [{
        price_data: {
          currency,
          unit_amount: Math.round(Number(plan.price) * 100),
          product_data: {
            name:        plan.name,
            description: `${school.name} — membership`,
          },
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
