import { describe, it, expect } from 'vitest'
import { mainCurrency, monthlyEquivalent, sortOverdue, sumByCurrency, unpaidState } from '@/lib/payments/collect'

describe('monthlyEquivalent', () => {
  it('counts recurring plans per month; one-off, passes and free plans are not monthly income', () => {
    expect(monthlyEquivalent(65, 'SUBSCRIPTION', 'monthly')).toBe(65)
    expect(monthlyEquivalent(180, 'SUBSCRIPTION', 'quarterly')).toBe(60)
    expect(monthlyEquivalent(600, 'SUBSCRIPTION', 'annual')).toBe(50)
    expect(monthlyEquivalent(30, 'SUBSCRIPTION', 'two-weekly')).toBe(65)
    expect(monthlyEquivalent(80, 'SINGLE_PASS', 'one-off')).toBe(0)
    expect(monthlyEquivalent(100, 'SUBSCRIPTION', 'one-off')).toBe(0)
    expect(monthlyEquivalent(0, 'SUBSCRIPTION', 'monthly')).toBe(0)
  })
})

describe('unpaidState', () => {
  const now = new Date('2026-11-02T10:00:00Z')
  const m = (status: string, price: number, isTrial: boolean, endDate: string | null = null) => ({ status, price, isTrial, endDate: endDate ? new Date(endDate) : null })
  it('a paid active plan → not listed', () => {
    expect(unpaidState([m('ACTIVE', 65, false)], now)).toBeNull()
  })
  it('trial running, trial over (still active or expired), free plan, nothing', () => {
    expect(unpaidState([m('ACTIVE', 0, true, '2026-11-09T00:00:00Z')], now)).toBe('TRIAL')
    expect(unpaidState([m('ACTIVE', 0, true, null)], now)).toBe('TRIAL') // not started yet
    expect(unpaidState([m('ACTIVE', 0, true, '2026-10-20T00:00:00Z')], now)).toBe('TRIAL_OVER')
    expect(unpaidState([m('EXPIRED', 0, true, '2026-10-20T00:00:00Z')], now)).toBe('TRIAL_OVER')
    expect(unpaidState([m('ACTIVE', 0, false)], now)).toBe('FREE_PLAN')
    expect(unpaidState([m('CANCELLED', 65, false)], now)).toBe('NO_PLAN')
    expect(unpaidState([], now)).toBe('NO_PLAN')
  })
})

describe('sorting and money', () => {
  it('students still training first, then the longest overdue', () => {
    const base = { membershipId: 'x', userId: 'u', endDate: new Date(), currency: 'EUR', lastClassAt: null }
    const out = sortOverdue([
      { ...base, membershipId: 'old-gone', amount: 65, daysOverdue: 40, training: false },
      { ...base, membershipId: 'training', amount: 65, daysOverdue: 3, training: true },
      { ...base, membershipId: 'mid-gone', amount: 65, daysOverdue: 10, training: false },
    ])
    expect(out.map(x => x.membershipId)).toEqual(['training', 'old-gone', 'mid-gone'])
  })
  it('never adds currencies together; main currency = most money', () => {
    const t = sumByCurrency([{ amount: 65, currency: 'EUR' }, { amount: 65.5, currency: 'EUR' }, { amount: 40, currency: 'GBP' }])
    expect(t).toEqual({ EUR: 130.5, GBP: 40 })
    expect(mainCurrency(t)).toBe('EUR')
    expect(mainCurrency({}, 'GBP')).toBe('GBP')
  })
})

describe('P3: rounding once at the end', () => {
  it('three quarterly €100 plans = €100/month', () => {
    const rows = [1, 2, 3].map(() => ({ amount: monthlyEquivalent(100, 'SUBSCRIPTION', 'quarterly'), currency: 'EUR' }))
    expect(sumByCurrency(rows)).toEqual({ EUR: 100 })
  })
})
