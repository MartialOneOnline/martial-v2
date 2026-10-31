// Shared CSV export helper — used by every dashboard table that offers a
// "Export" button (Transactions, Subscriptions, Plans, ...) so the escaping,
// BOM (for Excel to detect UTF-8) and filename convention stay consistent
// instead of being re-implemented per page.

export type CsvCell = string | number | null | undefined

export interface CsvOptions {
  /**
   * UI locale. Excel in comma-decimal locales (es, pt, fr, …) expects ";" as
   * the column separator and "," as the decimal mark — with plain "," CSV the
   * whole row lands in one column and 15.2 is read as text or a date. When
   * set to such a locale, numbers are written with a decimal comma and
   * columns are separated by ";". Omitted = the original "," format, so
   * existing exports are unchanged.
   */
  locale?: string
}

const COMMA_DECIMAL = /^(es|pt|fr|de|it|nl)\b/i

export function buildCsv(headers: string[], rows: CsvCell[][], opts: CsvOptions = {}): string {
  const commaDecimal = !!opts.locale && COMMA_DECIMAL.test(opts.locale)
  const sep = commaDecimal ? ';' : ','
  const cell = (v: CsvCell) => {
    if (v === null || v === undefined) return '""'
    const s = typeof v === 'number' && commaDecimal ? String(v).replace('.', ',') : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  return [headers, ...rows].map(r => r.map(cell).join(sep)).join('\n')
}

export function downloadCsv(filenamePrefix: string, headers: string[], rows: CsvCell[][], opts: CsvOptions = {}) {
  const csv = buildCsv(headers, rows, opts)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
