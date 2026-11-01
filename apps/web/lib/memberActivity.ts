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
  /** new / active(previous month) as %; null when previous month had 0 */
  newPct: number | null
  /** returning / active(previous month) as %; null when previous month had 0 */
  returningPct: number | null
  /** active in the same month a year earlier (0 if none) */
  activeYearAgo: number
  /** % change in active vs the same month a year earlier; null when that was 0 */
  yoyPct: number | null
  /** The month is still in progress — figures are "so far", see markProvisional() */
  provisional?: boolean
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

/** Civil date 'YYYY-MM-DD' of an instant in the given IANA timezone. */
export function civilDateInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Adds days to a civil date without any timezone involved. */
export function addDaysCivil(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/**
 * First instant (UTC) whose civil date in `timeZone` is `ymd`. Found by binary
 * search rather than offset arithmetic so DST jumps at midnight resolve
 * correctly: where 00:00 doesn't exist (e.g. São Paulo 2018-11-04) the day
 * starts at the first valid local instant, 01:00.
 */
export function startOfCivilDayUtc(ymd: string, timeZone: string): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number]
  const utcMidnight = Date.UTC(y, m - 1, d)
  // Every real offset is within ±14h, so the answer is in this window.
  let lo = utcMidnight - 15 * 3_600_000
  let hi = utcMidnight + 15 * 3_600_000
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2)
    if (civilDateInTz(new Date(mid), timeZone) >= ymd) hi = mid
    else lo = mid
  }
  return new Date(hi)
}

/**
 * Last instant (UTC) of civil day `ymd` in `timeZone` — 1 ms before the next
 * day starts, so a repeated hour at the end of the day (DST ending at
 * midnight, e.g. São Paulo 2019-02-16) is included.
 */
