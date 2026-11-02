// Absences report: who stopped coming (2026-11-02, agreed with the school owner).
//
// At a BJJ school most attendance is walk-ins and staff check-in, so
// cancelled bookings are a small signal; the real one is an active student
// who hasn't trained for a while. Everything here is computed from attended
// classes (check-in or booking), so schools that don't use bookings get the
// same lists. Pure — the API route loads the rows.

export type StoppedBucket = 'WARNING' | 'AT_RISK' | 'LOST'
export type AbsenceList = StoppedBucket | 'NEVER'

/** Days without a class: 7–13 warning, 14–29 at risk, 30+ nearly lost */
export const BUCKET_FROM: Record<StoppedBucket, number> = { WARNING: 7, AT_RISK: 14, LOST: 30 }
/** "How often they used to come" looks at the 8 weeks before their last class */
export const USUAL_WINDOW_WEEKS = 8
/** A student who joined less than this ago isn't "never came" yet */
export const NEVER_AFTER_DAYS = 7

export function bucketFor(daysSince: number): StoppedBucket | null {
  if (daysSince >= BUCKET_FROM.LOST) return 'LOST'
  if (daysSince >= BUCKET_FROM.AT_RISK) return 'AT_RISK'
  if (daysSince >= BUCKET_FROM.WARNING) return 'WARNING'
  return null
}

/** Calendar day (YYYY-MM-DD) of an instant in the school's timezone */
export function dayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

/** Whole calendar days from `from` to `to` in the school's timezone (DST-proof) */
export function daysBetween(from: Date, to: Date, timeZone: string): number {
  const a = Date.parse(`${dayKey(from, timeZone)}T00:00:00Z`)
  const b = Date.parse(`${dayKey(to, timeZone)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** Classes per week in the 8 weeks up to (and including) their last class, one decimal */
export function usualPerWeek(classDates: Date[], last: Date): number {
  const from = last.getTime() - USUAL_WINDOW_WEEKS * 7 * 86_400_000
  const n = classDates.filter(d => d.getTime() > from && d.getTime() <= last.getTime()).length
  return Math.round((n / USUAL_WINDOW_WEEKS) * 10) / 10
}

export interface StudentInput {
  memberId: string
  userId: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  joinedAt: Date | null
}

export interface PlanInfo { name: string; paying: boolean; trial: boolean }

export interface AbsenceRow extends StudentInput {
  lastClassAt: Date | null
  daysSince: number | null
  usualPerWeek: number | null
  plan: PlanInfo | null
}

/**
 * Sorts every active student into a list: stopped coming (by how long) or
 * never came. Paying students first — that's revenue that can still be kept —
 * then the longest gap.
 */
export function buildAbsenceLists(input: {
  students: StudentInput[]
  /** Every attended class per user (enough history for the last class + usual frequency) */
  classes: Map<string, Date[]>
  /** Last attended class ever, when older than the history above */
  lastEver: Map<string, Date>
  plans: Map<string, PlanInfo>
  now: Date
  timeZone: string
}): Record<AbsenceList, AbsenceRow[]> {
  const out: Record<AbsenceList, AbsenceRow[]> = { WARNING: [], AT_RISK: [], LOST: [], NEVER: [] }
  for (const s of input.students) {
    const dates = input.classes.get(s.userId) ?? []
    const recentLast = dates.reduce<Date | null>((m, d) => (!m || d > m ? d : m), null)
    const ever = input.lastEver.get(s.userId) ?? null
    const last = recentLast && ever ? (recentLast > ever ? recentLast : ever) : recentLast ?? ever
    const plan = input.plans.get(s.userId) ?? null
    if (!last) {
      const since = s.joinedAt ? daysBetween(s.joinedAt, input.now, input.timeZone) : null
      if (since === null || since >= NEVER_AFTER_DAYS) {
        out.NEVER.push({ ...s, lastClassAt: null, daysSince: since, usualPerWeek: null, plan })
      }
      continue
    }
    const daysSince = daysBetween(last, input.now, input.timeZone)
    const bucket = bucketFor(daysSince)
    if (!bucket) continue
    out[bucket].push({ ...s, lastClassAt: last, daysSince, usualPerWeek: usualPerWeek(dates, last), plan })
  }
  const byPriority = (a: AbsenceRow, b: AbsenceRow) =>
    Number(!!b.plan?.paying) - Number(!!a.plan?.paying) || (b.daysSince ?? 0) - (a.daysSince ?? 0) || a.name.localeCompare(b.name)
  for (const k of Object.keys(out) as AbsenceList[]) out[k].sort(byPriority)
  return out
}

/** A booking for a class that already ended but still CONFIRMED: nobody marked whether they came */
export const UNMARKED_AFTER_MS = 3 * 60 * 60 * 1000

export interface NoShowBooking { userId: string; scheduledAt: Date; status: string; className: string }
export interface NoShowAgg { userId: string; noShows: number; unmarked: number; lastAt: Date; topClass: string }

/** Per student: booked and didn't come (NO_SHOW) or nobody marked it — most first */
export function aggregateNoShows(bookings: NoShowBooking[]): NoShowAgg[] {
  const by = new Map<string, NoShowAgg & { classes: Map<string, number> }>()
  for (const b of bookings) {
    let a = by.get(b.userId)
    if (!a) { a = { userId: b.userId, noShows: 0, unmarked: 0, lastAt: b.scheduledAt, topClass: b.className, classes: new Map() }; by.set(b.userId, a) }
    if (b.status === 'NO_SHOW') a.noShows++
    else a.unmarked++
    if (b.scheduledAt > a.lastAt) a.lastAt = b.scheduledAt
    a.classes.set(b.className, (a.classes.get(b.className) ?? 0) + 1)
  }
  return [...by.values()].map(({ classes, ...a }) => {
    let top = a.topClass, max = 0
    for (const [name, n] of classes) if (n > max) { max = n; top = name }
    return { ...a, topClass: top }
  }).sort((x, y) => (y.noShows + y.unmarked) - (x.noShows + x.unmarked) || +y.lastAt - +x.lastAt)
}
