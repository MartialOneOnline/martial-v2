// Monthly active / new / lost student counts for the Users report.
//
// SchoolMember.status only holds the *current* state (no history), and
// imported V1 memberships only go back to mid-2026, so the monthly history is
// rebuilt from activity instead: a student is "seen" in a month if they paid a
// membership fee (Transaction PAID) or attended a class (Booking.attendedAt)
// that month.
//
// Payments alone are noisy month to month (quarterly plans, cash paid a few
// days late), so a student stays active for GRACE_MONTHS after the last month
// they were seen. With the default of 1:
//   active(M)    = seen in M or M-1
//   new(M)       = first month ever seen is M
//   returning(M) = active in M, not in M-1, but seen before M (came back)
//   lost(M)      = active in M-1, not in M (last seen two months ago)
// so active(M) = active(M-1) + new(M) + returning(M) - lost(M) always holds.

export const GRACE_MONTHS = 1

/** 'YYYY-MM' */
export type MonthKey = string

export interface ActivityRow { userId: string; month: MonthKey }

export interface MonthStats {
  month: MonthKey
  active: number
  new: number
  returning: number
  lost: number
  /** % change in active vs previous month; null when previous month had 0 */
  growthPct: number | null
  /** lost / active(previous month) as %; null when previous month had 0 */
  churnPct: number | null
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const idx = y * 12 + (m - 1) + n
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

/** Inclusive list of months from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m)
  return out
}

/** Month key of a date in the given IANA timezone. */
export function monthKeyInTz(date: Date, timeZone: string): MonthKey {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
  const y = parts.find(p => p.type === 'year')?.value
  const m = parts.find(p => p.type === 'month')?.value
  return `${y}-${m}`
}

// Cash payments are stored at local midnight, which is 22:00/23:00 UTC the
// previous day — a fee paid on the 1st would land in the previous month if
// bucketed in UTC. School has no timezone field, so derive it from country.
const COUNTRY_TZ: Record<string, string> = {
  ES: 'Europe/Madrid', GB: 'Europe/London', IE: 'Europe/Dublin', PT: 'Europe/Lisbon',
  FR: 'Europe/Paris', NL: 'Europe/Amsterdam', DE: 'Europe/Berlin', IT: 'Europe/Rome',
  BR: 'America/Sao_Paulo', US: 'America/New_York', VE: 'America/Caracas',
  AE: 'Asia/Dubai', AU: 'Australia/Sydney', JP: 'Asia/Tokyo',
}
export function schoolTimeZone(country: string | null | undefined): string {
  return (country && COUNTRY_TZ[country.toUpperCase()]) || 'Europe/Madrid'
}

/**
 * Computes stats for each month in `months` (ascending, contiguous) from the
 * full activity history — rows before the first requested month are needed so
 * "new" vs "returning" and the first month's "lost" are correct.
 */
export function computeMonthlyActivity(rows: ActivityRow[], months: MonthKey[], grace = GRACE_MONTHS): MonthStats[] {
  const seen = new Map<string, Set<MonthKey>>()
  const firstSeen = new Map<string, MonthKey>()
  for (const r of rows) {
    let set = seen.get(r.userId)
    if (!set) { set = new Set(); seen.set(r.userId, set) }
    set.add(r.month)
    const f = firstSeen.get(r.userId)
    if (!f || r.month < f) firstSeen.set(r.userId, r.month)
  }

  const isActive = (userId: string, month: MonthKey) => {
    const set = seen.get(userId)!
    for (let i = 0; i <= grace; i++) if (set.has(addMonths(month, -i))) return true
    return false
  }

  const out: MonthStats[] = []
  for (const month of months) {
    const prev = addMonths(month, -1)
    let active = 0, prevActive = 0, isNew = 0, returning = 0, lost = 0
    for (const userId of seen.keys()) {
      const now = isActive(userId, month)
      const before = isActive(userId, prev)
      if (now) active++
      if (before) prevActive++
      if (before && !now) lost++
      if (now && !before) {
        if (firstSeen.get(userId) === month) isNew++
        else returning++
      }
    }
    out.push({
      month, active, new: isNew, returning, lost,
      growthPct: prevActive > 0 ? round1(((active - prevActive) / prevActive) * 100) : null,
      churnPct:  prevActive > 0 ? round1((lost / prevActive) * 100) : null,
    })
  }
  return out
}

export interface PeriodSummary {
  /** Baseline month the period is compared against */
  baseMonth: MonthKey
  endMonth: MonthKey
  baseActive: number
  endActive: number
  new: number
  returning: number
  lost: number
  growthPct: number | null
  /** % of students active in baseMonth who are still active in endMonth */
  retentionPct: number | null
}

/**
 * Summary for a report period. The baseline is the month the period starts in
 * (or the month before, when the whole period sits inside one month — e.g.
 * 7D/30D), and new/lost are summed over the months after the baseline.
 */
export function summarisePeriod(rows: ActivityRow[], fromMonth: MonthKey, toMonth: MonthKey, grace = GRACE_MONTHS): PeriodSummary {
  const baseMonth = fromMonth < toMonth ? fromMonth : addMonths(toMonth, -1)
  const months = monthRange(addMonths(baseMonth, 1), toMonth)
  const stats = computeMonthlyActivity(rows, [baseMonth, ...months], grace)
  const base = stats[0]!
  const after = stats.slice(1)
  const end = after[after.length - 1] ?? base

  // Retention: of the students active in baseMonth, how many are active in endMonth
  const byUser = new Map<string, Set<MonthKey>>()
  for (const r of rows) {
    let s = byUser.get(r.userId)
    if (!s) { s = new Set(); byUser.set(r.userId, s) }
    s.add(r.month)
  }
  const activeIn = (set: Set<MonthKey>, m: MonthKey) => {
    for (let i = 0; i <= grace; i++) if (set.has(addMonths(m, -i))) return true
    return false
  }
  let kept = 0
  for (const set of byUser.values()) if (activeIn(set, baseMonth) && activeIn(set, end.month)) kept++

  return {
    baseMonth,
    endMonth: end.month,
    baseActive: base.active,
    endActive: end.active,
    new: after.reduce((s, m) => s + m.new, 0),
    returning: after.reduce((s, m) => s + m.returning, 0),
    lost: after.reduce((s, m) => s + m.lost, 0),
    growthPct: base.active > 0 ? round1(((end.active - base.active) / base.active) * 100) : null,
    retentionPct: base.active > 0 ? round1((kept / base.active) * 100) : null,
  }
}

function round1(n: number) { return Math.round(n * 10) / 10 }
