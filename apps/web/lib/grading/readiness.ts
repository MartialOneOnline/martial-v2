// Grading readiness — what grading a student is due, based on attendance.
//
// Rule semantics (confirmed with the school owner, 2026-10-26, mirrors V1):
// each grading at a belt has its own class count, counted from the previous
// grading. `classesByDegree[i]` = classes from stripe i to stripe i+1, and
// `[maxDegrees]` = from the last stripe to the next belt (RGM Blanco =
// [8, 16, 24, 24, 24]). Missing entries fall back to `totalClassesRequired`.
// A student who hasn't been graded in a while can be due several stripes at
// once (e.g. 50 classes at Blanco 0 → 8+16+24 → 3 stripes).
//
// We never go past the next belt: a belt is the instructor's call, so the
// count stops there. The belt step also needs the NEXT rank's minAge and
// minMonthsAtPrevious.
//
// Each school sets its own rules (2026-11-01) — any mix of, per grading:
//  - classes since the previous grading (classesByDegree / totalClassesRequired)
//  - minimum months since the previous grading (monthsByDegree), e.g. IBJJF
//    black belt degrees; cumulative when several steps are due at once
//  - minimum age for a stripe (minAgeByDegree); the belt uses the next rank's minAge
//  - training frequency for the whole belt: below classesPerPeriod nothing is
//    due (it blocks), and above maxClassesPerPeriod the extra classes in that
//    week/month don't count toward grading.
// A rule left blank doesn't apply.

import { civilDateInTz } from '../memberActivity'

export type ReadinessStatus = 'READY' | 'ALMOST_READY' | 'NOT_READY' | 'NO_RULES' | 'TOP_RANK'

/** MONTHS = time at the current belt (next rank's minMonthsAtPrevious); GRADING_MONTHS = since the previous grading */
export type RequirementKind = 'FREQUENCY' | 'MONTHS' | 'AGE' | 'GRADING_MONTHS'

export interface Requirement {
  kind: RequirementKind
  current: number
  required: number
  /** 0–100, capped */
  percent: number
  met: boolean
  /** FREQUENCY only */
  periodType?: 'WEEK' | 'MONTH'
  /** MONTHS / GRADING_MONTHS: the start date isn't known — treated as not met */
  unknown?: boolean
}

export interface GradingStep {
  kind: 'DEGREE' | 'BELT'
  rankId: string
  rankName: string
  rankColor: string
  /** Degree after this step (0 for a belt step) */
  degree: number
  /** Classes counted toward this step (0..required) — null when classes aren't a rule */
  classes: number | null
  required: number | null
  /** Enough classes AND every gate met */
  earned: boolean
  /** Every non-class rule that applies to this step (time, age, frequency) */
  gates: Requirement[]
  /** Unmet gates holding it back despite enough classes */
  blockedBy: RequirementKind[]
  /**
   * Earned steps: when the last of its rules was met (ISO) — the day of the
   * Nth class, or when the time/age was reached. null when not earned or
   * when only a frequency rule applies (that's a state, not a date).
   */
  earnedAt: string | null
}

export interface RankRules {
  id: string
  name: string
  color: string
  order: number
  maxDegrees: number
  minAge: number | null
  minMonthsAtPrevious: number | null
  totalClassesRequired: number | null
  classesByDegree: number[]
  /** Optional so older callers/fixtures keep working — missing = no rule */
  monthsByDegree?: number[]
  minAgeByDegree?: number[]
  classesPerPeriod: number | null
  maxClassesPerPeriod?: number | null
  periodType: string | null
  classTypeIds: string[]
  requireExam: boolean
  requireCompetition: boolean
}

export interface AttendedClass {
  scheduledAt: Date
  classId: string
  disciplineId: string | null
}

export interface ReadinessInput {
  /** All ranks of the member's grading system, any order */
  ranks: RankRules[]
  currentRankId: string | null
  currentDegree: number
  /** Start of the count: last grading, else belt date, else join date */
  countSince: Date | null
  /** When the current belt (not stripe) was awarded — see pickBeltSince(). null = unknown */
  beltSince: Date | null
  /** Start for "months since the previous grading". null = unknown (rule not met); omitted = countSince */
  stepSince?: Date | null
  dateOfBirth: Date | null
  attended: AttendedClass[]
  now?: Date
  /** School IANA timezone, for the week/month of the max-per-period cap. Default UTC. */
  timeZone?: string
}

