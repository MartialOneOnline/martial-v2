export interface PeriodPoint { label: string; from: Date; to: Date }
export interface PeriodBounds { from: Date; to: Date; points: PeriodPoint[] }

// Single source of truth for /api/dashboard/reports/* time windows. Every
// widget on a report page (stat cards, trend chart, table) is built from the
// same {from, to, points} triple so a "Custom" range always matches what the
// chart/table show — previously each route derived its own from/to per
// widget and a custom date range silently only reached the table.
export function periodBounds(period: string, dateFrom?: string | null, dateTo?: string | null): PeriodBounds {
  const now = new Date()

  if (period === 'custom' && dateFrom) {
    const from = new Date(dateFrom)
    from.setHours(0, 0, 0, 0)
    const to = dateTo ? new Date(dateTo) : new Date(now)
    to.setHours(23, 59, 59, 999)
    return { from, to, points: customPoints(from, to) }
  }

  const points: PeriodPoint[] = []
  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), from, to })
    }
  } else if (period === '30d') {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 3)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from, to })
    }
  } else if (period === '90d') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  }
  const from = points[0]?.from ?? new Date()
  const to   = points[points.length - 1]?.to ?? new Date()
  return { from, to, points }
}

// Buckets an arbitrary custom range into ~7-12 points, mirroring the
// granularity the fixed presets already use (daily for short spans, ~10
// evenly-sized buckets for medium spans, monthly for long spans).
function customPoints(from: Date, to: Date): PeriodPoint[] {
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1)
  const points: PeriodPoint[] = []

  if (days <= 14) {
    for (let i = 0; i < days; i++) {
      const d = new Date(from); d.setDate(d.getDate() + i)
      const ptFrom = new Date(d); ptFrom.setHours(0, 0, 0, 0)
      const ptTo   = new Date(d); ptTo.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from: ptFrom, to: ptTo })
    }
  } else if (days <= 120) {
    const stepDays = Math.ceil(days / 10)
    const cursor = new Date(from)
    while (cursor <= to) {
      const ptFrom = new Date(cursor); ptFrom.setHours(0, 0, 0, 0)
      const ptToRaw = new Date(cursor); ptToRaw.setDate(ptToRaw.getDate() + stepDays - 1)
      const ptTo = ptToRaw > to ? new Date(to) : ptToRaw
      ptTo.setHours(23, 59, 59, 999)
      points.push({ label: ptFrom.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from: ptFrom, to: ptTo })
      cursor.setDate(cursor.getDate() + stepDays)
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
    while (cursor <= to) {
      const ptFrom = cursor > from ? new Date(cursor) : new Date(from)
      const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999)
      const ptTo = monthEnd > to ? new Date(to) : monthEnd
      points.push({ label: cursor.toLocaleDateString('en-US', { month: 'short' }), from: ptFrom, to: ptTo })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  }
  return points
}
