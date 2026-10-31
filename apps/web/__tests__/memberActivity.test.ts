/**
 * computeMonthlyActivity()/summarisePeriod() drive the monthly active/new/lost
 * view on the Users report — the numbers a school owner reads as "how many
 * students did I gain/lose". The 1-month grace is what keeps a late cash
 * payment from showing up as a loss + a return.
 */
import { describe, it, expect } from 'vitest'
import {
  addMonths, monthRange, monthKeyInTz, schoolTimeZone,
  computeMonthlyActivity, summarisePeriod, type ActivityRow,
} from '@/lib/memberActivity'

const rows = (userId: string, ...months: string[]): ActivityRow[] => months.map(month => ({ userId, month }))

describe('month helpers', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-03', -14)).toBe('2025-01')
  })
  it('builds an inclusive month range', () => {
    expect(monthRange('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02'])
  })
  it('buckets a local-midnight payment into the local month, not UTC', () => {
    // 1 Oct 2026 00:00 in Madrid is 30 Sep 22:00 UTC
    expect(monthKeyInTz(new Date('2026-09-30T22:00:00Z'), 'Europe/Madrid')).toBe('2026-10')
    expect(schoolTimeZone('GB')).toBe('Europe/London')
    expect(schoolTimeZone(null)).toBe('Europe/Madrid')
  })
})

describe('computeMonthlyActivity()', () => {
  it('does not count a one-month gap as a loss (grace)', () => {
    const data = rows('a', '2026-01', '2026-03') // skipped February
    const [jan, feb, mar] = computeMonthlyActivity(data, ['2026-01', '2026-02', '2026-03'])
    expect(jan).toMatchObject({ active: 1, new: 1, lost: 0 })
    expect(feb).toMatchObject({ active: 1, new: 0, lost: 0, returning: 0 })
    expect(mar).toMatchObject({ active: 1, new: 0, lost: 0, returning: 0 })
  })

  it('counts a loss two months after last seen, and a later comeback as returning', () => {
    const data = rows('a', '2026-01', '2026-05')
    const s = computeMonthlyActivity(data, monthRange('2026-01', '2026-05'))
    expect(s.map(m => m.active)).toEqual([1, 1, 0, 0, 1])
    expect(s[2]).toMatchObject({ lost: 1 })
    expect(s[4]).toMatchObject({ returning: 1, new: 0 })
  })

  it('keeps active = prev + new + returning - lost, with growth and churn %', () => {
    const data = [
      ...rows('a', '2026-01', '2026-02', '2026-03', '2026-04'),
      ...rows('b', '2026-01'),             // lost in March
      ...rows('c', '2026-03', '2026-04'),  // new in March
      ...rows('d', '2026-04'),             // new in April
    ]
    const s = computeMonthlyActivity(data, monthRange('2026-01', '2026-04'))
    for (let i = 1; i < s.length; i++) {
      expect(s[i]!.active).toBe(s[i - 1]!.active + s[i]!.new + s[i]!.returning - s[i]!.lost)
    }
    expect(s[2]).toMatchObject({ active: 2, new: 1, lost: 1, growthPct: 0, churnPct: 50 })
    expect(s[3]).toMatchObject({ active: 3, new: 1, lost: 0, growthPct: 50, churnPct: 0 })
  })

  it('uses history before the window to tell new from returning', () => {
    const data = rows('a', '2025-01', '2026-03')
    const [mar] = computeMonthlyActivity(data, ['2026-03'])
    expect(mar).toMatchObject({ new: 0, returning: 1 })
  })

  it('returns null percentages when the previous month had nobody', () => {
    const [m] = computeMonthlyActivity(rows('a', '2026-03'), ['2026-03'])
    expect(m).toMatchObject({ growthPct: null, churnPct: null })
  })
})

describe('summarisePeriod()', () => {
  const data = [
    ...rows('a', '2025-10', '2025-11', '2025-12', '2026-01'),
    ...rows('b', '2025-10'),            // lost in December
    ...rows('c', '2025-12', '2026-01'), // new in December
  ]

  it('compares the first month of a multi-month period with the last', () => {
    const p = summarisePeriod(data, '2025-11', '2026-01')
    expect(p).toMatchObject({ baseMonth: '2025-11', endMonth: '2026-01', baseActive: 2, endActive: 2, new: 1, lost: 1, growthPct: 0, retentionPct: 50 })
  })

  it('falls back to the previous month when the period sits inside one month', () => {
    const p = summarisePeriod(data, '2025-12', '2025-12')
    expect(p).toMatchObject({ baseMonth: '2025-11', endMonth: '2025-12', new: 1, lost: 1 })
  })
})
