import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { periodBounds } from '@/lib/reportPeriods'

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

export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const period    = searchParams.get('period')    ?? '30d'
  const status    = searchParams.get('status')    ?? 'ALL'
  const search    = searchParams.get('search')    ?? ''
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize  = Math.min(1000, parseInt(searchParams.get('pageSize') ?? '15'))
  const className = searchParams.get('className') ?? ''
  const dateFrom  = searchParams.get('dateFrom')
  const dateTo    = searchParams.get('dateTo')

  // Single time window shared by the table, the trend chart and the stat
  // cards — a 'custom' period (with dateFrom/dateTo) or a preset both flow
  // through here so every widget on the page reflects the same range.
  const { from, to, points } = periodBounds(period, dateFrom, dateTo)

  // ── Booking list ─────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    class: { schoolId: auth.schoolId, ...(className ? { name: { contains: className, mode: 'insensitive' } } : {}) },
    scheduledAt: { gte: from, lte: to },
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
    where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from, lte: to }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
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
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from, lte: to } } }),
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from, lte: to }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.booking.count({ where: { class: { schoolId: auth.schoolId }, scheduledAt: { gte: from, lte: to }, status: 'CANCELLED' } }),
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
