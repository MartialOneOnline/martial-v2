// Payments report: money to collect (2026-11-02, agreed with the school owner).
//
// At RGM ~88% of revenue is cash, renewed by hand: a membership past its end
// date with no payment recorded is money the school is owed, and a student
// who keeps training without a paid plan is revenue being given away. Pure —
// the API route loads the rows.

/** A pending payment older than this is probably stale (old import, forgotten) */
export const OLD_PENDING_DAYS = 60
/** "Still training" = came to a class in the last two weeks */
export const TRAINING_RECENT_DAYS = 14
/** "Training without paying" looks at the last 30 days */
export const UNPAID_TRAINING_DAYS = 30

/**
 * What a plan brings in per month, for the "expected this month" figure.
 * Only recurring subscriptions count — a one-off pass or a lifetime plan isn't
 * monthly income.
 */
export function monthlyEquivalent(price: number, planType: string | null | undefined, billingCycle: string | null | undefined): number {
  if (!(price > 0)) return 0
  if (planType && planType !== 'SUBSCRIPTION') return 0
  switch (billingCycle ?? 'monthly') {
    case 'monthly': return price
    case 'quarterly': return price / 3
    case 'annual': return price / 12
    case 'two-weekly': return (price * 26) / 12
    default: return 0 // one-off / unknown
  }
}

export type UnpaidState = 'NO_PLAN' | 'TRIAL_OVER' | 'FREE_PLAN' | 'TRIAL'

/** Most urgent first: nothing at all, then a trial that's over, a free plan, a trial still running */
export const UNPAID_ORDER: Record<UnpaidState, number> = { NO_PLAN: 0, TRIAL_OVER: 1, FREE_PLAN: 2, TRIAL: 3 }

export interface MembershipLite {
  status: string
  price: number
  endDate: Date | null
  isTrial: boolean
}

/**
 * Why someone who trains has no paid plan — null when they do have one.
 * `memberships` are this student's memberships at the school, newest first.
 */
export function unpaidState(memberships: MembershipLite[], now: Date): UnpaidState | null {
  const active = memberships.filter(m => m.status === 'ACTIVE')
  if (active.some(m => !m.isTrial && m.price > 0)) return null
  const trial = active.find(m => m.isTrial)
  if (trial) return trial.endDate && trial.endDate <= now ? 'TRIAL_OVER' : 'TRIAL'
  if (active.length) return 'FREE_PLAN'
  const latest = memberships[0]
  if (latest?.isTrial) return 'TRIAL_OVER'
  return 'NO_PLAN'
}

export interface OverdueInput {
  membershipId: string
  userId: string
  endDate: Date
  amount: number
  currency: string
  lastClassAt: Date | null
}

/** Training students first (they're still here and can pay today), then the longest overdue */
export function sortOverdue<T extends OverdueInput & { daysOverdue: number; training: boolean }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.training) - Number(a.training) || b.daysOverdue - a.daysOverdue || b.amount - a.amount)
}

/** Sum per currency — a school can have a stray GBP payment among EUR ones; never add them together */
export function sumByCurrency(rows: { amount: number; currency: string }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) out[r.currency] = Math.round(((out[r.currency] ?? 0) + r.amount) * 100) / 100
  return out
}

/** The school's main currency: the one most of its money is in */
export function mainCurrency(totals: Record<string, number>, fallback = 'EUR'): string {
  let best = fallback, max = -1
  for (const [c, n] of Object.entries(totals)) if (n > max) { max = n; best = c }
  return best
}
