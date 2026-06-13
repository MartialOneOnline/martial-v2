import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { isValidScheduledAt, type ScheduleSlot } from '@/lib/scheduling'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { classId, scheduledAt } = body

  if (!classId || !scheduledAt) {
    return NextResponse.json({ error: 'Missing classId or scheduledAt' }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: user.id } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Validate class exists, is active and published
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      isActive: true,
      isPublished: true,
      schoolId: true,
      capacity: true,
      schedule: true,
      bookingSettings: true,
    },
  })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  if (!cls.isActive || !cls.isPublished) {
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
  })
  if (!activeMembership) {
    return NextResponse.json(
      { error: 'No active membership for this school' },
      { status: 403 },
    )
  }

  // Use a transaction to prevent race conditions on capacity and duplicate checks.
  // Both checks AND the insert happen atomically so concurrent requests can't
  // both pass the capacity gate and double-book the same slot.
  const booking = await prisma.$transaction(async (tx) => {
    // 1. Duplicate check inside transaction
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

    // 2. Capacity check inside transaction
    if (cls.capacity !== null) {
      const bookedCount = await tx.booking.count({
        where: {
          classId,
          scheduledAt: scheduledDate,
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
      })
      if (bookedCount >= cls.capacity) {
        throw Object.assign(new Error('Class is full'), { code: 'FULL', status: 409 })
      }
    }

    // 3. Create booking
    return tx.booking.create({
      data: {
        userId: dbUser.id,
        classId,
        scheduledAt: scheduledDate,
        status: 'CONFIRMED',
        paymentMethod: 'CASH',
        amountPaid: 0,
        currency: 'EUR',
      },
    })
  }).catch((err: Error & { status?: number }) => {
    const status = err.status ?? 500
    return NextResponse.json({ error: err.message }, { status })
  })

  if (booking instanceof NextResponse) return booking

  return NextResponse.json({ success: true, bookingId: booking.id })
}
