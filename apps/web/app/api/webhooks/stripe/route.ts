import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { MembershipStatus } from '@/lib/prisma-client/client'
import { sendMembershipReceiptEmail, sendEventTicketConfirmationEmail, sendEventTicketRefundedEmail } from '@/lib/email/sendEmails'
import { checkEventCapacity } from '@/lib/services/eventCapacity'
import { recordOnlinePayment, recordFlaggedPayment } from '@/lib/services/transactions'
import { syncSchoolMemberStatusForMembership, isSchoolMemberArchived } from '@/lib/services/membership'
import { PaymentMethod, TransactionCategory, StripeWebhookEventStatus } from '@/lib/prisma-client/enums'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { fmtPrice } from '@/lib/format'

// A row still PROCESSING past this long was orphaned by a request that
// crashed before ever reaching the PROCESSED/FAILED update at the bottom of
// POST — long enough that no live handler would legitimately still be
// running (Stripe itself times out webhook delivery at 20s).
const STALE_PROCESSING_MS = 5 * 60_000

// Claims exclusive ownership of a Stripe event by its (Stripe-assigned,
// globally unique) id before any business logic runs. Every handled event
// type goes through this — it's what makes retries idempotent and
// concurrent duplicate deliveries resolve to exactly one activation:
// the eventId unique constraint means only one create() can ever succeed
// for a given event, and Postgres serializes concurrent inserts on the same
// key, so a racing duplicate simply sees the row already there and skips.
async function claimStripeEvent(eventId: string, type: string): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { eventId, type, status: StripeWebhookEventStatus.PROCESSING },
    })
    return true
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'P2002') throw err
  }
  // A row already exists for this event. Reclaim it only if it's a terminal
  // failure (safe to retry immediately) or a PROCESSING row stuck past
  // STALE_PROCESSING_MS (its owning request died without ever finishing) —
  // otherwise this is a genuine retry/duplicate of an in-flight or already
  // completed delivery, so leave it alone and let the caller no-op.
  const reclaimed = await prisma.stripeWebhookEvent.updateMany({
    where: {
      eventId,
      OR: [
        { status: StripeWebhookEventStatus.FAILED },
        { status: StripeWebhookEventStatus.PROCESSING, updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } },
      ],
    },
    data: { status: StripeWebhookEventStatus.PROCESSING, error: null },
  })
  return reclaimed.count === 1
}

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

  // Idempotency gate: claim this event by id before touching any business
  // logic. A retried delivery of an event we already finished — the common
  // case, Stripe redelivers on timeout even after we've succeeded — or a
  // concurrent duplicate delivery short-circuits here to a plain 200.
  if (!(await claimStripeEvent(event.id, event.type)))
    return NextResponse.json({ received: true })

  try {
    await handleStripeEvent(event)
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: StripeWebhookEventStatus.PROCESSED, processedAt: new Date() },
    })
  } catch (err) {
    // Mark FAILED (not left stuck PROCESSING) so an immediate retry from
    // Stripe can reclaim and reprocess right away instead of waiting out
    // STALE_PROCESSING_MS.
    await prisma.stripeWebhookEvent.update({
      where: { eventId: event.id },
      data: { status: StripeWebhookEventStatus.FAILED, error: err instanceof Error ? err.message : String(err) },
    }).catch(() => {}) // best-effort — don't mask the original error if this write itself fails
    throw err
  }

  return NextResponse.json({ received: true })
}

