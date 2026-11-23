import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { findMembershipStatusDrift } from '@/lib/services/membership'
import { claimQueueCounts, invitationIndicators, listingReviewCounts } from '@/lib/claims/queue'

// Every "needs attention" number here comes from lib/claims/queue.ts — the
// same criteria the Verification Queue lists use — so a counter always equals
// the length of the list it links to.

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const [
    totalSchools,
    verifiedSchools,
    claimedSchools,
    underReviewSchools,
    unverifiedSchools,
    totalUsers,
    ownership,
    listings,
    invitations,
    schoolsByCountry,
    schoolsWithCoords,
    recentSchools,
    invitationsByMonth,
    membershipDrift,
  ] = await Promise.all([
    prisma.school.count(),
    prisma.school.count({ where: { status: 'VERIFIED' } }),
    prisma.school.count({ where: { status: 'CLAIMED' } }),
    prisma.school.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.school.count({ where: { status: 'UNVERIFIED' } }),
    prisma.user.count(),
    claimQueueCounts(prisma),
    listingReviewCounts(prisma),
    invitationIndicators(prisma),
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
      SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS month, COUNT(*) AS count
      FROM school_invitations
      WHERE "createdAt" >= DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC') - INTERVAL '5 months'
      GROUP BY 1
    `.catch(() => []),
    findMembershipStatusDrift(),
  ])

  return NextResponse.json({
    schools: {
      total: totalSchools,
      verified: verifiedSchools,
      claimed: claimedSchools,
      underReview: underReviewSchools,
      unverified: unverifiedSchools,
    },
    users: { total: totalUsers },
    ownership,
    listings,
    invitations,
    schoolsByCountry: schoolsByCountry.map(r => ({
      country: r.country || 'Unknown',
      count: r._count.id,
    })),
    schoolsWithCoords,
    recentSchools,
    // Invitations created per calendar month (UTC), current month + previous 5,
    // empty months included so the chart's axis is honest.
    invitationsByMonth: lastMonthsUtc(6).map(m => ({
      month: m.label,
      count: Number(invitationsByMonth.find(r => r.month === m.key)?.count ?? 0),
    })),
    membershipDrift: membershipDrift.length,
  })
}

function lastMonthsUtc(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1))
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }) }
  })
}
