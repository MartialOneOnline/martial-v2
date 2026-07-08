/**
 * Format a monetary amount according to currency conventions:
 *   EUR  →  65,00 €   (comma decimal, symbol on the right with space)
 *   GBP  →  £65.00    (symbol on the left, no space, dot decimal)
 *   USD  →  $65.00    (symbol on the left, no space, dot decimal)
 */
export function fmtPrice(amount: number, currency = 'EUR'): string {
  if (currency === 'EUR') {
    return (
      new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount) + ' €'
    )
  }
  const num = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
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
