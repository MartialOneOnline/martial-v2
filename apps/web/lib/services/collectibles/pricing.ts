export interface PriceInputs {
  unit: { specificPrice?: number | null; currency?: string | null }
  tier: { price?: number | null; currency?: string | null }
  product: { price: number; currency: string }
}

export interface ResolvedPrice {
  price: number
  currency: string
  source: 'unit' | 'tier' | 'product'
}

// Fallback order: unit-specific price -> tier price -> product base price.
// Currency follows whichever level the price itself came from, so a price
// and its currency are never mismatched across levels.
export function resolveUnitPrice({ unit, tier, product }: PriceInputs): ResolvedPrice {
  if (unit.specificPrice != null) {
    return { price: unit.specificPrice, currency: unit.currency ?? tier.currency ?? product.currency, source: 'unit' }
  }
  if (tier.price != null) {
    return { price: tier.price, currency: tier.currency ?? product.currency, source: 'tier' }
  }
  return { price: product.price, currency: product.currency, source: 'product' }
}
