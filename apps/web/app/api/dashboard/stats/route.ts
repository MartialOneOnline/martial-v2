import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  // requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
  // requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT
  // must not read revenue/member-count stats for the school.
  try { await requireDashboardAccess(schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

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
    newMembersThisMonth,
    bookingsThisMonth,
    membershipPlanCount,
    studentCount,
    school,
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
    // New members this month (joined since start of month)
    prisma.schoolMember.count({
      where: {
        schoolId, role: 'STUDENT',
        joinedAt: { gte: startOfMonth },
      },
    }),
    // Bookings this month (for avg attendance calculation)
    prisma.booking.count({
      where: {
        class: { schoolId },
        scheduledAt: { gte: startOfMonth },
        status: { not: 'CANCELLED' },
      },
    }),
    // Membership plan templates created (Getting Started checklist)
    prisma.membershipPlan.count({ where: { schoolId } }),
    // Any student added, including pending invites (Getting Started checklist —
    // deliberately no status filter, unlike activeMembers/totalMembers above)
    prisma.schoolMember.count({ where: { schoolId, role: 'STUDENT' } }),
    // School fields needed for the Getting Started checklist + auto-verify check
    prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        status: true, city: true, country: true,
        stripePublishableKey: true, stripeSecretKey: true,
        revolutPublicKey: true, revolutSecretKey: true,
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

  // Getting Started checklist — each real step derives from data that already
  // exists, not a manually-checked flag (see project plan). "settings" has no
  // independent signal (the tab covers language/notifications/etc.) so it's
  // just marked done once the five real steps are — a "go look around" nudge,
  // not a gate.
  const gettingStarted = {
    profile: Boolean(school?.city && school?.country),
    classes: activeClasses > 0,
    memberships: membershipPlanCount > 0,
    payments: Boolean(
      (school?.stripePublishableKey && school?.stripeSecretKey) ||
      (school?.revolutPublicKey && school?.revolutSecretKey)
    ),
    students: studentCount > 0,
  }
  const realStepsDone = Object.values(gettingStarted).every(Boolean)

  // Auto-promote CLAIMED -> UNDER_REVIEW once the school has finished its own
  // setup. Deliberately NOT -> VERIFIED: a school filling in its own data is
  // not the same as a human confirming it's legitimate, so this only queues
  // it for admin approval (/admin/schools/verify still does the real
  // CLAIMED/UNDER_REVIEW -> VERIFIED flip). Conditional on the current status
  // so this can never override a status a superadmin just set
  // (SUSPENDED/ARCHIVED/PARTNER/VERIFIED etc. are left alone).
  if (realStepsDone && school?.status === 'CLAIMED') {
    await prisma.school.updateMany({
      where: { id: schoolId, status: 'CLAIMED' },
      data: { status: 'UNDER_REVIEW' },
    })
  }

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
    classesToday:       { value: classesToday },
    newMembersThisMonth:{ value: newMembersThisMonth },
    bookingsThisMonth:  { value: bookingsThisMonth },
    gettingStarted: {
      ...gettingStarted,
      settings: realStepsDone,
      doneCount: Object.values(gettingStarted).filter(Boolean).length + (realStepsDone ? 1 : 0),
      total: 6,
    },
  })
}
