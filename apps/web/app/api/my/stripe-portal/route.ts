import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'

// POST /api/my/stripe-portal
// Creates a Stripe Billing Portal session for the student to manage their subscription.
// Body: { membershipId: string }
export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { membershipId } = await req.json() as { membershipId: string }

  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: {
      userId: true, schoolId: true,
      stripeCustomerId: true, stripeSubId: true,
    },
  })

  if (!membership || membership.userId !== dbUser.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!membership.stripeCustomerId)
    return NextResponse.json({ error: 'No Stripe subscription found' }, { status: 400 })

  const school = await prisma.school.findUnique({
    where: { id: membership.schoolId },
    select: { stripeSecretKey: true },
  })
  if (!school?.stripeSecretKey)
    return NextResponse.json({ error: 'School Stripe not configured' }, { status: 400 })

  const stripe = getStripe(school.stripeSecretKey)
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer:   membership.stripeCustomerId,
    return_url: `${origin}/my/membership`,
  })

  return NextResponse.json({ url: portalSession.url })
}
