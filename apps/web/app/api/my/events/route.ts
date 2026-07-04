import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

// Returns upcoming published events (seminars, competitions, etc.) at the schools
// where the user has an active membership, plus the user's own event bookings.
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

  const myBookings = await prisma.eventBooking.findMany({
    where: { userId: dbUser.id },
    select: {
      id: true,
      quantity: true,
      status: true,
      amountPaid: true,
      currency: true,
      ticketName: true,
      createdAt: true,
      event: { select: { id: true, title: true, startAt: true, location: true, coverUrl: true, school: { select: { name: true, slug: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get user's active membership school IDs
  const memberships = await prisma.membership.findMany({
    where: {
      userId: dbUser.id,
      status: 'ACTIVE',
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    select: { schoolId: true },
  })
  const schoolIds = [...new Set(memberships.map(m => m.schoolId))]

  if (schoolIds.length === 0) return NextResponse.json({ events: [], myBookings })

  const events = await prisma.event.findMany({
    where: {
      schoolId: { in: schoolIds },
      isPublished: true,
      isCancelled: false,
      startAt: { gte: new Date() },
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      location: true,
      startAt: true,
      endAt: true,
      capacity: true,
      coverUrl: true,
      paymentMethods: true,
      school: { select: { name: true, slug: true, logoUrl: true, city: true } },
      instructor: { select: { name: true, photoUrl: true } },
      tickets: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, name: true, description: true, price: true, currency: true, capacity: true },
      },
    },
    orderBy: { startAt: 'asc' },
  })

  const bookedByTicket = await prisma.eventBooking.groupBy({
    by: ['ticketId'],
    where: { eventId: { in: events.map(e => e.id) }, status: { in: ['PENDING', 'CONFIRMED'] } },
    _sum: { quantity: true },
  })
  const bookedMap = new Map(bookedByTicket.map(b => [b.ticketId, b._sum.quantity ?? 0]))

  const bookedByEvent = await prisma.eventBooking.groupBy({
    by: ['eventId'],
    where: { eventId: { in: events.map(e => e.id) }, status: { in: ['PENDING', 'CONFIRMED'] } },
    _sum: { quantity: true },
  })
  const bookedEventMap = new Map(bookedByEvent.map(b => [b.eventId, b._sum.quantity ?? 0]))

  const result = events.map(e => ({
    ...e,
    booked: bookedEventMap.get(e.id) ?? 0,
    tickets: e.tickets.map(t => ({ ...t, booked: bookedMap.get(t.id) ?? 0 })),
  }))

  return NextResponse.json({ events: result, myBookings })
}
