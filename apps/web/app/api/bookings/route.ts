import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

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

  // Validate the day of week matches the class schedule
  const dayOfWeek = scheduledDate.getDay() // 0=Sun … 6=Sat
  const schedule = cls.schedule as { dayOfWeek: number; startTime: string; endTime: string }[] | null
  if (schedule && schedule.length > 0) {
    const matchingSlot = schedule.find((s) => s.dayOfWeek === dayOfWeek)
    if (!matchingSlot) {
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

  // Check capacity (count confirmed/pending bookings for this class on this date)
  if (cls.capacity !== null) {
    const bookedCount = await prisma.booking.count({
      where: {
        classId,
        scheduledAt: scheduledDate,
        status: { in: ['CONFIRMED', 'PENDING'] },
      },
    })
    if (bookedCount >= cls.capacity) {
      return NextResponse.json({ error: 'Class is full' }, { status: 409 })
    }
  }

  // Prevent duplicate booking
  const duplicate = await prisma.booking.findFirst({
    where: {
      userId: dbUser.id,
      classId,
      scheduledAt: scheduledDate,
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
  })
  if (duplicate) {
    return NextResponse.json({ error: 'Already booked for this session' }, { status: 409 })
  }

  const booking = await prisma.booking.create({
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

  return NextResponse.json({ success: true, bookingId: booking.id })
}
