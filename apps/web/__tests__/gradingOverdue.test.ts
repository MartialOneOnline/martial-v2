import { describe, it, expect } from 'vitest'
import { OVERDUE_DAYS, compareGradingQueue, daysSince, focusCounts, isOverdue, monthsWithSchool, type GradingQueueRow } from '../lib/grading/overdue'

const NOW = new Date('2026-11-01T12:00:00Z')

const row = (name: string, p: Partial<GradingQueueRow> & { status?: GradingQueueRow['readiness']['status']; count?: number; percent?: number }): GradingQueueRow => ({
  name, isNew: p.isNew ?? false, daysOverdue: p.daysOverdue ?? null,
  readiness: { status: p.status ?? 'READY', due: p.status && p.status !== 'READY' ? null : { count: p.count ?? 1 }, percent: p.percent ?? (p.status && p.status !== 'READY' ? 50 : 100) },
})

describe('overdue gradings', () => {
  it('daysSince(): whole days, never negative, null without a date', () => {
    expect(daysSince('2026-10-18T12:00:00Z', NOW)).toBe(14)
    expect(daysSince('2026-10-31T13:00:00Z', NOW)).toBe(0)
    expect(daysSince('2026-11-05T00:00:00Z', NOW)).toBe(0)
    expect(daysSince(null, NOW)).toBeNull()
  })

  it('monthsWithSchool(): whole calendar months', () => {
    expect(monthsWithSchool(new Date('2026-05-01T00:00:00Z'), NOW)).toBe(6)
    expect(monthsWithSchool(new Date('2026-05-02T00:00:00Z'), NOW)).toBe(5)
    expect(monthsWithSchool(null, NOW)).toBeNull()
  })

  it(`overdue = due for ${OVERDUE_DAYS}+ days`, () => {
    expect(isOverdue(row('a', { daysOverdue: OVERDUE_DAYS }))).toBe(true)
    expect(isOverdue(row('a', { daysOverdue: OVERDUE_DAYS - 1 }))).toBe(false)
    expect(isOverdue(row('a', { daysOverdue: 99, status: 'ALMOST_READY' }))).toBe(false)
  })

  it('order: due first; new students first, then longest overdue, then most steps owed', () => {
    const rows = [
      row('almost', { status: 'ALMOST_READY', percent: 90 }),
      row('old-60d', { daysOverdue: 60 }),
      row('new-3d', { isNew: true, daysOverdue: 3 }),
      row('old-60d-2steps', { daysOverdue: 60, count: 2 }),
      row('new-40d', { isNew: true, daysOverdue: 40 }),
      row('not', { status: 'NOT_READY', percent: 10 }),
      row('old-5d', { daysOverdue: 5 }),
    ]
    expect(rows.sort(compareGradingQueue).map(r => r.name)).toEqual([
      'new-40d', 'new-3d', 'old-60d-2steps', 'old-60d', 'old-5d', 'almost', 'not',
    ])
  })

  it('P2 (PR #40 audit): chip counts are computed over the belt-filtered rows', () => {
    const rows = [
      { ...row('blue-new', { isNew: true, daysOverdue: 2 }), belt: 'Blue' },
      { ...row('white-old', { daysOverdue: 30 }), belt: 'White' },
      { ...row('white-new-late', { isNew: true, daysOverdue: 20 }), belt: 'White' },
      { ...row('white-almost', { isNew: true, status: 'ALMOST_READY' }), belt: 'White' },
    ]
    expect(focusCounts(rows)).toEqual({ overdue: 2, newDue: 2 })
    expect(focusCounts(rows.filter(r => r.belt === 'Blue'))).toEqual({ overdue: 0, newDue: 1 })
    expect(focusCounts(rows.filter(r => r.belt === 'White'))).toEqual({ overdue: 2, newDue: 1 })
  })
})
