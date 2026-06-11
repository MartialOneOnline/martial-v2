import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalSchools, schoolsThisMonth, schoolsLastMonth,
    totalUsers, usersThisMonth, usersLastMonth,
    totalInvitations, invitationsThisMonth,
    verifiedSchools, claimedSchools,
    schoolsByStatus, schoolsBySource, schoolsByCountry,
    usersByRole,
    invitationsByStatus,
    schoolsPerMonth,
    usersPerMonth,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.school.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.schoolInvitation.count(),
    prisma.schoolInvitation.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.school.count({ where: { status: 'VERIFIED' } }),
    prisma.school.count({ where: { status: 'CLAIMED' } }),
    prisma.school.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.school.groupBy({ by: ['source'], _count: { id: true } }),
    prisma.school.groupBy({
      by: ['country'], _count: { id: true },
      orderBy: { _count: { id: 'desc' } }, take: 10,
    }),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.schoolInvitation.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR("createdAt", 'Mon YY') as month, COUNT(*) as count
      FROM schools
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR("createdAt", 'Mon YY'), DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `.catch(() => []),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT TO_CHAR("createdAt", 'Mon YY') as month, COUNT(*) as count
      FROM users
      WHERE "createdAt" >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR("createdAt", 'Mon YY'), DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `.catch(() => []),
  ])

  return NextResponse.json({
    overview: {
      totalSchools, schoolsThisMonth, schoolsLastMonth,
      totalUsers, usersThisMonth, usersLastMonth,
      totalInvitations, invitationsThisMonth,
      verifiedSchools, claimedSchools,
    },
    schoolsByStatus: schoolsByStatus.map(r => ({ status: r.status, count: r._count.id })),
    schoolsBySource: schoolsBySource.map(r => ({ source: r.source, count: r._count.id })),
    schoolsByCountry: schoolsByCountry.map(r => ({ country: r.country || 'Unknown', count: r._count.id })),
    usersByRole: usersByRole.map(r => ({ role: r.role, count: r._count.id })),
    invitationsByStatus: invitationsByStatus.map(r => ({ status: r.status, count: r._count.id })),
    schoolsPerMonth: schoolsPerMonth.map(r => ({ month: r.month, count: Number(r.count) })),
    usersPerMonth: usersPerMonth.map(r => ({ month: r.month, count: Number(r.count) })),
  })
}
