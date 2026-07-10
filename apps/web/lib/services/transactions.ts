import type { Prisma } from '@/lib/prisma-client/client'
import { TransactionType, TransactionStatus, TransactionCategory, PaymentMethod } from '@/lib/prisma-client/enums'

interface RecordFlaggedPaymentInput {
  schoolId: string
  userId: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  reason: string
  planId?: string
  planName?: string
  date?: Date
  stripePaymentIntentId?: string
  revolutOrderId?: string
}

interface RecordOnlinePaymentInput {
  schoolId: string
  userId: string
  amount: number
  currency: string
  paymentMethod: PaymentMethod
  category: TransactionCategory
  description: string
  membershipId?: string
  bookingId?: string
  date?: Date
  // Provider references — pass whichever the caller has so the Transaction
  // row can be traced back to the Stripe/Revolut dashboard.
  stripePaymentIntentId?: string
  stripeInvoiceId?: string
  revolutOrderId?: string
}

// Records a successful Stripe/Revolut payment as an income Transaction.
// Call inside the same $transaction that activates the membership or confirms
// the event booking, so the money record and the access grant land atomically —
// used by both apps/web/app/api/webhooks/stripe/route.ts and .../revolut/route.ts
// to avoid duplicating this shape per provider.
//
// Idempotent on provider reference: the webhook handlers already guard against
// reprocessing the same event/order (StripeWebhookEvent claim / conditional
// PENDING->ACTIVE update), but this is a second, self-contained line of
// defense — a pre-check plus a unique-constraint catch — so this function
// can never itself create two ledger rows for the same payment.
export async function recordOnlinePayment(tx: Prisma.TransactionClient, input: RecordOnlinePaymentInput) {
  if (input.amount <= 0) return // free plans/tickets don't need a ledger entry

  if (input.stripePaymentIntentId) {
    const existing = await tx.transaction.findFirst({ where: { stripePaymentIntentId: input.stripePaymentIntentId }, select: { id: true } })
    if (existing) return
  }
  if (input.revolutOrderId) {
    const existing = await tx.transaction.findFirst({ where: { revolutOrderId: input.revolutOrderId }, select: { id: true } })
    if (existing) return
  }

  try {
    await tx.transaction.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        membershipId: input.membershipId ?? null,
        bookingId: input.bookingId ?? null,
        type: TransactionType.INCOME,
        status: TransactionStatus.PAID,
        category: input.category,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        date: input.date ?? new Date(),
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        stripeInvoiceId: input.stripeInvoiceId ?? null,
        revolutOrderId: input.revolutOrderId ?? null,
      },
    })
  } catch (err: unknown) {
    // Backstop: a concurrent call raced past the pre-check above and the DB's
    // unique constraint on the provider reference caught it instead.
    if ((err as { code?: string }).code !== 'P2002') throw err
  }
}

// Persists a payment the provider (Stripe/Revolut) already captured but that
// was deliberately NOT turned into an active membership — currently just the
// ARCHIVED-SchoolMember case in apps/web/app/api/webhooks/stripe/route.ts and
// .../revolut/route.ts, where the money is real but the account it belongs to
// was moderated out between checkout and this webhook delivery.
//
// Creates a Transaction with status=FLAGGED so the case is auditable and
// admin-visible in the existing dashboard Payments > Transactions list —
// not just a server log — without being counted as confirmed revenue (only
// status=PAID rows are summed into totalRevenue). No refund or reactivation
// happens here; that stays a manual decision.
//
// Idempotent the same way recordOnlinePayment is: a pre-check by provider
// reference plus a unique-constraint catch, so a webhook retry (Stripe) or a
// repeated delivery that never got claimed (Revolut has no per-delivery
// event id to dedupe on up front) can never create a second flagged row for
// the same payment.
export async function recordFlaggedPayment(tx: Prisma.TransactionClient, input: RecordFlaggedPaymentInput) {
  if (input.stripePaymentIntentId) {
    const existing = await tx.transaction.findFirst({ where: { stripePaymentIntentId: input.stripePaymentIntentId }, select: { id: true } })
    if (existing) return existing
  }
  if (input.revolutOrderId) {
    const existing = await tx.transaction.findFirst({ where: { revolutOrderId: input.revolutOrderId }, select: { id: true } })
    if (existing) return existing
  }

  try {
    return await tx.transaction.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        type: TransactionType.INCOME,
        status: TransactionStatus.FLAGGED,
        category: TransactionCategory.MEMBERSHIP,
        paymentMethod: input.paymentMethod,
        amount: input.amount,
        currency: input.currency,
        description: `${input.planName ?? 'Membership payment'} — requires manual review (member archived)`,
        date: input.date ?? new Date(),
        notes: [input.reason, input.planId ? `planId=${input.planId}` : null].filter(Boolean).join(' | '),
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        revolutOrderId: input.revolutOrderId ?? null,
      },
    })
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'P2002') throw err
    return null
  }
}
