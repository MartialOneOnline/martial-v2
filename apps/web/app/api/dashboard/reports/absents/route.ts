import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { absencePeriod, isAbsencePeriod } from '@/lib/absences/periods'
import { schoolTimeZone } from '@/lib/memberActivity'
import { cleanPhone, whatsappNumber } from '@/lib/phone'
import { isTrialMembership } from '@/lib/services/trial'
import {
  aggregateNoShows, buildAbsenceLists, isUnmarked, UNMARKED_AFTER_MS, USUAL_WINDOW_WEEKS,
  type AbsenceRow, type PlanInfo, type StudentInput,
} from '@/lib/absences/stopped'

// requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
// requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT must
// not read the per-member attendance roster for the school.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  try { await requireDashboardAccess(schoolId) }
  catch { return { error: 'Forbidden', status: 403 } }
  return { schoolId }
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
// Enough history for "how often they came" before a gap of up to a year
const HISTORY_DAYS = 365 + USUAL_WINDOW_WEEKS * 7

/**
 * GET /api/dashboard/reports/absents?period=30d|90d|12m|custom
 * - lists: active students who stopped coming (7–13 / 14–29 / 30+ days) and
 *   those who never came — computed from attended classes, independent of period
 * - noShows: booked and didn't come (or nobody marked it) within the period
 * - cancellations: count, trend and day-of-week within the period
 */
