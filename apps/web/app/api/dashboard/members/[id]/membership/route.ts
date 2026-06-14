import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role)) return { error: 'Forbidden', status: 403 }
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

  // id is the SchoolMember id
  const schoolMember = await prisma.schoolMember.findFirst({
    where: { id, schoolId: auth.schoolId },
    select: { userId: true },
  })
  if (!schoolMember) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const body = await req.json()
  const { planId, startDate, paymentMethod, notes } = body

  if (!planId) return NextResponse.json({ error: 'planId is required' }, { status: 400 })

  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, schoolId: auth.schoolId },
  })
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const start = startDate ? new Date(startDate) : new Date()

  // Calculate endDate for single-pass and trial plans
  let endDate: Date | null = null
  if (plan.validityDays) {
    endDate = new Date(start)
    endDate.setDate(endDate.getDate() + plan.validityDays)
  }

  // Cancel any existing active memberships for this user at this school
  await prisma.membership.updateMany({
    where: { userId: schoolMember.userId, schoolId: auth.schoolId, status: 'ACTIVE' },
    data: { status: 'CANCELLED' },
  })

  const membership = await prisma.membership.create({
    data: {
      userId: schoolMember.userId,
      schoolId: auth.schoolId,
      planId,
      planName: plan.name,
      price: plan.price,
      currency: plan.currency,
      paymentMethod: paymentMethod ?? 'CASH',
      status: 'ACTIVE',
      startDate: start,
      endDate,
      notes: notes?.trim() || null,
    },
    include: {
      plan: { select: { name: true, billingCycle: true, planType: true } },
    },
  })

  // Update member status to ACTIVE if they were LEAD/PENDING
  await prisma.schoolMember.update({
    where: { id },
    data: { status: 'ACTIVE' },
  }).catch(() => {/* ignore */})

  return NextResponse.json(membership, { status: 201 })
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

  // Count bookings per membership
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
    status: m.status,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate?.toISOString() ?? null,
    consumed: usageMap[m.id] ?? m.classesUsed,
    notes: m.notes,
  })))
}
