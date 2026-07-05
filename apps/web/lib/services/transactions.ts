import type { Prisma } from '@/lib/prisma-client/client'
import { TransactionType, TransactionStatus, TransactionCategory, PaymentMethod } from '@/lib/prisma-client/enums'

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
}

// Records a successful Stripe/Revolut payment as an income Transaction.
// Call inside the same $transaction that activates the membership or confirms
// the event booking, so the money record and the access grant land atomically —
// used by both apps/web/app/api/webhooks/stripe/route.ts and .../revolut/route.ts
// to avoid duplicating this shape per provider.
export async function recordOnlinePayment(tx: Prisma.TransactionClient, input: RecordOnlinePaymentInput) {
  if (input.amount <= 0) return // free plans/tickets don't need a ledger entry

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
    },
  })
}