export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const schoolId = auth.schoolId

  const { searchParams } = new URL(req.url)
  const rawPeriod = searchParams.get('period')
  const period = isAbsencePeriod(rawPeriod) ? rawPeriod : '30d'
  const now = new Date()

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const timeZone = schoolTimeZone(school?.country)
  // Period limits and buckets in the school's timezone, not the server's
  const { from, to: toDate, points } = absencePeriod(period, timeZone, now)

  // ── Active students (FROZEN = paused on purpose, not an absence) ─────────
  const members = await prisma.schoolMember.findMany({
    where: { schoolId, role: 'STUDENT', status: 'ACTIVE' },
    select: { id: true, userId: true, joinedAt: true, createdAt: true, user: { select: { name: true, email: true, phone: true, avatarUrl: true } } },
  })
  // Staff who also hold a student row aren't absent students
  const staff = await prisma.schoolMember.findMany({
    where: { schoolId, role: { not: 'STUDENT' }, userId: { in: members.map(m => m.userId) } },
    select: { userId: true },
  })
  const staffIds = new Set(staff.map(s => s.userId))
  const students: StudentInput[] = members.filter(m => !staffIds.has(m.userId)).map(m => ({
    memberId: m.id, userId: m.userId, name: m.user?.name ?? m.user?.email ?? '—',
    email: m.user?.email ?? null, phone: cleanPhone(m.user?.phone), avatarUrl: m.user?.avatarUrl ?? null,
    // No joinedAt (older rows): when the membership row was created — never "assume 7 days passed"
    joinedAt: m.joinedAt ?? m.createdAt ?? null,
  }))
  const userIds = students.map(s => s.userId)

  const attendedHere = { class: { schoolId }, attendedAt: { not: null }, status: { not: 'CANCELLED' as const } }
  const [recent, lastEver, memberships] = await Promise.all([
    prisma.booking.findMany({
      where: { ...attendedHere, userId: { in: userIds }, scheduledAt: { gte: new Date(now.getTime() - HISTORY_DAYS * 86_400_000), lte: now } },
      select: { userId: true, scheduledAt: true },
    }),
    prisma.booking.groupBy({
      by: ['userId'],
      where: { ...attendedHere, userId: { in: userIds }, scheduledAt: { lte: now } },
      _max: { scheduledAt: true },
    }),
    prisma.membership.findMany({
      where: { schoolId, userId: { in: userIds }, status: 'ACTIVE' },
      orderBy: { price: 'desc' },
      select: { userId: true, planId: true, planName: true, price: true, plan: { select: { planType: true, validityDays: true } } },
    }),
  ])

  const classes = new Map<string, Date[]>()
  for (const b of recent) {
    const list = classes.get(b.userId)
    if (list) list.push(b.scheduledAt)
    else classes.set(b.userId, [b.scheduledAt])
  }
  const lastEverMap = new Map<string, Date>()
  for (const g of lastEver) if (g._max?.scheduledAt) lastEverMap.set(g.userId, g._max.scheduledAt)
  const plans = new Map<string, PlanInfo>()
  for (const m of memberships) {
    if (plans.has(m.userId)) continue // highest price first: the plan that pays
    const trial = isTrialMembership(m)
    plans.set(m.userId, { name: m.planName, trial, paying: !trial && Number(m.price) > 0 })
  }

  const lists = buildAbsenceLists({ students, classes, lastEver: lastEverMap, plans, now, timeZone })
  const toRow = (r: AbsenceRow) => ({
    memberId: r.memberId, name: r.name, email: r.email, phone: r.phone,
    whatsapp: whatsappNumber(r.phone, school?.country), avatarUrl: r.avatarUrl,
    joinedAt: r.joinedAt?.toISOString() ?? null, lastClassAt: r.lastClassAt?.toISOString() ?? null,
    daysSince: r.daysSince, usualPerWeek: r.usualPerWeek, plan: r.plan,
  })

  // ── Within the period: no-shows (incl. unmarked) and cancellations ───────
  // Same people as the lists (active students, no staff), so counts and rows agree
  const inPeriod = { gte: from, lte: toDate }
  const unmarkedBefore = new Date(now.getTime() - UNMARKED_AFTER_MS)
  const [missedRaw, cancelled] = await Promise.all([
    prisma.booking.findMany({
      where: {
        class: { schoolId }, scheduledAt: inPeriod, userId: { in: userIds },
        OR: [{ status: 'NO_SHOW' }, { status: 'CONFIRMED', attendedAt: null, scheduledAt: { lt: unmarkedBefore } }],
      },
      select: { userId: true, scheduledAt: true, status: true, class: { select: { name: true, duration: true } }, user: { select: { name: true, email: true, phone: true, avatarUrl: true } } },
    }),
    prisma.booking.findMany({
      where: { class: { schoolId }, scheduledAt: inPeriod, status: 'CANCELLED', userId: { in: userIds } },
      select: { scheduledAt: true },
    }),
  ])
  // "Not marked" only once the class has ENDED three hours ago
  const missed = missedRaw.filter(b => b.status === 'NO_SHOW' || isUnmarked(b.scheduledAt, b.class?.duration ?? null, now))
  const missedUsers = new Map(missed.map(b => [b.userId, b.user]))
  const memberIdByUser = new Map(members.map(m => [m.userId, m.id]))
  const noShows = aggregateNoShows(missed.map(b => ({ userId: b.userId, scheduledAt: b.scheduledAt, status: b.status, className: b.class?.name ?? '—' })))
    .map(a => {
      const u = missedUsers.get(a.userId)
      return {
        memberId: memberIdByUser.get(a.userId) ?? null, name: u?.name ?? u?.email ?? '—', email: u?.email ?? null,
        phone: cleanPhone(u?.phone), whatsapp: whatsappNumber(u?.phone, school?.country), avatarUrl: u?.avatarUrl ?? null,
        noShows: a.noShows, unmarked: a.unmarked, lastAt: a.lastAt.toISOString(), topClass: a.topClass,
      }
    })

  const dow = Object.fromEntries(DOW.map(d => [d, { cancelled: 0, missed: 0 }])) as Record<(typeof DOW)[number], { cancelled: number; missed: number }>
  const dayOf = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(d) as (typeof DOW)[number]
  for (const b of cancelled) dow[dayOf(b.scheduledAt)]!.cancelled++
  for (const b of missed) dow[dayOf(b.scheduledAt)]!.missed++
  const trend = points.map(pt => ({
    key: pt.key, kind: pt.kind,
    cancelled: cancelled.filter(b => b.scheduledAt >= pt.from && b.scheduledAt <= pt.to).length,
    missed: missed.filter(b => b.scheduledAt >= pt.from && b.scheduledAt <= pt.to).length,
  }))

  const payingAway = [...lists.AT_RISK, ...lists.LOST].filter(r => r.plan?.paying).length
  return NextResponse.json({
    summary: {
      active: students.length,
      warning: lists.WARNING.length, atRisk: lists.AT_RISK.length, lost: lists.LOST.length, never: lists.NEVER.length,
      payingAway,
    },
    lists: {
      WARNING: lists.WARNING.map(toRow), AT_RISK: lists.AT_RISK.map(toRow), LOST: lists.LOST.map(toRow), NEVER: lists.NEVER.map(toRow),
    },
    noShows,
    period: {
      key: period,
      cancelled: cancelled.length,
      noShows: missed.filter(b => b.status === 'NO_SHOW').length,
      unmarked: missed.filter(b => b.status !== 'NO_SHOW').length,
      trend,
      dow: DOW.map(d => ({ day: d, ...dow[d] })),
    },
  })
}
