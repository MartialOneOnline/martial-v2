import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { periodBounds } from '@/lib/reportPeriods'

/**
 * GET /api/dashboard/revenue-chart?period=7d|30d|12m — money collected per
 * point, for the "Payments Overview" chart on the dashboard home.
 *
 * The chart used to read `revenueData` from /api/dashboard/reports/payments;
 * that report was rewritten (PR #49) and the field disappeared, leaving the
 * chart empty. It has its own endpoint now so report changes can't break it.
 * Same access and same sum (PAID income, not deleted) as the "Revenue" stat
 * card from /api/dashboard/stats on the same page.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  try { await requireDashboardAccess(schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const period = new URL(req.url).searchParams.get('period') ?? '12m'
  const { from, to, points } = periodBounds(['7d', '30d', '12m'].includes(period) ? period : '12m')

  const paid = await prisma.transaction.findMany({
    where: { schoolId, type: 'INCOME', status: 'PAID', deletedAt: null, date: { gte: from, lte: to } },
    select: { amount: true, date: true },
  })

  const revenueData = points.map(pt => ({
    date: pt.label,
    revenue: Math.round(paid.filter(t => t.date >= pt.from && t.date <= pt.to).reduce((s, t) => s + Number(t.amount), 0)),
  }))
  return NextResponse.json({ revenueData })
}
