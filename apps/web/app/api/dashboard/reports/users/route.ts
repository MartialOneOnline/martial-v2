import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import {
  addMonths, monthRange, schoolTimeZone, reportMonths, zonedRangeBounds,
  computeMonthlyActivity, summarisePeriod, activityByUser, segmentUsers, atRiskUsers,
  ACTIVITY_SEGMENTS, cohortRetention, closedPeriodMonths, markProvisional, type ActivityRow, type ActivitySegment,
} from '@/lib/memberActivity'
import { cleanPhone, whatsappNumber } from '@/lib/phone'

// requireDashboardAccess() bypasses this for SUPERADMIN and otherwise
// requires an ACTIVE SchoolMember with a staff-facing role — a STUDENT must
// not read the full member roster (names/emails/belts/plans) for the school.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  try { await requireDashboardAccess(schoolId) }
  catch { return { error: 'Forbidden', status: 403 } }
  return { schoolId }
}

export async function GET(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const period   = searchParams.get('period')  ?? '30d'
  const status   = searchParams.get('status')  ?? 'ALL'
  const search   = searchParams.get('search')  ?? ''
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(1000, parseInt(searchParams.get('pageSize') ?? '15'))

  const dateFrom = searchParams.get('dateFrom')
  const dateTo   = searchParams.get('dateTo')

  // Period → months (stats + custom chart) and, for a custom range, the
  // member-list bounds — all in the school's timezone from the civil dates
  // picked, never via server-local Dates (see reportMonths). Unlike the other
  // reports, the member list itself is a roster (not a per-period event log),
  // so the 7d/30d/90d/12m presets don't narrow it — only an explicit 'custom'
  // range does, replacing what used to be a separate, disconnected "Joined
  // date range" filter.
  const school = await prisma.school.findUnique({ where: { id: auth.schoolId }, select: { country: true, name: true } })
  const tz = schoolTimeZone(school?.country)
  const now = new Date()
  const isCustom = period === 'custom' && !!dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)
  const { fromMonth, toMonth } = reportMonths(period, dateFrom, dateTo, now, tz)
  const nowMonth = reportMonths('12m', null, null, now, tz).toMonth

  // Who-filter for the member list: students who were new / lost / came back
  // in `month`, or are at risk right now (see lib/memberActivity.ts). When
  // set it replaces the status tab and the custom joined-date filter — the
  // list is then exactly the students behind the monthly numbers.
  const segmentParam = searchParams.get('segment')
  const segment = ACTIVITY_SEGMENTS.find(s => s === segmentParam) ?? null
  const monthParam = searchParams.get('month')
  const segmentMonth = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) && monthParam <= nowMonth ? monthParam : nowMonth

  // ── Activity history ─────────────────────────────────────────────────────────
  // Rebuilt from activity (paid membership fee or attended class) because
  // SchoolMember.status has no history — see lib/memberActivity.ts for the
  // exact definitions. One row per (student, local month) over the school's
  // whole history, so "new" vs "returning" is right for any window. Columns
  // are `timestamp without time zone` holding UTC, hence the double AT TIME
  // ZONE (UTC → school-local) before bucketing by month.
  const [activity, attendance] = await Promise.all([
    prisma.$queryRaw<ActivityRow[]>`
      SELECT DISTINCT a."userId", a.month FROM (
        SELECT t."userId", to_char((t.date AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM') AS month
        FROM transactions t
        WHERE t."schoolId" = ${auth.schoolId} AND t.category = 'MEMBERSHIP' AND t.status = 'PAID'
          AND t."deletedAt" IS NULL AND t."userId" IS NOT NULL
        UNION
        SELECT b."userId", to_char((b."attendedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM')
        FROM bookings b JOIN classes c ON c.id = b."classId"
        WHERE c."schoolId" = ${auth.schoolId} AND b."attendedAt" IS NOT NULL AND b.status <> 'CANCELLED'
      ) a
      WHERE NOT EXISTS (
        SELECT 1 FROM school_members sm
        WHERE sm."userId" = a."userId" AND sm."schoolId" = ${auth.schoolId} AND sm.role <> 'STUDENT'
      )`,
    // Last class + total classes per student (for "at risk" and the list columns)
    prisma.booking.groupBy({
      by: ['userId'],
      where: { class: { schoolId: auth.schoolId }, attendedAt: { not: null }, status: { not: 'CANCELLED' } },
      _max: { attendedAt: true },
      _count: { _all: true },
    }),
  ])
  const byUser = activityByUser(activity)
  const lastAttended = new Map<string, Date>()
  const classCount = new Map<string, number>()
  for (const a of attendance) {
    if (a._max.attendedAt) lastAttended.set(a.userId, a._max.attendedAt)
    classCount.set(a.userId, a._count._all)
  }

  // Full history for the monthly CSV ("Export full history"): every month
  // from the school's first recorded activity, without the member list.
  if (searchParams.get('view') === 'history') {
    const firstMonth = activity.reduce((min, r) => (r.month < min ? r.month : min), nowMonth)
    const months = monthRange(firstMonth, nowMonth)
    return NextResponse.json({
      currentMonth: nowMonth,
      monthly: markProvisional(computeMonthlyActivity(activity, months), nowMonth),
      cohorts: cohortRetention(activity, months, nowMonth),
    })
  }

  const segmentAll: Record<ActivitySegment, string[]> = {
    NEW:       segmentUsers(byUser, segmentMonth, 'NEW'),
    LOST:      segmentUsers(byUser, segmentMonth, 'LOST'),
    RETURNING: segmentUsers(byUser, segmentMonth, 'RETURNING'),
    AT_RISK:   atRiskUsers(byUser, lastAttended, now, nowMonth),
  }
  // The monthly numbers keep students whose account was later removed from
  // the school (they were real students then), but those can't be listed or
  // contacted — so the list and its tab counts only include students still on
  // the roster, and `segmentRemoved` says how many were left out.
  const rosterUserIds = new Set((await prisma.schoolMember.findMany({
    where: { schoolId: auth.schoolId, role: 'STUDENT' }, select: { userId: true },
  })).map(m => m.userId))
  const segmentIds = Object.fromEntries(
    ACTIVITY_SEGMENTS.map(seg => [seg, segmentAll[seg].filter(id => rosterUserIds.has(id))]),
  ) as Record<ActivitySegment, string[]>

  // ── Member list ──────────────────────────────────────────────────────────────
  const belt = searchParams.get('belt') ?? ''

  // Many members still have a null joinedAt (no real join date recovered
  // yet — see backfill-joined-at-from-v1.mjs / -from-activity.mjs) and fall
  // back to createdAt for display, same as the per-member "Joined" column
  // below. Date-range filters need the same fallback — `joinedAt: { gte }`
  // alone would just silently drop every still-null row from the filter
  // entirely — so this expresses "joinedAt if set, else createdAt, within
  // range" as an OR (Prisma has no coalesce() in a where clause).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dateRangeFilter = (gte: Date, lte?: Date): any => ({
    OR: [
      { joinedAt: lte ? { gte, lte } : { gte } },
      { joinedAt: null, createdAt: lte ? { gte, lte } : { gte } },
    ],
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConditions: any[] = []
  if (isCustom && !segment) {
    const { from, to } = zonedRangeBounds(dateFrom!, dateTo, now, tz)
    andConditions.push(dateRangeFilter(from, to))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    role: 'STUDENT',
    ...(search ? {
      user: { OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search.replace(/\s/g, '') } },
      ]},
    } : {}),
    ...(belt ? { belt } : {}),
    ...(segment ? { userId: { in: segmentIds[segment] } } : {}),
    ...(!segment && status === 'ACTIVE'   ? { status: 'ACTIVE' } : {}),
    ...(!segment && status === 'INACTIVE' ? { status: { in: ['INACTIVE', 'FROZEN', 'LEAD'] } } : {}),
    ...(andConditions.length ? { AND: andConditions } : {}),
  }

  const memberInclude = { user: { select: { name: true, email: true, phone: true, avatarUrl: true } } } as const
  let members, total
  if (segment) {
    // Segments are small (tens of students), so sort in memory by most
    // recent class — the freshest contacts first — then paginate.
    const all = await prisma.schoolMember.findMany({ where, include: memberInclude })
    const t = (userId: string) => lastAttended.get(userId)?.getTime() ?? 0
    all.sort((a, b) => t(b.userId) - t(a.userId))
    total = all.length
    members = all.slice((page - 1) * pageSize, page * pageSize)
  } else {
    ;[members, total] = await Promise.all([
      prisma.schoolMember.findMany({
        where,
        include: memberInclude,
        orderBy: { joinedAt: { sort: 'desc', nulls: 'last' } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.schoolMember.count({ where }),
    ])
  }

  // Active plan + last membership payment for the listed students
  const userIds = members.map(m => m.userId)
  const [activeMemberships, lastPayments] = await Promise.all([
    prisma.membership.findMany({
      where: { userId: { in: userIds }, schoolId: auth.schoolId, status: 'ACTIVE' },
      select: { userId: true, planName: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: { in: userIds }, schoolId: auth.schoolId, category: 'MEMBERSHIP', status: 'PAID', deletedAt: null },
      select: { userId: true, date: true, amount: true, currency: true },
      orderBy: { date: 'desc' },
      distinct: ['userId'],
    }),
  ])
  const planByUser: Record<string, string> = {}
  for (const mem of activeMemberships) {
    if (!planByUser[mem.userId]) planByUser[mem.userId] = mem.planName
  }
  const lastPaymentByUser = new Map(lastPayments.map(p => [p.userId!, p]))

  // ── Belt distribution ────────────────────────────────────────────────────────
  const allActive = await prisma.schoolMember.findMany({
    where: { schoolId: auth.schoolId, role: 'STUDENT', status: 'ACTIVE' },
    select: { belt: true },
  })
  const beltMap: Record<string, number> = {}
  for (const m of allActive) {
    const b = m.belt ?? 'Unknown'
    beltMap[b] = (beltMap[b] ?? 0) + 1
  }
  const BELT_ORDER = ['Blanco', 'White', 'Azul', 'Blue', 'Morado', 'Purple', 'Marrón', 'Brown', 'Negro', 'Black']
  const beltDist = Object.entries(beltMap)
    .sort(([a], [b]) => {
      const ai = BELT_ORDER.indexOf(a); const bi = BELT_ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    .map(([name, value]) => ({ name, value }))

  // ── Monthly series + period summary ──────────────────────────────────────────
  // Cards compare closed months only — the month in progress would read as a
  // big drop every 1st (see closedPeriodMonths in lib/memberActivity.ts).
  const closedPeriod = closedPeriodMonths(fromMonth, toMonth, nowMonth, !isCustom)
  const summary = summarisePeriod(activity, closedPeriod.fromMonth, closedPeriod.toMonth)

  // Chart + table: monthly granularity only makes sense over several months,
  // so presets always show the last 12; a custom range shows its own months
  // (at least 2, at most 36).
  let chartFrom = addMonths(nowMonth, -11)
  let chartTo = nowMonth
  if (isCustom) {
    chartTo = toMonth
    chartFrom = fromMonth < chartTo ? fromMonth : addMonths(chartTo, -1)
    if (monthRange(chartFrom, chartTo).length > 36) chartFrom = addMonths(chartTo, -35)
  }
  const monthly = markProvisional(computeMonthlyActivity(activity, monthRange(chartFrom, chartTo)), nowMonth)
  const cohorts = cohortRetention(activity, monthRange(chartFrom, chartTo), nowMonth)

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const totalActive = await prisma.schoolMember.count({ where: { schoolId: auth.schoolId, role: 'STUDENT', status: 'ACTIVE' } })

  return NextResponse.json({
    stats: {
      totalActive,
      newInPeriod: summary.new,
      returningInPeriod: summary.returning,
      lostInPeriod: summary.lost,
      growthPct: summary.growthPct,
      retentionPct: summary.retentionPct,
      baseMonth: summary.baseMonth,
      endMonth: summary.endMonth,
      baseActive: summary.baseActive,
      endActive: summary.endActive,
    },
    monthly,
    cohorts,
    currentMonth: nowMonth,
    schoolName: school?.name ?? '',
    segment,
    segmentMonth,
    segmentRemoved: segment ? segmentAll[segment].length - segmentIds[segment].length : 0,
    segmentCounts: {
      NEW: segmentIds.NEW.length, LOST: segmentIds.LOST.length,
      RETURNING: segmentIds.RETURNING.length, AT_RISK: segmentIds.AT_RISK.length,
    },
    beltDist,
    members: members.map(m => {
      const act = byUser.get(m.userId)
      const pay = lastPaymentByUser.get(m.userId)
      return {
        id:        m.id,
        name:      m.user?.name     ?? '—',
        email:     m.user?.email    ?? '—',
        phone:     cleanPhone(m.user?.phone),
        whatsapp:  whatsappNumber(m.user?.phone, school?.country),
        avatarUrl: m.user?.avatarUrl ?? null,
        belt:      m.belt           ?? '—',
        plan:      planByUser[m.userId] ?? '—',
        status:    m.status,
        joinedAt:  (m.joinedAt ?? m.createdAt).toISOString(),
        isNew:     act?.first === nowMonth,
        firstMonth:   act?.first ?? null,
        lastMonth:    act?.last ?? null,
        monthsActive: act?.months.length ?? 0,
        classes:      classCount.get(m.userId) ?? 0,
        lastAttendedAt: lastAttended.get(m.userId)?.toISOString() ?? null,
        lastPayment: pay ? { date: pay.date.toISOString(), amount: pay.amount, currency: pay.currency } : null,
      }
    }),
    total,
    page,
    pageSize,
  })
}
