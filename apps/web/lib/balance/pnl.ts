// Balance report: a monthly profit & loss (2026-11-02, agreed with the school owner).
//
// RGM recorded rent and salaries until Nov 2025 and then stopped, so "income
// minus expenses" turned into a fake 96% margin. Every month is shown on its
// own; a month with income but no expenses is flagged instead of trusted, and
// unusually large income is pointed out for review. Only PAID money counts.
// Pure — the API route loads the rows.

export interface PnlTx {
  id: string
  type: 'INCOME' | 'EXPENSE'
  category: string
  amount: number
  currency: string
  date: Date
  description: string | null
}

export interface PnlMonth { key: string; from: Date; to: Date }

export interface PnlRow {
  key: string
  income: Record<string, number>
  expenses: Record<string, number>
  incomeTotal: number
  expenseTotal: number
  net: number
  /** Net / income, %; null when there is no income or the month has no expenses recorded */
  margin: number | null
  /** Income but no expense at all: the result for this month isn't real */
  missingExpenses: boolean
}

const cents = (n: number) => Math.round(n * 100) / 100

/** One row per month of the period, in one currency (others are never mixed in) */
export function buildPnl(txs: PnlTx[], months: PnlMonth[], currency: string): { rows: PnlRow[]; totals: Omit<PnlRow, 'key'> } {
  const inCur = txs.filter(t => t.currency === currency)
  const rows = months.map(m => {
    const inMonth = inCur.filter(t => t.date >= m.from && t.date <= m.to)
    const income: Record<string, number> = {}
    const expenses: Record<string, number> = {}
    for (const t of inMonth) {
      const bucket = t.type === 'INCOME' ? income : expenses
      bucket[t.category] = (bucket[t.category] ?? 0) + t.amount
    }
    return finish(m.key, income, expenses)
  })
  const income: Record<string, number> = {}
  const expenses: Record<string, number> = {}
  for (const r of rows) {
    for (const [c, n] of Object.entries(r.income)) income[c] = (income[c] ?? 0) + n
    for (const [c, n] of Object.entries(r.expenses)) expenses[c] = (expenses[c] ?? 0) + n
  }
  const totals: Omit<PnlRow, 'key'> = finish('', income, expenses)
  delete (totals as Partial<PnlRow>).key
  // The period's margin is only real if every month with income has its expenses
  if (rows.some(r => r.missingExpenses)) totals.margin = null
  return { rows, totals }
}

function finish(key: string, rawIncome: Record<string, number>, rawExpenses: Record<string, number>): PnlRow {
  const income = Object.fromEntries(Object.entries(rawIncome).map(([c, n]) => [c, cents(n)]))
  const expenses = Object.fromEntries(Object.entries(rawExpenses).map(([c, n]) => [c, cents(n)]))
  const incomeTotal = cents(Object.values(rawIncome).reduce((s, n) => s + n, 0))
  const expenseTotal = cents(Object.values(rawExpenses).reduce((s, n) => s + n, 0))
  const missingExpenses = incomeTotal > 0 && expenseTotal === 0
  const net = cents(incomeTotal - expenseTotal)
  return {
    key, income, expenses, incomeTotal, expenseTotal, net,
    margin: incomeTotal > 0 && !missingExpenses ? Math.round((net / incomeTotal) * 100) : null,
    missingExpenses,
  }
}

/** An income this many times the usual membership payment (and at least this much) stands out */
export const UNUSUAL_FACTOR = 5
export const UNUSUAL_MIN = 500

function median(list: number[]): number | null {
  if (!list.length) return null
  const s = [...list].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/**
 * Income worth a second look: anything filed as "Other", or far bigger than a
 * usual membership payment (e.g. an imported total, a typo with an extra zero).
 */
export function unusualIncome(txs: PnlTx[]): Array<PnlTx & { reason: 'OTHER' | 'LARGE' }> {
  const income = txs.filter(t => t.type === 'INCOME')
  const usual = median(income.filter(t => t.category === 'MEMBERSHIP').map(t => t.amount))
  const limit = Math.max(UNUSUAL_MIN, (usual ?? 0) * UNUSUAL_FACTOR)
  type Flagged = PnlTx & { reason: 'OTHER' | 'LARGE' }
  return income.flatMap<Flagged>(t => {
    if (t.category === 'OTHER') return [{ ...t, reason: 'OTHER' }]
    if (t.amount >= limit) return [{ ...t, reason: 'LARGE' }]
    return []
  }).sort((a, b) => b.amount - a.amount)
}

/**
 * Copying a month's expenses into another month: same category, amount and
 * concept, on the same day of the month (clamped to the month's last day).
 */
export function copyDay(sourceDay: number, targetYear: number, targetMonth: number): number {
  const last = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return Math.min(sourceDay, last)
}
