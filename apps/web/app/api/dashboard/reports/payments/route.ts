import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId, requireDashboardAccess } from '@/lib/auth/server'
import { memberHasPermission, type RoleBearer } from '@/lib/auth/customRoles'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { schoolTimeZone } from '@/lib/memberActivity'
import { cleanPhone, whatsappNumber } from '@/lib/phone'
import { isTrialMembership, NON_TRIAL_MEMBERSHIP_WHERE } from '@/lib/services/trial'
import { absencePeriod, zonedStartOfDay } from '@/lib/absences/periods'
import { daysBetween, dayKey } from '@/lib/absences/stopped'
import {
  mainCurrency, monthlyEquivalent, OLD_PENDING_DAYS, PAID_EARLY_DAYS, sortOverdue, sumByCurrency, TRAINING_RECENT_DAYS,
  UNPAID_ORDER, UNPAID_TRAINING_DAYS, unpaidState,
} from '@/lib/payments/collect'

// Who owes the school money is financial data: dashboard access is not
// enough, it needs the same permission as the Payments menu entry
// (school.analytics.view). SUPERADMIN has no member row and passes.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  let member: { role: string; customRoleId: string | null } | null
  try {
    ({ member } = await requireDashboardAccess(schoolId))
  } catch {
    // requireDashboardAccess only knows the base staff roles; a school-defined
    // (CUSTOM) staff role is staff too, and is judged by its own permissions below
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (m.role !== 'CUSTOM') return { error: 'Forbidden', status: 403 }
      member = m
    } catch { return { error: 'Forbidden', status: 403 } }
  }
  if (member && !await memberHasPermission(member as RoleBearer, 'school.analytics.view')) return { error: 'Forbidden', status: 403 }
  return { schoolId }
}

const DAY = 86_400_000
type UserLite = { name: string | null; email: string | null; phone: string | null } | null

