import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRevolutOrder, refundRevolutOrder } from '@/lib/revolut'
import { MembershipStatus } from '@/lib/prisma-client/client'
import { sendMembershipReceiptEmail, sendEventTicketConfirmationEmail, sendEventTicketRefundedEmail } from '@/lib/email/sendEmails'
import { checkEventCapacity } from '@/lib/services/eventCapacity'

// POST /api/webhooks/revolut
// Each school registers this URL in their Revolut Merchant dashboard.
// We extract the schoolId from the order's merchant_order_ext_ref (= membershipId or eventBookingId),
// load the school's revolutSecretKey, then act.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  let payload: { event: string; order_id: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const HANDLED = new Set(['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED'])
  if (!HANDLED.has(payload.event)) return NextResponse.json({ received: true })

  // Revolut uses IP allowlisting for webhook security (not HMAC signatures).
  // Production IPs: 35.246.21.235, 34.89.70.170
  // No signature verification needed — rely on Vercel edge + IP allowlist.

  const membership = await prisma.membership.findFirst({
    where: { revolutOrderId: payload.order_id },
    select: {
      id: true, userId: true, schoolId: true, status: true,
      plan: { select: { validityDays: true } },
      school: { select: { revolutSecretKey: true, name: true, city: true, language: true } },
    },
  })

  if (membership) {
    const { school } = membership
    if (!school?.revolutSecretKey)
      return NextResponse.json({ error: 'School Revolut not configured' }, { status: 400 })

    if (payload.event === 'ORDER_COMPLETED') {
      if (membership.status !== 'PENDING') return NextResponse.json({ received: true })

      const order = await getRevolutOrder(school.revolutSecretKey, payload.order_id)
      if (order.state !== 'COMPLETED') return NextResponse.json({ received: true })

      const endDate = membership.plan?.validityDays
        ? new Date(Date.now() + membership.plan.validityDays * 86_400_000)
        : undefined

      await prisma.$transaction(async (tx) => {
        await tx.membership.update({
          where: { id: membership.id },
          data: {
            status:    MembershipStatus.ACTIVE,
            startDate: new Date(),
            ...(endDate && { endDate }),
          },
        })
        await tx.schoolMember.updateMany({
          where: { userId: membership.userId, schoolId: membership.schoolId },
          data:  { status: 'ACTIVE' },
        })
      })

      // Send receipt email (fire-and-forget)
      prisma.membership.findUnique({
        where: { id: membership.id },
        select: {
          planName: true, price: true, currency: true, startDate: true, endDate: true,
          user:   { select: { email: true, name: true } },
          school: { select: { name: true, city: true, language: true } },
        },
      }).then(m => {
        if (!m?.user?.email) return
        sendMembershipReceiptEmail({
          to:            m.user.email,
          studentName:   m.user.name,
          schoolName:    m.school.name,
          schoolCity:    m.school.city,
          planName:      m.planName,
          amount:        Number(m.price),
          currency:      m.currency,
          paymentMethod: 'REVOLUT',
          startDate:     m.startDate,
          endDate:       m.endDate,
          membershipId:  membership.id,
          lang:          m.school.language,
        })
      }).catch(err => console.error('[revolut webhook] receipt email failed:', err))
    }

    if (payload.event === 'ORDER_PAYMENT_DECLINED' || payload.event === 'ORDER_PAYMENT_FAILED') {
      await prisma.membership.update({
        where: { id: membership.id },
        data:  { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
      })
    }

    return NextResponse.json({ received: true })
  }

  // ── Event ticket order ──────────────────────────────────────────────────────
  const eventBookingId = payload.order_id // resolved below via revolutOrderId lookup
  const eventBooking = await prisma.eventBooking.findFirst({
    where: { revolutOrderId: eventBookingId },
    select: {
      id: true, status: true, quantity: true, ticketId: true, eventId: true, ticketName: true, amountPaid: true, currency: true,
      event: { select: { title: true, startAt: true, location: true, capacity: true, schoolId: true, school: { select: { revolutSecretKey: true, name: true, city: true, language: true } } } },
      ticket: { select: { capacity: true } },
      user: { select: { email: true, name: true } },
    },
  })

  if (!eventBooking) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const revolutSecretKey = eventBooking.event.school.revolutSecretKey
  if (!revolutSecretKey)
    return NextResponse.json({ error: 'School Revolut not configured' }, { status: 400 })

  if (payload.event === 'ORDER_COMPLETED') {
    if (eventBooking.status !== 'PENDING') return NextResponse.json({ received: true })

    const order = await getRevolutOrder(revolutSecretKey, payload.order_id)
    if (order.state !== 'COMPLETED') return NextResponse.json({ received: true })

    const outcome = await prisma.$transaction(async (tx) => {
      const capacity = await checkEventCapacity(tx, {
        eventId: eventBooking.eventId,
        ticketId: eventBooking.ticketId,
        ticketCapacity: eventBooking.ticket.capacity,
        eventCapacity: eventBooking.event.capacity,
        quantity: eventBooking.quantity,
        excludeBookingId: eventBooking.id,
      })

      if (capacity.ok) {
        await tx.eventBooking.update({ where: { id: eventBooking.id }, data: { status: 'CONFIRMED' } })
        return { sold: true }
      } else {
        await tx.eventBooking.update({ where: { id: eventBooking.id }, data: { status: 'CANCELLED' } })
        return { sold: false }
      }
    })

    if (outcome.sold) {
      if (eventBooking.user?.email) {
        sendEventTicketConfirmationEmail({
          to:          eventBooking.user.email,
          studentName: eventBooking.user.name,
          schoolName:  eventBooking.event.school.name,
          schoolCity:  eventBooking.event.school.city,
          eventTitle:  eventBooking.event.title,
          ticketName:  eventBooking.ticketName,
          quantity:    eventBooking.quantity,
          amount:      Number(eventBooking.amountPaid ?? 0),
          currency:    eventBooking.currency,
          startAt:     eventBooking.event.startAt,
          location:    eventBooking.event.location,
          bookingId:   eventBooking.id,
          lang:        eventBooking.event.school.language,
        }).catch(err => console.error('[revolut webhook] event confirmation email failed:', err))
      }
    } else {
      refundRevolutOrder(revolutSecretKey, payload.order_id).catch(err =>
        console.error('[revolut webhook] event oversell refund failed:', err))
      if (eventBooking.user?.email) {
        sendEventTicketRefundedEmail({
          to:          eventBooking.user.email,
          studentName: eventBooking.user.name,
          schoolName:  eventBooking.event.school.name,
          schoolCity:  eventBooking.event.school.city,
          eventTitle:  eventBooking.event.title,
          ticketName:  eventBooking.ticketName,
          amount:      Number(eventBooking.amountPaid ?? 0),
          currency:    eventBooking.currency,
          bookingId:   eventBooking.id,
          lang:        eventBooking.event.school.language,
        }).catch(err => console.error('[revolut webhook] event refund email failed:', err))
      }
    }
  }

  if (payload.event === 'ORDER_PAYMENT_DECLINED' || payload.event === 'ORDER_PAYMENT_FAILED') {
    await prisma.eventBooking.update({
      where: { id: eventBooking.id },
      data:  { status: 'CANCELLED' },
    })
  }

  return NextResponse.json({ received: true })
}
