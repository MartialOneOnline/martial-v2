import type { Prisma } from '@/lib/prisma-client/client'
import { CollectibleUnitStatus, OwnershipAcquisitionType } from '@/lib/prisma-client/enums'

// Stripe Checkout's `expires_at` has a 30-minute minimum from session
// creation — matching the reservation TTL to it means "the Stripe session is
// still open" and "the reservation is still held" stay in sync.
export const RESERVATION_TTL_MS = 30 * 60_000

export interface ReserveUnitParams {
  collectionId: string
  tierId?: string
  size?: string
  editionNumber?: number // specific-number selection, when the collection allows it
}

// Atomically claims one AVAILABLE unit and marks it RESERVED with a TTL.
// Two concurrent callers can never claim the same unit: each attempt is a
// conditional `updateMany` matching `status: AVAILABLE` — Postgres only lets
// one of two racing UPDATEs on the same row actually see that WHERE clause
// still true, so the loser's `count` comes back 0 and it never mutates
// anything. Run inside a $transaction alongside the Stripe Checkout Session
// creation (mirrors the EventBooking PENDING-then-checkout pattern in
// apps/web/app/api/my/events/checkout/route.ts).
export async function reserveUnit(tx: Prisma.TransactionClient, params: ReserveUnitParams) {
  const { collectionId, tierId, size, editionNumber } = params
  const now = new Date()
  const expiresAt = new Date(now.getTime() + RESERVATION_TTL_MS)

  if (editionNumber != null) {
    const claim = await tx.collectibleUnit.updateMany({
      where: {
        collectionId, editionNumber, status: CollectibleUnitStatus.AVAILABLE,
        ...(tierId ? { tierId } : {}),
        ...(size ? { size } : {}),
      },
      data: { status: CollectibleUnitStatus.RESERVED, reservedAt: now, reservationExpiresAt: expiresAt },
    })
    if (claim.count === 0) return null
    return tx.collectibleUnit.findFirst({ where: { collectionId, editionNumber } })
  }

  // Automatic assignment — no specific number requested. Prisma has no
  // "UPDATE ... LIMIT 1", so this is find-candidate then conditionally claim
  // it, retried a few times in case a concurrent buyer wins the same
  // candidate first (their committed AVAILABLE->RESERVED update becomes
  // visible to this transaction's next SELECT under READ COMMITTED, so the
  // retry naturally sees a fresh candidate list, never the one just lost).
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await tx.collectibleUnit.findFirst({
      where: {
        collectionId, status: CollectibleUnitStatus.AVAILABLE,
        ...(tierId ? { tierId } : {}),
        ...(size ? { size } : {}),
      },
      orderBy: { editionNumber: 'asc' },
      select: { id: true },
    })
    if (!candidate) return null // sold out for this tier/size combination

    const claim = await tx.collectibleUnit.updateMany({
      where: { id: candidate.id, status: CollectibleUnitStatus.AVAILABLE },
      data: { status: CollectibleUnitStatus.RESERVED, reservedAt: now, reservationExpiresAt: expiresAt },
    })
    if (claim.count === 1) return tx.collectibleUnit.findUnique({ where: { id: candidate.id } })
    // lost the race for this candidate — loop and try the next one
  }
  return null
}

export interface ConfirmSaleParams {
  unitId: string
  orderId: string
  userId: string
}

// Atomically flips RESERVED -> SOLD and creates the ownership record. Called
// from both webhook routes (school-sold and Martial-sold) via the shared
// service so the business logic isn't duplicated per Stripe account.
// Returns null if the reservation was lost (expired and swept by
// releaseExpiredReservations, or — in a bug scenario — claimed by someone
// else) — the caller must refund the payment and flag it, mirroring the
// event-ticket oversell path in apps/web/app/api/webhooks/stripe/route.ts.
// Naturally idempotent: a second call for the same unit (a redelivered
// webhook that got past claimStripeEvent for some reason) matches 0 rows
// (status is already SOLD, not RESERVED) and returns null — it can never
// create a second Order/Ownership for one unit.
export async function confirmSale(tx: Prisma.TransactionClient, params: ConfirmSaleParams) {
  const claim = await tx.collectibleUnit.updateMany({
    where: { id: params.unitId, status: CollectibleUnitStatus.RESERVED },
    data: { status: CollectibleUnitStatus.SOLD, orderId: params.orderId, ownerUserId: params.userId, soldAt: new Date() },
  })
  if (claim.count === 0) return null

  await tx.collectibleOwnership.create({
    data: {
      collectibleUnitId: params.unitId,
      ownerUserId: params.userId,
      orderId: params.orderId,
      acquisitionType: OwnershipAcquisitionType.PURCHASE,
      isCurrent: true,
    },
  })

  return tx.collectibleUnit.findUniqueOrThrow({ where: { id: params.unitId } })
}

// Sweeps RESERVED units whose TTL has passed back to AVAILABLE. Never
// touches SOLD units — the where clause only ever matches RESERVED. Called
// from apps/web/app/api/cron/expire-collectible-reservations/route.ts.
export async function releaseExpiredReservations(client: Prisma.TransactionClient) {
  const result = await client.collectibleUnit.updateMany({
    where: { status: CollectibleUnitStatus.RESERVED, reservationExpiresAt: { lt: new Date() } },
    data: { status: CollectibleUnitStatus.AVAILABLE, reservedAt: null, reservationExpiresAt: null },
  })
  return result.count
}
