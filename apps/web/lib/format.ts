/**
 * Format a monetary amount according to currency conventions:
 *   EUR  →  65 €      (comma decimal, symbol on the right with space)
 *   GBP  →  £65       (symbol on the left, no space, dot decimal)
 *   USD  →  $65       (symbol on the left, no space, dot decimal)
 * Decimals are dropped when they're .00 (e.g. 65.50 -> "65,50 €" / "£65.50", but 65.00 -> "65 €" / "£65").
 */
export function fmtPrice(amount: number, currency = 'EUR'): string {
  if (currency === 'EUR') {
    // de-DE (not es-ES) deliberately: same comma-decimal/period-thousands
    // format, but es-ES's CLDR data suppresses the thousands separator for
    // 4-digit amounts (e.g. 3015 -> "3015,00" instead of "3.015,00").
    return (
      new Intl.NumberFormat('de-DE', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount) + ' €'
    )
  }
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  if (currency === 'GBP') return '£' + num
  if (currency === 'USD') return '$' + num
  return num + ' ' + currency
}

/** Symbol-only helper (no amount) */
export function currencySymbol(currency: string): string {
  if (currency === 'EUR') return '€'
  if (currency === 'GBP') return '£'
  if (currency === 'USD') return '$'
  return currency
}

/** "SEMINAR" -> "Seminar", "OPEN_MAT" -> "Open mat" */
export function formatEventType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, ' ')
}
