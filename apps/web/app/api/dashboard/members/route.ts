import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// GET /api/dashboard/members — list all school members with active membership
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const members = await prisma.schoolMember.findMany({
    where: { schoolId, role: 'STUDENT' },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: 'desc' },
  })

  // Fetch active memberships for all members in one query
  const userIds = members.map(m => m.userId)
  const memberships = await prisma.membership.findMany({
    where: { userId: { in: userIds }, schoolId, status: 'ACTIVE' },
    include: {
      plan: { select: { name: true, classAccess: true, planType: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  // Count bookings per membership for usage
  const membershipIds = memberships.map(m => m.id)
  const usageCounts = await prisma.booking.groupBy({
    by: ['membershipId'],
    where: { membershipId: { in: membershipIds }, status: { not: 'CANCELLED' } },
    _count: { id: true },
  })
  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))

  // Map membership by userId (take first active one per user)
  const membershipByUserId: Record<string, typeof memberships[0] & { consumed: number }> = {}
  for (const m of memberships) {
    if (!membershipByUserId[m.userId]) {
      membershipByUserId[m.userId] = { ...m, consumed: usageMap[m.id] ?? m.classesUsed }
    }
  }

  const result = members.map(m => {
    const mem = membershipByUserId[m.userId]
    const classAccess = mem?.plan?.classAccess as { classRules?: { limitType?: string; limit?: string }[]; globalLimit?: string } | null
    const totalLimit = classAccess?.globalLimit ? parseInt(classAccess.globalLimit) : null

    return {
      id: m.id,
      userId: m.user.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      belt: m.belt ?? 'Blanco',
      beltDegree: m.beltDegree ?? 0,
      status: m.status,
      role: m.role,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      activeMembership: mem ? {
        id: mem.id,
        planName: mem.plan?.name ?? mem.planName,
        planType: mem.plan?.planType ?? 'SUBSCRIPTION',
        status: mem.status,
        startDate: mem.startDate.toISOString(),
        endDate: mem.endDate?.toISOString() ?? null,
        price: Number(mem.price),
        currency: mem.currency,
        consumed: mem.consumed,
        totalLimit,
      } : null,
    }
  })

  return NextResponse.json(result)
}

// POST /api/dashboard/members — create a new member (student) in the current school
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { name, email, belt, beltDegree, status, phone } = body

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Upsert user by email, then create SchoolMember
  const newUser = await prisma.user.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { name: name.trim() },
    create: {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone?.trim() || null,
      role: 'STUDENT',
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  // Check if already a member
  const existing = await prisma.schoolMember.findFirst({
    where: { userId: newUser.id, schoolId },
  })
  if (existing) {
    return NextResponse.json({ error: 'This person is already a member of this school' }, { status: 409 })
  }

  const schoolMember = await prisma.schoolMember.create({
    data: {
      userId: newUser.id,
      schoolId,
      role: 'STUDENT',
      belt: belt || 'Blanco',
      beltDegree: beltDegree ?? 0,
      status: status || 'ACTIVE',
    },
    select: {
      id: true, belt: true, beltDegree: true, status: true, role: true, joinedAt: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  return NextResponse.json({
    member: {
      id: schoolMember.id,
      name: schoolMember.user.name ?? schoolMember.user.email,
      email: schoolMember.user.email,
      avatarUrl: schoolMember.user.avatarUrl ?? null,
      belt: schoolMember.belt ?? 'Blanco',
      beltDegree: schoolMember.beltDegree ?? 0,
      status: schoolMember.status,
      role: schoolMember.role,
      joinedAt: schoolMember.joinedAt?.toISOString() ?? null,
    },
  }, { status: 201 })
}
