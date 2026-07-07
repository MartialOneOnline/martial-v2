import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRevolutOrder, refundRevolutOrder, verifyRevolutWebhook } from '@/lib/revolut'
import { MembershipStatus } from '@/lib/prisma-client/client'
import { sendMembershipReceiptEmail, sendEventTicketConfirmationEmail, sendEventTicketRefundedEmail } from '@/lib/email/sendEmails'
import { checkEventCapacity } from '@/lib/services/eventCapacity'
import { recordOnlinePayment } from '@/lib/services/transactions'
import { PaymentMethod, TransactionCategory } from '@/lib/prisma-client/enums'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { fmtPrice } from '@/lib/format'

// POST /api/webhooks/revolut
// Each school registers this URL in their Revolut Merchant dashboard.
// We extract the schoolId from the order's merchant_order_ext_ref (= membershipId or eventBookingId),
// load the school's revolutSecretKey, then act.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('revolut-signature') ?? ''
  const timestampHeader  = req.headers.get('revolut-request-timestamp') ?? ''

  let payload: { event: string; order_id: string }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const HANDLED = new Set(['ORDER_COMPLETED', 'ORDER_PAYMENT_DECLINED', 'ORDER_PAYMENT_FAILED'])
  if (!HANDLED.has(payload.event)) return NextResponse.json({ received: true })

  // This endpoint is shared across every school — the only thing that tells us which
  // school's webhookSecret to verify against is a real order_id matching a row we
  // created ourselves. A missing/blank order_id must never reach the DB lookup below:
  // Prisma treats `where: { revolutOrderId: undefined }` as "no filter on this field",
  // which would silently match an arbitrary PENDING row (any school's abandoned
  // Revolut checkout sits with revolutOrderId=null until completed) instead of failing.
  if (typeof payload.order_id !== 'string' || !payload.order_id.trim())
    return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })

  // Verify the HMAC signature once we know which school's signing secret to check.
  // Checkout creation now requires revolutWebhookSecret to be set (see /api/my/checkout
  // and /api/my/events/checkout), so a missing secret here means either a school that
  // registered Revolut before that guard existed, or a forged request — either way we
  // reject rather than process an unsigned payload.
  async function verifySignature(webhookSecret: string | null, schoolId: string): Promise<boolean> {
    if (!webhookSecret) {
      console.warn(`[revolut webhook] schoolId=${schoolId} has no revolutWebhookSecret configured — rejecting payload. Ask them to click "Register webhook" in Settings.`)
      return false
    }
    return verifyRevolutWebhook(rawBody, signatureHeader, timestampHeader, webhookSecret)
  }

  const membership = await prisma.membership.findFirst({
    where: { revolutOrderId: payload.order_id },
    select: {
      id: true, userId: true, schoolId: true, status: true, planName: true, price: true, currency: true,
      plan: { select: { validityDays: true } },
      school: { select: { revolutSecretKey: true, revolutWebhookSecret: true, name: true, city: true, language: true } },
    },
  })

  if (membership) {
    const { school } = membership
    if (!school?.revolutSecretKey)
      return NextResponse.json({ error: 'School Revolut not configured' }, { status: 400 })

    if (!(await verifySignature(school.revolutWebhookSecret, membership.schoolId)))
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

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
        await recordOnlinePayment(tx, {
          schoolId:      membership.schoolId,
          userId:        membership.userId,
          amount:        Number(membership.price),
          currency:      membership.currency,
          paymentMethod: PaymentMethod.REVOLUT,
          category:      TransactionCategory.MEMBERSHIP,
          description:   membership.planName,
          membershipId:  membership.id,
          revolutOrderId: payload.order_id,
        })
      })

      // Notify + send receipt email (fire-and-forget)
      prisma.membership.findUnique({
        where: { id: membership.id },
        select: {
          planName: true, price: true, currency: true, startDate: true, endDate: true,
          user:   { select: { email: true, name: true } },
          school: { select: { name: true, city: true, language: true } },
        },
      }).then(m => {
        if (!m) return
        notifyPaymentReceived(membership.schoolId, m.user?.name ?? 'Alumno', fmtPrice(Number(m.price), m.currency), m.planName)
        if (!m.user?.email) return
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
      if (membership.status !== 'PENDING') return NextResponse.json({ received: true })

      // Re-fetch the order from Revolut rather than trusting the payload directly —
      // mirrors the ORDER_COMPLETED check above. If Revolut's own record says the
      // order actually completed, don't cancel a membership that was in fact paid.
      const order = await getRevolutOrder(school.revolutSecretKey, payload.order_id)
      if (order.state === 'COMPLETED') return NextResponse.json({ received: true })

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
      id: true, status: true, quantity: true, ticketId: true, eventId: true, ticketName: true, amountPaid: true, currency: true, userId: true, qrToken: true,
      event: { select: { title: true, startAt: true, location: true, capacity: true, schoolId: true, school: { select: { revolutSecretKey: true, revolutWebhookSecret: true, name: true, city: true, language: true } } } },
      ticket: { select: { capacity: true } },
      user: { select: { email: true, name: true } },
    },
  })

  if (!eventBooking) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  const revolutSecretKey = eventBooking.event.school.revolutSecretKey
  if (!revolutSecretKey)
    return NextResponse.json({ error: 'School Revolut not configured' }, { status: 400 })

  if (!(await verifySignature(eventBooking.event.school.revolutWebhookSecret, eventBooking.event.schoolId)))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })

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
        await recordOnlinePayment(tx, {
          schoolId:      eventBooking.event.schoolId,
          userId:        eventBooking.userId,
          amount:        Number(eventBooking.amountPaid ?? 0),
          currency:      eventBooking.currency,
          paymentMethod: PaymentMethod.REVOLUT,
          category:      TransactionCategory.OTHER, // no dedicated EVENT category yet
          description:   `${eventBooking.event.title} — ${eventBooking.ticketName} x${eventBooking.quantity}`,
          bookingId:     eventBooking.id,
          revolutOrderId: payload.order_id,
        })
        return { sold: true }
      } else {
        await tx.eventBooking.update({ where: { id: eventBooking.id }, data: { status: 'CANCELLED' } })
        return { sold: false }
      }
    })

    if (outcome.sold) {
      notifyPaymentReceived(
        eventBooking.event.schoolId,
        eventBooking.user?.name ?? 'Alumno',
        fmtPrice(Number(eventBooking.amountPaid ?? 0), eventBooking.currency),
        `${eventBooking.event.title} — ${eventBooking.ticketName}`,
      )
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
          qrToken:     eventBooking.qrToken,
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
    if (eventBooking.status !== 'PENDING') return NextResponse.json({ received: true })

    // Re-fetch from Revolut before cancelling — same reasoning as the membership branch.
    const order = await getRevolutOrder(revolutSecretKey, payload.order_id)
    if (order.state === 'COMPLETED') return NextResponse.json({ received: true })

    await prisma.eventBooking.update({
      where: { id: eventBooking.id },
      data:  { status: 'CANCELLED' },
    })
  }

  return NextResponse.json({ received: true })
}
