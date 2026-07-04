import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// GET /api/admin/reports/gradings — platform-wide belt promotions, last 12 months
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const from = new Date()
  from.setMonth(from.getMonth() - 12)

  const [totalPeriod, transitions, monthlyTrend, bySchool] = await Promise.all([
    prisma.grading.count({ where: { gradedAt: { gte: from } } }),
    prisma.grading.findMany({
      where: { gradedAt: { gte: from }, fromBelt: { not: null } },
      select: { fromBelt: true, toBelt: true },
    }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR("gradedAt", 'Mon YY') as month, COUNT(*) as count
      FROM gradings
      WHERE "gradedAt" >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR("gradedAt", 'Mon YY'), DATE_TRUNC('month', "gradedAt")
      ORDER BY DATE_TRUNC('month', "gradedAt")
    `.catch(() => []),
    prisma.grading.groupBy({
      by: ['schoolId'],
      where: { gradedAt: { gte: from } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    }),
  ])

  const transitionMap = new Map<string, number>()
  for (const g of transitions) {
    const key = `${g.fromBelt}→${g.toBelt}`
    transitionMap.set(key, (transitionMap.get(key) ?? 0) + 1)
  }
  const topTransitions = Array.from(transitionMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const schoolIds = bySchool.map(s => s.schoolId)
  const schools = await prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, name: true } })
  const schoolMap = Object.fromEntries(schools.map(s => [s.id, s.name]))

  return NextResponse.json({
    stats: { totalPeriod },
    monthlyTrend: monthlyTrend.map(r => ({ month: r.month, count: Number(r.count) })),
    topTransitions,
    bySchool: bySchool.map(s => ({
      schoolId: s.schoolId,
      schoolName: schoolMap[s.schoolId] ?? s.schoolId,
      count: s._count.id,
    })),
  })
}
