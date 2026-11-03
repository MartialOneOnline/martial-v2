import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { schoolTimeZone } from '@/lib/memberActivity'
import { cleanPhone, whatsappNumber } from '@/lib/phone'
import { wallClock } from '@/lib/bookings/occupancy'
import { getGradingEnabledForSchool } from '@/lib/grading/moduleServer'
import {
  BLOCK_ITEMS, justAtRisk, recentUnmarked, todaySessions, topActions, trialDay,
  type ActionKind, type AwayRow, type BlockState, type Unmarked,
} from '@/lib/today/actions'
import { GET as paymentsReport } from '../reports/payments/route'
import { GET as leadsReport } from '../reports/leads/route'
import { GET as absencesReport } from '../reports/absents/route'
import { GET as bookingsReport } from '../reports/bookings/route'
import { GET as gradingReadiness } from '../reports/grading-readiness/route'
import { GET as membershipsList } from '../memberships/route'

type Result<T> = { state: Exclude<BlockState, 'off'>; data?: T }

/**
 * Runs one of the existing report endpoints within this request (same
 * session cookies), so its permission check and rules apply unchanged:
 * 403 → the block is hidden for this person, any other failure → an error
 * line on that block only.
 */
async function call<T>(handler: (req: NextRequest) => Promise<Response>, base: string, path: string): Promise<Result<T>> {
  try {
    const res = await handler(new NextRequest(new URL(path, base)))
    if (res.status === 401 || res.status === 403) return { state: 'forbidden' }
    if (!res.ok) return { state: 'error' }
    return { state: 'ok', data: await res.json() as T }
  } catch {
    return { state: 'error' }
  }
}

interface ContactRow { name: string; email: string | null; phone: string | null; whatsapp: string | null; memberId: string | null }
const contactOf = (r: ContactRow) => ({ name: r.name, email: r.email ?? null, phone: r.phone ?? null, whatsapp: r.whatsapp ?? null, memberId: r.memberId ?? null })

