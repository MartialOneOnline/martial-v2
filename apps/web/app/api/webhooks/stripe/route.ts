import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { MembershipStatus } from '@/lib/prisma-client/client'
import { sendMembershipReceiptEmail, sendEventTicketConfirmationEmail, sendEventTicketRefundedEmail } from '@/lib/email/sendEmails'
import { checkEventCapacity } from '@/lib/services/eventCapacity'
import { recordOnlinePayment } from '@/lib/services/transactions'
import { PaymentMethod, TransactionCategory } from '@/lib/prisma-client/enums'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { fmtPrice } from '@/lib/format'

// POST /api/webhooks/stripe
// Each school registers this URL in their Stripe dashboard.
// We look up the school from session/subscription metadata, then verify the signature
// using that school's webhookSecret.
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''

  // Parse without verification first to read schoolId from metadata
  let unverified: { type: string; data: { object: Record<string, unknown> } }
  try {
    unverified = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const HANDLED_EVENTS = new Set([
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
    'customer.subscription.deleted',
    'customer.subscription.updated',
  ])

  if (!HANDLED_EVENTS.has(unverified.type)) {
    return NextResponse.json({ received: true })
  }

  // Extract schoolId from metadata (present on checkout.session and subscription_data)
  const obj = unverified.data.object as Record<string, unknown>
  const metadata = (obj.metadata ?? obj.subscription_details ?? {}) as Record<string, string>
  const subscriptionMeta = (obj.subscription_data as Record<string, unknown> | undefined)?.metadata as Record<string, string> | undefined

  const schoolId = metadata?.schoolId ?? subscriptionMeta?.schoolId
  if (!schoolId)
    return NextResponse.json({ error: 'Missing schoolId in metadata' }, { status: 400 })

  // Load school's stripe config to verify signature
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { stripeSecretKey: true, stripeWebhookSecret: true },
  })
  if (!school?.stripeSecretKey || !school?.stripeWebhookSecret)
    return NextResponse.json({ error: 'School Stripe not configured' }, { status: 400 })

  // Verify Stripe signature
  const stripe = getStripe(school.stripeSecretKey)
  let event: ReturnType<typeof stripe.webhooks.constructEvent>
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, school.stripeWebhookSecret)
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 })
  }

  switch (event.type) {

    // ── One-time payment OR subscription first payment ─────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as {
        metadata?: Record<string, string>
        payment_status?: string
        subscription?: string
        customer?: string
        payment_intent?: string
      }
      const meta = (session.metadata ?? {}) as Record<string, string>
      const { planId, planType, validityDays, eventBookingId } = meta
      // Non-null: these always accompany planId, set together by /api/my/checkout.
      const schoolId = meta.schoolId!
      const userId = meta.userId!
      const planName = meta.planName!
      const price = meta.price!
      const currency = meta.currency!
      if (!planId && !eventBookingId) break

      if (session.payment_status !== 'paid') break

      if (eventBookingId) {
        const outcome = await prisma.$transaction(async (tx) => {
          const booking = await tx.eventBooking.findUnique({
            where: { id: eventBookingId },
            select: {
              status: true, quantity: true, ticketId: true, eventId: true, ticketName: true, amountPaid: true, currency: true,
              userId: true,
              event: { select: { title: true, startAt: true, location: true, capacity: true, schoolId: true, school: { select: { name: true, city: true, language: true } } } },
              ticket: { select: { capacity: true } },
              user: { select: { email: true, name: true } },
            },
          })
          if (!booking || booking.status !== 'PENDING') return null

          const capacity = await checkEventCapacity(tx, {
            eventId: booking.eventId,
            ticketId: booking.ticketId,
            ticketCapacity: booking.ticket.capacity,
            eventCapacity: booking.event.capacity,
            quantity: booking.quantity,
            excludeBookingId: eventBookingId,
          })

          if (capacity.ok) {
            await tx.eventBooking.update({
              where: { id: eventBookingId },
              data: { status: 'CONFIRMED', stripePaymentId: session.payment_intent ?? null },
            })
            await recordOnlinePayment(tx, {
              schoolId:      booking.event.schoolId,
              userId:        booking.userId,
              amount:        Number(booking.amountPaid ?? 0),
              currency:      booking.currency,
              paymentMethod: PaymentMethod.STRIPE,
              category:      TransactionCategory.OTHER, // no dedicated EVENT category yet
              description:   `${booking.event.title} — ${booking.ticketName} x${booking.quantity}`,
              bookingId:     eventBookingId,
            })
            return { sold: true, booking }
          } else {
            await tx.eventBooking.update({
              where: { id: eventBookingId },
              data: { status: 'CANCELLED' },
            })
            return { sold: false, booking }
          }
        })

        if (outcome?.sold) {
          notifyPaymentReceived(
            outcome.booking.event.schoolId,
            outcome.booking.user?.name ?? 'Alumno',
            fmtPrice(Number(outcome.booking.amountPaid ?? 0), outcome.booking.currency),
            `${outcome.booking.event.title} — ${outcome.booking.ticketName}`,
          )
        }

        if (outcome?.sold && outcome.booking.user?.email) {
          sendEventTicketConfirmationEmail({
            to:          outcome.booking.user.email,
            studentName: outcome.booking.user.name,
            schoolName:  outcome.booking.event.school.name,
            schoolCity:  outcome.booking.event.school.city,
            eventTitle:  outcome.booking.event.title,
            ticketName:  outcome.booking.ticketName,
            quantity:    outcome.booking.quantity,
            amount:      Number(outcome.booking.amountPaid ?? 0),
            currency:    outcome.booking.currency,
            startAt:     outcome.booking.event.startAt,
            location:    outcome.booking.event.location,
            bookingId:   eventBookingId,
            lang:        outcome.booking.event.school.language,
          }).catch(err => console.error('[stripe webhook] event confirmation email failed:', err))
        } else if (outcome && !outcome.sold) {
          const school = await prisma.school.findUnique({ where: { id: outcome.booking.event.schoolId }, select: { stripeSecretKey: true } })
          if (school?.stripeSecretKey && session.payment_intent) {
            getStripe(school.stripeSecretKey).refunds.create({ payment_intent: session.payment_intent }).catch(err =>
              console.error('[stripe webhook] event oversell refund failed:', err))
          }
          if (outcome.booking.user?.email) {
            sendEventTicketRefundedEmail({
              to:          outcome.booking.user.email,
              studentName: outcome.booking.user.name,
              schoolName:  outcome.booking.event.school.name,
              schoolCity:  outcome.booking.event.school.city,
              eventTitle:  outcome.booking.event.title,
              ticketName:  outcome.booking.ticketName,
              amount:      Number(outcome.booking.amountPaid ?? 0),
              currency:    outcome.booking.currency,
              bookingId:   eventBookingId,
              lang:        outcome.booking.event.school.language,
            }).catch(err => console.error('[stripe webhook] event refund email failed:', err))
          }
        }
        break
      }

      if (!planId) break

      // The membership is created here, on confirmed payment — not before checkout.
      // An abandoned/cancelled Stripe session simply never reaches this handler, so
      // it never leaves a phantom PENDING membership behind.
      let activatedMembershipId: string | null = null
      await prisma.$transaction(async (tx) => {
        // Idempotency: a retried webhook delivery for the same successful session
        // would otherwise create a second membership.
        const alreadyActive = await tx.membership.findFirst({
          where: { userId, planId, status: 'ACTIVE' },
          select: { id: true },
        })
        if (alreadyActive) return

        const endDate = planType !== 'SUBSCRIPTION' && validityDays
          ? new Date(Date.now() + Number(validityDays) * 86_400_000)
          : undefined

        const created = await tx.membership.create({
          data: {
            userId, schoolId, planId,
            planName, price: Number(price), currency,
            paymentMethod: PaymentMethod.STRIPE,
            status:        MembershipStatus.ACTIVE,
            startDate:     new Date(),
            ...(endDate && { endDate }),
            ...(session.subscription && { stripeSubId: session.subscription }),
            ...(session.customer     && { stripeCustomerId: String(session.customer) }),
          },
        })
        await tx.schoolMember.updateMany({
          where: { userId, schoolId },
          data:  { status: 'ACTIVE' },
        })
        await recordOnlinePayment(tx, {
          schoolId,
          userId,
          amount:        Number(price),
          currency,
          paymentMethod: PaymentMethod.STRIPE,
          category:      TransactionCategory.MEMBERSHIP,
          description:   planName,
          membershipId:  created.id,
        })
        activatedMembershipId = created.id
      })

      // Notify + send receipt email (fire-and-forget)
      if (activatedMembershipId) {
        prisma.membership.findUnique({
          where: { id: activatedMembershipId },
          select: {
            planName: true, price: true, currency: true, startDate: true, endDate: true,
            user:   { select: { email: true, name: true } },
            school: { select: { name: true, city: true, language: true } },
          },
        }).then(m => {
          if (!m) return
          notifyPaymentReceived(schoolId, m.user?.name ?? 'Alumno', fmtPrice(Number(m.price), m.currency), m.planName)
          if (!m.user?.email) return
          sendMembershipReceiptEmail({
            to:            m.user.email,
            studentName:   m.user.name,
            schoolName:    m.school.name,
            schoolCity:    m.school.city,
            planName:      m.planName,
            amount:        Number(m.price),
            currency:      m.currency,
            paymentMethod: 'STRIPE',
            startDate:     m.startDate,
            endDate:       m.endDate,
            membershipId:  activatedMembershipId!,
            lang:          m.school.language,
          })
        }).catch(err => console.error('[stripe webhook] receipt email failed:', err))
      }
      break
    }

    // ── Subscription renewed (next billing cycle paid) ─────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as {
        subscription?: string
        customer?: string
        id?: string
        billing_reason?: string
        amount_paid?: number
      }
      if (!invoice.subscription) break
      // Skip the initial invoice (already handled by checkout.session.completed)
      if (invoice.billing_reason === 'subscription_create') break

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: invoice.subscription },
        select: {
          id: true, schoolId: true, userId: true, planName: true, currency: true,
          plan: { select: { billingCycle: true } },
          user: { select: { name: true } },
        },
      })
      if (!membership) break

      const renewalAmount = invoice.amount_paid != null ? invoice.amount_paid / 100 : 0

      // Extend endDate by one billing period or keep null (indefinite)
      await prisma.$transaction(async (tx) => {
        await tx.membership.update({
          where: { id: membership.id },
          data: {
            status:          MembershipStatus.ACTIVE,
            stripeInvoiceId: invoice.id ?? null,
          },
        })
        await recordOnlinePayment(tx, {
          schoolId:      membership.schoolId,
          userId:        membership.userId,
          amount:        renewalAmount,
          currency:      membership.currency,
          paymentMethod: PaymentMethod.STRIPE,
          category:      TransactionCategory.MEMBERSHIP,
          description:   `${membership.planName} — renewal`,
          membershipId:  membership.id,
        })
      })
      notifyPaymentReceived(membership.schoolId, membership.user?.name ?? 'Alumno', fmtPrice(renewalAmount, membership.currency), `${membership.planName} — renovación`)
      break
    }

    // ── Subscription payment failed ────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string }
      if (!invoice.subscription) break

      await prisma.membership.updateMany({
        where:  { stripeSubId: invoice.subscription },
        data:   { status: MembershipStatus.PAUSED },
      })
      break
    }

    // ── Subscription cancelled (from Stripe dashboard or API) ─────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string; cancel_at_period_end?: boolean }
      await prisma.membership.updateMany({
        where: { stripeSubId: sub.id },
        data:  { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
      })
      break
    }

    // ── Subscription updated (pause, plan change, etc.) ───────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as { id: string; status: string; cancel_at_period_end?: boolean }
      let newStatus: MembershipStatus | undefined
      if (sub.status === 'active')   newStatus = MembershipStatus.ACTIVE
      if (sub.status === 'paused')   newStatus = MembershipStatus.PAUSED
      if (sub.status === 'canceled') newStatus = MembershipStatus.CANCELLED
      if (sub.cancel_at_period_end)  newStatus = MembershipStatus.CANCELLED

      if (newStatus) {
        await prisma.membership.updateMany({
          where: { stripeSubId: sub.id },
          data:  { status: newStatus },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
