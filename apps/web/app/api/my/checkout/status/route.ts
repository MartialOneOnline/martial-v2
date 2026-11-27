import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { getRevolutOrder } from '@/lib/revolut'
import { isRateLimited } from '@/lib/rateLimit'

// GET /api/my/checkout/status — read-only state of ONE checkout attempt.
//
//   Stripe:  ?provider=stripe&session_id=cs_…&plan=<planId>
//   Revolut: ?provider=revolut&attempt=<membershipId>
//
// Never grants access and never replaces the webhook: it only reports what the
// provider and our own records say about this specific attempt. It is
// independent of the student's selected school context. An attempt that isn't
// the caller's answers 404 exactly like one that doesn't exist.
//
// Response: { payment, access, incident, school, planName }
//   payment  — 'paid' | 'not_completed' | 'unconfirmed' | 'unknown' (provider unreachable)
//   access   — 'none' | 'pending_activation' | 'active' | 'paused' | 'ended'
//   incident — null | 'needs_school' (payment captured but not activated, e.g. archived member)

type Payment = 'paid' | 'not_completed' | 'unconfirmed' | 'unknown'
type Access = 'none' | 'pending_activation' | 'active' | 'paused' | 'ended'

const NOT_FOUND = () => NextResponse.json({ error: 'Not found' }, { status: 404 })

function accessFromMembership(status: string | null | undefined, payment: Payment): Access {
  switch (status) {
    case 'ACTIVE': return 'active'
    case 'PAUSED': return 'paused'
    case 'CANCELLED':
    case 'EXPIRED': return 'ended'
    default: return payment === 'paid' ? 'pending_activation' : 'none'
  }
}

export async function GET(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // The return page polls every 2 s for up to a minute; this leaves headroom
  // for a manual "check again" without letting it hammer the providers.
  if (isRateLimited(`checkout-status:${dbUser.id}`, 45, 60_000))
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const sp = req.nextUrl.searchParams
  const provider = sp.get('provider')

  if (provider === 'stripe') {
    const sessionId = sp.get('session_id')
    const planHint = sp.get('plan')
    if (!sessionId || !planHint || !sessionId.startsWith('cs_')) return NOT_FOUND()

    // The plan id only tells us which school's key to read the session with —
    // an untrusted hint, verified against the session's own metadata below.
    // Never tries other schools' keys.
    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planHint },
      select: { id: true, schoolId: true, name: true, school: { select: { id: true, name: true, slug: true, stripeSecretKey: true } } },
    })
    if (!plan?.school.stripeSecretKey) return NOT_FOUND()

    let session: {
      status?: string | null
      payment_status?: string | null
      payment_intent?: string | { id: string } | null
      subscription?: string | { id: string } | null
      metadata?: Record<string, string> | null
    }
    try {
      session = await getStripe(plan.school.stripeSecretKey).checkout.sessions.retrieve(sessionId)
    } catch (err) {
      const code = (err as { code?: string; statusCode?: number })
      if (code?.code === 'resource_missing' || code?.statusCode === 404) return NOT_FOUND()
      console.error('[checkout status] stripe retrieve failed:', err)
      return NextResponse.json({
        payment: 'unknown', access: 'none', incident: null,
        school: { id: plan.school.id, name: plan.school.name, slug: plan.school.slug }, planName: plan.name,
      })
    }

    const meta = session.metadata ?? {}
    if (meta.userId !== dbUser.id || meta.planId !== plan.id || meta.schoolId !== plan.schoolId) return NOT_FOUND()

    const payment: Payment =
      session.payment_status === 'paid' || session.payment_status === 'no_payment_required' ? 'paid'
      : session.status === 'expired' ? 'not_completed'
      : 'unconfirmed'

    const idOf = (v: string | { id: string } | null | undefined) => (typeof v === 'string' ? v : v?.id ?? null)
    const subscriptionId = idOf(session.subscription)
    const paymentIntentId = idOf(session.payment_intent)

    // Link to THIS purchase only — never "any active membership of the plan".
    let membershipStatus: string | null = null
    let incident: 'needs_school' | null = null
    if (subscriptionId) {
      const m = await prisma.membership.findFirst({
        where: { stripeSubId: subscriptionId, userId: dbUser.id, schoolId: plan.schoolId },
        select: { status: true },
      })
      membershipStatus = m?.status ?? null
    }
    if (!membershipStatus && paymentIntentId) {
      const tx = await prisma.transaction.findFirst({
        where: { stripePaymentIntentId: paymentIntentId, userId: dbUser.id, schoolId: plan.schoolId },
        select: { status: true, membership: { select: { status: true } } },
      })
      if (tx?.status === 'FLAGGED') incident = 'needs_school'
      membershipStatus = tx?.membership?.status ?? null
    }

    return NextResponse.json({
      payment,
      access: incident ? 'none' : accessFromMembership(membershipStatus, payment),
      incident,
      school: { id: plan.school.id, name: plan.school.name, slug: plan.school.slug },
      planName: plan.name,
    })
  }

  if (provider === 'revolut') {
    const attempt = sp.get('attempt')
    if (!attempt) return NOT_FOUND()
    const membership = await prisma.membership.findFirst({
      where: { id: attempt, userId: dbUser.id, paymentMethod: 'REVOLUT' },
      select: {
        status: true, planName: true, revolutOrderId: true,
        school: { select: { id: true, name: true, slug: true, revolutSecretKey: true } },
      },
    })
    if (!membership) return NOT_FOUND()
    const school = { id: membership.school.id, name: membership.school.name, slug: membership.school.slug }

    let payment: Payment = 'unconfirmed'
    if (membership.revolutOrderId && membership.school.revolutSecretKey) {
      try {
        const order = await getRevolutOrder(membership.school.revolutSecretKey, membership.revolutOrderId)
        const state = String(order.state ?? '').toUpperCase()
        payment = state === 'COMPLETED' ? 'paid'
          : state === 'FAILED' || state === 'CANCELLED' ? 'not_completed'
          : 'unconfirmed'
      } catch (err) {
        console.error('[checkout status] revolut order lookup failed:', err)
        payment = 'unknown'
      }
    }
    // Our own record already proves activation even if the provider lookup failed.
    if (membership.status === 'ACTIVE' && payment !== 'paid') payment = 'paid'

    let incident: 'needs_school' | null = null
    if (membership.revolutOrderId && membership.status === 'PENDING') {
      const flagged = await prisma.transaction.findFirst({
        where: { revolutOrderId: membership.revolutOrderId, userId: dbUser.id, status: 'FLAGGED' },
        select: { id: true },
      })
      if (flagged) incident = 'needs_school'
    }

    return NextResponse.json({
      payment,
      access: incident || payment === 'not_completed'
        ? 'none'
        : accessFromMembership(membership.status === 'PENDING' ? null : membership.status, payment),
      incident,
      school,
      planName: membership.planName,
    })
  }

  return NOT_FOUND()
}
