import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

// Returns upcoming published events (seminars, competitions, etc.) at the
// student's active school, plus the user's own event bookings at that school.
// Event ticket purchase isn't gated on membership status, so LEAD members awaiting
// payment approval can see and book events same as active members.
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
    select: { id: true, name: true, email: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A student in 2+ schools would otherwise see every school's events and
  // event-bookings mixed together — see getActiveStudentContext().
  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  if (studentContext.kind === 'none' && (await hasDashboardAccess(dbUser.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const schoolId = studentContext.kind === 'ok' ? studentContext.schoolId : undefined

  const buyerName = dbUser.name ?? dbUser.email

  const myBookingsRaw = await prisma.eventBooking.findMany({
    where: { userId: dbUser.id, ...(schoolId && { event: { schoolId } }) },
    select: {
      id: true,
      quantity: true,
      status: true,
      amountPaid: true,
      currency: true,
      ticketName: true,
      paymentMethod: true,
      createdAt: true,
      qrToken: true,
      checkedIn: true,
      checkedInAt: true,
      event: { select: { id: true, title: true, startAt: true, location: true, coverUrl: true, school: { select: { name: true, slug: true, phone: true, email: true, website: true, instagram: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
  const myBookings = myBookingsRaw.map(b => ({ ...b, buyerName }))

  // Schools to list published events for: the single active student school
  // when resolved, otherwise every school the user belongs to (LEAD/ACTIVE/
  // FROZEN) — matches the 'none' fallback used elsewhere in this endpoint.
  let schoolIds: string[]
  if (schoolId) {
    schoolIds = [schoolId]
  } else {
    const schoolMembers = await prisma.schoolMember.findMany({
      where: { userId: dbUser.id, status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] } },
      select: { schoolId: true },
    })
    schoolIds = [...new Set(schoolMembers.map(sm => sm.schoolId))]
  }

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
