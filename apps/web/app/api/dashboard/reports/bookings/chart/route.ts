import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { periodBounds } from '@/lib/reportPeriods'

/**
 * GET /api/dashboard/reports/bookings/chart?period=7d|30d|12m
 * Bookings per point (confirmed/completed vs cancelled) for the dashboard
 * home card. Moved here unchanged when the Bookings report became an
 * occupancy report (2026-11-02).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  try { await requireDashboardAccess(schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const period = new URL(req.url).searchParams.get('period') ?? '30d'
  const { points } = periodBounds(period)
  const chartData = await Promise.all(
    points.map(async pt => {
      const [confirmed, cancelled] = await Promise.all([
        prisma.booking.count({ where: { class: { schoolId }, scheduledAt: { gte: pt.from, lte: pt.to }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
        prisma.booking.count({ where: { class: { schoolId }, scheduledAt: { gte: pt.from, lte: pt.to }, status: 'CANCELLED' } }),
      ])
      return { date: pt.label, confirmed, cancelled }
    })
  )
  return NextResponse.json({ chartData })
}
