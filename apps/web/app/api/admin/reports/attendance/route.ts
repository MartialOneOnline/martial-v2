import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// GET /api/admin/reports/attendance — platform-wide booking attendance, last 12 months
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const from = new Date()
  from.setMonth(from.getMonth() - 12)

  const [totalPeriod, confirmedPeriod, cancelledPeriod, noShowPeriod, monthlyTrend, bySchool] = await Promise.all([
    prisma.booking.count({ where: { scheduledAt: { gte: from } } }),
    prisma.booking.count({ where: { scheduledAt: { gte: from }, status: { in: ['CONFIRMED', 'COMPLETED'] } } }),
    prisma.booking.count({ where: { scheduledAt: { gte: from }, status: 'CANCELLED' } }),
    prisma.booking.count({ where: { scheduledAt: { gte: from }, status: 'NO_SHOW' } }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR(b."scheduledAt", 'Mon YY') as month, COUNT(*) as count
      FROM bookings b
      WHERE b."scheduledAt" >= NOW() - INTERVAL '12 months'
        AND b.status IN ('CONFIRMED', 'COMPLETED')
      GROUP BY TO_CHAR(b."scheduledAt", 'Mon YY'), DATE_TRUNC('month', b."scheduledAt")
      ORDER BY DATE_TRUNC('month', b."scheduledAt")
    `.catch(() => []),
    prisma.$queryRaw<{ schoolId: string; schoolName: string; total: bigint; confirmed: bigint }[]>`
      SELECT c."schoolId" as "schoolId", s.name as "schoolName",
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE b.status IN ('CONFIRMED', 'COMPLETED')) as confirmed
      FROM bookings b
      JOIN classes c ON c.id = b."classId"
      JOIN schools s ON s.id = c."schoolId"
      WHERE b."scheduledAt" >= NOW() - INTERVAL '12 months'
      GROUP BY c."schoolId", s.name
      ORDER BY total DESC
      LIMIT 20
    `.catch(() => []),
  ])

  const attendanceRate = totalPeriod > 0 ? Math.round((confirmedPeriod / totalPeriod) * 100) : 0

  return NextResponse.json({
    stats: { totalPeriod, confirmedPeriod, cancelledPeriod, noShowPeriod, attendanceRate },
    monthlyTrend: monthlyTrend.map(r => ({ month: r.month, count: Number(r.count) })),
    bySchool: bySchool.map(r => ({
      schoolId: r.schoolId,
      schoolName: r.schoolName,
      total: Number(r.total),
      confirmed: Number(r.confirmed),
      attendanceRate: Number(r.total) > 0 ? Math.round((Number(r.confirmed) / Number(r.total)) * 100) : 0,
    })),
  })
}
