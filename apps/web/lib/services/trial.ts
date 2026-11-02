// Free trials.
//
// Decided with the school owner (2026-11-02):
// - The trial's days count from the student's FIRST CLASS, not from when
//   staff assigned it — nobody loses the trial because they couldn't come
//   in time. Until that class, the trial has no end date (and an old trial
//   that was never used gets its end date cleared, so the first booking works).
// - It ends on its last day, with no grace period (paid plans keep 30 days).
// - It never blocks entry: staff check-in still works, and the check-in says
//   "trial expired — still coming" so someone assigns a plan.
// - A trial that was never used doesn't expire.
// - An end date set by hand (cash override, date edit — Membership.endDateManual)
//   is the staff's decision: it is never moved or cleared, and the trial ends on it.
// - The first class is looked for from Membership.assignedAt (when the trial
//   was given — historical for imports), which never changes.
//
// A trial is a membership of a TRIAL plan, or the plan-less one-week trial a
// student starts from the school's public page (app/api/memberships/trial).
import { prisma } from '@/lib/db'
import { MembershipStatus } from '@/lib/prisma-client/enums'

export const TRIAL_PLAN_TYPE = 'TRIAL'
/** The self-service trial from the public school page has no plan */
export const PUBLIC_TRIAL_NAME = 'Free Trial — 1 Week'
export const PUBLIC_TRIAL_DAYS = 7

const DAY_MS = 86_400_000
// The trial class is often done before staff register the trial that same
// day, so a class up to a day before the assignment counts as its first.
const FIRST_CLASS_LOOKBACK_MS = DAY_MS

export const isTrialPlanType = (planType: string | null | undefined) => planType === TRIAL_PLAN_TYPE

/** Prisma filter matching every trial membership (plan or public page) */
export const TRIAL_MEMBERSHIP_WHERE = {
  OR: [
    { plan: { planType: TRIAL_PLAN_TYPE } },
    { planId: null, price: 0, planName: PUBLIC_TRIAL_NAME },
  ],
}
/** …and its complement: memberships that keep the paid-plan rules */
export const NON_TRIAL_MEMBERSHIP_WHERE = {
  AND: [
    { OR: [{ planId: null }, { plan: { planType: { not: TRIAL_PLAN_TYPE } } }] },
    { NOT: { planId: null, price: 0, planName: PUBLIC_TRIAL_NAME } },
  ],
}

export interface TrialMembership {
  id: string; userId: string; schoolId: string
  createdAt: Date; startDate: Date; endDate: Date | null
  assignedAt: Date | null; endDateManual: boolean
  planId: string | null; planName: string; price: number | { toString(): string }
  plan: { planType?: string | null; validityDays: number | null } | null
}

type TrialKind = Pick<TrialMembership, 'planId' | 'planName' | 'price' | 'plan'>

export function isTrialMembership(m: TrialKind): boolean {
  if (isTrialPlanType(m.plan?.planType)) return true
  return !m.planId && Number(m.price) === 0 && m.planName === PUBLIC_TRIAL_NAME
}

export function trialValidityDays(m: TrialKind): number | null {
  if (m.plan) return m.plan.validityDays && m.plan.validityDays > 0 ? m.plan.validityDays : null
  return isTrialMembership(m) ? PUBLIC_TRIAL_DAYS : null
}

/** Where a trial's window should be, given its first class (null = not started). */
export function trialWindow(validityDays: number | null | undefined, firstClass: Date | null): { startDate: Date; endDate: Date } | null {
  if (!firstClass || !validityDays || validityDays <= 0) return null
  // Plain day arithmetic: the same on any server timezone, DST changes included
  return { startDate: new Date(firstClass), endDate: new Date(firstClass.getTime() + validityDays * DAY_MS) }
}

export interface TrialState { id: string; endDate: Date | null; used: boolean; manual: boolean }

/** Over once its last day has passed — no grace. Unused ones only end if staff set the date. */
export function trialLapsed(s: Pick<TrialState, 'endDate' | 'used' | 'manual'>, now = new Date()): boolean {
  if (!s.endDate || s.endDate > now) return false
  return s.used || s.manual
}

type Db = Pick<typeof prisma, 'booking' | 'membership'>

/** When the trial was given. Older rows without assignedAt fall back to the earliest of creation and start. */
export function trialAssignedAt(m: Pick<TrialMembership, 'assignedAt' | 'createdAt' | 'startDate'>): Date {
  if (m.assignedAt) return m.assignedAt
  return m.startDate < m.createdAt ? m.startDate : m.createdAt
}

