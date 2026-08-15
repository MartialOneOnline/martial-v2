import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/prisma-client/client'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { scheduledAtForDate, type ScheduleSlot } from '@/lib/scheduling'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params
  const body = await req.json().catch(() => ({}))
  const { userId, date } = body as { userId?: string; date?: string }
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  // Verify class belongs to school
  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true, capacity: true, schedule: true } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Verify the student is actually a member of this school — staff should
  // only be able to book their own roster, not an arbitrary userId.
  const member = await prisma.schoolMember.findFirst({ where: { userId, schoolId }, select: { id: true } })
  if (!member) return NextResponse.json({ error: 'Student not found in this school' }, { status: 404 })

  // Resolve to the class's real schedule-slot time for this date (same
  // instant GET /api/my/school-classes would generate for a self-booking on
  // this day) rather than an arbitrary noon placeholder — otherwise a
  // staff-added booking and a self-booking for what a human considers "the
  // same occurrence" land on different scheduledAt values, and the capacity
  // count/advisory lock/unique index below would silently only ever see
  // rows from this endpoint, never self-bookings on the real slot time.
  const dateStr = date ?? new Date().toISOString().slice(0, 10)
  const scheduledAt = scheduledAtForDate(dateStr, cls.schedule as ScheduleSlot[] | null)
  const dayStart = new Date(Date.UTC(scheduledAt.getUTCFullYear(), scheduledAt.getUTCMonth(), scheduledAt.getUTCDate()))
  const dayEnd   = new Date(dayStart.getTime() + 86_400_000)

  const cancelled = await prisma.classCancellation.findUnique({
    where: { classId_date: { classId, date: new Date(`${dateStr}T00:00:00.000Z`) } },
    select: { id: true },
  })
  if (cancelled) return NextResponse.json({ error: 'This class has been cancelled for this date' }, { status: 409 })

  // Duplicate check + capacity check + create run inside a transaction
  // guarded by the same advisory lock (namespace 1, keyed by classId+scheduledAt)
  // that POST /api/bookings uses for self-service bookings on this slot — so
  // a staff-added booking and a concurrent self-booking (or another staff
  // add) for the same class+instant serialize against each other instead of
  // both reading a stale count and both squeezing past capacity.
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1, hashtext(${`${classId}:${scheduledAt.toISOString()}`}))`

    const existing = await tx.booking.findFirst({
      where: {
        classId,
        userId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { notIn: ['CANCELLED'] },
      },
    })
    if (existing) {
      throw Object.assign(new Error('Already booked'), { code: 'DUPLICATE', status: 409 })
    }

    if (cls.capacity !== null) {
      const bookedCount = await tx.booking.count({
        where: { classId, scheduledAt, status: { in: ['CONFIRMED', 'PENDING'] } },
      })
      if (bookedCount >= cls.capacity) {
        throw Object.assign(new Error('Class is full'), { code: 'FULL', status: 409 })
      }
    }

    return tx.booking.create({
      data: {
        classId,
        userId,
        scheduledAt,
        status: 'CONFIRMED',
        bookedByRole: 'STAFF',
        bookedByUserId: user.id,
      },
      include: { user: { select: { name: true, avatarUrl: true } } },
    })
  }).catch((err: Error & { status?: number }) => {
    // Belt-and-suspenders: the partial unique index on bookings still rejects
    // the insert at the DB level if the app-level duplicate check above lost
    // a race against a write outside this route's lock (see
    // prisma/migrations/20260709090000_bookings_active_slot_unique_index).
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Already booked' }, { status: 409 })
    }
    const status = err.status ?? 500
    return NextResponse.json({ error: err.message }, { status })
  })

  if (booking instanceof NextResponse) return booking

  return NextResponse.json({
    booking: {
      id:            booking.id,
      name:          booking.user?.name ?? '—',
      avatarUrl:     booking.user?.avatarUrl ?? null,
      status:        booking.status,
      createdAt:     booking.createdAt.toISOString(),
      scheduledAt:   booking.scheduledAt.toISOString(),
      bookedByRole:  booking.bookedByRole,
      bookedByName:  user.name ?? null,
    },
  })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params

  // Optional ?date=YYYY-MM-DD param; defaults to today (server timezone).
  // Optional ?time=HH:MM param — when given alongside date, scopes the
  // result to that exact scheduled occurrence (±1min tolerance, matching
  // lib/scheduling.ts#isValidScheduledAt) instead of the whole day. Needed
  // for classes with more than one slot on the same day (e.g. 17:00 and
  // 19:00 sessions) — without it, opening either session's roster from the
  // calendar/timetable returned every booking for the day, merging both
  // sessions into one list.
  const dateParam = req.nextUrl.searchParams.get('date')
  const timeParam = req.nextUrl.searchParams.get('time')

  let scheduledAtFilter: { gte: Date; lt: Date }
  if (dateParam && timeParam) {
    const [y, m, d] = dateParam.split('-').map(Number)
    const [hh, mm]  = timeParam.split(':').map(Number)
    const target = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0))
    scheduledAtFilter = { gte: new Date(target.getTime() - 60_000), lt: new Date(target.getTime() + 60_000) }
  } else {
    const base = dateParam ? new Date(dateParam) : new Date()
    const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    scheduledAtFilter = { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86_400_000) }
  }

  // Occurrence-level cancellation is keyed by date only (see
  // cancel-occurrence/route.ts), independent of the time-scoped filter above.
  const occurrenceDate = new Date(`${dateParam ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
  const cancellation = await prisma.classCancellation.findUnique({
    where: { classId_date: { classId, date: occurrenceDate } },
    select: { reason: true, hidden: true },
  })

  const bookings = await prisma.booking.findMany({
    where: {
      classId,
      scheduledAt: scheduledAtFilter,
      class: { schoolId },
      status: { notIn: ['CANCELLED'] },
    },
    include: {
      user: {
        select: {
          name: true,
          avatarUrl: true,
          schoolMembers: {
            where: { schoolId },
            select: { belt: true, beltDegree: true, status: true },
            take: 1,
          },
          memberships: {
            where: { schoolId, status: { in: ['ACTIVE', 'PENDING'] } },
            orderBy: { createdAt: 'desc' },
            select: { status: true, planName: true },
            take: 1,
          },
        },
      },
      bookedByUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    cancelled: !!cancellation,
    cancelReason: cancellation?.reason ?? null,
    cancelHidden: cancellation?.hidden ?? false,
    bookings: bookings.map(b => {
      const member     = b.user?.schoolMembers?.[0]
      const membership = b.user?.memberships?.[0]
      return {
        id:               b.id,
        name:             b.user?.name ?? '—',
        avatarUrl:        b.user?.avatarUrl ?? null,
        status:           b.status,
        attendedAt:       b.attendedAt?.toISOString() ?? null,
        scheduledAt:      b.scheduledAt.toISOString(),
        createdAt:        b.createdAt.toISOString(),
        bookedByRole:     b.bookedByRole,
        bookedByName:     b.bookedByUser?.name ?? null,
        belt:             member?.belt ?? null,
        beltDegree:       member?.beltDegree ?? 0,
        memberStatus:     member?.status ?? null,
        membershipStatus: membership?.status ?? null,
        membershipPlan:   membership?.planName ?? null,
      }
    }),
  })
}
