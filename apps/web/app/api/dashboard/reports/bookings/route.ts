import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { schoolTimeZone } from '@/lib/memberActivity'
import {
  buildOccupancy, isOccPeriod, occupancyWindows, parseSchedule, slotKey, wallClock,
} from '@/lib/bookings/occupancy'

// requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
// requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT must
// not read the school's attendance.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  try { await requireDashboardAccess(schoolId) }
  catch { return { error: 'Forbidden', status: 403 } }
  return { schoolId }
}

/**
 * GET /api/dashboard/reports/bookings?period=30d|90d|12m
 * How full each class of the weekly timetable is: average attendance per
 * session against capacity, compared with the period before; quiet classes
 * (and what else runs at that time), nearly full ones, past classes nobody
 * marked, bookings outside the timetable, a weekly trend and who books.
 * The full booking list lives at ./list.
 */
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const schoolId = auth.schoolId

  const raw = new URL(req.url).searchParams.get('period')
  const period = isOccPeriod(raw) ? raw : '30d'

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const timeZone = schoolTimeZone(school?.country)
  const now = new Date()
  const { current, previous } = occupancyWindows(period, wallClock(now, timeZone))

  const [classRows, bookingRows, cancellationRows, firstSeenRows] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, capacity: true, duration: true, isActive: true, schedule: true, createdAt: true },
    }),
    prisma.booking.findMany({
      where: { class: { schoolId }, scheduledAt: { gte: previous.from, lte: current.to } },
      select: { classId: true, userId: true, scheduledAt: true, status: true, attendedAt: true, bookedByRole: true },
    }),
    prisma.classCancellation.findMany({
      where: { class: { schoolId }, date: { gte: previous.from, lte: current.to } },
      select: { classId: true, date: true },
    }),
    // First booking ever on each slot (class × weekday × wall time): empty
    // sessions only count from there, never from today's timetable alone.
    // scheduledAt is a timestamp without zone holding wall time, so EXTRACT
    // and to_char read the slot's weekday and time directly (returned as text
    // so no driver applies a timezone to it).
    prisma.$queryRaw<{ classId: string; dow: number; time: string; first: string }[]>`
      SELECT b."classId", EXTRACT(DOW FROM b."scheduledAt")::int AS dow,
             to_char(b."scheduledAt", 'HH24:MI') AS time,
             to_char(MIN(b."scheduledAt"), 'YYYY-MM-DD"T"HH24:MI:SS') AS first
      FROM bookings b JOIN classes c ON c.id = b."classId"
      WHERE c."schoolId" = ${schoolId} AND b.status <> 'CANCELLED'
      GROUP BY 1, 2, 3`,
  ])

  const occupancy = buildOccupancy({
    classes: classRows.map(c => ({ ...c, schedule: parseSchedule(c.schedule) })),
    bookings: bookingRows.map(b => ({
      classId: b.classId, userId: b.userId, scheduledAt: b.scheduledAt, status: b.status,
      attended: b.attendedAt !== null, bookedByRole: b.bookedByRole,
    })),
    cancellations: cancellationRows.map(c => ({ classId: c.classId, date: c.date.toISOString().slice(0, 10) })),
    period,
    now,
    timeZone,
    slotFirstSeen: Object.fromEntries(firstSeenRows.map(r => [slotKey(r.classId, Number(r.dow), r.time), new Date(`${r.first}Z`)])),
  })

  return NextResponse.json({
    period,
    from: current.from.toISOString().slice(0, 10),
    to: current.to.toISOString().slice(0, 10),
    hasBookings: firstSeenRows.length > 0,
    ...occupancy,
  })
}
