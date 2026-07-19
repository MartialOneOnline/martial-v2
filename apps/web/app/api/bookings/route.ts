import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { Prisma } from '@/lib/prisma-client/client'
import { isValidScheduledAt, type ScheduleSlot } from '@/lib/scheduling'
import { type ClassAccessConfig } from '@/lib/services/classAccess'
import { checkBookingEligibility } from '@/lib/services/bookingEligibility'
import { sendTrialConfirmedEmail } from '@/lib/email/sendEmails'

export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { classId, scheduledAt } = body

  if (!classId || !scheduledAt) {
    return NextResponse.json({ error: 'Missing classId or scheduledAt' }, { status: 400 })
  }

  // Validate class exists, is active and published
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      isActive: true,
      isPublished: true,
      schoolId: true,
      capacity: true,
      schedule: true,
      bookingSettings: true,
      school: { select: { name: true, city: true, language: true } },
    },
  })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  if (!cls.isActive) {
    return NextResponse.json({ error: 'Class is not available for booking' }, { status: 400 })
  }

  // Validate scheduledAt is in the future
  const scheduledDate = new Date(scheduledAt)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt date' }, { status: 400 })
  }
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'Scheduled date must be in the future' }, { status: 400 })
  }

  // Validate that scheduledAt matches a real schedule slot (day + time).
  // Uses isValidScheduledAt from lib/scheduling — same logic as the client.
  const schedule = cls.schedule as ScheduleSlot[] | null
  if (schedule && schedule.length > 0) {
    if (!isValidScheduledAt(scheduledDate, schedule)) {
      return NextResponse.json(
        { error: 'Scheduled date does not match class timetable' },
        { status: 400 },
      )
    }
  }

  // Validate user has an active membership or trial at this school
  const activeMembership = await prisma.membership.findFirst({
    where: {
      userId: dbUser.id,
      schoolId: cls.schoolId,
      status: { in: ['ACTIVE'] },
      OR: [{ endDate: null }, { endDate: { gte: scheduledDate } }],
    },
    include: { plan: { select: { classAccess: true } } },
  })
  if (!activeMembership) {
    return NextResponse.json(
      { error: 'No active membership for this school' },
      { status: 403 },
    )
  }

  const classAccess = activeMembership.plan?.classAccess as ClassAccessConfig | null
  const hasRules = !!classAccess &&
    ((classAccess.classRules?.length ?? 0) > 0 || !!classAccess.globalLimit)

  // Use a transaction to prevent race conditions on quota, capacity and
  // duplicate checks. Two Postgres advisory locks (xact-scoped, released
  // automatically at commit/rollback) serialize the checks-then-write below
  // against the two kinds of concurrent request that could otherwise slip
  // past a plain read-then-write:
  //   1. Another booking attempt for this exact class+slot (protects capacity
  //      and the duplicate check across different users).
  //   2. Another booking attempt by this same user, for any class/time at any
  //      school (protects the classAccess weekly/monthly/total quota count
  //      below, which spans multiple slots and can't be scoped to lock #1).
  // Namespaced via a literal first key (1 vs 2) so the two lock kinds can't
  // collide, and always acquired in this same order so no deadlock is
  // possible between concurrent requests taking both locks.
  const booking = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(1, hashtext(${`${classId}:${scheduledDate.toISOString()}`}))`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(2, hashtext(${dbUser.id}))`

    // Duplicate check — the partial unique index on bookings (userId, classId,
    // scheduledAt) WHERE status IN ('PENDING','CONFIRMED') is the ultimate
    // backstop (see prisma/migrations/20260709090000_...), but checking here
    // first gives a clean, expected error instead of relying on the raw
    // constraint violation for the common (non-racing) case.
    const duplicate = await tx.booking.findFirst({
      where: {
        userId: dbUser.id,
        classId,
        scheduledAt: scheduledDate,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    })
    if (duplicate) {
      throw Object.assign(new Error('Already booked for this session'), { code: 'DUPLICATE', status: 409 })
    }

    // Enforce MembershipPlan.classAccess rules (per-class and global booking
    // caps) — counted inside the transaction, after the user-scoped lock, so
    // two concurrent requests from the same user can't both read "1 of 2
    // used" and both proceed.
    let counts = { perWeek: 0, perMonth: 0, total: 0, globalPerWeek: 0, globalPerMonth: 0, globalTotal: 0 }
    if (hasRules) {
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
      startOfWeek.setHours(0, 0, 0, 0)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [perWeek, perMonth, total, globalPerWeek, globalPerMonth, globalTotal] = await Promise.all([
        tx.booking.count({
          where: { userId: dbUser.id, classId, scheduledAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
        }),
        tx.booking.count({
          where: { userId: dbUser.id, classId, scheduledAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        }),
        tx.booking.count({
          where: { userId: dbUser.id, classId, scheduledAt: { gte: activeMembership.startDate }, status: { not: 'CANCELLED' } },
        }),
        tx.booking.count({
          where: { userId: dbUser.id, class: { schoolId: cls.schoolId }, scheduledAt: { gte: startOfWeek }, status: { not: 'CANCELLED' } },
        }),
        tx.booking.count({
          where: { userId: dbUser.id, class: { schoolId: cls.schoolId }, scheduledAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        }),
        tx.booking.count({
          where: { membershipId: activeMembership.id, status: { not: 'CANCELLED' } },
        }),
      ])
      counts = { perWeek, perMonth, total, globalPerWeek, globalPerMonth, globalTotal }
    }

    // Capacity check — counted inside the transaction, after the slot lock,
    // so two concurrent requests for the last seat can't both pass.
    const bookedCount = cls.capacity !== null
      ? await tx.booking.count({
          where: { classId, scheduledAt: scheduledDate, status: { in: ['CONFIRMED', 'PENDING'] } },
        })
      : 0

    const eligibility = checkBookingEligibility({
      scheduledAt: scheduledDate,
      classId,
      capacity: cls.capacity,
      bookedCount,
      membership: {
        id: activeMembership.id,
        startDate: activeMembership.startDate,
        endDate: activeMembership.endDate,
        classAccess,
      },
      counts,
    })
    if (!eligibility.allowed) {
      // FULL is a conflict over a contested, racy resource (the seat) — 409,
      // same family as the duplicate-booking check above. Every other reason
      // (no membership, expired, classAccess) is a permission/eligibility
      // problem — 403.
      const status = eligibility.code === 'FULL' ? 409 : 403
      throw Object.assign(new Error(eligibility.reason ?? 'Booking not allowed'), { code: eligibility.code ?? 'NOT_ELIGIBLE', status })
    }

    // Create booking — always link to the active membership so consumption is trackable
    return tx.booking.create({
      data: {
        userId: dbUser.id,
        classId,
        scheduledAt: scheduledDate,
        status: 'CONFIRMED',
        paymentMethod: 'CASH',
        amountPaid: 0,
        currency: 'EUR',
        membershipId: activeMembership.id,
      },
    })
  }).catch((err: Error & { status?: number }) => {
    // Belt-and-suspenders: if the app-level duplicate check above still lost
    // a race (e.g. against a booking created outside this route, which
    // doesn't take the advisory locks), the partial unique index rejects the
    // insert at the DB level — surface that the same way as the app-level check.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Already booked for this session' }, { status: 409 })
    }
    const status = err.status ?? 500
    return NextResponse.json({ error: err.message }, { status })
  })

  if (booking instanceof NextResponse) return booking

  // Send trial confirmed email when the active membership is a free trial
  const isTrial = activeMembership.price === 0 || activeMembership.planName.toLowerCase().includes('trial')
  if (isTrial && cls.school && dbUser.email) {
    sendTrialConfirmedEmail({
      to: dbUser.email,
      studentName: dbUser.name,
      schoolName: cls.school.name,
      schoolCity: cls.school.city,
      className: cls.name,
      scheduledAt: scheduledDate,
      lang: cls.school.language,
    }).catch(err => console.error('[bookings] trial email failed:', err))
  }

  return NextResponse.json({ success: true, bookingId: booking.id })
}
