import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { checkEventCapacity } from '@/lib/services/eventCapacity'

// POST /api/my/events/checkout — create a Stripe Checkout Session for an event ticket
// (seminars, competitions, etc). One-time payment only, no subscriptions.
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
    select: { id: true, name: true, email: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { eventId, ticketId, quantity: rawQuantity } = await req.json() as { eventId: string; ticketId: string; quantity?: number }
  if (!eventId || !ticketId) return NextResponse.json({ error: 'eventId and ticketId required' }, { status: 400 })
  const quantity = Math.min(10, Math.max(1, Math.round(rawQuantity ?? 1)))

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, schoolId: true, title: true, isPublished: true, isCancelled: true,
      startAt: true, capacity: true, paymentMethods: true,
      school: { select: { name: true, stripeSecretKey: true } },
    },
  })
  if (!event || !event.isPublished || event.isCancelled || event.startAt <= new Date())
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (!event.paymentMethods.includes('STRIPE'))
    return NextResponse.json({ error: 'Stripe not accepted for this event' }, { status: 400 })

  const ticket = await prisma.eventTicket.findFirst({
    where: { id: ticketId, eventId },
    select: { id: true, name: true, price: true, currency: true, capacity: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  if (!event.school.stripeSecretKey)
    return NextResponse.json({ error: 'School has not configured Stripe' }, { status: 400 })

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
        paymentMethod: 'STRIPE',
      },
    })
  }).catch((err: Error & { status?: number }) => {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  })

  if (booking instanceof NextResponse) return booking

  const stripe   = getStripe(event.school.stripeSecretKey)
  const origin   = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const currency = (ticket.currency ?? 'EUR').toLowerCase()

  const metadata = {
    eventBookingId: booking.id,
    schoolId:       event.schoolId,
    userId:         dbUser.id,
    eventId:        event.id,
    ticketId:       ticket.id,
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: dbUser.email ?? undefined,
    line_items: [{
      price_data: {
        currency,
        unit_amount: Math.round(Number(ticket.price) * 100),
        product_data: {
          name:        `${event.title} — ${ticket.name}`,
          description: `${event.school.name} — event ticket`,
        },
      },
      quantity,
    }],
    metadata,
    success_url: `${origin}/my/events?checkout=success`,
    cancel_url:  `${origin}/my/events?checkout=cancelled`,
  })

  return NextResponse.json({ url: session.url })
}