export interface Readiness {
  status: ReadinessStatus
  /** 0–100 toward the next not-yet-earned step; 100 when something is due */
  percent: number | null
  /** When the first owed grading became due (ISO) — "due since"; null when nothing is due */
  dueSince: string | null
  /**
   * true when the date the student reached their current grade isn't known
   * (no grading or belt date): dueSince is then only an estimate from the
   * attendance and can't be floored at the start of the current grade.
   */
  dueSinceEstimated: boolean
  /** Highest step earned right now — what the instructor should award */
  due: { kind: 'DEGREE' | 'BELT'; rankId: string; rankName: string; rankColor: string; degree: number; count: number } | null
  /** First step not earned yet */
  next: GradingStep | null
  /** Every step from the current grade up to the next belt */
  steps: GradingStep[]
  requirements: Requirement[]
  /** Exam / competition for the belt — not tracked in the app, the instructor checks them */
  manualChecks: Array<'EXAM' | 'COMPETITION'>
  /** Classes that count toward grading since countSince (after the max-per-period cap) */
  classesSince: number
  /** Classes actually attended since countSince */
  classesAttended: number
  /** Attended classes that don't count because of maxClassesPerPeriod */
  classesOverCap: number
  classCap: { max: number; periodType: 'WEEK' | 'MONTH' } | null
  /** Classes the very next grading needs (from the current stripe) */
  classesForFirstStep: number | null
  /** The belt has class rules but this grading has no count and no fallback — nothing past it is evaluated */
  incompleteRules: { kind: 'DEGREE' | 'BELT'; degree: number; rankName: string } | null
  countSince: string | null
}

export interface GradingRecord {
  gradedAt: Date
  fromBelt: string | null
  toBelt: string
  toBeltRankId: string | null
  toDegree: number | null
}

/**
 * Date the student's CURRENT belt was awarded, for "months at belt".
 * Never uses the school join date, and never mistakes a stripe for a belt:
 *  1. latest grading INTO the current belt from a known other belt, or to degree 0
 *  2. else the earliest stripe grading at the current belt — the belt is at
 *     least that old, so it's a safe lower bound
 *  3. else member.beltDate (import / profile editor "promotion date")
 *  4. else null → unknown, and the months rule counts as not met
 */
export function pickBeltSince(input: {
  gradings: GradingRecord[]
  rankId: string | null
  beltNames: string[]
  beltDate: Date | null
}): Date | null {
  const atCurrent = landsAtRank(input.rankId, input.beltNames)
  // Only positive evidence counts as a belt change: landing on the plain belt
  // (degree 0/null), or a known origin belt that differs. A stripe with an
  // unknown origin is not one — it only proves the belt was already held.
  const isBeltChange = (g: GradingRecord) =>
    !g.toDegree ||
    (!!g.fromBelt && g.fromBelt.trim().toLowerCase() !== g.toBelt.trim().toLowerCase())

  const here = input.gradings.filter(atCurrent).sort((a, b) => a.gradedAt.getTime() - b.gradedAt.getTime())
  const beltChanges = here.filter(isBeltChange)
  if (beltChanges.length) return beltChanges[beltChanges.length - 1]!.gradedAt
  if (here.length) return here[0]!.gradedAt
  return input.beltDate
}

/**
 * Whether a grading landed on the given rank. Structured identity wins: a
 * record whose FK names another rank never matches by name (two systems can
 * both have a "White"). Name matching is only for legacy records without
 * toBeltRankId.
 */
function landsAtRank(rankId: string | null, beltNames: string[]) {
  const names = beltNames.map(n => n.trim().toLowerCase()).filter(Boolean)
  return (g: GradingRecord) => {
    if (g.toBeltRankId && rankId) return g.toBeltRankId === rankId
    return names.includes(g.toBelt.trim().toLowerCase())
  }
}

