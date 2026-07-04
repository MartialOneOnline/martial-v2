import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// GET /api/admin/reports/payments — platform-wide school transactions, last 12 months
//
// Each school picks its own Transaction.currency, so summing across schools is
// only meaningful within one currency. This report reports on EUR (the
// platform default — see PlatformSettings.defaultCurrency) and separately
// surfaces a count of non-EUR transactions rather than silently mixing units.
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const from = new Date()
  from.setMonth(from.getMonth() - 12)

  const [
    incomeSum, expenseSum, otherCurrencyCount,
    byCategory, byStatus, monthlyTrend, bySchool,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: { date: { gte: from }, status: 'PAID', currency: 'EUR', type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { date: { gte: from }, status: 'PAID', currency: 'EUR', type: 'EXPENSE' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { date: { gte: from }, status: 'PAID', currency: { not: 'EUR' } } }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { date: { gte: from }, status: 'PAID', currency: 'EUR' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      where: { date: { gte: from } },
      _count: { id: true },
    }),
    prisma.$queryRaw<{ month: string; type: string; total: number }[]>`
      SELECT TO_CHAR("date", 'Mon YY') as month, type, SUM(amount) as total
      FROM transactions
      WHERE "date" >= NOW() - INTERVAL '12 months' AND status = 'PAID' AND currency = 'EUR'
      GROUP BY TO_CHAR("date", 'Mon YY'), DATE_TRUNC('month', "date"), type
      ORDER BY DATE_TRUNC('month', "date")
    `.catch(() => []),
    prisma.transaction.groupBy({
      by: ['schoolId'],
      where: { date: { gte: from }, status: 'PAID', currency: 'EUR', type: 'INCOME' },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 20,
    }),
  ])

  const schoolIds = bySchool.map(s => s.schoolId)
  const schools = await prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, name: true } })
  const schoolMap = Object.fromEntries(schools.map(s => [s.id, s.name]))

  // Reshape monthlyTrend rows (one per month+type) into one point per month
  const monthMap = new Map<string, { income: number; expense: number }>()
  for (const row of monthlyTrend) {
    const entry = monthMap.get(row.month) ?? { income: 0, expense: 0 }
    if (row.type === 'INCOME') entry.income += Number(row.total)
    else entry.expense += Number(row.total)
    monthMap.set(row.month, entry)
  }

  return NextResponse.json({
    currency: 'EUR',
    stats: {
      income: incomeSum._sum.amount ?? 0,
      expense: expenseSum._sum.amount ?? 0,
      net: (incomeSum._sum.amount ?? 0) - (expenseSum._sum.amount ?? 0),
      otherCurrencyCount,
    },
    byCategory: byCategory.map(r => ({ category: r.category, total: r._sum.amount ?? 0, count: r._count.id })),
    byStatus: byStatus.map(r => ({ status: r.status, count: r._count.id })),
    monthlyTrend: Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v })),
    bySchool: bySchool.map(s => ({
      schoolId: s.schoolId,
      schoolName: schoolMap[s.schoolId] ?? s.schoolId,
      income: s._sum.amount ?? 0,
    })),
  })
}