export function endOfCivilDayUtc(ymd: string, timeZone: string): Date {
  return new Date(startOfCivilDayUtc(addDaysCivil(ymd, 1), timeZone).getTime() - 1)
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

/**
 * Months covered by a report period, from the civil dates the user picked
 * (custom) or "today" in the school's timezone (presets). Deliberately never
 * goes through server-local Date objects: a custom range ending 31 Aug at
 * 23:59 server time is already 1 Sep in Madrid when the server runs in UTC.
 * toMonth is clamped to the current month.
 */
export function reportMonths(period: string, dateFrom: string | null | undefined, dateTo: string | null | undefined, now: Date, timeZone: string): { fromMonth: MonthKey; toMonth: MonthKey } {
  const today = civilDateInTz(now, timeZone)
  const nowMonth = today.slice(0, 7)
  let fromMonth: MonthKey
  let toMonth: MonthKey = nowMonth
  if (period === 'custom' && dateFrom && YMD.test(dateFrom)) {
    fromMonth = dateFrom.slice(0, 7)
    if (dateTo && YMD.test(dateTo)) toMonth = dateTo.slice(0, 7)
  } else if (period === '7d') {
    fromMonth = addDaysCivil(today, -6).slice(0, 7)
  } else if (period === '30d') {
    fromMonth = addDaysCivil(today, -29).slice(0, 7)
  } else if (period === '90d') {
    fromMonth = addMonths(nowMonth, -2)
  } else {
    fromMonth = addMonths(nowMonth, -11)
  }
  if (toMonth > nowMonth) toMonth = nowMonth
  if (fromMonth > toMonth) fromMonth = toMonth
  return { fromMonth, toMonth }
}

/** UTC bounds of a custom civil-date range (inclusive days) in the school's timezone. */
export function zonedRangeBounds(dateFrom: string, dateTo: string | null | undefined, now: Date, timeZone: string): { from: Date; to: Date } {
  const end = dateTo && YMD.test(dateTo) ? dateTo : civilDateInTz(now, timeZone)
  return { from: startOfCivilDayUtc(dateFrom, timeZone), to: endOfCivilDayUtc(end, timeZone) }
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
    const yearAgo = addMonths(month, -12)
    let active = 0, prevActive = 0, isNew = 0, returning = 0, lost = 0, activeYearAgo = 0
    for (const userId of seen.keys()) {
      const now = isActive(userId, month)
      const before = isActive(userId, prev)
      if (now) active++
      if (before) prevActive++
      if (isActive(userId, yearAgo)) activeYearAgo++
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
      newPct:       prevActive > 0 ? round1((isNew / prevActive) * 100) : null,
      returningPct: prevActive > 0 ? round1((returning / prevActive) * 100) : null,
      activeYearAgo,
      yoyPct: activeYearAgo > 0 ? round1(((active - activeYearAgo) / activeYearAgo) * 100) : null,
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

// ── Who (not just how many) ──────────────────────────────────────────────────
// Same definitions as computeMonthlyActivity, returning the students so the
// school can see and contact them.

export type ActivitySegment = 'NEW' | 'LOST' | 'RETURNING' | 'AT_RISK'
export const ACTIVITY_SEGMENTS: ActivitySegment[] = ['NEW', 'LOST', 'RETURNING', 'AT_RISK']

/** A student counts as at risk after this many days without attending. */
export const AT_RISK_DAYS = 21

export interface UserActivity {
  /** Distinct months seen, ascending */
  months: MonthKey[]
  first: MonthKey
  last: MonthKey
}

export function activityByUser(rows: ActivityRow[]): Map<string, UserActivity> {
  const sets = new Map<string, Set<MonthKey>>()
  for (const r of rows) {
    let s = sets.get(r.userId)
    if (!s) { s = new Set(); sets.set(r.userId, s) }
    s.add(r.month)
  }
  const out = new Map<string, UserActivity>()
  for (const [userId, s] of sets) {
    const months = [...s].sort()
    out.set(userId, { months, first: months[0]!, last: months[months.length - 1]! })
  }
  return out
}

function activeIn(a: UserActivity, month: MonthKey, grace = GRACE_MONTHS): boolean {
  for (let i = 0; i <= grace; i++) if (a.months.includes(addMonths(month, -i))) return true
  return false
}

/** Students who were new / lost / came back in `month`. */
export function segmentUsers(byUser: Map<string, UserActivity>, month: MonthKey, segment: Exclude<ActivitySegment, 'AT_RISK'>, grace = GRACE_MONTHS): string[] {
  const prev = addMonths(month, -1)
  const out: string[] = []
  for (const [userId, a] of byUser) {
    const now = activeIn(a, month, grace)
    const before = activeIn(a, prev, grace)
    if (segment === 'LOST' && before && !now) out.push(userId)
    else if (segment === 'NEW' && now && !before && a.first === month) out.push(userId)
    else if (segment === 'RETURNING' && now && !before && a.first < month) out.push(userId)
  }
  return out
}

/**
 * Students still counted as active this month but who haven't attended a
 * class in AT_RISK_DAYS (or never have — paying without coming). These are
 * the ones to contact *before* they become lost.
 */
export function atRiskUsers(byUser: Map<string, UserActivity>, lastAttended: Map<string, Date>, now: Date, currentMonth: MonthKey, days = AT_RISK_DAYS, grace = GRACE_MONTHS): string[] {
  const cutoff = now.getTime() - days * 86_400_000
  const out: string[] = []
  for (const [userId, a] of byUser) {
    if (!activeIn(a, currentMonth, grace)) continue
    const last = lastAttended.get(userId)
    if (!last || last.getTime() < cutoff) out.push(userId)
  }
  return out
}

// ── New-student retention (cohorts) ──────────────────────────────────────────
// Of the students who started in a month, how many are still active k months
// later. k = 1 is left out on purpose: with the 1-month grace every new
// student is still "active" the month after they start, so it's always 100%.

export const COHORT_OFFSETS = [2, 3, 6] as const
export type CohortOffset = typeof COHORT_OFFSETS[number]

// ── The month in progress ─────────────────────────────────────────────────────
// On the 1st, "active" for the new month is only last month's students (the
// grace), nobody new has started yet and growth always reads −10…−20% even in
// months that end up positive (measured on RGM over 12 months). Lost is close
// to final — those are students who haven't paid or come for a whole month,
// i.e. the ones still worth calling this month. So:
//   - period summaries (the cards) end at the last closed month;
//   - the current month stays on the table/chart, flagged provisional, with
//     growth and year-on-year left empty until it closes.

/**
 * Period months for the summary cards, never ending in the month in progress.
 * Presets keep their length (the window slides back one month); a custom
 * range just has its end clamped to the last closed month.
 */
export function closedPeriodMonths(fromMonth: MonthKey, toMonth: MonthKey, currentMonth: MonthKey, keepLength: boolean): { fromMonth: MonthKey; toMonth: MonthKey } {
  if (toMonth < currentMonth) return { fromMonth, toMonth }
  const closed = addMonths(currentMonth, -1)
  let from = keepLength ? addMonths(fromMonth, -1) : fromMonth
  if (from > closed) from = closed
  return { fromMonth: from, toMonth: closed }
}

/** Flags the month in progress and blanks the figures that only make sense once it has closed. */
export function markProvisional(stats: MonthStats[], currentMonth: MonthKey): MonthStats[] {
  return stats.map(m => m.month === currentMonth
    ? { ...m, provisional: true, growthPct: null, yoyPct: null }
    : { ...m, provisional: false })
}

export interface CohortStats {
  month: MonthKey
  started: number
  /** % still active k months later; null when that month hasn't happened yet or nobody started */
  retained: Record<CohortOffset, number | null>
  /** absolute counts behind `retained` (for weighted averages) */
  retainedCount: Record<CohortOffset, number | null>
}

export function cohortRetention(rows: ActivityRow[], months: MonthKey[], currentMonth: MonthKey, grace = GRACE_MONTHS): CohortStats[] {
  const byUser = activityByUser(rows)
  return months.map(month => {
    const cohort = segmentUsers(byUser, month, 'NEW', grace)
    const retained = {} as Record<CohortOffset, number | null>
    const retainedCount = {} as Record<CohortOffset, number | null>
    for (const k of COHORT_OFFSETS) {
      const target = addMonths(month, k)
      // Only measure against closed months: the current one is still filling up
      if (target >= currentMonth || cohort.length === 0) { retained[k] = null; retainedCount[k] = null; continue }
      const n = cohort.filter(u => activeIn(byUser.get(u)!, target, grace)).length
      retainedCount[k] = n
      retained[k] = round1((n / cohort.length) * 100)
    }
    return { month, started: cohort.length, retained, retainedCount }
  })
}

/** Weighted % still active k months later across the given cohorts (null if none measurable). */
export function averageRetention(cohorts: CohortStats[], k: CohortOffset): number | null {
  let started = 0, kept = 0
  for (const c of cohorts) {
    const n = c.retainedCount[k]
    if (n === null) continue
    started += c.started; kept += n
  }
  return started > 0 ? round1((kept / started) * 100) : null
}
