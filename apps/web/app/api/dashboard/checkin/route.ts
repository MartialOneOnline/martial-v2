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
    select: { id: true, name: true },
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

  // Find existing booking for this student on this date
  let booking = await prisma.booking.findFirst({
    where: {
      classId,
      userId,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      status: { notIn: ['CANCELLED'] },
    },
    select: { id: true, status: true, attendedAt: true },
  })

  const alreadyCheckedIn = booking?.status === 'COMPLETED'

  if (alreadyCheckedIn) {
    return NextResponse.json({
      studentName: student.name ?? student.email,
      alreadyCheckedIn: true,
    })
  }

  if (booking) {
    // Mark existing booking as attended
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'COMPLETED', attendedAt: new Date() },
    })
  } else {
    // Walk-in: create booking and mark attended immediately
    try {
      booking = await prisma.booking.create({
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
        select: { id: true, status: true, attendedAt: true },
      })
    } catch (err) {
      // Backstop against a concurrent duplicate check-in for the same
      // student+class+slot — see the partial unique index migration
      // referenced in classes/[id]/bookings/route.ts.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return NextResponse.json({ error: 'Already booked for this session' }, { status: 409 })
      }
      throw err
    }
  }

  return NextResponse.json({
    studentName: student.name ?? student.email,
    alreadyCheckedIn: false,
  })
}
