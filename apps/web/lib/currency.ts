/**
 * Currencies a school can price plans, classes, event tickets and manual
 * transactions in, plus the default currency for a school's country.
 *
 * Only two-decimal currencies are listed on purpose: Stripe checkout sends
 * `price * 100` as the amount, which would be wrong for zero-decimal
 * currencies such as JPY or KRW.
 */
export const CURRENCIES = [
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British pound' },
  { code: 'USD', label: 'US dollar' },
  { code: 'AUD', label: 'Australian dollar' },
  { code: 'NZD', label: 'New Zealand dollar' },
  { code: 'CAD', label: 'Canadian dollar' },
  { code: 'CHF', label: 'Swiss franc' },
  { code: 'SEK', label: 'Swedish krona' },
  { code: 'NOK', label: 'Norwegian krone' },
  { code: 'DKK', label: 'Danish krone' },
  { code: 'PLN', label: 'Polish złoty' },
  { code: 'TRY', label: 'Turkish lira' },
  { code: 'AED', label: 'UAE dirham' },
  { code: 'BRL', label: 'Brazilian real' },
  { code: 'MXN', label: 'Mexican peso' },
  { code: 'SGD', label: 'Singapore dollar' },
  { code: 'HKD', label: 'Hong Kong dollar' },
  { code: 'ZAR', label: 'South African rand' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR'

const EUROZONE = [
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA', 'ME', 'XK',
]

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  ...Object.fromEntries(EUROZONE.map(c => [c, 'EUR' as CurrencyCode])),
  GB: 'GBP', UK: 'GBP', GG: 'GBP', JE: 'GBP', IM: 'GBP', GI: 'GBP',
  US: 'USD', PR: 'USD',
  AU: 'AUD',
  NZ: 'NZD',
  CA: 'CAD',
  CH: 'CHF', LI: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  TR: 'TRY',
  AE: 'AED',
  BR: 'BRL',
  MX: 'MXN',
  SG: 'SGD',
  HK: 'HKD',
  ZA: 'ZAR',
}

/** Default currency for a school's country (ISO 3166 alpha-2). Unknown → EUR. */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  if (!country) return DEFAULT_CURRENCY
  return COUNTRY_CURRENCY[country.trim().toUpperCase()] ?? DEFAULT_CURRENCY
}

export function isSupportedCurrency(code: unknown): code is CurrencyCode {
  return typeof code === 'string' && CURRENCIES.some(c => c.code === code)
}

/**
 * Options for a currency <select>. A record saved in a currency that's no
 * longer listed keeps it as an option so editing it doesn't silently switch.
 */
export function currencyOptions(current?: string | null): { code: string; label: string }[] {
  const list: { code: string; label: string }[] = CURRENCIES.map(c => ({ code: c.code, label: c.label }))
  if (current && !list.some(c => c.code === current)) list.unshift({ code: current, label: current })
  return list
}
