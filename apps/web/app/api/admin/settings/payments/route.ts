import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { getPlatformStripe } from '@/lib/stripe'
import { PAYMENT_METHOD_KEYS } from '@/lib/paymentMethods'

type Cycle = 'monthly' | 'quarterly' | 'annual'
const CYCLES: Cycle[] = ['monthly', 'quarterly', 'annual']
const EXPECTED_INTERVAL: Record<Cycle, { interval: 'month' | 'year'; count: number }> = {
  monthly: { interval: 'month', count: 1 },
  quarterly: { interval: 'month', count: 3 },
  annual: { interval: 'year', count: 1 },
}
const PRICE_ID_FIELD: Record<Cycle, string> = {
  monthly: 'stripePriceIdMonthly',
  quarterly: 'stripePriceIdQuarterly',
  annual: 'stripePriceIdAnnual',
}
const PRICE_AMOUNT_FIELD: Record<Cycle, string> = {
  monthly: 'planPriceMonthly',
  quarterly: 'planPriceQuarterly',
  annual: 'planPriceAnnual',
}

// GET /api/admin/settings/payments — platform payment gating + SaaS plan config
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton' },
    update: {},
  })

  return NextResponse.json({ settings })
}

// PATCH /api/admin/settings/payments
export async function PATCH(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const body = await req.json()
  const {
    enabledPaymentMethods,
    defaultCurrency, defaultTaxName, defaultTaxRate, defaultTaxNumber, taxActive,
    gracePeriodDays,
    stripePriceIdMonthly, stripePriceIdQuarterly, stripePriceIdAnnual,
  } = body

  const data: Record<string, unknown> = {}

  if (enabledPaymentMethods !== undefined) {
    if (!Array.isArray(enabledPaymentMethods) || !enabledPaymentMethods.every((m: unknown) => typeof m === 'string' && PAYMENT_METHOD_KEYS.includes(m as typeof PAYMENT_METHOD_KEYS[number]))) {
      return NextResponse.json({ error: 'enabledPaymentMethods must only contain known payment method keys' }, { status: 400 })
    }
    data.enabledPaymentMethods = enabledPaymentMethods
  }

  if (defaultCurrency !== undefined) data.defaultCurrency = String(defaultCurrency).trim().toUpperCase() || 'EUR'
  if (defaultTaxName !== undefined) data.defaultTaxName = defaultTaxName?.trim() || null
  if (defaultTaxRate !== undefined) data.defaultTaxRate = defaultTaxRate === null || defaultTaxRate === '' ? null : Number(defaultTaxRate)
  if (defaultTaxNumber !== undefined) data.defaultTaxNumber = defaultTaxNumber?.trim() || null
  if (taxActive !== undefined) data.taxActive = !!taxActive

  if (gracePeriodDays !== undefined) {
    const days = Number(gracePeriodDays)
    if (!Number.isInteger(days) || days < 0) {
      return NextResponse.json({ error: 'gracePeriodDays must be a non-negative integer' }, { status: 400 })
    }
    data.gracePeriodDays = days
  }

  const priceInputs: Partial<Record<Cycle, string | null>> = {
    monthly: stripePriceIdMonthly,
    quarterly: stripePriceIdQuarterly,
    annual: stripePriceIdAnnual,
  }
  const touchedCycles = CYCLES.filter(c => priceInputs[c] !== undefined)

  const derivedCurrencyByCycle: Partial<Record<Cycle, string>> = {}

  if (touchedCycles.length) {
    const stripe = getPlatformStripe()

    for (const cycle of touchedCycles) {
      const priceId = priceInputs[cycle]
      if (!priceId) {
        // Clearing this cycle's price entirely
        data[PRICE_ID_FIELD[cycle]] = null
        data[PRICE_AMOUNT_FIELD[cycle]] = null
        continue
      }

      let price
      try {
        price = await stripe.prices.retrieve(priceId)
      } catch {
        return NextResponse.json({ error: `${cycle}: could not find that Stripe Price ID` }, { status: 400 })
      }

      if (!price.active) return NextResponse.json({ error: `${cycle}: Stripe Price is inactive` }, { status: 400 })
      if (price.type !== 'recurring' || !price.recurring) return NextResponse.json({ error: `${cycle}: Stripe Price must be recurring` }, { status: 400 })
      if (price.billing_scheme !== 'per_unit') return NextResponse.json({ error: `${cycle}: tiered prices are not supported, use a per-unit Price` }, { status: 400 })
      if (price.unit_amount == null) return NextResponse.json({ error: `${cycle}: Stripe Price must have a fixed unit amount` }, { status: 400 })
      if (price.recurring.usage_type !== 'licensed') return NextResponse.json({ error: `${cycle}: metered prices are not supported` }, { status: 400 })

      const expected = EXPECTED_INTERVAL[cycle]
      if (price.recurring.interval !== expected.interval || price.recurring.interval_count !== expected.count) {
        return NextResponse.json({
          error: `${cycle}: Stripe Price must bill every ${expected.count} ${expected.interval}(s) — got every ${price.recurring.interval_count} ${price.recurring.interval}(s)`,
        }, { status: 400 })
      }

      data[PRICE_ID_FIELD[cycle]] = priceId
      data[PRICE_AMOUNT_FIELD[cycle]] = price.unit_amount
      derivedCurrencyByCycle[cycle] = price.currency.toUpperCase()
    }

    // All configured prices (the ones changing now + any left untouched) must share one currency.
    const existing = await prisma.platformSettings.findUnique({ where: { id: 'singleton' } })
    const referenceCurrency = Object.values(derivedCurrencyByCycle)[0]

    if (referenceCurrency) {
      const mismatchedNew = Object.entries(derivedCurrencyByCycle).find(([, c]) => c !== referenceCurrency)
      if (mismatchedNew) {
        return NextResponse.json({ error: 'All configured Stripe Prices must use the same currency' }, { status: 400 })
      }

      const untouchedCyclesWithExistingPrice = CYCLES.filter(c => !touchedCycles.includes(c) && existing?.[PRICE_ID_FIELD[c] as keyof typeof existing])
      if (untouchedCyclesWithExistingPrice.length && existing?.planCurrency && existing.planCurrency !== referenceCurrency) {
        return NextResponse.json({ error: `New Price currency (${referenceCurrency}) does not match your already-configured prices (${existing.planCurrency})` }, { status: 400 })
      }

      data.planCurrency = referenceCurrency
    }
  }

  const updated = await prisma.platformSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', ...data },
    update: data,
  })

  return NextResponse.json({ settings: updated })
}
