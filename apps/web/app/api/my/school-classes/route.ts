import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { nextOccurrence, type ScheduleSlot } from '@/lib/scheduling'

// Returns upcoming class occurrences for the schools the user belongs to (any
// SchoolMember status, so a LEAD awaiting payment approval can still see the
// timetable). Each occurrence carries canBook — true only for schools where the
// user has an active membership — so the client can show classes read-only and
// prompt for membership activation instead of booking.
// Each occurrence is one schedulable slot in the next 14 days.
export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Schools the user belongs to at all (LEAD/ACTIVE/FROZEN) — determines what's visible.
  const schoolMembers = await prisma.schoolMember.findMany({
    where: { userId: dbUser.id, status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] } },
    select: { schoolId: true },
  })
  const schoolIds = [...new Set(schoolMembers.map(sm => sm.schoolId))]

  if (schoolIds.length === 0) return NextResponse.json({ occurrences: [] })

  // Schools with an active membership — determines what's bookable.
  const activeMemberships = await prisma.membership.findMany({
    where: {
      userId: dbUser.id,
      status: 'ACTIVE',
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    select: { schoolId: true },
  })
  const bookableSchoolIds = new Set(activeMemberships.map(m => m.schoolId))

  const classes = await prisma.class.findMany({
    where: { schoolId: { in: schoolIds }, isActive: true },
    select: {
      id: true,
      name: true,
      duration: true,
      level: true,
      capacity: true,
      schedule: true,
      coverUrl: true,
      schoolId: true,
      school: { select: { name: true, slug: true, logoUrl: true, city: true } },
      instructor: { select: { name: true, photoUrl: true } },
    },
  })

  const now = new Date()
  const cutoff = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  // For each class, generate all occurrences in the next 14 days
  const occurrences: {
    classId: string
    className: string
    scheduledAt: string
    duration: number | null
    level: string | null
    capacity: number | null
    coverUrl: string | null
    school: { name: string; slug: string; logoUrl: string | null; city: string | null }
    instructor: { name: string; photoUrl: string | null } | null
    booked: number
    alreadyBooked: boolean
    canBook: boolean
  }[] = []

  // Get user's existing bookings for these classes in the window
  const existingBookings = await prisma.booking.findMany({
    where: {
      userId: dbUser.id,
      classId: { in: classes.map(c => c.id) },
      scheduledAt: { gte: now, lte: cutoff },
      status: { not: 'CANCELLED' },
    },
    select: { classId: true, scheduledAt: true },
  })

  // Get capacity usage per (classId, scheduledAt)
  const capacityBookings = await prisma.booking.findMany({
    where: {
      classId: { in: classes.map(c => c.id) },
      scheduledAt: { gte: now, lte: cutoff },
      status: { not: 'CANCELLED' },
    },
    select: { classId: true, scheduledAt: true },
  })
  const capacityMap = new Map<string, number>()
  for (const b of capacityBookings) {
    const key = `${b.classId}:${b.scheduledAt.toISOString()}`
    capacityMap.set(key, (capacityMap.get(key) ?? 0) + 1)
  }

  const bookedSet = new Set(existingBookings.map(b => `${b.classId}:${b.scheduledAt.toISOString()}`))

  for (const cls of classes) {
    const schedule = cls.schedule as ScheduleSlot[] | null
    if (!schedule || schedule.length === 0) continue

    for (const slot of schedule) {
      // Generate all occurrences for this slot in the next 14 days
      let cursor = nextOccurrence(now, slot.dayOfWeek, slot.startTime)
      while (cursor <= cutoff) {
        const key = `${cls.id}:${cursor.toISOString()}`
        occurrences.push({
          classId: cls.id,
          className: cls.name,
          scheduledAt: cursor.toISOString(),
          duration: cls.duration,
          level: cls.level,
          capacity: cls.capacity,
          coverUrl: cls.coverUrl,
          school: cls.school,
          instructor: cls.instructor,
          booked: capacityMap.get(key) ?? 0,
          alreadyBooked: bookedSet.has(key),
          canBook: bookableSchoolIds.has(cls.schoolId),
        })
        // Next week same slot
        const next = new Date(cursor)
        next.setUTCDate(next.getUTCDate() + 7)
        cursor = next
      }
    }
  }

  occurrences.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  return NextResponse.json({ occurrences })
}
