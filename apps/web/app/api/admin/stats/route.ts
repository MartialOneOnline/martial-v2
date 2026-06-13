import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const [
    totalSchools,
    verifiedSchools,
    claimedSchools,
    unverifiedSchools,
    totalUsers,
    totalInvitations,
    sentInvitations,
    registeredInvitations,
    pendingInvitations,
    schoolsByCountry,
    schoolsWithCoords,
    recentSchools,
    invitationsByMonth,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: 'VERIFIED' } }),
    prisma.school.count({ where: { status: 'CLAIMED' } }),
    prisma.school.count({ where: { status: 'UNVERIFIED' } }),
    prisma.user.count(),
    prisma.schoolInvitation.count(),
    prisma.schoolInvitation.count({ where: { status: 'SENT' } }),
    prisma.schoolInvitation.count({ where: { status: 'REGISTERED' } }),
    prisma.schoolInvitation.count({ where: { status: { in: ['PENDING', 'SENT', 'OPENED'] } } }),
    prisma.school.groupBy({
      by: ['country'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.school.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, city: true, country: true, lat: true, lng: true, status: true },
    }),
    prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, city: true, country: true, status: true, createdAt: true },
    }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT
        TO_CHAR("createdAt", 'Mon') as month,
        COUNT(*) as count
      FROM school_invitations
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR("createdAt", 'Mon'), DATE_TRUNC('month', "createdAt")
      ORDER BY DATE_TRUNC('month', "createdAt")
    `.catch(() => []),
  ])

  return NextResponse.json({
    schools: {
      total: totalSchools,
      verified: verifiedSchools,
      claimed: claimedSchools,
      unverified: unverifiedSchools,
    },
    users: { total: totalUsers },
    invitations: {
      total: totalInvitations,
      sent: sentInvitations,
      registered: registeredInvitations,
      pending: pendingInvitations,
    },
    schoolsByCountry: schoolsByCountry.map(r => ({
      country: r.country || 'Unknown',
      count: r._count.id,
    })),
    schoolsWithCoords,
    recentSchools,
    invitationsByMonth: invitationsByMonth.map(r => ({
      month: r.month,
      count: Number(r.count),
    })),
  })
}
