import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getPlatformStripe } from '@/lib/stripe'

type Cycle = 'monthly' | 'quarterly' | 'annual'
const PRICE_ID_FIELD: Record<Cycle, 'stripePriceIdMonthly' | 'stripePriceIdQuarterly' | 'stripePriceIdAnnual'> = {
  monthly: 'stripePriceIdMonthly',
  quarterly: 'stripePriceIdQuarterly',
  annual: 'stripePriceIdAnnual',
}

const REUSABLE_STATUSES = ['INACTIVE', 'CANCELED', 'INCOMPLETE_EXPIRED']

// POST /api/dashboard/billing/checkout — start (or restart) the school's Martial SaaS subscription
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { billingCycle } = await req.json() as { billingCycle?: Cycle }
  if (!billingCycle || !(billingCycle in PRICE_ID_FIELD)) {
    return NextResponse.json({ error: 'billingCycle must be one of monthly, quarterly, annual' }, { status: 400 })
  }

  const [school, platformSettings, existingSubscription] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true, email: true } }),
    prisma.platformSettings.findUnique({ where: { id: 'singleton' } }),
    prisma.schoolSubscription.findUnique({ where: { schoolId } }),
  ])
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  // Reject creating a second live subscription — server-side, not just UI hiding the button.
  if (existingSubscription?.stripeSubscriptionId && !REUSABLE_STATUSES.includes(existingSubscription.status)) {
    return NextResponse.json({ error: 'School already has an active subscription. Use the billing portal to manage it.' }, { status: 409 })
  }

  const priceId = platformSettings?.[PRICE_ID_FIELD[billingCycle]]
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for the ${billingCycle} plan` }, { status: 400 })
  }

  const stripe = getPlatformStripe()

  // Reuse the Stripe Customer if we already have one, otherwise create it once
  // and persist it — avoids spawning duplicate Customers on repeated checkout attempts.
  let stripeCustomerId = existingSubscription?.stripeCustomerId ?? null
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: school.name,
      email: school.email ?? undefined,
      metadata: { schoolId },
    })
    stripeCustomerId = customer.id
    await prisma.schoolSubscription.upsert({
      where: { schoolId },
      create: { schoolId, stripeCustomerId, status: 'INACTIVE' },
      update: { stripeCustomerId },
    })
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    client_reference_id: schoolId,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { schoolId, billingCycle },
    subscription_data: { metadata: { schoolId, billingCycle } },
    success_url: `${origin}/dashboard/settings?tab=billing`,
    cancel_url: `${origin}/dashboard/settings?tab=billing`,
  })

  return NextResponse.json({ url: session.url })
}
