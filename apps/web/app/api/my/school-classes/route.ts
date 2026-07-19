import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { nextOccurrence, type ScheduleSlot } from '@/lib/scheduling'
import type { ClassAccessConfig, BookingCounts } from '@/lib/services/classAccess'
import { checkBookingEligibility, type EligibleMembership } from '@/lib/services/bookingEligibility'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

const EMPTY_COUNTS: BookingCounts = {
  perWeek: 0, perMonth: 0, total: 0, globalPerWeek: 0, globalPerMonth: 0, globalTotal: 0,
}

function hasClassAccessRules(classAccess: ClassAccessConfig | null): boolean {
  return !!classAccess && ((classAccess.classRules?.length ?? 0) > 0 || !!classAccess.globalLimit)
}

// Returns upcoming class occurrences for the schools the user belongs to (any
// SchoolMember status, so a LEAD awaiting payment approval can still see the
// timetable). Each occurrence carries canBook computed via the same
// eligibility rules POST /api/bookings enforces (membership coverage,
// classAccess quotas, capacity) — see lib/services/bookingEligibility.ts —
// so this list can't drift from what actually books successfully.
// Each occurrence is one schedulable slot in the next 14 days.
export async function GET() {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // A student in 2+ schools would otherwise see every school's timetable
  // merged into one list of occurrences — see getActiveStudentContext().
  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  if (studentContext.kind === 'none' && (await hasDashboardAccess(dbUser.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Single active student school when resolved; otherwise every school the
  // user belongs to at all (LEAD/ACTIVE/FROZEN) — matches the 'none' fallback
  // used elsewhere in this endpoint (only reachable for a user with zero real
  // STUDENT memberships anywhere, so this naturally comes back empty too).
  let schoolIds: string[]
  if (studentContext.kind === 'ok') {
    schoolIds = [studentContext.schoolId]
  } else {
    const schoolMembers = await prisma.schoolMember.findMany({
      where: { userId: dbUser.id, status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] } },
      select: { schoolId: true },
    })
    schoolIds = [...new Set(schoolMembers.map(sm => sm.schoolId))]
  }

  if (schoolIds.length === 0) return NextResponse.json({ occurrences: [] })

  // Active memberships per school — determines what's bookable and under what
  // rules. Deliberately not filtered by endDate here (unlike the old
  // bookableSchoolIds set): each occurrence checks endDate against its own
  // scheduledAt below, since a membership can be active today but expire
  // before a session 10 days out.
  const activeMemberships = await prisma.membership.findMany({
    where: { userId: dbUser.id, schoolId: { in: schoolIds }, status: 'ACTIVE' },
    include: { plan: { select: { classAccess: true } } },
  })
  // A school could in principle have more than one ACTIVE membership row —
  // prefer the one that covers furthest into the future (null = unlimited).
  const membershipBySchool = new Map<string, EligibleMembership>()
  for (const m of activeMemberships) {
    const candidate: EligibleMembership = {
      id: m.id,
      startDate: m.startDate,
      endDate: m.endDate,
      classAccess: (m.plan?.classAccess as ClassAccessConfig | null) ?? null,
    }
    const existing = membershipBySchool.get(m.schoolId)
    if (!existing || (existing.endDate !== null && (candidate.endDate === null || candidate.endDate > existing.endDate))) {
      membershipBySchool.set(m.schoolId, candidate)
    }
  }

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

  // classAccess quota usage is computed once per classId (not per occurrence)
  // — the weekly/monthly/total window is anchored to "now", not to the
  // occurrence being evaluated, so every occurrence of the same class shares
  // the same counts. Only computed for classes whose membership plan
  // actually has rules, to avoid needless queries for the common unrestricted case.
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  startOfWeek.setHours(0, 0, 0, 0)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const countsByClassId = new Map<string, BookingCounts>()
  for (const cls of classes) {
    const membership = membershipBySchool.get(cls.schoolId)
    if (!membership || !hasClassAccessRules(membership.classAccess)) continue

    const [perWeek, perMonth, total, globalPerWeek, globalPerMonth, globalTotal] = await Promise.all([
      prisma.booking.count({
        where: { userId: dbUser.id, classId: cls.id, scheduledAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
      }),
      prisma.booking.count({
        where: { userId: dbUser.id, classId: cls.id, scheduledAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      }),
      prisma.booking.count({
        where: { userId: dbUser.id, classId: cls.id, scheduledAt: { gte: membership.startDate }, status: { not: 'CANCELLED' } },
      }),
      prisma.booking.count({
        where: { userId: dbUser.id, class: { schoolId: cls.schoolId }, scheduledAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
      }),
      prisma.booking.count({
        where: { userId: dbUser.id, class: { schoolId: cls.schoolId }, scheduledAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
      }),
      prisma.booking.count({
        where: { membershipId: membership.id, status: { not: 'CANCELLED' } },
      }),
    ])
    countsByClassId.set(cls.id, { perWeek, perMonth, total, globalPerWeek, globalPerMonth, globalTotal })
  }

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

    const membership = membershipBySchool.get(cls.schoolId) ?? null
    const counts = countsByClassId.get(cls.id) ?? EMPTY_COUNTS

    for (const slot of schedule) {
      // Generate all occurrences for this slot in the next 14 days
      let cursor = nextOccurrence(now, slot.dayOfWeek, slot.startTime)
      while (cursor <= cutoff) {
        const key = `${cls.id}:${cursor.toISOString()}`
        const bookedCount = capacityMap.get(key) ?? 0
        const eligibility = checkBookingEligibility({
          scheduledAt: cursor,
          classId: cls.id,
          capacity: cls.capacity,
          bookedCount,
          membership,
          counts,
        })
        const alreadyBooked = bookedSet.has(key)
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
          booked: bookedCount,
          alreadyBooked,
          // Eligible AND not already booked — POST /api/bookings remains the
          // final authority (it re-validates everything transactionally),
          // this only drives whether the client shows a "Book" button.
          canBook: eligibility.allowed && !alreadyBooked,
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
