import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { findPausedMembership } from '@/lib/services/planPurchase'

// GET /api/my/checkout/precheck?planId=… — the buyer's own situation at the
// plan's school, shown in the purchase sheet BEFORE paying. The public plan
// listing can't know any of this. Informational only: POST /api/my/checkout
// re-checks every point itself. Never returns external subscription ids.
export async function GET(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const planId = req.nextUrl.searchParams.get('planId')
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    select: { id: true, schoolId: true, isPublic: true, isActive: true },
  })
  if (!plan || !plan.isPublic || !plan.isActive) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const [member, existing, pausedMembership] = await Promise.all([
    prisma.schoolMember.findFirst({
      where: { userId: dbUser.id, schoolId: plan.schoolId },
      select: { status: true },
    }),
    prisma.membership.findFirst({
      where: { userId: dbUser.id, planId: plan.id, status: { in: ['ACTIVE', 'PAUSED', 'PENDING'] } },
      select: { status: true, paymentMethod: true },
    }),
    findPausedMembership(dbUser.id, plan.schoolId),
  ])

  // Same rule as checkout: a stale PENDING Revolut attempt doesn't block a retry.
  const blocksDuplicate = !!existing && !(existing.status === 'PENDING' && existing.paymentMethod === 'REVOLUT')

  return NextResponse.json({
    archived: member?.status === 'ARCHIVED',
    alreadyHasPlan: blocksDuplicate,
    pausedMembership,
  })
}