/**
 * GET /api/dashboard/reports/payments — money to collect:
 * - toCollect: paid plans past their end date with no payment (training students first)
 * - unpaidTraining: came in the last 30 days without a paid plan
 * - failed: Stripe payments that couldn't be charged, failed transactions (90 days)
 * - oldPending: payments pending for more than 60 days (to review, nothing is changed)
 * - month: expected vs collected this month (school timezone, per currency)
 * - monthly / byMethod: collected per month over 12 months
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- same signature as the other report routes
export async function GET(_req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const schoolId = auth.schoolId
  const now = new Date()

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { country: true } })
  const timeZone = schoolTimeZone(school?.country)
  const contact = (u: UserLite) => ({
    name: u?.name ?? u?.email ?? '—', email: u?.email ?? null,
    phone: cleanPhone(u?.phone), whatsapp: whatsappNumber(u?.phone, school?.country),
  })
  const [ty, tm, td] = dayKey(now, timeZone).split('-').map(Number) as [number, number, number]
  const todayStart = zonedStartOfDay(ty, tm, td, timeZone)
  const monthStart = zonedStartOfDay(ty, tm, 1, timeZone)

  // Staff aren't customers, whatever plan rows they may have
  const staff = await prisma.schoolMember.findMany({ where: { schoolId, role: { not: 'STUDENT' } }, select: { userId: true } })
  const staffIds = new Set(staff.map(s => s.userId))
  const students = await prisma.schoolMember.findMany({ where: { schoolId, role: 'STUDENT' }, select: { id: true, userId: true } })
  const memberIdByUser = new Map(students.filter(s => !staffIds.has(s.userId)).map(s => [s.userId, s.id]))
  // Money of staff never counts; payments without a person (anonymous) do
  const notStaff = staffIds.size ? { OR: [{ userId: null }, { userId: { notIn: [...staffIds] } }] } : {}

  const attended = { class: { schoolId }, attendedAt: { not: null }, status: { not: 'CANCELLED' as const }, scheduledAt: { lte: now } }

  // ── To collect: paid plan ended, not renewed ─────────────────────────────
  const overdueRaw = await prisma.membership.findMany({
    where: {
      schoolId, status: 'ACTIVE', price: { gt: 0 }, endDate: { lt: todayStart }, cancelledAt: null,
      ...NON_TRIAL_MEMBERSHIP_WHERE,
    },
    select: {
      id: true, userId: true, endDate: true, price: true, currency: true, paymentMethod: true, planName: true,
      user: { select: { name: true, email: true, phone: true } },
      transactions: { where: { status: 'PENDING', deletedAt: null }, select: { amount: true }, take: 1 },
    },
  })
  const overdueMembers = overdueRaw.filter(m => memberIdByUser.has(m.userId))
  const overdueIds = overdueMembers.map(m => m.userId)
  const earliestDue = overdueMembers.reduce<Date | null>((min, m) => (!min || m.endDate! < min ? m.endDate! : min), null)
  const [lastClasses, lastPayments, paidAround] = await Promise.all([
    prisma.booking.groupBy({ by: ['userId'], where: { ...attended, userId: { in: overdueIds } }, _max: { scheduledAt: true } }),
    prisma.transaction.groupBy({
      by: ['userId'],
      where: { schoolId, userId: { in: overdueIds }, type: 'INCOME', category: 'MEMBERSHIP', status: 'PAID', deletedAt: null },
      _max: { date: true },
    }),
    // Payments that may already cover the overdue period (dates out of sync)
    earliestDue ? prisma.transaction.findMany({
      where: {
        schoolId, userId: { in: overdueIds }, type: 'INCOME', category: 'MEMBERSHIP', status: 'PAID', deletedAt: null,
        // Paid around/after the earliest due date, or paid earlier for a period that reaches past it
        OR: [
          { date: { gte: new Date(earliestDue.getTime() - PAID_EARLY_DAYS * DAY) } },
          { periodEnd: { gt: earliestDue } },
        ],
      },
      select: { userId: true, membershipId: true, date: true, periodEnd: true },
    }) : Promise.resolve([]),
  ])
  const lastClassBy = new Map(lastClasses.map(g => [g.userId, g._max?.scheduledAt ?? null]))
  const lastPaidBy = new Map(lastPayments.map(g => [g.userId!, g._max?.date ?? null]))
  /**
   * A paid payment for this plan (or this student) dated around or after the
   * due date, or whose period goes past it: the money may already be in and
   * only the dates weren't updated — shown "to review", never as a debt.
   */
  const paidSinceDue = (m: { id: string; userId: string; endDate: Date | null }): Date | null => {
    const due = m.endDate!.getTime()
    // A payment linked to another plan never covers this one; an unlinked payment of this student may
    const hits = paidAround.filter(t => (t.membershipId ? t.membershipId === m.id : t.userId === m.userId)
      && (t.date.getTime() >= due - PAID_EARLY_DAYS * DAY || (!!t.periodEnd && t.periodEnd.getTime() > due)))
    return hits.reduce<Date | null>((max, t) => (!max || t.date > max ? t.date : max), null)
  }
  const toCollect = sortOverdue(overdueMembers.map(m => {
    const lastClassAt = lastClassBy.get(m.userId) ?? null
    return {
      membershipId: m.id, userId: m.userId, endDate: m.endDate!, currency: m.currency,
      amount: Number(m.transactions[0]?.amount ?? m.price),
      lastClassAt,
      daysOverdue: daysBetween(m.endDate!, now, timeZone),
      training: !!lastClassAt && daysBetween(lastClassAt, now, timeZone) < TRAINING_RECENT_DAYS,
      method: m.paymentMethod, planName: m.planName, pendingRecorded: m.transactions.length > 0, user: m.user,
      paidSinceDue: paidSinceDue(m),
    }
  })).map(({ user, userId, paidSinceDue: paid, ...r }) => ({
    ...r, ...contact(user), memberId: memberIdByUser.get(userId) ?? null,
    endDate: r.endDate.toISOString(), lastClassAt: r.lastClassAt?.toISOString() ?? null,
    lastPaidAt: lastPaidBy.get(userId)?.toISOString() ?? null,
    // Paid but the plan's dates weren't moved: check the dates, don't chase the money
    toReview: !!paid, paidSinceDueAt: paid?.toISOString() ?? null,
  })).sort((a, b) => Number(a.toReview) - Number(b.toReview))

  // ── Training without a paid plan (last 30 days) ──────────────────────────
  const recent = await prisma.booking.groupBy({
    by: ['userId'],
    where: { ...attended, scheduledAt: { gte: new Date(now.getTime() - UNPAID_TRAINING_DAYS * DAY), lte: now } },
    _count: { _all: true }, _max: { scheduledAt: true },
  })
  const trainees = recent.filter(g => memberIdByUser.has(g.userId))
  const [traineeMemberships, traineeUsers] = await Promise.all([
    prisma.membership.findMany({
      where: { schoolId, userId: { in: trainees.map(g => g.userId) } },
      orderBy: { startDate: 'desc' },
      select: { userId: true, status: true, price: true, endDate: true, planId: true, planName: true, plan: { select: { planType: true, validityDays: true } } },
    }),
    prisma.user.findMany({ where: { id: { in: trainees.map(g => g.userId) } }, select: { id: true, name: true, email: true, phone: true } }),
  ])
  const msBy = new Map<string, typeof traineeMemberships>()
  for (const m of traineeMemberships) msBy.set(m.userId, [...(msBy.get(m.userId) ?? []), m])
  const userBy = new Map(traineeUsers.map(u => [u.id, u]))
  const unpaidTraining = trainees.flatMap(g => {
    const ms = msBy.get(g.userId) ?? []
    const state = unpaidState(ms.map(m => ({ status: m.status, price: Number(m.price), endDate: m.endDate, isTrial: isTrialMembership(m) })), now)
    if (!state) return []
    const current = ms.find(m => m.status === 'ACTIVE') ?? ms[0]
    return [{
      ...contact(userBy.get(g.userId) ?? null), memberId: memberIdByUser.get(g.userId) ?? null,
      state, classes: g._count?._all ?? 0, lastClassAt: g._max?.scheduledAt?.toISOString() ?? null,
      planName: current?.planName ?? null, planEndsAt: current?.endDate?.toISOString() ?? null,
    }]
  }).sort((a, b) => UNPAID_ORDER[a.state] - UNPAID_ORDER[b.state] || b.classes - a.classes)

  // ── Failed charges ────────────────────────────────────────────────────────
  const [pastDue, failedTx] = await Promise.all([
    prisma.membership.findMany({
      where: { schoolId, status: { in: ['ACTIVE', 'PAUSED'] }, paymentStatus: { in: ['PAST_DUE', 'UNPAID'] } },
      select: { userId: true, price: true, currency: true, planName: true, paymentStatus: true, paymentStatusAt: true, user: { select: { name: true, email: true, phone: true } } },
    }),
    prisma.transaction.findMany({
      where: { schoolId, type: 'INCOME', status: 'FAILED', deletedAt: null, date: { gte: new Date(now.getTime() - 90 * DAY) }, ...notStaff },
      orderBy: { date: 'desc' },
      select: { userId: true, amount: true, currency: true, description: true, date: true, paymentMethod: true, user: { select: { name: true, email: true, phone: true } } },
    }),
  ])
  const failed = [
    ...pastDue.filter(m => !staffIds.has(m.userId)).map(m => ({
      kind: m.paymentStatus as 'PAST_DUE' | 'UNPAID', ...contact(m.user), memberId: memberIdByUser.get(m.userId) ?? null,
      amount: Number(m.price), currency: m.currency, label: m.planName, date: m.paymentStatusAt?.toISOString() ?? null, method: 'STRIPE',
    })),
    ...failedTx.map(t => ({
      kind: 'FAILED' as const, ...contact(t.user), memberId: t.userId ? memberIdByUser.get(t.userId) ?? null : null,
      amount: Number(t.amount), currency: t.currency, label: t.description ?? '', date: t.date.toISOString(), method: t.paymentMethod ?? null,
    })),
  ]

  // ── Old pending payments (to review — nothing is changed here) ───────────
  const oldPendingRaw = await prisma.transaction.findMany({
    where: { schoolId, type: 'INCOME', status: 'PENDING', deletedAt: null, date: { lt: new Date(now.getTime() - OLD_PENDING_DAYS * DAY) }, ...notStaff },
    orderBy: { date: 'asc' },
    select: { id: true, userId: true, amount: true, currency: true, description: true, date: true, user: { select: { name: true, email: true, phone: true } }, membership: { select: { status: true } } },
  })
  const oldPending = oldPendingRaw.map(t => ({
    id: t.id, ...contact(t.user), memberId: t.userId ? memberIdByUser.get(t.userId) ?? null : null,
    amount: Number(t.amount), currency: t.currency, label: t.description ?? '', date: t.date.toISOString(),
    daysPending: daysBetween(t.date, now, timeZone), membershipStatus: t.membership?.status ?? null,
  }))

  // ── This month: expected vs collected (school timezone) ──────────────────
  const [subs, paidThisMonth, pendingThisMonth] = await Promise.all([
    prisma.membership.findMany({
      where: { schoolId, status: 'ACTIVE', price: { gt: 0 }, ...NON_TRIAL_MEMBERSHIP_WHERE },
      select: { userId: true, price: true, currency: true, plan: { select: { planType: true, billingCycle: true } } },
    }),
    prisma.transaction.findMany({
      where: { schoolId, type: 'INCOME', status: 'PAID', deletedAt: null, date: { gte: monthStart, lte: now }, ...notStaff },
      select: { amount: true, currency: true },
    }),
    prisma.transaction.findMany({
      where: { schoolId, type: 'INCOME', status: 'PENDING', deletedAt: null, date: { gte: monthStart, lte: now }, ...notStaff },
      select: { amount: true, currency: true },
    }),
  ])
  const expected = sumByCurrency(subs.filter(m => !staffIds.has(m.userId)).map(m => ({
    // A plan-less legacy membership is treated as monthly
    amount: monthlyEquivalent(Number(m.price), m.plan?.planType ?? 'SUBSCRIPTION', m.plan?.billingCycle ?? 'monthly'), currency: m.currency,
  })))
  const collected = sumByCurrency(paidThisMonth.map(t => ({ amount: Number(t.amount), currency: t.currency })))
  const pending = sumByCurrency(pendingThisMonth.map(t => ({ amount: Number(t.amount), currency: t.currency })))

  // ── 12 months collected, per month and per method (main currency) ────────
  const year = absencePeriod('12m', timeZone, now)
  const paidYear = await prisma.transaction.findMany({
    where: { schoolId, type: 'INCOME', status: 'PAID', deletedAt: null, date: { gte: year.from, lte: now }, ...notStaff },
    select: { amount: true, currency: true, date: true, paymentMethod: true },
  })
  const currency = mainCurrency(sumByCurrency(paidYear.map(t => ({ amount: Number(t.amount), currency: t.currency }))), Object.keys(expected)[0] ?? 'EUR')
  const inMain = paidYear.filter(t => t.currency === currency)
  const monthly = year.points.map(pt => ({
    key: pt.key,
    amount: Math.round(inMain.filter(t => t.date >= pt.from && t.date <= pt.to).reduce((s, t) => s + Number(t.amount), 0) * 100) / 100, // rounded once, after summing
  }))
  const methodTotals = new Map<string, number>()
  for (const t of inMain) methodTotals.set(t.paymentMethod ?? 'OTHER', (methodTotals.get(t.paymentMethod ?? 'OTHER') ?? 0) + Number(t.amount))
  const byMethod = [...methodTotals.entries()].map(([method, amount]) => ({ method, amount: Math.round(amount * 100) / 100 })).sort((a, b) => b.amount - a.amount)

  return NextResponse.json({
    currency,
    month: { key: dayKey(now, timeZone).slice(0, 7), expected, collected, pending },
    toCollect,
    // Only real debts: rows "to review" may already be paid
    toCollectTotal: sumByCurrency(toCollect.filter(x => !x.toReview)),
    unpaidTraining,
    failed,
    oldPending,
    oldPendingTotal: sumByCurrency(oldPending),
    monthly,
    byMethod,
    otherCurrencies: Object.keys(sumByCurrency(paidYear.map(t => ({ amount: Number(t.amount), currency: t.currency })))).filter(c => c !== currency),
  })
}