async function handleStripeEvent(event: Stripe.Event) {
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
              quantity: true, ticketId: true, eventId: true, ticketName: true, amountPaid: true, currency: true,
              userId: true, qrToken: true,
              event: { select: { title: true, startAt: true, location: true, capacity: true, schoolId: true, school: { select: { name: true, city: true, language: true } } } },
              ticket: { select: { capacity: true } },
              user: { select: { email: true, name: true } },
            },
          })
          if (!booking) return null

          // Claim atomically: only the delivery whose conditional update
          // actually flips PENDING -> CONFIRMED goes on to check capacity and
          // record the payment. A retried/duplicate delivery for this booking
          // matches zero rows here and returns early, so it can never
          // double-confirm or double-charge — the same pattern used for the
          // membership claim below and for the Revolut side of this flow.
          const claim = await tx.eventBooking.updateMany({
            where: { id: eventBookingId, status: 'PENDING' },
            data: { status: 'CONFIRMED', stripePaymentId: session.payment_intent ?? null },
          })
          if (claim.count === 0) return null

          const capacity = await checkEventCapacity(tx, {
            eventId: booking.eventId,
            ticketId: booking.ticketId,
            ticketCapacity: booking.ticket.capacity,
            eventCapacity: booking.event.capacity,
            quantity: booking.quantity,
            excludeBookingId: eventBookingId,
          })

          if (capacity.ok) {
            await recordOnlinePayment(tx, {
              schoolId:      booking.event.schoolId,
              userId:        booking.userId,
              amount:        Number(booking.amountPaid ?? 0),
              currency:      booking.currency,
              paymentMethod: PaymentMethod.STRIPE,
              category:      TransactionCategory.OTHER, // no dedicated EVENT category yet
              description:   `${booking.event.title} — ${booking.ticketName} x${booking.quantity}`,
              bookingId:     eventBookingId,
              stripePaymentIntentId: session.payment_intent,
            })
            return { sold: true, booking }
          } else {
            // Oversold after claiming — compensate by cancelling instead of confirming.
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
            qrToken:     outcome.booking.qrToken,
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
      let blockedByArchivedMember = false
      await prisma.$transaction(async (tx) => {
        // Retry/duplicate-delivery protection for *this* event now lives in
        // claimStripeEvent (only one delivery of a given event.id ever
        // reaches here) — this check is a separate business guard against
        // creating a second ACTIVE membership on the same plan, kept as-is.
        const alreadyActive = await tx.membership.findFirst({
          where: { userId, planId, status: 'ACTIVE' },
          select: { id: true },
        })
        if (alreadyActive) return

        // /api/my/checkout blocks starting a checkout while ARCHIVED, but a
        // staff member can archive this person *between* checkout and this
        // webhook delivery — Stripe has already captured the money by the
        // time we find out. Don't grant access: no Membership created, no
        // SchoolMember write. The captured payment is persisted as a
        // FLAGGED Transaction instead — auditable and visible in the
        // dashboard Payments list — so this needs manual follow-up (refund
        // or reactivation), not resolved here.
        if (await isSchoolMemberArchived(tx, { userId, schoolId })) {
          blockedByArchivedMember = true
          await recordFlaggedPayment(tx, {
            schoolId, userId,
            amount: Number(price), currency,
            paymentMethod: PaymentMethod.STRIPE,
            planId, planName,
            reason: 'SchoolMember is ARCHIVED — payment captured but membership not activated',
            stripePaymentIntentId: session.payment_intent,
          })
          return
        }

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
        // Try to create first (race-safe via the (schoolId, userId) unique
        // constraint — a plain findFirst-then-create would let two concurrent
        // webhook deliveries both create a row). The ARCHIVED case is already
        // handled above, so a P2002 here just means the row already exists
        // as PENDING/LEAD/ACTIVE/FROZEN/INACTIVE — promote it.
        try {
          await tx.schoolMember.create({
            data: { userId, schoolId, role: 'STUDENT', status: 'ACTIVE', joinedAt: new Date() },
          })
        } catch (err: unknown) {
          if ((err as { code?: string }).code !== 'P2002') throw err
          await tx.schoolMember.updateMany({
            where: { schoolId, userId, status: { not: 'ARCHIVED' } },
            data: { status: 'ACTIVE' },
          })
        }
        await recordOnlinePayment(tx, {
          schoolId,
          userId,
          amount:        Number(price),
          currency,
          paymentMethod: PaymentMethod.STRIPE,
          category:      TransactionCategory.MEMBERSHIP,
          description:   planName,
          membershipId:  created.id,
          stripePaymentIntentId: session.payment_intent,
        })
        activatedMembershipId = created.id
      })

      if (blockedByArchivedMember) {
        // Real-time alerting hook — the durable record is the FLAGGED
        // Transaction created above, queryable from the dashboard.
        console.error(`[stripe webhook] payment captured for ARCHIVED member — userId=${userId} schoolId=${schoolId} planId=${planId} paymentIntent=${session.payment_intent ?? 'n/a'}. Flagged for manual review (see Transactions).`)
      }

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
        payment_intent?: string
      }
      if (!invoice.subscription) break
      // Skip the initial invoice (already handled by checkout.session.completed)
      if (invoice.billing_reason === 'subscription_create') break

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: invoice.subscription },
        select: {
          id: true, schoolId: true, userId: true, planName: true, currency: true, stripeInvoiceId: true,
          plan: { select: { billingCycle: true } },
          user: { select: { name: true } },
        },
      })
      if (!membership) break

      const renewalAmount = invoice.amount_paid != null ? invoice.amount_paid / 100 : 0

      // Idempotency: Stripe redelivers this event on retry (e.g. if our response
      // times out even though we already processed it). Guard with a conditional
      // update keyed on stripeInvoiceId — only the delivery that actually flips
      // stripeInvoiceId to this invoice's id gets to record the transaction and
      // fire the notification, so a retry (or two concurrent deliveries of the
      // same event) can't double-count revenue or double-notify.
      const claimed = await prisma.$transaction(async (tx) => {
        const result = await tx.membership.updateMany({
          where: {
            id: membership.id,
            // SQL's `<>` never matches a NULL column, so a plain `{ not: invoice.id }`
            // would exclude every membership on its first-ever renewal (stripeInvoiceId
            // still null) — the OR keeps that case matchable while still excluding an
            // exact repeat of this invoice id.
            ...(invoice.id ? { OR: [{ stripeInvoiceId: null }, { stripeInvoiceId: { not: invoice.id } }] } : {}),
          },
          data: {
            status:          MembershipStatus.ACTIVE,
            stripeInvoiceId: invoice.id ?? null,
          },
        })
        if (result.count === 0) return false

        await recordOnlinePayment(tx, {
          schoolId:      membership.schoolId,
          userId:        membership.userId,
          amount:        renewalAmount,
          currency:      membership.currency,
          paymentMethod: PaymentMethod.STRIPE,
          category:      TransactionCategory.MEMBERSHIP,
          description:   `${membership.planName} — renewal`,
          membershipId:  membership.id,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId:       invoice.id,
        })
        // A renewal payment implies the subscription was ACTIVE (or is
        // recovering from a previous failed payment that had frozen the
        // member) — project that onto SchoolMember too, unless ARCHIVED.
        await syncSchoolMemberStatusForMembership(tx, {
          userId: membership.userId, schoolId: membership.schoolId, membershipStatus: MembershipStatus.ACTIVE,
        })
        return true
      })

      if (claimed) {
        notifyPaymentReceived(membership.schoolId, membership.user?.name ?? 'Alumno', fmtPrice(renewalAmount, membership.currency), `${membership.planName} — renovación`)
      }
      break
    }

    // ── Subscription payment failed ────────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as { subscription?: string }
      if (!invoice.subscription) break

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: invoice.subscription },
        select: { id: true, userId: true, schoolId: true },
      })
      if (!membership) break

      await prisma.$transaction(async (tx) => {
        await tx.membership.updateMany({
          where:  { stripeSubId: invoice.subscription },
          data:   { status: MembershipStatus.PAUSED },
        })
        await syncSchoolMemberStatusForMembership(tx, {
          userId: membership.userId, schoolId: membership.schoolId, membershipStatus: MembershipStatus.PAUSED,
        })
      })
      break
    }

    // ── Subscription cancelled (from Stripe dashboard or API) ─────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string }

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: sub.id },
        select: { id: true, userId: true, schoolId: true },
      })
      if (!membership) break

      await prisma.$transaction(async (tx) => {
        await tx.membership.updateMany({
          where: { stripeSubId: sub.id },
          data:  { status: MembershipStatus.CANCELLED, cancelledAt: new Date() },
        })
        await syncSchoolMemberStatusForMembership(tx, {
          userId: membership.userId, schoolId: membership.schoolId, membershipStatus: MembershipStatus.CANCELLED, excludeMembershipId: membership.id,
        })
      })
      break
    }

    // ── Subscription updated (pause, plan change, cancellation scheduled) ─────
    case 'customer.subscription.updated': {
      const sub = event.data.object as {
        id: string
        status: string
        cancel_at_period_end?: boolean
        current_period_end?: number
        items?: { data?: { current_period_end?: number }[] }
      }

      const membership = await prisma.membership.findFirst({
        where: { stripeSubId: sub.id },
        select: { id: true, userId: true, schoolId: true },
      })
      if (!membership) break

      // sub.status is Stripe's actual current state — trust it as-is.
      // cancel_at_period_end is a *separate* flag meaning "will cancel later"
      // and must never force CANCELLED here: the subscription is still
      // active (and the member should still have access) until Stripe
      // itself sends customer.subscription.deleted at the period's end.
      let newStatus: MembershipStatus | undefined
      if (sub.status === 'active')   newStatus = MembershipStatus.ACTIVE
      if (sub.status === 'paused')   newStatus = MembershipStatus.PAUSED
      if (sub.status === 'canceled') newStatus = MembershipStatus.CANCELLED

      const cancelledAt = sub.cancel_at_period_end && sub.status !== 'canceled' ? new Date() : undefined

      // Stripe moved the period-end field from the subscription's top level
      // onto each subscription item in recent API versions — check both
      // shapes. If neither is present, keep the existing endDate rather
      // than guessing: a wrong endDate could cut access early or extend it
      // wrongly, and checkAndExpireMembership only acts once cancelledAt is
      // also set, so a stale endDate here is inert until then anyway.
      const periodEndUnix = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end
      const periodEndDate = periodEndUnix ? new Date(periodEndUnix * 1000) : undefined

      if (!newStatus && cancelledAt === undefined && !periodEndDate) break // nothing to sync

      await prisma.$transaction(async (tx) => {
        await tx.membership.updateMany({
          where: { stripeSubId: sub.id },
          data: {
            ...(newStatus && { status: newStatus }),
            ...(cancelledAt !== undefined && { cancelledAt }),
            ...(periodEndDate && { endDate: periodEndDate }),
          },
        })
        if (newStatus) {
          await syncSchoolMemberStatusForMembership(tx, {
            userId: membership.userId, schoolId: membership.schoolId, membershipStatus: newStatus, excludeMembershipId: membership.id,
          })
        }
      })
      break
    }
  }
}
