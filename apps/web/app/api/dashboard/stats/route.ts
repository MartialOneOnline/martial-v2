import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try { await requireSchoolAccess(user.id, schoolId) }
    catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const [
    totalMembers,
    membersLastMonth,
    activeClasses,
    totalBookings,
    bookingsLastMonth,
    activeMembers,
    openLeads,
    gradingsCount,
    revenueThisMonth,
    revenueLastMonth,
    classesToday,
  ] = await Promise.all([
    // Total active students
    prisma.schoolMember.count({
      where: { schoolId, role: 'STUDENT', status: 'ACTIVE' },
    }),
    // Students last month (for trend)
    prisma.schoolMember.count({
      where: {
        schoolId, role: 'STUDENT', status: 'ACTIVE',
        joinedAt: { lte: endOfLastMonth },
      },
    }),
    // Active classes
    prisma.class.count({ where: { schoolId, isActive: true } }),
    // Total bookings all time
    prisma.booking.count({
      where: { class: { schoolId } },
    }),
    // Bookings last month (for trend)
    prisma.booking.count({
      where: {
        class: { schoolId },
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    // Active memberships
    prisma.membership.count({
      where: { schoolId, status: 'ACTIVE' },
    }),
    // Open leads
    prisma.lead.count({
      where: { schoolId, status: { in: ['NEW', 'CONTACTED', 'TRIAL_BOOKED'] } },
    }),
    // Gradings this year
    prisma.grading.count({
      where: {
        schoolId,
        gradedAt: { gte: new Date(now.getFullYear(), 0, 1) },
      },
    }),
    // Revenue this month
    prisma.transaction.aggregate({
      where: {
        schoolId,
        type: 'INCOME',
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    }),
    // Revenue last month
    prisma.transaction.aggregate({
      where: {
        schoolId,
        type: 'INCOME',
        date: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { amount: true },
    }),
    // Classes today (by day of week)
    prisma.class.count({
      where: {
        schoolId,
        isActive: true,
        schedule: { not: undefined },
      },
    }),
  ])

  const revenueNow = revenueThisMonth._sum.amount ?? 0
  const revenuePrev = revenueLastMonth._sum.amount ?? 0
  const revenueTrend = revenuePrev > 0
    ? `${revenueNow >= revenuePrev ? '+' : ''}${Math.round(((revenueNow - revenuePrev) / revenuePrev) * 100)}%`
    : null

  const membersTrend = membersLastMonth > 0
    ? `+${totalMembers - membersLastMonth}`
    : null

  return NextResponse.json({
    members: { value: totalMembers, trend: membersTrend },
    activeClasses: { value: activeClasses },
    revenue: {
      value: revenueNow,
      formatted: `€${revenueNow.toLocaleString('en-EU', { minimumFractionDigits: 0 })}`,
      trend: revenueTrend,
    },
    bookings: { value: totalBookings },
    activeMembers: { value: activeMembers },
    openLeads: { value: openLeads },
    gradings: { value: gradingsCount },
    classesToday: { value: classesToday },
  })
}
