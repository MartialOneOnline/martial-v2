/**
 * Tests for validateTiers()/resolveTierForNumber() — the range validation
 * that guards both collection creation and unit generation. See
 * lib/services/collectibles/tiers.ts.
 */
import { describe, it, expect } from 'vitest'
import { validateTiers, resolveTierForNumber } from '@/lib/services/collectibles/tiers'

const goodTiers = [
  { code: 'CHAMPION', startNumber: 1, endNumber: 10 },
  { code: 'SIGNATURE', startNumber: 11, endNumber: 40 },
  { code: 'COMMUNITY', startNumber: 41, endNumber: 50 },
]

describe('validateTiers()', () => {
  it('accepts a full, non-overlapping partition of 1..totalUnits', () => {
    const result = validateTiers(goodTiers, 50)
    expect(result.ok).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('rejects totalUnits <= 0', () => {
    expect(validateTiers(goodTiers, 0).ok).toBe(false)
  })

  it('rejects an empty tier list', () => {
    expect(validateTiers([], 50).ok).toBe(false)
  })

  it('rejects overlapping ranges', () => {
    const overlapping = [
      { code: 'A', startNumber: 1, endNumber: 10 },
      { code: 'B', startNumber: 5, endNumber: 20 },
    ]
    const result = validateTiers(overlapping, 20)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('overlap'))).toBe(true)
  })

  it('rejects a gap between tiers', () => {
    const gapped = [
      { code: 'A', startNumber: 1, endNumber: 10 },
      { code: 'B', startNumber: 15, endNumber: 20 },
    ]
    const result = validateTiers(gapped, 20)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('Gap'))).toBe(true)
  })

  it('rejects numbering that does not start at 1', () => {
    const result = validateTiers([{ code: 'A', startNumber: 2, endNumber: 20 }], 20)
    expect(result.ok).toBe(false)
  })

  it('rejects numbering that does not end at totalUnits', () => {
    const result = validateTiers([{ code: 'A', startNumber: 1, endNumber: 15 }], 20)
    expect(result.ok).toBe(false)
  })

  it('rejects a tier range outside 1..totalUnits', () => {
    const result = validateTiers([{ code: 'A', startNumber: 1, endNumber: 60 }], 50)
    expect(result.ok).toBe(false)
  })

  it('rejects duplicate tier codes', () => {
    const dup = [
      { code: 'A', startNumber: 1, endNumber: 10 },
      { code: 'A', startNumber: 11, endNumber: 20 },
    ]
    const result = validateTiers(dup, 20)
    expect(result.ok).toBe(false)
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true)
  })
})

describe('resolveTierForNumber()', () => {
  it('resolves each number to its correct tier', () => {
    expect(resolveTierForNumber(goodTiers, 1)?.code).toBe('CHAMPION')
    expect(resolveTierForNumber(goodTiers, 10)?.code).toBe('CHAMPION')
    expect(resolveTierForNumber(goodTiers, 11)?.code).toBe('SIGNATURE')
    expect(resolveTierForNumber(goodTiers, 40)?.code).toBe('SIGNATURE')
    expect(resolveTierForNumber(goodTiers, 41)?.code).toBe('COMMUNITY')
    expect(resolveTierForNumber(goodTiers, 50)?.code).toBe('COMMUNITY')
  })

  it('returns undefined for a number outside any tier', () => {
    expect(resolveTierForNumber(goodTiers, 51)).toBeUndefined()
  })
})
