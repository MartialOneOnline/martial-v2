import { describe, it, expect } from 'vitest'
import { buildPnl, copyDay, unusualIncome, type PnlTx } from '@/lib/balance/pnl'
import { balanceMonths } from '@/lib/balance/months'

const at = (iso: string) => new Date(iso)
let n = 0
const tx = (type: PnlTx['type'], category: string, amount: number, date: string, currency = 'EUR'): PnlTx =>
  ({ id: `t${n++}`, type, category, amount, currency, date: at(date), description: null })
const months = [
  { key: '2026-09', from: at('2026-08-31T22:00:00Z'), to: at('2026-09-30T21:59:59.999Z') },
  { key: '2026-10', from: at('2026-09-30T22:00:00Z'), to: at('2026-10-31T22:59:59.999Z') },
]

describe('buildPnl', () => {
  const txs = [
    tx('INCOME', 'MEMBERSHIP', 5000, '2026-09-10T10:00:00Z'), tx('EXPENSE', 'RENT', 500, '2026-09-01T10:00:00Z'), tx('EXPENSE', 'SALARY', 1900.1, '2026-09-30T10:00:00Z'),
    tx('INCOME', 'MEMBERSHIP', 5045, '2026-10-10T10:00:00Z'), // October: no expenses recorded
    tx('INCOME', 'MEMBERSHIP', 40, '2026-10-11T10:00:00Z', 'GBP'),
  ]
  const { rows, totals } = buildPnl(txs, months, 'EUR')

  it('a month with expenses has a real result and margin', () => {
    expect(rows[0]).toMatchObject({ key: '2026-09', incomeTotal: 5000, expenseTotal: 2400.1, net: 2599.9, margin: 52, missingExpenses: false })
    expect(rows[0]!.expenses).toEqual({ RENT: 500, SALARY: 1900.1 })
  })
  it('income without expenses is flagged, its margin and the period margin are not shown', () => {
    expect(rows[1]).toMatchObject({ key: '2026-10', incomeTotal: 5045, expenseTotal: 0, margin: null, missingExpenses: true })
    expect(totals).toMatchObject({ incomeTotal: 10045, expenseTotal: 2400.1, margin: null })
    expect('key' in totals).toBe(false)
  })
  it('never mixes currencies', () => {
    expect(rows[1]!.incomeTotal).toBe(5045)
    expect(buildPnl(txs, months, 'GBP').totals.incomeTotal).toBe(40)
  })
})

describe('unusualIncome', () => {
  it('flags "Other" and income far above a usual membership payment', () => {
    const list = [
      ...Array.from({ length: 10 }, (_, i) => tx('INCOME', 'MEMBERSHIP', 65, `2026-10-0${(i % 9) + 1}T10:00:00Z`)),
      tx('INCOME', 'MEMBERSHIP', 650, '2026-10-12T10:00:00Z'), // 10× usual → large
      tx('INCOME', 'MEMBERSHIP', 300, '2026-10-12T10:00:00Z'), // below the €500 floor
      tx('INCOME', 'OTHER', 4400, '2026-10-13T10:00:00Z'),
      tx('EXPENSE', 'SALARY', 9000, '2026-10-13T10:00:00Z'),
    ]
    expect(unusualIncome(list).map(u => [u.amount, u.reason])).toEqual([[4400, 'OTHER'], [650, 'LARGE']])
  })
})

describe('months and copies', () => {
  it('"this year" = January to now in the school timezone; the last month ends now', () => {
    const now = at('2026-11-02T10:00:00Z')
    const m = balanceMonths('year', 'Europe/Madrid', now)
    expect(m.map(x => x.key)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
    expect(m[0]!.from.toISOString()).toBe('2025-12-31T23:00:00.000Z')
    expect(m[m.length - 1]!.to).toEqual(now)
    for (let i = 1; i < m.length; i++) expect(m[i - 1]!.to.getTime() + 1).toBe(m[i]!.from.getTime())
  })
  it('a copied expense keeps its day, clamped to the month', () => {
    expect(copyDay(31, 2026, 2)).toBe(28)
    expect(copyDay(15, 2026, 11)).toBe(15)
  })
})
