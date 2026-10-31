/**
 * computeMonthlyActivity()/summarisePeriod() drive the monthly active/new/lost
 * view on the Users report — the numbers a school owner reads as "how many
 * students did I gain/lose". The 1-month grace is what keeps a late cash
 * payment from showing up as a loss + a return.
 */
import { describe, it, expect } from 'vitest'
import {
  addMonths, monthRange, monthKeyInTz, schoolTimeZone,
  computeMonthlyActivity, summarisePeriod, reportMonths, zonedRangeBounds, civilDateInTz, type ActivityRow,
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

// Audit PR #34 (P1): a custom range must cover exactly the picked months,
// whatever the server's timezone — the school's civil dates are the input.
describe('reportMonths()', () => {
  const now = new Date('2026-10-31T12:00:00Z')

  it('keeps a custom August range inside August (east of UTC)', () => {
    expect(reportMonths('custom', '2026-08-01', '2026-08-31', now, 'Europe/Madrid')).toEqual({ fromMonth: '2026-08', toMonth: '2026-08' })
  })
  it('keeps a custom August range inside August (west of UTC)', () => {
    expect(reportMonths('custom', '2026-08-01', '2026-08-31', now, 'America/New_York')).toEqual({ fromMonth: '2026-08', toMonth: '2026-08' })
  })
  it('clamps a custom range ending in the future to the current month', () => {
    expect(reportMonths('custom', '2026-09-15', '2027-02-01', now, 'Europe/Madrid')).toEqual({ fromMonth: '2026-09', toMonth: '2026-10' })
  })
  it('uses today in the school timezone, not the server one', () => {
    // 31 Oct 23:30 UTC is already 1 Nov in Madrid, still 31 Oct in New York
    const late = new Date('2026-10-31T23:30:00Z')
    expect(reportMonths('90d', null, null, late, 'Europe/Madrid')).toEqual({ fromMonth: '2026-09', toMonth: '2026-11' })
    expect(reportMonths('90d', null, null, late, 'America/New_York')).toEqual({ fromMonth: '2026-08', toMonth: '2026-10' })
  })

  // Audit PR #34 (P2): 12M on the 29th–31st must start 11 months back, not overflow
  it.each(['2026-10-29', '2026-10-30', '2026-10-31', '2026-03-31', '2026-05-31'])('12m from %s spans exactly 12 months', day => {
    const r = reportMonths('12m', null, null, new Date(`${day}T12:00:00Z`), 'Europe/Madrid')
    expect(monthRange(r.fromMonth, r.toMonth)).toHaveLength(12)
    expect(r.toMonth).toBe(day.slice(0, 7))
  })
})

describe('zonedRangeBounds()', () => {
  const now = new Date('2026-10-31T12:00:00Z')
  it('builds the custom list bounds at local midnight in the school timezone', () => {
    const madrid = zonedRangeBounds('2026-08-01', '2026-08-31', now, 'Europe/Madrid')
    expect(madrid.from.toISOString()).toBe('2026-07-31T22:00:00.000Z')
    expect(madrid.to.toISOString()).toBe('2026-08-31T21:59:59.999Z')
    const ny = zonedRangeBounds('2026-08-01', '2026-08-31', now, 'America/New_York')
    expect(ny.from.toISOString()).toBe('2026-08-01T04:00:00.000Z')
    expect(ny.to.toISOString()).toBe('2026-09-01T03:59:59.999Z')
  })
  it('handles a range that crosses a DST change', () => {
    // Madrid leaves summer time on 25 Oct 2026
    const r = zonedRangeBounds('2026-10-01', '2026-10-31', now, 'Europe/Madrid')
    expect(r.from.toISOString()).toBe('2026-09-30T22:00:00.000Z')
    expect(r.to.toISOString()).toBe('2026-10-31T22:59:59.999Z')
  })
})

// Audit PR #34 round 2 (P2): DST transitions that happen exactly at midnight.
describe('zonedRangeBounds() at midnight DST transitions', () => {
  const now = new Date('2026-10-31T12:00:00Z')

  it('starts a day whose midnight does not exist at its first valid instant (São Paulo 2018-11-04)', () => {
    // 00:00 -03 jumped to 01:00 -02 → the day starts at 01:00 local = 03:00Z
    const r = zonedRangeBounds('2018-11-04', '2018-11-04', now, 'America/Sao_Paulo')
    expect(r.from.toISOString()).toBe('2018-11-04T03:00:00.000Z')
    expect(r.to.toISOString()).toBe('2018-11-05T01:59:59.999Z') // already -02 on the 5th
  })

  it('ends a day with a repeated last hour after the repeat (São Paulo 2019-02-16)', () => {
    // 17 Feb 00:00 -02 went back to 16 Feb 23:00 -03 → 16 Feb ends at 03:00Z on the 17th
    const r = zonedRangeBounds('2019-02-16', '2019-02-16', now, 'America/Sao_Paulo')
    expect(r.from.toISOString()).toBe('2019-02-16T02:00:00.000Z')
    expect(r.to.toISOString()).toBe('2019-02-17T02:59:59.999Z')
  })

  it('every bound lands on the requested civil day, and one ms outside does not', () => {
    for (const [tz, day] of [['America/Sao_Paulo', '2018-11-04'], ['America/Sao_Paulo', '2019-02-16'], ['Europe/Madrid', '2026-03-29'], ['America/New_York', '2026-11-01']] as const) {
      const { from, to } = zonedRangeBounds(day, day, now, tz)
      expect(civilDateInTz(from, tz)).toBe(day)
      expect(civilDateInTz(to, tz)).toBe(day)
      expect(civilDateInTz(new Date(from.getTime() - 1), tz)).not.toBe(day)
      expect(civilDateInTz(new Date(to.getTime() + 1), tz)).not.toBe(day)
    }
  })
})
