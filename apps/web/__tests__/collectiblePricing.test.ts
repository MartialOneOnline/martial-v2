/**
 * Tests for resolveUnitPrice() — unit-specific > tier > product fallback.
 * See lib/services/collectibles/pricing.ts.
 */
import { describe, it, expect } from 'vitest'
import { resolveUnitPrice } from '@/lib/services/collectibles/pricing'

const product = { price: 100, currency: 'EUR' }

describe('resolveUnitPrice()', () => {
  it('falls back to product price when unit and tier have none', () => {
    const result = resolveUnitPrice({ unit: {}, tier: {}, product })
    expect(result).toEqual({ price: 100, currency: 'EUR', source: 'product' })
  })

  it('prefers tier price over product price', () => {
    const result = resolveUnitPrice({ unit: {}, tier: { price: 250, currency: 'EUR' }, product })
    expect(result).toEqual({ price: 250, currency: 'EUR', source: 'tier' })
  })

  it('prefers unit-specific price over tier and product price', () => {
    const result = resolveUnitPrice({
      unit: { specificPrice: 999, currency: 'USD' },
      tier: { price: 250, currency: 'EUR' },
      product,
    })
    expect(result).toEqual({ price: 999, currency: 'USD', source: 'unit' })
  })

  it('unit price without its own currency falls back to tier currency', () => {
    const result = resolveUnitPrice({
      unit: { specificPrice: 999 },
      tier: { price: 250, currency: 'GBP' },
      product,
    })
    expect(result.currency).toBe('GBP')
  })

  it('treats 0 as a real specific price, not "unset"', () => {
    const result = resolveUnitPrice({ unit: { specificPrice: 0, currency: 'EUR' }, tier: { price: 250 }, product })
    expect(result).toEqual({ price: 0, currency: 'EUR', source: 'unit' })
  })
})