/**
 * Start of "months since the previous grading" — the date the student reached
 * their CURRENT rank and degree. Only evidence for that exact grade counts:
 *  1. latest grading that landed on the current rank AND degree
 *  2. else, at degree 0, member.beltDate (the belt's award date)
 *  3. else, at the very first grade of the system, the join date (they started there)
 *  4. else null → unknown, and the time rule counts as not met
 * A grading at another rank or system never resolves it (Project Audit PR #38 P1).
 */
export function pickStepSince(input: {
  gradings: GradingRecord[]
  rankId: string | null
  beltNames: string[]
  degree: number
  beltDate: Date | null
  joinedAt: Date | null
  isFirstGrade: boolean
}): Date | null {
  const atRank = landsAtRank(input.rankId, input.beltNames)
  const here = input.gradings
    .filter(g => atRank(g) && (g.toDegree ?? 0) === input.degree)
    .sort((a, b) => b.gradedAt.getTime() - a.gradedAt.getTime())
  if (here.length) return here[0]!.gradedAt
  if (input.degree === 0 && input.beltDate) return input.beltDate
  return input.isFirstGrade ? input.joinedAt : null
}

export const ALMOST_READY_THRESHOLD = 75

const FREQUENCY_WINDOW_WEEKS = 12
const FREQUENCY_WINDOW_MONTHS = 3
const DAY_MS = 24 * 60 * 60 * 1000

function pct(current: number, required: number): number {
  if (required <= 0) return 100
  return Math.max(0, Math.min(100, Math.floor((current / required) * 100)))
}

function wholeMonthsBetween(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth())
  if (to.getUTCDate() < from.getUTCDate()) months -= 1
  return Math.max(0, months)
}

function ageAt(dob: Date, at: Date): number {
  let age = at.getUTCFullYear() - dob.getUTCFullYear()
  const m = at.getUTCMonth() - dob.getUTCMonth()
  if (m < 0 || (m === 0 && at.getUTCDate() < dob.getUTCDate())) age -= 1
  return age
}

/**
 * Week (Monday start) or calendar month of an instant, on the school's local
 * calendar — a 00:15 Tuesday class in Madrid is 23:15 Monday UTC.
 */
function periodKey(d: Date, type: 'WEEK' | 'MONTH', timeZone: string): number {
  const [y, m, day] = civilDateInTz(d, timeZone).split('-').map(Number) as [number, number, number]
  if (type === 'MONTH') return y * 12 + (m - 1)
  const civil = Date.UTC(y, m - 1, day)
  const sinceMonday = (new Date(civil).getUTCDay() + 6) % 7
  return civil - sinceMonday * DAY_MS
}

/** Keeps at most `max` classes per week/month (school calendar), earliest first. */
export function capPerPeriod(classes: AttendedClass[], max: number, type: 'WEEK' | 'MONTH', timeZone = 'UTC'): AttendedClass[] {
  const perPeriod = new Map<number, number>()
  return [...classes]
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .filter(c => {
      const k = periodKey(c.scheduledAt, type, timeZone)
      const n = perPeriod.get(k) ?? 0
      if (n >= max) return false
      perPeriod.set(k, n + 1)
      return true
    })
}

/** Same instant `months` calendar months earlier, clamped to the month's last day (31 May − 3 → 28/29 Feb, not 3 Mar). */
function monthsBefore(d: Date, months: number): Date {
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1))
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(d.getUTCDate(), lastDay),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()))
}

/**
 * First day on which wholeMonthsBetween(from, day) >= months — the exact
 * calendar rule the engine checks. When that month is too short for from's
 * day (31 Jan + 1 month, 29 Feb + 1 year) the rule is only met on the 1st of
 * the following month, not on a clamped 28 Feb (Project Audit PR #40 P2).
 */
function monthsMetAt(from: Date, months: number): Date {
  const y = from.getUTCFullYear(), m = from.getUTCMonth() + months, day = from.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return day <= lastDay ? new Date(Date.UTC(y, m, day)) : new Date(Date.UTC(y, m + 1, 1))
}

