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
    try { await requireSchoolAccess(user.id, schoolId) }
    catch { return { error: 'Forbidden', status: 403 } }
  }
  return { schoolId }
}

function periodDates(period: string) {
  const now = new Date()
  const points: { label: string; from: Date; to: Date }[] = []

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), from, to })
    }
  } else if (period === '30d') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 5)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from, to })
    }
  } else if (period === '90d') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  }

  return { from: points[0]?.from ?? new Date(), points }
}

export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const period   = searchParams.get('period')  ?? '30d'
  const status   = searchParams.get('status')  ?? 'ALL'
  const search   = searchParams.get('search')  ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = 15

  const { from, points } = periodDates(period)
  const now = new Date()
  const newThreshold = new Date(now); newThreshold.setDate(now.getDate() - 30)

  // ── Member list ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const belt     = searchParams.get('belt')     ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo   = searchParams.get('dateTo')   ?? ''

  const where: any = {
    schoolId: auth.schoolId,
    role: 'STUDENT',
    ...(search ? {
      user: { OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]},
    } : {}),
    ...(belt ? { belt } : {}),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
      },
    } : {}),
    ...(status === 'ACTIVE'   ? { status: 'ACTIVE' } : {}),
    ...(status === 'INACTIVE' ? { status: { in: ['INACTIVE', 'FROZEN', 'LEAD'] } } : {}),
    ...(status === 'NEW'      ? { status: 'ACTIVE', createdAt: { gte: newThreshold } } : {}),
  }

  const [members, total] = await Promise.all([
    prisma.schoolMember.findMany({
      where,
      include: { user: { select: { name: true, email: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.schoolMember.count({ where }),
  ])

  // Fetch active membership plan names + last attended class for these users
  const userIds = members.map(m => m.userId)
  const [activeMemberships, lastAttended] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: { in: userIds }, schoolId: auth.schoolId, status: 'ACTIVE' },
      select: { userId: true, planName: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.booking.findMany({
      where: { userId: { in: userIds }, attendedAt: { not: null }, class: { schoolId: auth.schoolId } },
      select: { userId: true, attendedAt: true },
      orderBy: { attendedAt: 'desc' },
      distinct: ['userId'],
    }),
  ])
  const planByUser: Record<string, string> = {}
  for (const mem of activeMemberships) {
    if (!planByUser[mem.userId]) planByUser[mem.userId] = mem.planName
  }
  const lastAttendedByUser: Record<string, string> = {}
  for (const b of lastAttended) {
    if (b.attendedAt) lastAttendedByUser[b.userId] = b.attendedAt.toISOString()
  }

  // ── Belt distribution ────────────────────────────────────────────────────────
  const allActive = await prisma.schoolMember.findMany({
    where: { schoolId: auth.schoolId, role: 'STUDENT', status: 'ACTIVE' },
    select: { belt: true },
  })
  const beltMap: Record<string, number> = {}
  for (const m of allActive) {
    const b = m.belt ?? 'Unknown'
    beltMap[b] = (beltMap[b] ?? 0) + 1
  }
  const BELT_ORDER = ['Blanco', 'White', 'Azul', 'Blue', 'Morado', 'Purple', 'Marrón', 'Brown', 'Negro', 'Black']
  const beltDist = Object.entries(beltMap)
    .sort(([a], [b]) => {
      const ai = BELT_ORDER.indexOf(a); const bi = BELT_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([name, value]) => ({ name, value }))

  // ── Growth chart ─────────────────────────────────────────────────────────────
  const growthData = await Promise.all(
    points.map(async pt => {
      const count = await prisma.schoolMember.count({
        where: { schoolId: auth.schoolId, role: 'STUDENT', createdAt: { lte: pt.to } },
      })
      return { date: pt.label, members: count }
    })
  )

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const [totalActive, newInPeriod, totalInactive] = await Promise.all([
    prisma.schoolMember.count({ where: { schoolId: auth.schoolId, role: 'STUDENT', status: 'ACTIVE' } }),
    prisma.schoolMember.count({ where: { schoolId: auth.schoolId, role: 'STUDENT', status: 'ACTIVE', createdAt: { gte: from } } }),
    prisma.schoolMember.count({ where: { schoolId: auth.schoolId, role: 'STUDENT', status: { in: ['INACTIVE', 'FROZEN'] } } }),
  ])
  const totalAll = totalActive + totalInactive
  const retentionRate = totalAll > 0 ? Math.round((totalActive / totalAll) * 100) : 0

  return NextResponse.json({
    stats: { totalActive, newInPeriod, totalInactive, retentionRate },
    growthData,
    beltDist,
    members: members.map(m => ({
      id:        m.id,
      name:      m.user?.name     ?? '—',
      email:     m.user?.email    ?? '—',
      avatarUrl: m.user?.avatarUrl ?? null,
      belt:      m.belt           ?? '—',
      plan:      planByUser[m.userId] ?? '—',
      status:        m.status,
      joinedAt:      m.createdAt.toISOString(),
      isNew:         m.createdAt >= newThreshold,
      lastAttendedAt: lastAttendedByUser[m.userId] ?? null,
    })),
    total,
    page,
    pageSize,
  })
}