/**
 * GET /api/dashboard/today
 * What is worth doing today, block by block: today's classes and unmarked
 * ones, money of students still training, failed charges, leads, students
 * who just went 14 days without coming, pending membership requests and
 * students ready to grade — plus the three most urgent for the home page.
 * Every block comes from its report's own endpoint and permission.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  try { await requireDashboardAccess(schoolId) }
  catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const base = req.url
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const nowWall = wallClock(new Date(), schoolTimeZone(school?.country))
  const today = nowWall.toISOString().slice(0, 10)
  const dayStart = new Date(`${today}T00:00:00.000Z`)
  const dayEnd = new Date(`${today}T23:59:59.999Z`)

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const [classRows, todayBookings, cancellations, payments, leads, absences, bookings, gradingOn, memberships] = await Promise.all([
    prisma.class.findMany({ where: { schoolId, isActive: true }, select: { id: true, name: true, capacity: true, duration: true, isActive: true, schedule: true } }),
    prisma.booking.findMany({ where: { class: { schoolId }, scheduledAt: { gte: dayStart, lte: dayEnd }, status: { not: 'CANCELLED' } }, select: { classId: true, scheduledAt: true } }),
    prisma.classCancellation.findMany({ where: { class: { schoolId }, date: dayStart }, select: { classId: true } }),
    call<any>(paymentsReport, base, '/api/dashboard/reports/payments'),
    call<any>(leadsReport, base, '/api/dashboard/reports/leads'),
    call<any>(absencesReport, base, '/api/dashboard/reports/absents'),
    call<any>(bookingsReport, base, '/api/dashboard/reports/bookings?period=30d'),
    getGradingEnabledForSchool(schoolId).catch(() => false),
    call<any>(membershipsList, base, `/api/dashboard/memberships?status=PENDING&pageSize=${BLOCK_ITEMS}`),
  ])
  const readiness = gradingOn ? await call<any>(() => gradingReadiness(), base, '/api/dashboard/reports/grading-readiness') : null

  // ── Today's classes ─────────────────────────────────────────────────────
  const sessions = todaySessions({
    classes: classRows, bookings: todayBookings,
    cancelledClassIds: new Set(cancellations.map(c => c.classId)), nowWall,
  })
  const unmarked: Unmarked[] = bookings.state === 'ok' ? recentUnmarked(bookings.data.unmarked ?? [], nowWall) : []

  // ── Money: overdue plans of people still training, failed charges ───────
  const collectRows = payments.state === 'ok' ? (payments.data.toCollect as any[]).filter(r => r.training && !r.toReview) : []
  const failedRows = payments.state === 'ok' ? (payments.data.failed as any[]) : []

  // ── Leads ───────────────────────────────────────────────────────────────
  const fu = leads.state === 'ok' ? leads.data.followUps : null
  const leadRow = (r: any) => ({ id: r.id, name: r.name, email: r.email ?? null, phone: r.phone ?? null, whatsapp: r.whatsapp ?? null, memberId: null, followUpDays: r.followUpDays ?? null, upcomingAt: r.upcomingAt ?? null })
  const trials = (fu?.UPCOMING_TRIAL ?? []).map((r: any) => ({ ...leadRow(r), day: trialDay(r.upcomingAt, nowWall) })).filter((r: any) => r.day)
  const notContacted = (fu?.NOT_CONTACTED ?? []).map(leadRow)
  const triedNotJoined = (fu?.TRIED_NOT_JOINED ?? []).map(leadRow)

  // ── Retain ──────────────────────────────────────────────────────────────
  const retainRows = absences.state === 'ok' ? justAtRisk(absences.data.lists.AT_RISK as AwayRow[]) : []

  // ── Approvals and gradings ──────────────────────────────────────────────
  const pending = memberships.state === 'ok' ? (memberships.data.memberships as any[]) : []
  const pendingTotal = memberships.state === 'ok' ? Number(memberships.data.total ?? pending.length) : 0
  const ready = readiness?.state === 'ok' ? (readiness.data.students as any[]).filter(s => s.readiness?.status === 'READY') : []
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const counts: Partial<Record<ActionKind, number>> = {
    COLLECT: collectRows.length,
    TRIAL_TODAY: trials.filter((r: { day: string }) => r.day === 'TODAY').length,
    NOT_CONTACTED: notContacted.length,
    FAILED: failedRows.length,
    RETAIN: retainRows.length,
    APPROVALS: pendingTotal,
    UNMARKED: unmarked.length,
    TRIED_NOT_JOINED: triedNotJoined.length,
    GRADING: ready.length,
  }

  return NextResponse.json({
    date: today,
    top: topActions(counts),
    classes: { state: 'ok', sessions, unmarkedState: bookings.state, unmarked: unmarked.slice(0, BLOCK_ITEMS), unmarkedCount: unmarked.length },
    collect: {
      state: payments.state,
      count: collectRows.length,
      items: collectRows.slice(0, BLOCK_ITEMS).map(r => ({ ...contactOf(r), daysOverdue: r.daysOverdue, amount: r.amount, currency: r.currency, planName: r.planName })),
      failedCount: failedRows.length,
      failed: failedRows.slice(0, BLOCK_ITEMS).map(r => ({ ...contactOf(r), amount: r.amount, currency: r.currency, kind: r.kind, label: r.label })),
    },
    leads: {
      state: leads.state,
      trials: trials.slice(0, BLOCK_ITEMS), trialsCount: trials.length,
      notContacted: notContacted.slice(0, BLOCK_ITEMS), notContactedCount: notContacted.length,
      triedNotJoined: triedNotJoined.slice(0, BLOCK_ITEMS), triedNotJoinedCount: triedNotJoined.length,
    },
    retain: {
      state: absences.state,
      count: retainRows.length,
      items: retainRows.slice(0, BLOCK_ITEMS).map(r => ({ ...contactOf(r), daysSince: r.daysSince, planName: r.plan?.name ?? null })),
    },
    approvals: {
      state: memberships.state,
      count: pendingTotal,
      items: pending.map(m => ({ id: m.id, name: m.userName, email: m.userEmail ?? null, phone: null, whatsapp: null, memberId: m.schoolMemberId ?? null, planName: m.planName })),
    },
    grading: readiness === null ? { state: 'off' as const } : {
      state: readiness.state,
      count: ready.length,
      items: ready.slice(0, BLOCK_ITEMS).map(s => ({ name: s.name, email: null, phone: cleanPhone(s.phone), whatsapp: whatsappNumber(s.phone, school?.country), memberId: s.memberId, rankName: s.rankName ?? null, daysOverdue: s.daysOverdue ?? null })),
    },
  })
}
