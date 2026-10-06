import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

const DAY = 24 * 60 * 60 * 1000
const STAFF_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST', 'CUSTOM'] as const

// GET /api/admin/schools/[id]/overview — read-only snapshot of how a school is
// actually operating (students, classes, bookings, payments) so super admins
// can check on it without impersonating the owner. Strictly read-only: no
// write paths here, and nothing that exposes payment-provider secrets.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const school = await prisma.school.findUnique({
    where: { id },
    select: {
      id: true, name: true, slug: true, status: true, type: true,
      city: true, country: true, email: true, phone: true, logoUrl: true,
      claimedById: true, createdAt: true,
      stripePublishableKey: true, revolutPublicKey: true,
      subscription: { select: { status: true } },
    },
  })
  if (!school) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = new Date()
  const since30 = new Date(now.getTime() - 30 * DAY)
  const until14 = new Date(now.getTime() + 14 * DAY)
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

  const [members, memberships, classes, recentBookings, upcomingBookings, bookingStats30, transactions, incomeThisMonth] = await Promise.all([
    prisma.schoolMember.findMany({
      where: { schoolId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, role: true, status: true, belt: true, beltDegree: true,
        joinedAt: true, createdAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
    prisma.membership.findMany({
      where: { schoolId: id },
      orderBy: { startDate: 'desc' },
      select: {
        id: true, userId: true, planName: true, price: true, currency: true,
        paymentMethod: true, status: true, paymentStatus: true,
        startDate: true, endDate: true,
      },
    }),
    prisma.class.findMany({
      where: { schoolId: id },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: {
        id: true, name: true, level: true, duration: true, capacity: true,
        isActive: true, isPublished: true, isTrial: true, schedule: true,
        instructor: { select: { name: true } },
        _count: { select: { bookings: { where: { scheduledAt: { gte: since30, lte: now }, status: { not: 'CANCELLED' } } } } },
      },
    }),
    prisma.booking.findMany({
      where: { class: { schoolId: id }, scheduledAt: { gte: since30, lte: now } },
      orderBy: { scheduledAt: 'desc' },
      take: 150,
      select: {
        id: true, scheduledAt: true, attendedAt: true, status: true, bookedByRole: true,
        user: { select: { name: true, email: true } },
        class: { select: { name: true } },
      },
    }),
    prisma.booking.findMany({
      where: { class: { schoolId: id }, scheduledAt: { gt: now, lte: until14 }, status: { in: ['PENDING', 'CONFIRMED'] } },
      orderBy: { scheduledAt: 'asc' },
      take: 150,
      select: {
        id: true, scheduledAt: true, attendedAt: true, status: true, bookedByRole: true,
        user: { select: { name: true, email: true } },
        class: { select: { name: true } },
      },
    }),
    prisma.booking.groupBy({
      by: ['status'],
      where: { class: { schoolId: id }, scheduledAt: { gte: since30, lte: now } },
      _count: true,
    }),
    prisma.transaction.findMany({
      where: { schoolId: id, deletedAt: null },
      orderBy: { date: 'desc' },
      take: 30,
      select: {
        id: true, type: true, status: true, category: true, paymentMethod: true,
        amount: true, currency: true, description: true, date: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.transaction.groupBy({
      by: ['currency'],
      where: { schoolId: id, deletedAt: null, type: 'INCOME', status: 'PAID', date: { gte: monthStart } },
      _sum: { amount: true },
    }),
  ])

  // Current membership per student: prefer ACTIVE/PAUSED/PENDING over ended
  // ones, then most recent start (memberships are already sorted desc).
  const LIVE = new Set(['ACTIVE', 'PAUSED', 'PENDING'])
  const currentMembershipByUser = new Map<string, (typeof memberships)[number]>()
  for (const m of memberships) {
    const prev = currentMembershipByUser.get(m.userId)
    if (!prev || (!LIVE.has(prev.status) && LIVE.has(m.status))) currentMembershipByUser.set(m.userId, m)
  }

  // Check-ins over the last 30 days, per student and in total.
  const attendedGroups = await prisma.booking.groupBy({
    by: ['userId'],
    where: { class: { schoolId: id }, scheduledAt: { gte: since30, lte: now }, attendedAt: { not: null } },
    _count: true,
  })
  const attendedByUser = new Map(attendedGroups.map(g => [g.userId, g._count]))
  const attended30 = attendedGroups.reduce((sum, g) => sum + g._count, 0)
  const students = members.filter(m => m.role === 'STUDENT')
  const staff = members.filter(m => (STAFF_ROLES as readonly string[]).includes(m.role))

  const studentsByStatus: Record<string, number> = {}
  for (const s of students) studentsByStatus[s.status] = (studentsByStatus[s.status] ?? 0) + 1

  const membershipsByStatus: Record<string, number> = {}
  for (const m of memberships) membershipsByStatus[m.status] = (membershipsByStatus[m.status] ?? 0) + 1

  const bookingsByStatus30: Record<string, number> = {}
  for (const b of bookingStats30) bookingsByStatus30[b.status] = b._count

  return NextResponse.json({
    school: {
      id: school.id, name: school.name, slug: school.slug, status: school.status, type: school.type,
      city: school.city, country: school.country, email: school.email, phone: school.phone,
      logoUrl: school.logoUrl, createdAt: school.createdAt,
      claimed: Boolean(school.claimedById),
      stripeConnected: Boolean(school.stripePublishableKey),
      revolutConnected: Boolean(school.revolutPublicKey),
      subscriptionStatus: school.subscription?.status ?? null,
    },
    stats: {
      students: students.length,
      studentsByStatus,
      staff: staff.length,
      membershipsByStatus,
      activeClasses: classes.filter(c => c.isActive).length,
      bookings30: Object.values(bookingsByStatus30).reduce((a, b) => a + b, 0),
      bookingsByStatus30,
      attended30,
      upcoming14: upcomingBookings.length,
      incomeThisMonth: incomeThisMonth.map(r => ({ currency: r.currency, amount: r._sum.amount ?? 0 })),
    },
    staff: staff.map(m => ({
      id: m.id, role: m.role, status: m.status,
      name: m.user.name, email: m.user.email,
    })),
    students: students.map(m => {
      const ms = currentMembershipByUser.get(m.user.id)
      return {
        id: m.id, status: m.status, belt: m.belt, beltDegree: m.beltDegree,
        joinedAt: m.joinedAt ?? m.createdAt,
        name: m.user.name, email: m.user.email, phone: m.user.phone,
        attended: attendedByUser.get(m.user.id) ?? 0,
        membership: ms ? {
          planName: ms.planName, price: ms.price, currency: ms.currency,
          paymentMethod: ms.paymentMethod, status: ms.status, paymentStatus: ms.paymentStatus,
          endDate: ms.endDate,
        } : null,
      }
    }),
    classes: classes.map(c => ({
      id: c.id, name: c.name, level: c.level, duration: c.duration, capacity: c.capacity,
      isActive: c.isActive, isPublished: c.isPublished, isTrial: c.isTrial,
      schedule: Array.isArray(c.schedule) ? c.schedule : [],
      instructor: c.instructor?.name ?? null,
      bookings30: c._count.bookings,
    })),
    recentBookings,
    upcomingBookings,
    transactions,
  })
}
