/**
 * Format a monetary amount according to currency conventions:
 *   EUR  →  65 €      (comma decimal, symbol on the right with space)
 *   GBP  →  £65       (symbol on the left, no space, dot decimal)
 *   USD  →  $65       (symbol on the left, no space, dot decimal)
 *   AUD  →  A$65      other currencies use their en-US symbol (NZ$, CA$, R$, CHF 65…)
 * Decimals are dropped when they're .00 (e.g. 65.50 -> "65,50 €" / "£65.50", but 65.00 -> "65 €" / "£65").
 */
export function fmtPrice(amount: number, currency = 'EUR'): string {
  const fractionDigits = Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2
  if (currency === 'EUR') {
    // de-DE (not es-ES) deliberately: same comma-decimal/period-thousands
    // format, but es-ES's CLDR data suppresses the thousands separator for
    // 4-digit amounts (e.g. 3015 -> "3015,00" instead of "3.015,00").
    return (
      new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: 2,
      }).format(amount) + ' €'
    )
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Not a valid ISO 4217 code — show the raw code rather than crash
    const num = new Intl.NumberFormat('en-US', { minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }).format(amount)
    return num + ' ' + currency
  }
}

/** Symbol-only helper (no amount): EUR → €, AUD → A$, CHF → CHF */
export function currencySymbol(currency: string): string {
  if (currency === 'EUR') return '€'
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency })
      .formatToParts(0).find(p => p.type === 'currency')?.value ?? currency
  } catch {
    return currency
  }
}

/** "SEMINAR" -> "Seminar", "OPEN_MAT" -> "Open mat" */
export function formatEventType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
}
