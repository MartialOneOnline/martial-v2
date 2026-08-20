/**
 * Tests for generateUnits() — the idempotent unit generator behind both the
 * admin "Generate units" action and scripts/seed-buchecha-collection.ts. See
 * lib/services/collectibles/unitGenerator.ts.
 *
 * Uses a minimal in-memory fake standing in for Prisma.TransactionClient —
 * only the two methods generateUnits() actually calls (findMany, createMany)
 * — rather than a full Prisma mock, since this repo has no live-DB test
 * harness for anything (see the plan's scope note on integration tests).
 */
import { describe, it, expect } from 'vitest'
import { generateUnits } from '@/lib/services/collectibles/unitGenerator'
import type { TierRange } from '@/lib/services/collectibles/tiers'

const TIERS: (TierRange & { id: string })[] = [
  { id: 't-champion', code: 'CHAMPION', startNumber: 1, endNumber: 10 },
  { id: 't-signature', code: 'SIGNATURE', startNumber: 11, endNumber: 40 },
  { id: 't-community', code: 'COMMUNITY', startNumber: 41, endNumber: 50 },
]

function fakeTx(existingNumbers: number[] = []) {
  const created: Record<string, unknown>[] = []
  const tx = {
    collectibleUnit: {
      findMany: async () => existingNumbers.map(editionNumber => ({ editionNumber })),
      createMany: async ({ data }: { data: Record<string, unknown>[] }) => {
        created.push(...data)
        return { count: data.length }
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
  return { tx, created }
}

describe('generateUnits()', () => {
  it('creates exactly totalUnits units on a fresh collection', async () => {
    const { tx, created } = fakeTx([])
    const result = await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    expect(result.createdCount).toBe(50)
    expect(created).toHaveLength(50)
  })

  it('assigns the correct 10/30/10 tier split', async () => {
    const { tx, created } = fakeTx([])
    await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    const byTier = created.reduce((acc: Record<string, number>, u) => {
      acc[u.tierId as string] = (acc[u.tierId as string] ?? 0) + 1
      return acc
    }, {})
    expect(byTier['t-champion']).toBe(10)
    expect(byTier['t-signature']).toBe(30)
    expect(byTier['t-community']).toBe(10)
  })

  it('is idempotent: running again on a fully-generated collection creates nothing', async () => {
    const allNumbers = Array.from({ length: 50 }, (_, i) => i + 1)
    const { tx, created } = fakeTx(allNumbers)
    const result = await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    expect(result.createdCount).toBe(0)
    expect(result.existingCount).toBe(50)
    expect(created).toHaveLength(0)
  })

  it('only fills in missing numbers, never exceeding totalUnits', async () => {
    const { tx, created } = fakeTx([1, 2, 3])
    const result = await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    expect(result.createdCount).toBe(47)
    expect(created.map(u => u.editionNumber)).not.toContain(1)
    expect(created.map(u => u.editionNumber)).not.toContain(2)
    expect(created.map(u => u.editionNumber)).not.toContain(3)
    expect(created).toHaveLength(47)
  })

  it('generates unique SKUs and unique verification codes', async () => {
    const { tx, created } = fakeTx([])
    await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    expect(new Set(created.map(u => u.sku)).size).toBe(50)
    expect(new Set(created.map(u => u.publicVerificationCode)).size).toBe(50)
  })

  it('produces zero-padded, correctly formatted SKUs', async () => {
    const { tx, created } = fakeTx([])
    await generateUnits(tx, { collectionId: 'c1', totalUnits: 50, skuPrefix: 'BUC-LEGACY-2026', tiers: TIERS })
    const first = created.find(u => u.editionNumber === 1)
    const last = created.find(u => u.editionNumber === 50)
    expect(first?.sku).toBe('BUC-LEGACY-2026-01')
    expect(last?.sku).toBe('BUC-LEGACY-2026-50')
  })
})
