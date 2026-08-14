import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'

// Day of week: 0=Sun, 1=Mon ... 6=Sat
// Prisma schedule JSON: [{ dayOfWeek: 1, startTime: "18:00", endTime: "19:30" }]

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  // requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
  // requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT
  // must not read today's class roster/booking counts for the school.
  try {
    await requireDashboardAccess(schoolId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Optional ?date=YYYY-MM-DD to look up a day other than today (e.g. the
  // dashboard's day-strip / calendar picker). Falls back to today.
  const dateParam = searchParams.get('date')
  const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()
  const targetDow = targetDate.getDay() // 0=Sun

  const dayStart = new Date(targetDate); dayStart.setHours(0, 0, 0, 0)
  const dayEnd   = new Date(targetDate); dayEnd.setHours(23, 59, 59, 999)

  // Occurrence-level cancellations for this date, keyed the same
  // UTC-midnight way as cancel-occurrence/route.ts — independent of
  // dayStart/dayEnd above, which stay in server-local time for the booking
  // count query.
  const dateKey = dateParam ?? new Date().toISOString().slice(0, 10)
  const occurrenceDate = new Date(`${dateKey}T00:00:00.000Z`)
  const cancellations = await prisma.classCancellation.findMany({
    where: { class: { schoolId }, date: occurrenceDate },
    select: { classId: true },
  })
  const cancelledClassIds = new Set(cancellations.map(c => c.classId))

  const classes = await prisma.class.findMany({
    where: { schoolId, isActive: true },
    include: {
      instructor: { select: { name: true, photoUrl: true } },
      bookings: {
        where: {
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { not: 'CANCELLED' },
        },
        select: { id: true, scheduledAt: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Expand to one row per schedule slot that runs on the target day — a
  // class can have multiple slots on the same day-of-week (e.g. a 10:00 and
  // a 20:00 NOGI session), and each must surface as its own row instead of
  // collapsing onto a single slot.
  const todayClasses = classes
    .flatMap(cls => {
      if (!cls.schedule) return []
      const schedule = cls.schedule as { dayOfWeek: number; startTime: string; endTime?: string }[]
      if (!Array.isArray(schedule)) return []

      const cap = cls.capacity ?? 99
      return schedule
        .filter(s => s.dayOfWeek === targetDow)
        .map(slot => {
          const [sh, sm] = slot.startTime.split(':').map(Number)
          const booked = cls.bookings.filter(b => {
            const at = b.scheduledAt
            return at.getUTCHours() === (sh ?? 0) && at.getUTCMinutes() === (sm ?? 0)
          }).length
          return {
            id: cls.id,
            name: cls.name,
            time: `${slot.startTime}${slot.endTime ? `–${slot.endTime}` : ''}`,
            enrolled: booked,
            cap,
            status: cancelledClassIds.has(cls.id) ? 'Cancelled' : booked >= cap ? 'Full' : 'Open',
            instructor: cls.instructor?.name ?? null,
            level: cls.level ?? null,
            image: cls.coverUrl ?? null,
          }
        })
    })
    .sort((a, b) => a.time.localeCompare(b.time))

  return NextResponse.json({ classes: todayClasses })
}