/** First day on which ageAt(dob, day) >= years — same rule (29 Feb birthdays → 1 Mar). */
function ageMetAt(dob: Date, years: number): Date {
  return monthsMetAt(dob, 12 * years)
}

function latest(dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null)
}

function positive(v: number | null | undefined): number | null {
  return typeof v === 'number' && v > 0 ? v : null
}

function classCounts(rank: RankRules, c: AttendedClass): boolean {
  if (!rank.classTypeIds.length) return true
  return rank.classTypeIds.includes(c.classId) || (!!c.disciplineId && rank.classTypeIds.includes(c.disciplineId))
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const now = input.now ?? new Date()
  const ranks = [...input.ranks].sort((a, b) => a.order - b.order)
  const current = ranks.find(r => r.id === input.currentRankId) ?? null
  const since = input.countSince

  const result = (r: Partial<Readiness> & { status: ReadinessStatus }): Readiness => ({
    percent: null, due: null, dueSince: null, dueSinceEstimated: false, next: null, steps: [], requirements: [], manualChecks: [],
    classesSince: 0, classesAttended: 0, classesOverCap: 0, classCap: null, classesForFirstStep: null, incompleteRules: null, countSince: since ? since.toISOString() : null, ...r,
  })

  if (!current) return result({ status: 'NO_RULES' })

  const nextRank = ranks.find(r => r.order > current.order) ?? null
  const degree = Math.min(input.currentDegree, current.maxDegrees)

  const counted = input.attended.filter(c =>
    c.scheduledAt <= now && (!since || c.scheduledAt >= since) && classCounts(current, c))
  const period: 'WEEK' | 'MONTH' | null = current.periodType === 'WEEK' || current.periodType === 'MONTH' ? current.periodType : null
  const maxPerPeriod = period ? positive(current.maxClassesPerPeriod) : null
  const classCap = maxPerPeriod && period ? { max: maxPerPeriod, periodType: period } : null
  const classesAttended = counted.length
  // Classes that count toward grading, oldest first — [n-1] is the day the nth one was reached
  const countedForGrading = classCap
    ? capPerPeriod(counted, classCap.max, classCap.periodType, input.timeZone ?? 'UTC')
    : [...counted].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
  const classesSince = countedForGrading.length
  const classCounters = { classesSince, classesAttended, classesOverCap: classesAttended - classesSince, classCap }

  // Nothing left to grade — but the attendance count is still real.
  if (degree >= current.maxDegrees && !nextRank) return result({ status: 'TOP_RANK', ...classCounters })
  /** Classes needed to go from stripe `d` to the next step at this belt — null = not a rule */
  const requiredFrom = (d: number): number | null => {
    // 0 / missing = not set for this stripe → use the belt's default
    const v = current.classesByDegree[d] || current.totalClassesRequired
    return v && v > 0 ? v : null
  }

  const requirements: Requirement[] = []

  // ── Belt gates (next rank) ────────────────────────────────────────────────
  if (nextRank?.minMonthsAtPrevious && nextRank.minMonthsAtPrevious > 0) {
    // Unknown belt date → can't prove the time at belt, so it doesn't pass.
    const unknown = !input.beltSince
    const months = input.beltSince ? wholeMonthsBetween(input.beltSince, now) : 0
    const met = !unknown && months >= nextRank.minMonthsAtPrevious
    requirements.push({
      kind: 'MONTHS', current: months, required: nextRank.minMonthsAtPrevious,
      percent: unknown ? 0 : pct(months, nextRank.minMonthsAtPrevious), met, ...(unknown && { unknown: true }),
    })
  }
  // An unknown birth date doesn't block — many schools never collected it.
  if (nextRank?.minAge && nextRank.minAge > 0 && input.dateOfBirth) {
    const age = ageAt(input.dateOfBirth, now)
    const met = age >= nextRank.minAge
    requirements.push({ kind: 'AGE', current: age, required: nextRank.minAge, percent: pct(age, nextRank.minAge), met })
  }
  const beltGates = requirements.filter(r => r.kind === 'MONTHS' || r.kind === 'AGE')
  // When each met belt gate was reached, for "due since"
  const beltGateDates: Array<Date | null> = beltGates.map(g => {
    if (!g.met) return null
    if (g.kind === 'MONTHS') return input.beltSince ? monthsMetAt(input.beltSince, g.required) : null
    return input.dateOfBirth ? ageMetAt(input.dateOfBirth, g.required) : null
  })

  // ── Frequency: below the minimum nothing is due ───────────────────────────
  let frequency: Requirement | null = null
  const minPerPeriod = period ? positive(current.classesPerPeriod) : null
  if (minPerPeriod && period) {
    const isWeek = period === 'WEEK'
    const windowStart = isWeek
      ? new Date(now.getTime() - FREQUENCY_WINDOW_WEEKS * 7 * DAY_MS)
      : monthsBefore(now, FREQUENCY_WINDOW_MONTHS)
    // Start of the count (or, unknown, the first class in the window) so a
    // student who started three weeks ago isn't averaged over twelve.
    const firstInWindow = counted.filter(c => c.scheduledAt >= windowStart)
      .reduce<Date | null>((min, c) => (!min || c.scheduledAt < min ? c.scheduledAt : min), null)
    const start = since ?? firstInWindow
    const from = start && start > windowStart ? start : windowStart
    // The full window is exactly 12 weeks / 3 calendar months; a shorter one
    // (graded or started recently) is measured in days, at least one week.
    const spanDays = Math.max(7, (now.getTime() - from.getTime()) / DAY_MS)
    const periods = from === windowStart
      ? (isWeek ? FREQUENCY_WINDOW_WEEKS : FREQUENCY_WINDOW_MONTHS)
      : (isWeek ? spanDays / 7 : spanDays / 30.44)
    // Real attendance (before the cap): the student did train that much.
    const avg = Math.round((counted.filter(c => c.scheduledAt >= from).length / periods) * 10) / 10
    frequency = {
      kind: 'FREQUENCY', current: avg, required: minPerPeriod,
      percent: pct(avg, minPerPeriod), met: avg >= minPerPeriod, periodType: period,
    }
    requirements.unshift(frequency)
  }

  // ── Steps: remaining stripes, then the next belt ──────────────────────────
  const stepSince = input.stepSince === undefined ? since : input.stepSince
  const monthsSinceGrading = stepSince ? wholeMonthsBetween(stepSince, now) : null
  const age = input.dateOfBirth ? ageAt(input.dateOfBirth, now) : null
  const monthsFrom = (d: number) => positive((current.monthsByDegree ?? [])[d])
  const ageFor = (d: number) => (d < current.maxDegrees ? positive((current.minAgeByDegree ?? [])[d]) : null)

  const steps: GradingStep[] = []
  let used = 0 // classes consumed by earlier steps
  let usedMonths = 0 // months consumed by earlier steps
  // Nothing can be owed from before the student reached the current grade
  // (e.g. a next-belt age met years ago doesn't make a grading from last
  // week overdue — Project Audit PR #40 P1). Unknown → the count start.
  const gradeSince = stepSince ?? since
  let prevEarnedAt: Date | null = gradeSince
  const pushStep = (
    kind: 'DEGREE' | 'BELT', rank: RankRules, deg: number,
    required: number | null, months: number | null, minAge: number | null,
  ) => {
    const classes = required ? Math.max(0, Math.min(required, classesSince - used)) : null
    const enoughClasses = required ? classesSince >= used + required : true
    if (required) used += required
    const gates: Requirement[] = []
    const metDates: Array<Date | null> = [required && enoughClasses ? countedForGrading[used - 1]!.scheduledAt : null]
    if (months) {
      usedMonths += months
      if (stepSince) metDates.push(monthsMetAt(stepSince, usedMonths))
      // Unknown last-grading date → can't prove the time, so it doesn't pass.
      const unknown = monthsSinceGrading === null
      const cur = monthsSinceGrading ?? 0
      gates.push({
        kind: 'GRADING_MONTHS', current: cur, required: usedMonths,
        percent: unknown ? 0 : pct(cur, usedMonths), met: !unknown && cur >= usedMonths, ...(unknown && { unknown: true }),
      })
    }
    // An unknown birth date doesn't block — many schools never collected it.
    if (minAge && age !== null) {
      gates.push({ kind: 'AGE', current: age, required: minAge, percent: pct(age, minAge), met: age >= minAge })
      metDates.push(ageMetAt(input.dateOfBirth!, minAge))
    }
    if (kind === 'BELT') { gates.push(...beltGates); metDates.push(...beltGateDates) }
    if (frequency) gates.push(frequency)
    const unmet = gates.filter(g => !g.met).map(g => g.kind)
    const earned = enoughClasses && unmet.length === 0
    // Never before the previous step, never in the future (month-end rounding)
    let earnedAt: Date | null = null
    if (earned) {
      const at = latest([...metDates, prevEarnedAt])
      earnedAt = at && at > now ? now : at
      prevEarnedAt = earnedAt
    }
    steps.push({
      kind, rankId: rank.id, rankName: rank.name, rankColor: rank.color, degree: deg,
      classes, required, earned, gates,
      blockedBy: enoughClasses ? unmet : [],
      earnedAt: earnedAt ? earnedAt.toISOString() : null,
    })
  }
  // A belt measures its gradings in classes, in time, or both. With classes,
  // every grading up to the next belt needs a count; with time only, every
  // stripe needs a time. A gap stops the walk there, so later requirements
  // can never be skipped. Neither → only the belt gates (time/age at belt).
  const usesClasses = (current.totalClassesRequired ?? 0) > 0 || current.classesByDegree.some(v => v > 0)
  const usesMonths = (current.monthsByDegree ?? []).some(v => v > 0)
  let incompleteRules: Readiness['incompleteRules'] = null
  if (usesClasses || usesMonths) {
    for (let d = degree; d <= current.maxDegrees; d++) {
      const isBelt = d === current.maxDegrees
      if (isBelt && !nextRank) break
      const rank = isBelt ? nextRank! : current
      const target = isBelt ? 0 : d + 1
      const req = usesClasses ? requiredFrom(d) : null
      const months = monthsFrom(d)
      const measurable = usesClasses ? !!req : (!!months || (isBelt && beltGates.length > 0))
      if (!measurable) {
        incompleteRules = { kind: isBelt ? 'BELT' : 'DEGREE', degree: target, rankName: rank.name }
        break
      }
      pushStep(isBelt ? 'BELT' : 'DEGREE', rank, target, req, months, isBelt ? null : ageFor(d))
    }
  } else if (nextRank && beltGates.length) {
    pushStep('BELT', nextRank, 0, null, null, null)
  }

  const manualChecks: Array<'EXAM' | 'COMPETITION'> = []
  if (nextRank?.requireExam) manualChecks.push('EXAM')
  if (nextRank?.requireCompetition) manualChecks.push('COMPETITION')

  const base = { steps, requirements, manualChecks, ...classCounters, classesForFirstStep: steps[0]?.required ?? null, incompleteRules }
  if (!steps.length) return result({ status: 'NO_RULES', ...base })

  // Steps are earned in order — a blocked belt doesn't hide earned stripes.
  let earnedCount = 0
  while (earnedCount < steps.length && steps[earnedCount]!.earned) earnedCount++
  const last = earnedCount > 0 ? steps[earnedCount - 1]! : null
  const next = steps[earnedCount] ?? null

  const due = last ? {
    kind: last.kind, rankId: last.rankId, rankName: last.rankName, rankColor: last.rankColor,
    degree: last.degree, count: earnedCount,
  } : null

  if (due) return result({ status: 'READY', percent: 100, due, dueSince: steps[0]!.earnedAt, dueSinceEstimated: !stepSince, next, ...base })

  // Nothing due yet: progress toward the first step.
  const parts: number[] = []
  if (next?.classes !== null && next?.required) parts.push(pct(next.classes, next.required))
  if (next) parts.push(...next.gates.map(g => g.percent))
  const percent = parts.length ? Math.min(...parts) : 0
  return result({
    status: percent >= ALMOST_READY_THRESHOLD ? 'ALMOST_READY' : 'NOT_READY',
    percent, due: null, next, ...base,
  })
}
