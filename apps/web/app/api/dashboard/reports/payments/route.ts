import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'

// requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
// requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT must
// not read per-transaction revenue/payment-method breakdowns for the school.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  try { await requireDashboardAccess(schoolId) }
  catch { return { error: 'Forbidden', status: 403 } }
  return { schoolId }
}

function periodBounds(period: string) {
  const now = new Date()
  const points: { label: string; from: Date; to: Date }[] = []

  if (period === '7d') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), from, to })
    }
  } else if (period === '30d') {
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i * 3)
      const from = new Date(d); from.setHours(0, 0, 0, 0)
      const to   = new Date(d); to.setHours(23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), from, to })
    }
  } else if (period === '90d') {
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      points.push({ label: d.toLocaleDateString('en-US', { month: 'short' }), from, to })
    }
  }
  return { from: points[0]?.from ?? new Date(), points }
}

const METHOD_LABELS: Record<string, string> = {
  STRIPE: 'Stripe', CASH: 'Cash', BANK_TRANSFER: 'Transfer',
  DIRECT_DEBIT: 'Direct Debit', OTHER: 'Other',
}
const METHOD_FILLS: Record<string, string> = {
  STRIPE: '#6D28D9', CASH: '#16A34A', BANK_TRANSFER: '#0870E2',
  DIRECT_DEBIT: '#0F766E', OTHER: '#9CA3AF',
}

export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const period    = searchParams.get('period')    ?? '30d'
  const status    = searchParams.get('status')    ?? 'ALL'
  const search    = searchParams.get('search')    ?? ''
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize  = 15
  const method    = searchParams.get('method')    ?? ''
  const dateFrom  = searchParams.get('dateFrom')  ?? ''
  const dateTo    = searchParams.get('dateTo')    ?? ''
  const minAmount = parseFloat(searchParams.get('minAmount') ?? '0') || 0
  const maxAmount = parseFloat(searchParams.get('maxAmount') ?? '0') || 0

  const { from: periodFrom, points } = periodBounds(period)
  const tableFrom = dateFrom ? new Date(dateFrom) : periodFrom
  const tableTo   = dateTo   ? new Date(dateTo + 'T23:59:59') : undefined

  // Only INCOME transactions for this report
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    type: 'INCOME',
    date: { gte: tableFrom, ...(tableTo ? { lte: tableTo } : {}) },
    ...(status !== 'ALL' ? { status } : {}),
    ...(method ? { paymentMethod: method } : {}),
    ...(minAmount || maxAmount ? { amount: { ...(minAmount ? { gte: minAmount } : {}), ...(maxAmount ? { lte: maxAmount } : {}) } } : {}),
    ...(search ? {
      OR: [
        { user: { name:  { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { user: { select: { name: true, email: true, avatarUrl: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.transaction.count({ where }),
  ])

  // ── Revenue chart ─────────────────────────────────────────────────────────
  const revenueData = await Promise.all(
    points.map(async pt => {
      const agg = await prisma.transaction.aggregate({
        where: { schoolId: auth.schoolId, type: 'INCOME', status: 'PAID', date: { gte: pt.from, lte: pt.to } },
        _sum: { amount: true },
      })
      return { date: pt.label, revenue: Math.round(agg._sum.amount ?? 0) }
    })
  )

  // ── By payment method ─────────────────────────────────────────────────────
  const methodAgg = await prisma.transaction.groupBy({
    by: ['paymentMethod'],
    where: { schoolId: auth.schoolId, type: 'INCOME', status: 'PAID', date: { gte: periodFrom } },
    _sum: { amount: true },
  })
  const methodData = methodAgg
    .filter(m => m.paymentMethod)
    .map(m => ({
      name: METHOD_LABELS[m.paymentMethod!] ?? m.paymentMethod!,
      amount: Math.round(m._sum.amount ?? 0),
      fill: METHOD_FILLS[m.paymentMethod!] ?? '#9CA3AF',
    }))
    .sort((a, b) => b.amount - a.amount)

  // ── Stats ─────────────────────────────────────────────────────────────────
  const [totalRevenueAgg, pendingCountAgg, failedCountAgg, totalCountAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { schoolId: auth.schoolId, type: 'INCOME', status: 'PAID', date: { gte: periodFrom } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { schoolId: auth.schoolId, type: 'INCOME', status: 'PENDING', date: { gte: periodFrom } } }),
    prisma.transaction.count({ where: { schoolId: auth.schoolId, type: 'INCOME', status: 'FAILED',  date: { gte: periodFrom } } }),
    prisma.transaction.count({ where: { schoolId: auth.schoolId, type: 'INCOME', date: { gte: periodFrom } } }),
  ])

  const totalRevenue = Math.round(totalRevenueAgg._sum.amount ?? 0)
  const failedRate   = totalCountAgg > 0 ? Math.round((failedCountAgg / totalCountAgg) * 100) : 0

  // MRR: paid income in current month
  const mrrFrom = new Date(); mrrFrom.setDate(1); mrrFrom.setHours(0, 0, 0, 0)
  const mrrAgg = await prisma.transaction.aggregate({
    where: { schoolId: auth.schoolId, type: 'INCOME', status: 'PAID', date: { gte: mrrFrom } },
    _sum: { amount: true },
  })
  const mrr = Math.round(mrrAgg._sum.amount ?? 0)

  return NextResponse.json({
    stats: { totalRevenue, mrr, pendingCount: pendingCountAgg, failedRate },
    revenueData,
    methodData,
    transactions: transactions.map(tx => ({
      id:          tx.id,
      userName:    tx.user?.name     ?? '—',
      userEmail:   tx.user?.email    ?? '—',
      userAvatar:  tx.user?.avatarUrl ?? null,
      description: tx.description ?? tx.category,
      method:      tx.paymentMethod ? (METHOD_LABELS[tx.paymentMethod] ?? tx.paymentMethod) : '—',
      methodKey:   tx.paymentMethod ?? 'OTHER',
      amount:      tx.amount,
      currency:    tx.currency,
      date:        tx.date.toISOString(),
      status:      tx.status,
    })),
    total,
    page,
    pageSize,
  })
}
