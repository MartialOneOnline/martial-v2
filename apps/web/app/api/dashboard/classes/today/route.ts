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

  const todayDow = new Date().getDay() // 0=Sun

  const classes = await prisma.class.findMany({
    where: { schoolId, isActive: true },
    include: {
      instructor: { select: { name: true, photoUrl: true } },
      bookings: {
        where: {
          scheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
          status: { not: 'CANCELLED' },
        },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Filter to classes that run today
  const todayClasses = classes
    .filter(cls => {
      if (!cls.schedule) return false
      const schedule = cls.schedule as { dayOfWeek: number; startTime: string }[]
      return Array.isArray(schedule) && schedule.some(s => s.dayOfWeek === todayDow)
    })
    .map(cls => {
      const schedule = cls.schedule as { dayOfWeek: number; startTime: string; endTime?: string }[]
      const todaySlot = schedule.find(s => s.dayOfWeek === todayDow)
      const booked = cls.bookings.length
      const cap = cls.capacity ?? 99
      return {
        id: cls.id,
        name: cls.name,
        time: todaySlot
          ? `${todaySlot.startTime}${todaySlot.endTime ? `–${todaySlot.endTime}` : ''}`
          : '',
        enrolled: booked,
        cap,
        status: booked >= cap ? 'Full' : 'Open',
        instructor: cls.instructor?.name ?? null,
        level: cls.level ?? null,
        image: cls.coverUrl ?? null,
      }
    })
    .sort((a, b) => a.time.localeCompare(b.time))

  return NextResponse.json({ classes: todayClasses })
}
