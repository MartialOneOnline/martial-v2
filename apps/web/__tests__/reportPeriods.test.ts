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

// Audit PR #52 (P2): 30d points were single days 3 days apart, so the two
// days in between (e.g. 7 Oct when today is 2 Nov) were never counted.
describe('periodBounds() 30d', () => {
  afterEach(() => { vi.useRealTimers() })

  it.each(['2026-11-02', '2026-03-01', '2026-12-31'])('on %s, covers the last 30 days with no gaps or overlaps', day => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(`${day}T12:00:00`))
    const { points, from, to } = periodBounds('30d')
    const now = new Date()
    expect(points).toHaveLength(10)
    expect(from).toEqual(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29))
    expect(to).toEqual(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999))
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.from.getTime()).toBe(points[i - 1]!.to.getTime() + 1)
    }
  })

  it('counts 7 Oct when today is 2 Nov 2026 in exactly one point', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00'))
    const tx = new Date('2026-10-07T18:00:00')
    expect(periodBounds('30d').points.filter(p => tx >= p.from && tx <= p.to)).toHaveLength(1)
  })
})
