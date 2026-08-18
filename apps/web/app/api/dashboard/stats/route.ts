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
  // "This month" totals below are necessarily month-to-date (today isn't
  // over yet), so comparing them against all of last month always makes the
  // current month look like a steep decline until the last day or two — a
  // 5-days-in vs 31-days total comparison, not an actual trend. Cap last
  // month's comparison window to the same number of days elapsed so far,
  // clamped to that month's own length (e.g. day 30/31 comparing against Feb).
  const comparableEndOfLastMonth = new Date(
    now.getFullYear(), now.getMonth() - 1,
    Math.min(now.getDate(), endOfLastMonth.getDate()),
    23, 59, 59, 999
  )
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const todayDow = now.getDay() // 0=Sun

  const [
    totalMembers,
    membersLastMonth,
    activeClasses,
    totalBookings,
    bookingsLastMonth,
    bookingsThisMonthCreated,
    activeMembers,
    openLeads,
    gradingsCount,
    revenueThisMonth,
    revenueLastMonth,
    classSchedules,
    newMembersThisMonth,
    bookingsThisMonth,
    membershipPlanCount,
    studentCount,
    school,
    attendanceTotal,
    attendanceConfirmed,
    unreadNotifications,
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
    // Bookings in the same day-count window last month (for trend) — see
    // comparableEndOfLastMonth above for why this isn't the full month.
    prisma.booking.count({
      where: {
        class: { schoolId },
        createdAt: { gte: startOfLastMonth, lte: comparableEndOfLastMonth },
      },
    }),
    // Bookings this month, same createdAt basis as bookingsLastMonth above
    prisma.booking.count({
      where: {
        class: { schoolId },
        createdAt: { gte: startOfMonth },
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
    // Revenue in the same day-count window last month (for trend) — same
    // partial-vs-full-month fix as bookingsLastMonth above.
    prisma.transaction.aggregate({
      where: {
        schoolId,
        type: 'INCOME',
        date: { gte: startOfLastMonth, lte: comparableEndOfLastMonth },
      },
      _sum: { amount: true },
    }),
    // Schedules of active classes — filtered to today's day-of-week below,
    // since `schedule` is a JSON array Prisma can't query dayOfWeek inside.
    prisma.class.findMany({
      where: { schoolId, isActive: true },
      select: { schedule: true },
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
    // Attendance rate over the last 30 days (confirmed/completed vs total)
    prisma.booking.count({
      where: { class: { schoolId }, scheduledAt: { gte: thirtyDaysAgo, lte: now } },
    }),
    prisma.booking.count({
      where: {
        class: { schoolId },
        scheduledAt: { gte: thirtyDaysAgo, lte: now },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    }),
    // Unread notifications visible to this user (school-wide or targeted at them)
    prisma.notification.count({
      where: { schoolId, read: false, OR: [{ recipientUserId: null }, { recipientUserId: user.id }] },
    }),
  ])

  const classesToday = classSchedules.reduce((count, cls) => {
    if (!cls.schedule) return count
    const schedule = cls.schedule as { dayOfWeek: number }[]
    if (!Array.isArray(schedule)) return count
    return count + schedule.filter(s => s.dayOfWeek === todayDow).length
  }, 0)

  const avgAttendance = attendanceTotal > 0 ? Math.round((attendanceConfirmed / attendanceTotal) * 100) : 0

  const revenueNow = revenueThisMonth._sum.amount ?? 0
  const revenuePrev = revenueLastMonth._sum.amount ?? 0
  const revenueTrend = revenuePrev > 0
    ? `${revenueNow >= revenuePrev ? '+' : ''}${Math.round(((revenueNow - revenuePrev) / revenuePrev) * 100)}%`
    : null

  const membersTrend = membersLastMonth > 0
    ? `+${totalMembers - membersLastMonth}`
    : null

  const bookingsTrend = bookingsLastMonth > 0
    ? `${bookingsThisMonthCreated >= bookingsLastMonth ? '+' : ''}${Math.round(((bookingsThisMonthCreated - bookingsLastMonth) / bookingsLastMonth) * 100)}%`
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
    bookings: { value: totalBookings, trend: bookingsTrend },
    activeMembers: { value: activeMembers },
    openLeads: { value: openLeads },
    gradings: { value: gradingsCount },
    avgAttendance:      { value: avgAttendance },
    notifications:      { value: unreadNotifications },
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
