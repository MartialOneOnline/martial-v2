// Shared CSV export helper — used by every dashboard table that offers a
// "Export" button (Transactions, Subscriptions, Plans, ...) so the escaping,
// BOM (for Excel to detect UTF-8) and filename convention stay consistent
// instead of being re-implemented per page.
export function downloadCsv(filenamePrefix: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
