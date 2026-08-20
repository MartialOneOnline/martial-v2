/**
 * Tests for the atomic reserve/confirm/release claim logic in
 * lib/services/collectibles/reservation.ts — the same conditional-updateMany
 * pattern already proven for EventBooking (see
 * apps/web/app/api/webhooks/stripe/route.ts). True concurrent-transaction
 * behavior (two DB connections racing on the same row) isn't reproducible
 * without a live Postgres — not available in this repo's test setup for
 * anything — so this exercises the claim predicates the atomicity relies on:
 * a reservation only succeeds while status is still AVAILABLE, a sale only
 * confirms while status is still RESERVED, and expiry sweeps only ever
 * touch RESERVED rows, never SOLD ones.
 *
 * Uses a minimal in-memory fake standing in for Prisma.TransactionClient,
 * same approach as collectibleUnitGenerator.test.ts.
 */
import { describe, it, expect } from 'vitest'
import { reserveUnit, confirmSale, releaseExpiredReservations } from '@/lib/services/collectibles/reservation'

interface FakeUnit {
  id: string
  collectionId: string
  editionNumber: number
  tierId: string
  size: string | null
  status: string
  reservedAt: Date | null
  reservationExpiresAt: Date | null
  orderId: string | null
  ownerUserId: string | null
}

function fakeTx(units: FakeUnit[]) {
  const ownerships: Record<string, unknown>[] = []
  const tx = {
    collectibleUnit: {
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const matches = units.filter(u => matchesWhere(u, where))
        matches.forEach(u => Object.assign(u, data))
        return { count: matches.length }
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => units.find(u => matchesWhere(u, where)) ?? null,
      findUnique: async ({ where }: { where: { id: string } }) => units.find(u => u.id === where.id) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const u = units.find(x => x.id === where.id)
        if (!u) throw new Error('not found')
        return u
      },
    },
    collectibleOwnership: {
      create: async ({ data }: { data: Record<string, unknown> }) => { ownerships.push(data); return data },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { tx, units, ownerships }
}

function matchesWhere(u: FakeUnit, where: Record<string, unknown>): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'reservationExpiresAt' && value && typeof value === 'object' && 'lt' in (value as object)) {
      const cutoff = (value as { lt: Date }).lt
      return u.reservationExpiresAt != null && u.reservationExpiresAt < cutoff
    }
    return (u as unknown as Record<string, unknown>)[key] === value
  })
}

function makeUnit(overrides: Partial<FakeUnit> = {}): FakeUnit {
  return {
    id: 'u1', collectionId: 'c1', editionNumber: 1, tierId: 't1', size: null,
    status: 'AVAILABLE', reservedAt: null, reservationExpiresAt: null, orderId: null, ownerUserId: null,
    ...overrides,
  }
}

describe('reserveUnit()', () => {
  it('claims an AVAILABLE unit and marks it RESERVED', async () => {
    const { tx, units } = fakeTx([makeUnit()])
    const result = await reserveUnit(tx, { collectionId: 'c1' })
    expect(result?.status).toBe('RESERVED')
    expect(units[0]!.reservationExpiresAt).not.toBeNull()
  })

  it('returns null when nothing is AVAILABLE', async () => {
    const { tx } = fakeTx([makeUnit({ status: 'SOLD' })])
    const result = await reserveUnit(tx, { collectionId: 'c1' })
    expect(result).toBeNull()
  })

  it('does not claim a unit already RESERVED by someone else', async () => {
    const { tx, units } = fakeTx([makeUnit({ status: 'RESERVED' })])
    const result = await reserveUnit(tx, { collectionId: 'c1' })
    expect(result).toBeNull()
    expect(units[0]!.status).toBe('RESERVED') // unchanged, not double-claimed
  })

  it('claims a specific edition number when requested', async () => {
    const { tx } = fakeTx([makeUnit({ id: 'u1', editionNumber: 1 }), makeUnit({ id: 'u2', editionNumber: 2 })])
    const result = await reserveUnit(tx, { collectionId: 'c1', editionNumber: 2 })
    expect(result?.id).toBe('u2')
  })

  it('does not claim a specific number that is not AVAILABLE', async () => {
    const { tx } = fakeTx([makeUnit({ id: 'u1', editionNumber: 1, status: 'SOLD' })])
    const result = await reserveUnit(tx, { collectionId: 'c1', editionNumber: 1 })
    expect(result).toBeNull()
  })
})

describe('confirmSale()', () => {
  it('flips a RESERVED unit to SOLD and creates an ownership record', async () => {
    const { tx, ownerships } = fakeTx([makeUnit({ status: 'RESERVED' })])
    const result = await confirmSale(tx, { unitId: 'u1', orderId: 'o1', userId: 'user1' })
    expect(result?.status).toBe('SOLD')
    expect(result?.orderId).toBe('o1')
    expect(result?.ownerUserId).toBe('user1')
    expect(ownerships).toHaveLength(1)
    expect(ownerships[0]).toMatchObject({ collectibleUnitId: 'u1', ownerUserId: 'user1', isCurrent: true })
  })

  it('protects a unit that is not RESERVED — a lost reservation race', async () => {
    const { tx, ownerships } = fakeTx([makeUnit({ status: 'AVAILABLE' })])
    const result = await confirmSale(tx, { unitId: 'u1', orderId: 'o1', userId: 'user1' })
    expect(result).toBeNull()
    expect(ownerships).toHaveLength(0)
  })

  it('is idempotent — a second call on an already-SOLD unit is a no-op', async () => {
    const { tx, ownerships } = fakeTx([makeUnit({ status: 'RESERVED' })])
    await confirmSale(tx, { unitId: 'u1', orderId: 'o1', userId: 'user1' })
    const second = await confirmSale(tx, { unitId: 'u1', orderId: 'o1', userId: 'user1' })
    expect(second).toBeNull()
    expect(ownerships).toHaveLength(1) // not duplicated
  })

  it('never resells a unit already owned by a different buyer', async () => {
    const { tx } = fakeTx([makeUnit({ status: 'SOLD', ownerUserId: 'user1', orderId: 'o1' })])
    const result = await confirmSale(tx, { unitId: 'u1', orderId: 'o2', userId: 'user2' })
    expect(result).toBeNull()
  })
})

describe('releaseExpiredReservations()', () => {
  it('releases a RESERVED unit past its TTL back to AVAILABLE', async () => {
    const past = new Date(Date.now() - 60_000)
    const { tx, units } = fakeTx([makeUnit({ status: 'RESERVED', reservationExpiresAt: past })])
    const count = await releaseExpiredReservations(tx)
    expect(count).toBe(1)
    expect(units[0]!.status).toBe('AVAILABLE')
    expect(units[0]!.reservationExpiresAt).toBeNull()
  })

  it('does not release a RESERVED unit still within its TTL', async () => {
    const future = new Date(Date.now() + 60_000)
    const { tx, units } = fakeTx([makeUnit({ status: 'RESERVED', reservationExpiresAt: future })])
    const count = await releaseExpiredReservations(tx)
    expect(count).toBe(0)
    expect(units[0]!.status).toBe('RESERVED')
  })

  it('never touches a SOLD unit, even with a stale reservationExpiresAt', async () => {
    const past = new Date(Date.now() - 60_000)
    const { tx, units } = fakeTx([makeUnit({ status: 'SOLD', reservationExpiresAt: past, ownerUserId: 'user1' })])
    const count = await releaseExpiredReservations(tx)
    expect(count).toBe(0)
    expect(units[0]!.status).toBe('SOLD')
  })
})
