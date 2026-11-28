import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { createRevolutOrder } from '@/lib/revolut'
import { MembershipStatus, PaymentMethod } from '@/lib/prisma-client/client'
import { resolveOnlineMethod } from '@/lib/paymentMethods'
import { evaluatePlanForPurchase } from '@/lib/services/planEligibility'
import { findPausedMembership, loadClassContext, providerConfigOf } from '@/lib/services/planPurchase'

function reject(status: number, code: string, error: string) {
  return NextResponse.json({ error, code }, { status })
}

// POST /api/my/checkout — create a checkout session for a membership plan
// Supports Stripe (one-time + subscription) and Revolut (one-time)
//
// Body: { planId, provider?, classId?, acknowledgePausedMembership? }
// Buying a plan never books a class. `classId` only says which class the buyer
// was looking at: when present, the purchase is refused if that class isn't
// covered (lib/services/planEligibility.ts) — the same evaluation the public
// plan listing presents, re-run here before any write or provider call.
export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    planId?: string; provider?: unknown; classId?: unknown; acknowledgePausedMembership?: unknown
  }
  const { planId, provider } = body
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })
  if (body.classId !== undefined && body.classId !== null && typeof body.classId !== 'string')
    return reject(400, 'invalid_class', 'classId must be a string')
  const classId = typeof body.classId === 'string' && body.classId ? body.classId : null

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: {
      id: true, schoolId: true, name: true, price: true, currency: true,
      planType: true, billingCycle: true, validityDays: true,
      isPublic: true, isActive: true, paymentMethods: true, stripePriceId: true, classAccess: true,
    },
  })
  if (!plan || !plan.isPublic || !plan.isActive)
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  // The plan's own paymentMethods decide which provider may be used. An explicit
  // provider the plan doesn't allow is rejected — never swapped for another one —
  // and this runs before any purchase/membership write or provider call below.
  // (getAuthUser() above may still provision/link the caller's own User row on a
  // first OAuth session — identity provisioning, not part of the purchase.)
  const resolved = resolveOnlineMethod(provider, plan.paymentMethods)
  if (!resolved.ok) return reject(400, 'method_not_allowed', resolved.error)
  const useRevolut = resolved.method === 'REVOLUT'

  // No SchoolMember requirement here — a brand-new user with no prior relationship
  // to the school can check out directly. The webhook creates the SchoolMember
  // (status ACTIVE) once the payment actually succeeds; see /api/webhooks/stripe
  // and /api/webhooks/revolut. FROZEN / INACTIVE / LEAD / PENDING members may buy
  // too (owner's decision) and are promoted to ACTIVE by the webhook. The one
  // exception is ARCHIVED: staff removed this person for a reason, and the webhook
  // deliberately won't reactivate that status (see the ARCHIVED guard there) — so
  // don't take their money for an activation that will never happen.
  const archivedMember = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: plan.schoolId, status: 'ARCHIVED' },
    select: { id: true },
  })
  if (archivedMember) {
    return reject(403, 'member_archived', 'Your membership at this school was archived — please contact the school before purchasing a plan')
  }

  // Provider must actually be connected before we touch any row (the stale-Revolut
  // cleanup below deletes one) or call out to the provider.
  const school = await prisma.school.findUnique({
    where: { id: plan.schoolId },
    select: { stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true, name: true },
  })
  if (useRevolut) {
    if (!school?.revolutSecretKey)
      return reject(400, 'provider_not_configured', 'School has not configured Revolut')
    // Webhook must be registered (revolutWebhookSecret set) before we accept payments —
    // otherwise the webhook handler would have to process unsigned notifications.
    if (!school.revolutWebhookSecret)
      return reject(400, 'provider_not_configured', 'School has not activated Revolut yet — the webhook must be registered first')
  } else if (!school?.stripeSecretKey) {
    return reject(400, 'provider_not_configured', 'School has not configured Stripe')
  }

  // Shared eligibility: the chosen provider must be a real offer for this plan
  // (e.g. Revolut can't sell a SUBSCRIPTION — it would never renew).
  const now = new Date()
  const loadedClass = classId ? await loadClassContext(plan.schoolId, classId, now) : null
  if (classId && !loadedClass) return reject(400, 'class_unavailable', 'This class is not available at this school')
  const eligibility = evaluatePlanForPurchase(
    { ...plan, price: Number(plan.price) },
    providerConfigOf(school!),
    now,
    loadedClass?.context,
  )
  if (eligibility.configIssue === 'invalid_validity')
    return reject(400, 'plan_misconfigured', 'This plan cannot be bought online until the school fixes its validity')
  if (!eligibility.offers.some(o => o.provider === resolved.method))
    return reject(400, 'method_not_offered', 'This plan cannot be bought online with this payment method')
  if (eligibility.classCheck) {
    switch (eligibility.classCheck.status) {
      case 'not_included':
        return reject(400, 'class_not_included', 'This plan does not include the selected class')
      case 'no_upcoming_session':
        return reject(400, 'no_upcoming_session', 'The selected class has no upcoming sessions')
      case 'expires_before_session':
        return reject(400, 'expires_before_session', 'This pass would expire before the next session of the selected class')
    }
  }

  // A PAUSED membership at this school is left untouched by the purchase. If the
  // buyer wasn't shown that (the sheet asks for an explicit acknowledgement), stop
  // here — re-checked server-side, not trusted from the client's earlier read.
  const paused = await findPausedMembership(dbUser.id, plan.schoolId)
  if (paused && body.acknowledgePausedMembership !== true) {
    return NextResponse.json(
      { error: 'You have a paused membership at this school', code: 'paused_membership_ack_required', pausedMembership: paused },
      { status: 409 },
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
      return reject(409, 'already_has_plan', 'Already have this plan')
    }
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // ── Revolut path ────────────────────────────────────────────────────────────
  // (provider configuration already verified above)
  if (useRevolut && school?.revolutSecretKey) {
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
      successUrl:       `${origin}/checkout/return?provider=revolut&attempt=${membership.id}`,
      cancelUrl:        `${origin}/checkout/return?provider=revolut&attempt=${membership.id}&cancelled=1`,
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

  // {CHECKOUT_SESSION_ID} is substituted by Stripe. `plan` is only a hint for
  // which school's key to read the session with; /api/my/checkout/status
  // verifies it against the session's own metadata.
  const stripeSuccessUrl = `${origin}/checkout/return?provider=stripe&plan=${plan.id}&session_id={CHECKOUT_SESSION_ID}`
  const stripeCancelUrl  = `${origin}/checkout/return?provider=stripe&plan=${plan.id}&cancelled=1`

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
      success_url: stripeSuccessUrl,
      cancel_url:  stripeCancelUrl,
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
      success_url: stripeSuccessUrl,
      cancel_url:  stripeCancelUrl,
    })
  }

  return NextResponse.json({ url: session.url })
}