/**
 * The first attended class at this school for a trial, counted from when the
 * trial was given (stable — startDate moves when the trial is anchored).
 */
export async function firstTrialClass(db: Db, userId: string, schoolId: string, assignedAt: Date): Promise<Date | null> {
  const b = await db.booking.findFirst({
    where: {
      userId, class: { schoolId }, attendedAt: { not: null }, status: { not: 'CANCELLED' },
      scheduledAt: { gte: new Date(assignedAt.getTime() - FIRST_CLASS_LOOKBACK_MS) },
    },
    orderBy: { scheduledAt: 'asc' },
    select: { scheduledAt: true },
  })
  return b?.scheduledAt ?? null
}

/**
 * Puts one ACTIVE trial where it belongs and returns where it stands:
 * anchored on its first class, or without an end date until that class.
 * A hand-set end date is never touched. Idempotent — the reference is when
 * the trial was given (assignedAt), which never changes. `write: false`
 * computes only (dry run).
 */
export async function syncTrialWindow(db: Db, m: TrialMembership, opts: { write?: boolean } = {}): Promise<TrialState> {
  const validity = trialValidityDays(m)
  const assignedAt = trialAssignedAt(m)
  const first = await firstTrialClass(db, m.userId, m.schoolId, assignedAt)
  const used = !!first
  if (m.endDateManual) return { id: m.id, endDate: m.endDate, used, manual: true }

  // An older row gets its assignment recorded once, so later syncs use the same reference
  const pin = m.assignedAt ? {} : { assignedAt }
  const write = async (data: { startDate?: Date; endDate: Date | null }) => {
    if (opts.write !== false) await db.membership.update({ where: { id: m.id }, data: { ...data, ...pin } })
  }
  const w = trialWindow(validity, first)
  if (!w) {
    // Not started yet: no end date, so the first booking isn't refused
    if (m.endDate || !m.assignedAt) await write({ endDate: null })
    return { id: m.id, endDate: null, used, manual: false }
  }
  if (!m.assignedAt || m.startDate.getTime() !== w.startDate.getTime() || m.endDate?.getTime() !== w.endDate.getTime()) await write(w)
  return { id: m.id, endDate: w.endDate, used: true, manual: false }
}

export const trialSelect = {
  id: true, userId: true, schoolId: true, createdAt: true, startDate: true, endDate: true,
  assignedAt: true, endDateManual: true, planId: true, planName: true, price: true,
  plan: { select: { planType: true, validityDays: true } },
} as const

/**
 * Brings these students' active trials at this school up to date — after
 * attendance is recorded (starts the clock) and before a booking is checked
 * (an unused old trial must not refuse the first class). Never throws.
 */
export async function syncTrials(userIds: string[], schoolId: string): Promise<void> {
  if (!userIds.length) return
  try {
    const trials = await prisma.membership.findMany({
      where: { userId: { in: [...new Set(userIds)] }, schoolId, status: MembershipStatus.ACTIVE, ...TRIAL_MEMBERSHIP_WHERE },
      select: trialSelect,
    })
    for (const t of trials) await syncTrialWindow(prisma, t)
  } catch (err) {
    console.error('[trial] could not sync trial window:', err)
  }
}

/**
 * For the check-in screen: this student came on a trial that is over and has
 * no other plan — "trial expired, still coming". Never blocks anything.
 */
export async function trialExpiredFor(userId: string, schoolId: string, now = new Date()): Promise<boolean> {
  const memberships = await prisma.membership.findMany({
    where: { userId, schoolId, status: { in: [MembershipStatus.ACTIVE, MembershipStatus.EXPIRED, MembershipStatus.CANCELLED] } },
    orderBy: { startDate: 'desc' },
    select: { status: true, endDate: true, planId: true, planName: true, price: true, plan: { select: { planType: true, validityDays: true } } },
  })
  const active = memberships.filter(m => m.status === MembershipStatus.ACTIVE)
  if (active.some(m => !isTrialMembership(m))) return false
  // Still active in the database but past its last day (the nightly sweep hasn't run yet)
  if (active.length) return active.every(m => !!m.endDate && m.endDate <= now)
  const latest = memberships[0]
  return !!latest && isTrialMembership(latest) && latest.status === MembershipStatus.EXPIRED
}
