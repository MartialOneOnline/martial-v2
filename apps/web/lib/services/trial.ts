// Free trials (MembershipPlan.planType = 'TRIAL').
//
// Decided with the school owner (2026-11-02):
// - The trial's days count from the student's FIRST CLASS, not from when
//   staff assigned it — nobody loses the trial because they couldn't come
//   in time. Until that class, the trial has no end date.
// - It ends on its last day, with no grace period (paid plans keep 30 days).
// - It never blocks entry: staff check-in still works, and the check-in says
//   "trial expired — still coming" so someone assigns a plan.
// - A trial that was never used doesn't expire.
import { prisma } from '@/lib/db'
import { MembershipStatus } from '@/lib/prisma-client/enums'

export const TRIAL_PLAN_TYPE = 'TRIAL'

// The trial class is often done before staff register the trial that same
// day, so a class up to a day before the assignment counts as its first.
const FIRST_CLASS_LOOKBACK_MS = 24 * 60 * 60 * 1000

export const isTrialPlanType = (planType: string | null | undefined) => planType === TRIAL_PLAN_TYPE

/** Where a trial's window should be, given its first class (null = not started). */
export function trialWindow(validityDays: number | null | undefined, firstClass: Date | null): { startDate: Date; endDate: Date } | null {
  if (!firstClass || !validityDays || validityDays <= 0) return null
  // Plain day arithmetic: the same on any server timezone, DST changes included
  const endDate = new Date(firstClass.getTime() + validityDays * 86_400_000)
  return { startDate: new Date(firstClass), endDate }
}

/** A used trial is over once its last day has passed — no grace. */
export function trialLapsed(endDate: Date | null, used: boolean, now = new Date()): boolean {
  return used && !!endDate && endDate <= now
}

type Db = Pick<typeof prisma, 'booking' | 'membership'>

/** The first attended class at this school counting for a trial assigned at `assignedAt`. */
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

export interface TrialState { id: string; endDate: Date | null; used: boolean }

/**
 * Re-anchors one ACTIVE trial on its first class and returns where it stands.
 * Idempotent — safe to call after every attendance write and from the expiry sweep.
 */
export async function syncTrialWindow(db: Db, membership: {
  id: string; userId: string; schoolId: string; startDate: Date; endDate: Date | null
  plan: { validityDays: number | null } | null
}, opts: { write?: boolean } = {}): Promise<TrialState> {
  const first = await firstTrialClass(db, membership.userId, membership.schoolId, membership.startDate)
  const w = trialWindow(membership.plan?.validityDays, first)
  if (!w) return { id: membership.id, endDate: membership.endDate, used: !!first }
  const same = membership.startDate.getTime() === w.startDate.getTime() && membership.endDate?.getTime() === w.endDate.getTime()
  if (!same && opts.write !== false) {
    await db.membership.update({ where: { id: membership.id }, data: { startDate: w.startDate, endDate: w.endDate } })
  }
  return { id: membership.id, endDate: w.endDate, used: true }
}

const trialSelect = {
  id: true, userId: true, schoolId: true, startDate: true, endDate: true,
  plan: { select: { validityDays: true } },
} as const

/**
 * After attendance is recorded: starts the clock of these students' trials at
 * this school (their first class). Never throws — attendance must not fail
 * because of it.
 */
export async function startTrialClocks(userIds: string[], schoolId: string): Promise<void> {
  if (!userIds.length) return
  try {
    const trials = await prisma.membership.findMany({
      where: { userId: { in: [...new Set(userIds)] }, schoolId, status: MembershipStatus.ACTIVE, plan: { planType: TRIAL_PLAN_TYPE } },
      select: trialSelect,
    })
    for (const t of trials) await syncTrialWindow(prisma, t)
  } catch (err) {
    console.error('[trial] could not start trial clock:', err)
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
    select: { status: true, endDate: true, plan: { select: { planType: true } } },
  })
  const active = memberships.filter(m => m.status === MembershipStatus.ACTIVE)
  if (active.some(m => !isTrialPlanType(m.plan?.planType))) return false
  // Still active in the database but past its last day (the nightly sweep hasn't run yet)
  if (active.length) return active.every(m => !!m.endDate && m.endDate <= now)
  const latest = memberships[0]
  return !!latest && isTrialPlanType(latest.plan?.planType) && latest.status === MembershipStatus.EXPIRED
}
