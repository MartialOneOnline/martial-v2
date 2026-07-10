import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { checkEventCapacity } from '@/lib/services/eventCapacity'

// POST /api/my/events/reserve — reserve an event ticket to pay in cash at the door.
// No redirect: the booking is created directly as PENDING until an admin marks it paid.
export async function POST(req: NextRequest) {
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

  const { eventId, ticketId, quantity: rawQuantity } = await req.json() as { eventId: string; ticketId: string; quantity?: number }
  if (!eventId || !ticketId) return NextResponse.json({ error: 'eventId and ticketId required' }, { status: 400 })
  const quantity = Math.min(10, Math.max(1, Math.round(rawQuantity ?? 1)))

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, schoolId: true, isPublished: true, isCancelled: true, startAt: true, capacity: true, paymentMethods: true,
    },
  })
  if (!event || !event.isPublished || event.isCancelled || event.startAt <= new Date())
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (!event.paymentMethods.includes('CASH'))
    return NextResponse.json({ error: 'Cash is not accepted for this event' }, { status: 400 })

  // Mirrors the ARCHIVED guard in /api/my/events/checkout and /api/my/checkout —
  // this reservation still creates a PENDING EventBooking (holding a capacity
  // slot) for an admin to later mark paid, so an ARCHIVED member must not be
  // able to reserve one either.
  const archivedMember = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: event.schoolId, status: 'ARCHIVED' },
    select: { id: true },
  })
  if (archivedMember) {
    return NextResponse.json(
      { error: 'Your membership at this school was archived — please contact the school before booking this event' },
      { status: 403 },
    )
  }

  const ticket = await prisma.eventTicket.findFirst({
    where: { id: ticketId, eventId },
    select: { id: true, name: true, price: true, currency: true, capacity: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  const booking = await prisma.$transaction(async (tx) => {
    const capacity = await checkEventCapacity(tx, {
      eventId, ticketId, ticketCapacity: ticket.capacity, eventCapacity: event.capacity, quantity,
    })
    if (!capacity.ok) throw Object.assign(new Error(capacity.reason), { status: 409 })

    return tx.eventBooking.create({
      data: {
        eventId,
        ticketId,
        userId: dbUser.id,
        ticketName: ticket.name,
        quantity,
        status: 'PENDING',
        amountPaid: ticket.price * quantity,
        currency: ticket.currency,
        paymentMethod: 'CASH',
        qrToken: crypto.randomUUID(),
      },
    })
  }).catch((err: Error & { status?: number }) => {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  })

  if (booking instanceof NextResponse) return booking

  return NextResponse.json({ success: true, bookingId: booking.id })
}
