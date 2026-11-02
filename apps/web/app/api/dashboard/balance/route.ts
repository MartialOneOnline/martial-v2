import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { schoolTimeZone } from '@/lib/memberActivity'
import { dayKey } from '@/lib/absences/stopped'
import { zonedStartOfDay } from '@/lib/absences/periods'
import { balanceMonths, BALANCE_PERIODS, type BalancePeriod } from '@/lib/balance/months'
import { mainCurrency, sumByCurrency } from '@/lib/payments/collect'
import { buildPnl, unusualIncome, type PnlTx } from '@/lib/balance/pnl'
import { balanceAccess } from '@/lib/balance/access'

/**
 * GET /api/dashboard/balance?period=month|3m|12m|year — monthly P&L (PAID
 * only, school timezone, one currency at a time), months without expenses,
 * the last month that has expenses (to copy from) and unusual income.
 */
export async function GET(req: NextRequest) {
  const auth = await balanceAccess('school.analytics.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { schoolId } = auth

  const raw = new URL(req.url).searchParams.get('period') as BalancePeriod | null
  const period: BalancePeriod = raw && BALANCE_PERIODS.includes(raw) ? raw : '12m'
  const now = new Date()
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const timeZone = schoolTimeZone(school?.country)
  const months = balanceMonths(period, timeZone, now)

  const lastMonth = months[months.length - 1]!
  const [ly, lm] = lastMonth.key.split('-').map(Number) as [number, number]
  const endOfCurrentMonth = zonedStartOfDay(ly, lm + 1, 1, timeZone)
  const [rows, lastExpense, periodExpenses, firstExpense] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId, status: 'PAID', deletedAt: null, date: { gte: months[0]!.from, lte: now } },
      select: { id: true, type: true, category: true, amount: true, currency: true, date: true, description: true },
    }),
    prisma.transaction.findFirst({
      where: { schoolId, type: 'EXPENSE', status: 'PAID', deletedAt: null, date: { lte: now } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    // What the copy endpoint looks at: any expense, any currency, the WHOLE month (later days included)
    prisma.transaction.findMany({
      where: { schoolId, type: 'EXPENSE', status: 'PAID', deletedAt: null, date: { gte: months[0]!.from, lt: endOfCurrentMonth } },
      select: { date: true },
    }),
    prisma.transaction.findFirst({
      where: { schoolId, type: 'EXPENSE', status: 'PAID', deletedAt: null },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ])
  const monthsWithAnyExpense = new Set(periodExpenses.map(e => dayKey(e.date, timeZone).slice(0, 7)))
  const txs: PnlTx[] = rows.map(t => ({
    id: t.id, type: t.type as PnlTx['type'], category: t.category, amount: Number(t.amount), currency: t.currency, date: t.date,
    description: t.description && t.description !== 'NULL' ? t.description : null,
  }))
  const byCurrency = sumByCurrency(txs.map(t => ({ amount: t.amount, currency: t.currency })))
  const currency = mainCurrency(byCurrency)
  const { rows: pnl, totals } = buildPnl(txs, months, currency)

  return NextResponse.json({
    period, currency,
    otherCurrencies: Object.keys(byCurrency).filter(c => c !== currency),
    months: pnl.map((row, i) => ({
      ...row,
      // The copy button shows exactly when the copy endpoint would accept it:
      // no expense at all that month (any currency, any day) and an earlier month to copy from
      copyable: !monthsWithAnyExpense.has(row.key) && !!firstExpense && firstExpense.date < months[i]!.from,
      // Missing from this balance, but there are expenses in another currency or later this month
      expensesElsewhere: row.missingExpenses && monthsWithAnyExpense.has(row.key),
    })),
    totals,
    lastExpenseMonth: lastExpense ? dayKey(lastExpense.date, timeZone).slice(0, 7) : null,
    unusual: unusualIncome(txs.filter(t => t.currency === currency)).slice(0, 10).map(t => ({
      id: t.id, category: t.category, amount: t.amount, currency: t.currency, date: t.date.toISOString(), description: t.description, reason: t.reason,
    })),
    canManage: auth.canManage,
  })
}
