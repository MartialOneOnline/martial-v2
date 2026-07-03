import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getPlatformStripe } from '@/lib/stripe'

// POST /api/dashboard/billing/portal — manage the school's Martial SaaS subscription
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

  const subscription = await prisma.schoolSubscription.findUnique({ where: { schoolId } })
  if (!subscription?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe subscription found for this school' }, { status: 400 })
  }

  const stripe = getPlatformStripe()
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/dashboard/settings?tab=billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
