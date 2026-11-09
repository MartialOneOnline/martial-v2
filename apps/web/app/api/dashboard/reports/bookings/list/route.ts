import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@/lib/prisma-client/client'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardPermission } from '@/lib/auth/server'
import { schoolTimeZone } from '@/lib/memberActivity'
import { isOccPeriod, occupancyWindows, wallClock } from '@/lib/bookings/occupancy'

const STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'] as const
type Status = typeof STATUSES[number]
const isStatus = (s: string | null): s is Status => !!s && (STATUSES as readonly string[]).includes(s)

/**
 * GET /api/dashboard/reports/bookings/list?period=&status=&search=&page=&pageSize=
 * Every booking of the period, newest first. 'ALL' leaves out cancelled ones
 * (they have their own filter). scheduledAt is the class's local time in UTC
 * fields, so the client must format it in UTC.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  try { await requireDashboardPermission('school.analytics.view', schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const sp = new URL(req.url).searchParams
  const rawPeriod = sp.get('period')
  const period = isOccPeriod(rawPeriod) ? rawPeriod : '30d'
  const rawStatus = sp.get('status')
  const search = (sp.get('search') ?? '').trim().slice(0, 100)
  const page = Math.max(1, Number.parseInt(sp.get('page') ?? '1', 10) || 1)
  const pageSize = Math.min(5000, Math.max(1, Number.parseInt(sp.get('pageSize') ?? '15', 10) || 15))

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const { current } = occupancyWindows(period, wallClock(new Date(), schoolTimeZone(school?.country)))

  const where: Prisma.BookingWhereInput = {
    class: { schoolId },
    scheduledAt: { gte: current.from, lte: current.to },
    status: isStatus(rawStatus) ? rawStatus : { not: 'CANCELLED' },
    ...(search ? {
      OR: [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { class: { name: { contains: search, mode: 'insensitive' } } },
      ],
    } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      select: {
        id: true, userId: true, scheduledAt: true, status: true, attendedAt: true, bookedByRole: true,
        user: { select: { name: true, email: true, avatarUrl: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.booking.count({ where }),
  ])

  return NextResponse.json({
    bookings: rows.map(b => ({
      id: b.id,
      userId: b.userId,
      userName: b.user?.name ?? '—',
      userEmail: b.user?.email ?? '',
      userAvatar: b.user?.avatarUrl ?? null,
      classId: b.class.id,
      className: b.class.name,
      scheduledAt: b.scheduledAt.toISOString(),
      status: b.status,
      attended: b.attendedAt !== null || b.status === 'COMPLETED',
      bookedBy: b.bookedByRole,
    })),
    total,
    page,
    pageSize,
  })
}
