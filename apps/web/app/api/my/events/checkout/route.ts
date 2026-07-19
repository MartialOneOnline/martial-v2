import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { createRevolutOrder } from '@/lib/revolut'
import { checkEventCapacity } from '@/lib/services/eventCapacity'

// POST /api/my/events/checkout — create a checkout session for an event ticket
// (seminars, competitions, etc). Supports Stripe and Revolut, one-time payment only.
export async function POST(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, ticketId, quantity: rawQuantity, provider = 'STRIPE' } = await req.json() as { eventId: string; ticketId: string; quantity?: number; provider?: string }
  if (!eventId || !ticketId) return NextResponse.json({ error: 'eventId and ticketId required' }, { status: 400 })
  const quantity = Math.min(10, Math.max(1, Math.round(rawQuantity ?? 1)))

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, schoolId: true, title: true, isPublished: true, isCancelled: true,
      startAt: true, capacity: true, paymentMethods: true,
      school: { select: { name: true, stripeSecretKey: true, revolutSecretKey: true, revolutWebhookSecret: true } },
    },
  })
  if (!event || !event.isPublished || event.isCancelled || event.startAt <= new Date())
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const useRevolut = provider === 'REVOLUT' || (!event.paymentMethods.includes('STRIPE') && event.paymentMethods.includes('REVOLUT'))

  if (!useRevolut && !event.paymentMethods.includes('STRIPE'))
    return NextResponse.json({ error: 'No online payment method available for this event' }, { status: 400 })
  if (useRevolut && !event.paymentMethods.includes('REVOLUT'))
    return NextResponse.json({ error: 'Revolut not accepted for this event' }, { status: 400 })

  // No SchoolMember requirement here — a brand-new user with no prior relationship
  // to the school can check out directly. The one exception is ARCHIVED (mirrors
  // /api/my/checkout for memberships): staff removed this person for a reason,
  // and the event webhook deliberately won't confirm a booking for them (see the
  // ARCHIVED guard in /api/webhooks/stripe and /api/webhooks/revolut) — so don't
  // take their money for a ticket that will never be honoured. They need to
  // contact the school first. The webhook guard stays in place regardless, as
  // defense-in-depth against being archived between this check and payment.
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

  if (useRevolut && !event.school.revolutSecretKey)
    return NextResponse.json({ error: 'School has not configured Revolut' }, { status: 400 })
  // Webhook must be registered (revolutWebhookSecret set) before we accept payments —
  // otherwise the webhook handler would have to process unsigned notifications.
  if (useRevolut && !event.school.revolutWebhookSecret)
    return NextResponse.json({ error: 'School has not activated Revolut yet — the webhook must be registered first' }, { status: 400 })
  if (!useRevolut && !event.school.stripeSecretKey)
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
        paymentMethod: useRevolut ? 'REVOLUT' : 'STRIPE',
        qrToken: crypto.randomUUID(),
      },
    })
  }).catch((err: Error & { status?: number }) => {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 500 })
  })

  if (booking instanceof NextResponse) return booking

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const metadata = {
    eventBookingId: booking.id,
    schoolId:       event.schoolId,
    userId:         dbUser.id,
    eventId:        event.id,
    ticketId:       ticket.id,
  }

  // ── Revolut path ────────────────────────────────────────────────────────────
  if (useRevolut) {
    const order = await createRevolutOrder({
      secretKey:        event.school.revolutSecretKey!,
      amount:           Math.round(Number(ticket.price) * quantity * 100),
      currency:         ticket.currency ?? 'EUR',
      merchantOrderRef: booking.id,
      description:      `${event.title} — ${ticket.name}`,
      email:            dbUser.email ?? undefined,
      successUrl:       `${origin}/my/events?checkout=success`,
      cancelUrl:        `${origin}/my/events?checkout=cancelled`,
      metadata,
    })

    await prisma.eventBooking.update({
      where: { id: booking.id },
      data:  { revolutOrderId: order.id },
    })

    return NextResponse.json({ url: order.checkout_url })
  }

  // ── Stripe path ─────────────────────────────────────────────────────────────
  const stripe   = getStripe(event.school.stripeSecretKey!)
  const currency = (ticket.currency ?? 'EUR').toLowerCase()

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
