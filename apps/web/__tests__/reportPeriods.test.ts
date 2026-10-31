/**
 * Audit PR #34 (P2): periodBounds() used to step months back from `now` with
 * setMonth(), which on the 29th–31st overflows ("31 Nov" = 1 Dec) — the 12M
 * window then started a month late and 90D could repeat a month.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { periodBounds } from '@/lib/reportPeriods'

describe('periodBounds() month presets', () => {
  afterEach(() => { vi.useRealTimers() })

  it.each(['2026-10-29', '2026-10-30', '2026-10-31', '2026-03-31', '2026-05-31', '2026-12-31'])('on %s, 12m covers 12 distinct consecutive months', day => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T12:00:00`))
    const { points, from } = periodBounds('12m')
    const months = points.map(p => `${p.from.getFullYear()}-${p.from.getMonth()}`)
    expect(new Set(months).size).toBe(12)
    const now = new Date()
    expect(from).toEqual(new Date(now.getFullYear(), now.getMonth() - 11, 1))
  })

  it.each(['2026-05-31', '2026-03-31'])('on %s, 90d covers 3 distinct consecutive months', day => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T12:00:00`))
    const { points } = periodBounds('90d')
    const now = new Date()
    expect(points.map(p => p.from)).toEqual([
      new Date(now.getFullYear(), now.getMonth() - 2, 1),
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      new Date(now.getFullYear(), now.getMonth(), 1),
    ])
  })
})
