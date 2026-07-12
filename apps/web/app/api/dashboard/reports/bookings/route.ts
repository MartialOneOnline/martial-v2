import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'

// requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
// requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT must
// not read the full per-member booking roster for the school.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  try { await requireDashboardAccess(schoolId) }
  catch { return { error: 'Forbidden', status: 403 } }
  return { schoolId }
}

function periodBounds(period: string): { from: Date; points: { label: string; from: Date; to: Date }[] } {
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
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 3)
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
  const period    = searchParams.get('period')    ?? '30d'
  const status    = searchParams.get('status')    ?? 'ALL'
  const search    = searchParams.get('search')    ?? ''
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize  = 15
  const className = searchParams.get('className') ?? ''
  const dateFrom  = searchParams.get('dateFrom')  ?? ''
  const dateTo    = searchParams.get('dateTo')    ?? ''

  const { from, points } = periodBounds(period)

  // If dateFrom/dateTo provided, use them for the table query; otherwise use period-derived from
  const tableFrom = dateFrom ? new Date(dateFrom) : from
  const tableTo   = dateTo   ? new Date(dateTo + 'T23:59:59') : undefined

  // ── Booking list ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    class: { schoolId: auth.schoolId, ...(className ? { name: { contains: className, mode: 'insensitive' } } : {}) },
    scheduledAt: { gte: tableFrom, ...(tableTo ? { lte: tableTo } : {}) },
    ...(status !== 'ALL' ? { status } : {}),
    ...(search ? {
      OR: [
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { class: { name: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        user:  { select: { name: true, email: true, avatarUrl: true } },
        class: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ])

  // ── Chart: bookings per time point ───────────────────────────────────────────
  const chartData = await Promise.all(
    points.map(async pt => {
      const [confirmed, cancelled] = await Promise.all([
        prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: pt.from, lte: pt.to }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
        prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: pt.from, lte: pt.to }, status: 'CANCELLED' } }),
      ])
      return { date: pt.label, confirmed, cancelled }
    })
  )

  // ── By class breakdown ───────────────────────────────────────────────────────
  const byClass = await prisma.booking.groupBy({
    by: ['classId'],
    where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 6,
  })
  const classIds = byClass.map(b => b.classId)
  const classes  = await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } })
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]))

  const CHART_COLORS = ['#0870E2', '#6D28D9', '#C2410C', '#15803D', '#0F766E', '#B45309']
  const byClassData = byClass.map((b, i) => ({
    name: classMap[b.classId] ?? b.classId,
    bookings: b._count.id,
    fill: CHART_COLORS[i] ?? '#9CA3AF',
  }))

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const [totalPeriod, confirmedPeriod, cancelledPeriod] = await Promise.all([
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from } } }),
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from }, status: 'CANCELLED' } }),
  ])
  const attendanceRate = totalPeriod > 0 ? Math.round((confirmedPeriod / totalPeriod) * 100) : 0

  return NextResponse.json({
    stats: { totalPeriod, confirmedPeriod, cancelledPeriod, attendanceRate },
    chartData,
    byClassData,
    bookings: bookings.map(b => ({
      id:          b.id,
      userName:    b.user?.name     ?? '—',
      userEmail:   b.user?.email    ?? '—',
      userAvatar:  b.user?.avatarUrl ?? null,
      className:   b.class?.name    ?? '—',
      scheduledAt: b.scheduledAt.toISOString(),
      status:      b.status,
    })),
    total,
    page,
    pageSize,
  })
}
