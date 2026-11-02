import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { schoolTimeZone } from '@/lib/memberActivity'
import { dayKey } from '@/lib/absences/stopped'
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

  const [rows, lastExpense] = await Promise.all([
    prisma.transaction.findMany({
      where: { schoolId, status: 'PAID', deletedAt: null, date: { gte: months[0]!.from, lte: now } },
      select: { id: true, type: true, category: true, amount: true, currency: true, date: true, description: true },
    }),
    prisma.transaction.findFirst({
      where: { schoolId, type: 'EXPENSE', status: 'PAID', deletedAt: null, date: { lte: now } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
  ])
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
    months: pnl,
    totals,
    lastExpenseMonth: lastExpense ? dayKey(lastExpense.date, timeZone).slice(0, 7) : null,
    unusual: unusualIncome(txs.filter(t => t.currency === currency)).slice(0, 10).map(t => ({
      id: t.id, category: t.category, amount: t.amount, currency: t.currency, date: t.date.toISOString(), description: t.description, reason: t.reason,
    })),
    canManage: auth.canManage,
  })
}
