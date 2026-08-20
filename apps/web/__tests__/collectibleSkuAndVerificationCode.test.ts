/**
 * Tests for SKU/verification-code/display-number generation. See
 * lib/services/collectibles/verification.ts.
 */
import { describe, it, expect } from 'vitest'
import { generateSku, generateVerificationCode, formatDisplayNumber } from '@/lib/services/collectibles/verification'

describe('generateSku()', () => {
  it('zero-pads to the width of totalUnits', () => {
    expect(generateSku('BUC-LEGACY-2026', 1, 50)).toBe('BUC-LEGACY-2026-01')
    expect(generateSku('BUC-LEGACY-2026', 7, 50)).toBe('BUC-LEGACY-2026-07')
    expect(generateSku('BUC-LEGACY-2026', 50, 50)).toBe('BUC-LEGACY-2026-50')
  })

  it('uses a wider pad for totals over 99', () => {
    expect(generateSku('X', 7, 500)).toBe('X-007')
  })
})

describe('formatDisplayNumber()', () => {
  it('formats as zero-padded "N/total"', () => {
    expect(formatDisplayNumber(1, 50)).toBe('01/50')
    expect(formatDisplayNumber(50, 50)).toBe('50/50')
  })
})

describe('generateVerificationCode()', () => {
  it('generates codes of consistent length using a non-ambiguous alphabet', () => {
    const code = generateVerificationCode()
    expect(code).toHaveLength(10)
    expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]+$/)
  })

  it('is not sequential/predictable — two calls differ', () => {
    const a = generateVerificationCode()
    const b = generateVerificationCode()
    expect(a).not.toBe(b)
  })

  it('generates unique codes across a large batch (collision-resistant)', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateVerificationCode()))
    expect(codes.size).toBe(2000)
  })
})
