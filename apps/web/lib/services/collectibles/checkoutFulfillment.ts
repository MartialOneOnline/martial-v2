import { prisma } from '@/lib/db'
import { getStripe } from '@/lib/stripe'
import { PaymentMethod, TransactionCategory } from '@/lib/prisma-client/enums'
import { recordOnlinePayment, recordFlaggedPayment } from '@/lib/services/transactions'
import { isSchoolMemberArchived } from '@/lib/services/membership'
import { notifyPaymentReceived } from '@/lib/notifications/create'
import { sendCollectibleReceiptEmail } from '@/lib/email/sendEmails'
import { fmtPrice } from '@/lib/format'
import { confirmSale } from './reservation'
import { formatDisplayNumber } from './verification'

export interface FulfillCollectibleCheckoutParams {
  collectibleUnitId: string
  userId: string
  amountTotalCents: number | null
  currency: string | null
  stripePaymentIntentId: string | null
}

// Shared by both webhook routes — apps/web/app/api/webhooks/stripe/route.ts
// (school-sold collections) and apps/web/app/api/webhooks/stripe-platform/route.ts
// (Martial-sold collections, e.g. Buchecha) — so the atomic claim, Order/
// Transaction/Ownership creation, notification and receipt email exist in
// exactly one place regardless of which Stripe account processed the
// payment. Idempotent via confirmSale (see reservation.ts) — a redelivered
// webhook for a unit already SOLD just no-ops.
export async function fulfillCollectibleCheckout(params: FulfillCollectibleCheckoutParams) {
  const { collectibleUnitId, userId, amountTotalCents, currency, stripePaymentIntentId } = params
  const amount = (amountTotalCents ?? 0) / 100
  const upperCurrency = (currency ?? 'eur').toUpperCase()

  const outcome = await prisma.$transaction(async tx => {
    const unit = await tx.collectibleUnit.findUnique({
      where: { id: collectibleUnitId },
      select: {
        editionNumber: true,
        publicVerificationCode: true,
        collection: { select: { id: true, name: true, schoolId: true, totalUnits: true } },
        tier: { select: { name: true } },
      },
    })
    if (!unit) return null

    const schoolId = unit.collection.schoolId

    if (schoolId && (await isSchoolMemberArchived(tx, { userId, schoolId }))) {
      await tx.collectibleUnit.updateMany({
        where: { id: collectibleUnitId, status: 'RESERVED' },
        data: { status: 'AVAILABLE', reservedAt: null, reservationExpiresAt: null },
      })
      await recordFlaggedPayment(tx, {
        schoolId, userId, amount, currency: upperCurrency,
        paymentMethod: PaymentMethod.STRIPE,
        reason: 'SchoolMember is ARCHIVED — payment captured but collectible not assigned',
        stripePaymentIntentId: stripePaymentIntentId ?? undefined,
      })
      return { kind: 'blocked-archived' as const, unit, schoolId }
    }

    const order = await tx.order.create({
      data: {
        schoolId,
        userId,
        status: 'PAID',
        total: amount,
        currency: upperCurrency,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        // No OrderItem rows — a collectible sale is always qty 1 of one
        // specific serialized unit, which is what CollectibleUnit.orderId
        // (set by confirmSale below) already records; OrderItem exists for
        // multi-line, quantity-based normal-product orders instead.
      },
    })

    const sold = await confirmSale(tx, { unitId: collectibleUnitId, orderId: order.id, userId })
    if (!sold) return { kind: 'lost-race' as const, unit, schoolId }

    await recordOnlinePayment(tx, {
      schoolId,
      userId,
      amount,
      currency: upperCurrency,
      paymentMethod: PaymentMethod.STRIPE,
      category: TransactionCategory.PRODUCT_SALE,
      description: `${unit.collection.name} — ${unit.tier.name} #${unit.editionNumber}`,
      stripePaymentIntentId: stripePaymentIntentId ?? undefined,
    })

    return { kind: 'sold' as const, unit, schoolId, orderId: order.id }
  })

  if (!outcome) return

  if (outcome.kind === 'blocked-archived') {
    console.error(`[collectible checkout] payment captured for ARCHIVED member — userId=${userId} unitId=${collectibleUnitId}. Flagged for manual review.`)
    return
  }

  if (outcome.kind === 'lost-race') {
    // Reservation expired/was reclaimed before this webhook arrived — refund
    // rather than silently keep money for a unit that's no longer reserved
    // for this buyer, mirroring the event-ticket oversell path.
    if (stripePaymentIntentId) {
      const secretKey = outcome.schoolId
        ? (await prisma.school.findUnique({ where: { id: outcome.schoolId }, select: { stripeSecretKey: true } }))?.stripeSecretKey
        : process.env.STRIPE_PLATFORM_SECRET_KEY
      if (secretKey) {
        getStripe(secretKey).refunds.create({ payment_intent: stripePaymentIntentId }).catch(err =>
          console.error('[collectible checkout] lost-race refund failed:', err))
      }
    }
    return
  }

  // outcome.kind === 'sold'
  if (outcome.schoolId) {
    notifyPaymentReceived(
      outcome.schoolId,
      'Cliente',
      fmtPrice(amount, upperCurrency),
      `${outcome.unit.collection.name} — ${outcome.unit.tier.name}`,
    )
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } })
  if (user?.email) {
    sendCollectibleReceiptEmail({
      to: user.email,
      ownerName: user.name,
      sellerLabel: outcome.schoolId ? 'Your school' : 'Martial',
      collectionName: outcome.unit.collection.name,
      tierName: outcome.unit.tier.name,
      displayNumber: formatDisplayNumber(outcome.unit.editionNumber, outcome.unit.collection.totalUnits),
      amount,
      currency: upperCurrency,
      unitId: collectibleUnitId,
      verificationCode: outcome.unit.publicVerificationCode,
    }).catch(err => console.error('[collectible checkout] receipt email failed:', err))
  }
}
