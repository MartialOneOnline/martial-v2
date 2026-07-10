import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Prisma } from '@/lib/prisma-client/client'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// POST /api/dashboard/checkin
// Body: { classId, userId, date }  (date = YYYY-MM-DD local)
// Finds the booking for userId+classId+date.
// If found → marks attended (COMPLETED + attendedAt).
// If not found → creates walk-in booking + marks attended immediately.
// Idempotent: already-COMPLETED returns 200 with alreadyCheckedIn=true.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json().catch(() => ({}))
  const { classId, userId, date } = body as { classId?: string; userId?: string; date?: string }

  if (!classId || !userId || !date)
    return NextResponse.json({ error: 'classId, userId and date are required' }, { status: 400 })

  // Verify class belongs to this school
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, capacity: true },
  })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  // Verify student is a member of this school
  const student = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolMembers: { some: { schoolId } },
    },
    select: { id: true, name: true, email: true },
  })
  if (!student) return NextResponse.json({ error: 'Student not found in this school' }, { status: 404 })

  const base = new Date(date + 'T12:00:00')
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  // The partial unique index on bookings (see
  // prisma/migrations/20260709090000_bookings_active_slot_unique_index) only
  // covers status IN (PENDING, CONFIRMED) — a walk-in here is inserted
  // directly as COMPLETED, so that index gives no protection against two
  // concurrent check-ins for the same student+class+day both racing past the
  // "no booking found" read and both creating a row. An advisory lock scoped
  // to (classId, userId, date) serializes the whole find→create/update below
  // per requester, so the second racer always observes the first one's write
  // and takes the idempotent "already checked in" path instead of inserting
  // a duplicate. Namespace 3, distinct from the slot lock (1) and per-user
  // quota lock (2) in app/api/bookings/route.ts.
  let result: { alreadyCheckedIn: boolean; atCapacity: boolean }
  try {
    result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(3, hashtext(${`${classId}:${userId}:${date}`}))`

      const booking = await tx.booking.findFirst({
        where: {
          classId,
          userId,
          scheduledAt: { gte: startOfDay, lt: endOfDay },
          status: { notIn: ['CANCELLED'] },
        },
        select: { id: true, status: true, attendedAt: true },
      })

      let alreadyCheckedIn = false
      if (booking?.status === 'COMPLETED') {
        alreadyCheckedIn = true
      } else if (booking) {
        // Mark existing booking as attended
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: 'COMPLETED', attendedAt: new Date() },
        })
      } else {
        // Walk-in: create booking and mark attended immediately. Never
        // blocked by capacity — the student is already physically present,
        // unlike a booking made ahead of time — see atCapacity below, which
        // only surfaces the state for a non-blocking UI notice.
        await tx.booking.create({
          data: {
            classId,
            userId,
            scheduledAt: base,
            status: 'COMPLETED',
            attendedAt: new Date(),
            paymentMethod: 'CASH',
            amountPaid: 0,
            currency: 'EUR',
          },
        })
      }

      // Informational only — computed after the write so it reflects the
      // check-in that just happened. Same "active for this class today"
      // definition as the duplicate check above (CANCELLED excluded).
      let atCapacity = false
      if (cls.capacity !== null) {
        const activeCount = await tx.booking.count({
          where: { classId, scheduledAt: { gte: startOfDay, lt: endOfDay }, status: { notIn: ['CANCELLED'] } },
        })
        atCapacity = activeCount >= cls.capacity
      }

      return { alreadyCheckedIn, atCapacity }
    })
  } catch (err) {
    // Defense in depth: any unexpected unique-constraint violation still
    // maps to a clean 409 instead of a 500, even though the advisory lock
    // above is what actually prevents the walk-in race in practice.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Already booked for this session' }, { status: 409 })
    }
    throw err
  }

  return NextResponse.json({
    studentName: student.name ?? student.email,
    alreadyCheckedIn: result.alreadyCheckedIn,
    atCapacity: result.atCapacity,
  })
}
