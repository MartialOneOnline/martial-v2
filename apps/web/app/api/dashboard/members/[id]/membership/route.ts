import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { assignPlan, cancelMembership } from '@/lib/services/membership'
import { PaymentMethod } from '@/lib/prisma-client/enums'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.memberships.manage')) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// POST /api/dashboard/members/[id]/membership — assign a plan to a member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await req.json()
  const { planId, startDate, paymentMethod, notes } = body

  if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

  try {
    const membership = await assignPlan({
      schoolMemberId: id,
      schoolId: auth.schoolId,
      planId,
      startDate: startDate ? new Date(startDate) : undefined,
      paymentMethod: paymentMethod as PaymentMethod | undefined,
      notes,
    })
    return NextResponse.json(membership, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    const status = msg.includes('not found') ? 404 : 400
    return NextResponse.json({ error: msg }, { status })
  }
}

// DELETE /api/dashboard/members/[id]/membership/[membershipId]
// handled via PATCH below — cancel an active membership
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { membershipId, action, reason } = body

  if (action !== 'cancel') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  if (!membershipId) return NextResponse.json({ error: 'membershipId required' }, { status: 400 })

  try {
    const membership = await cancelMembership({
      membershipId,
      schoolId: auth.schoolId,
      reason,
    })
    return NextResponse.json(membership)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// GET /api/dashboard/members/[id]/membership — full membership history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const schoolMember = await prisma.schoolMember.findFirst({
    where: { id, schoolId: auth.schoolId },
    select: { userId: true },
  })
  if (!schoolMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const memberships = await prisma.membership.findMany({
    where: { userId: schoolMember.userId, schoolId: auth.schoolId },
    include: { plan: { select: { name: true, planType: true, billingCycle: true } } },
    orderBy: { startDate: 'desc' },
  })

  const membershipIds = memberships.map(m => m.id)
  const usageCounts = await prisma.booking.groupBy({
    by: ['membershipId'],
    where: { membershipId: { in: membershipIds }, status: { not: 'CANCELLED' } },
    _count: { id: true },
  })
  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))

  return NextResponse.json(memberships.map(m => ({
    id: m.id,
    planName: m.plan?.name ?? m.planName,
    planType: m.plan?.planType ?? 'SUBSCRIPTION',
    billingCycle: m.plan?.billingCycle ?? null,
    price: Number(m.price),
    currency: m.currency,
    paymentMethod: m.paymentMethod,
    status: m.status,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate?.toISOString() ?? null,
    cancelledAt: m.cancelledAt?.toISOString() ?? null,
    renewedFromId: m.renewedFromId ?? null,
    consumed: usageMap[m.id] ?? m.classesUsed,
    notes: m.notes,
  })))
}
