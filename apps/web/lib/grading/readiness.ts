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
}

export interface Readiness {
  status: ReadinessStatus
  /** 0–100 toward the next not-yet-earned step; 100 when something is due */
  percent: number | null
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
  const names = input.beltNames.map(n => n.trim().toLowerCase()).filter(Boolean)
  // Structured identity wins: a record whose FK names another rank never
  // matches by name (two systems can both have a "White"). Name matching is
  // only for legacy records without toBeltRankId.
  const atCurrent = (g: GradingRecord) => {
    if (g.toBeltRankId && input.rankId) return g.toBeltRankId === input.rankId
    return names.includes(g.toBelt.trim().toLowerCase())
  }
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

/** Week (Monday start) or calendar month bucket, in UTC like the rest of this module */
function periodKey(d: Date, type: 'WEEK' | 'MONTH'): number {
  if (type === 'MONTH') return d.getUTCFullYear() * 12 + d.getUTCMonth()
  const day = (d.getUTCDay() + 6) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)
}

/** Keeps at most `max` classes per week/month, earliest first. */
export function capPerPeriod(classes: AttendedClass[], max: number, type: 'WEEK' | 'MONTH'): AttendedClass[] {
  const perPeriod = new Map<number, number>()
  return [...classes]
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .filter(c => {
      const k = periodKey(c.scheduledAt, type)
      const n = perPeriod.get(k) ?? 0
      if (n >= max) return false
      perPeriod.set(k, n + 1)
      return true
    })
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
    percent: null, due: null, next: null, steps: [], requirements: [], manualChecks: [],
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
  const classesSince = classCap ? capPerPeriod(counted, classCap.max, classCap.periodType).length : classesAttended
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

  // ── Frequency: below the minimum nothing is due ───────────────────────────
  let frequency: Requirement | null = null
  const minPerPeriod = period ? positive(current.classesPerPeriod) : null
  if (minPerPeriod && period) {
    const isWeek = period === 'WEEK'
    const windowStart = isWeek
      ? new Date(now.getTime() - FREQUENCY_WINDOW_WEEKS * 7 * DAY_MS)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - FREQUENCY_WINDOW_MONTHS, now.getUTCDate()))
    // Start of the count (or, unknown, the first class in the window) so a
    // student who started three weeks ago isn't averaged over twelve.
    const firstInWindow = counted.filter(c => c.scheduledAt >= windowStart)
      .reduce<Date | null>((min, c) => (!min || c.scheduledAt < min ? c.scheduledAt : min), null)
    const start = since ?? firstInWindow
    const from = start && start > windowStart ? start : windowStart
    const spanDays = Math.max(7, (now.getTime() - from.getTime()) / DAY_MS)
    const periods = isWeek ? spanDays / 7 : spanDays / 30.44
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
  const pushStep = (
    kind: 'DEGREE' | 'BELT', rank: RankRules, deg: number,
    required: number | null, months: number | null, minAge: number | null,
  ) => {
    const classes = required ? Math.max(0, Math.min(required, classesSince - used)) : null
    const enoughClasses = required ? classesSince >= used + required : true
    if (required) used += required
    const gates: Requirement[] = []
    if (months) {
      usedMonths += months
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
    }
    if (kind === 'BELT') gates.push(...beltGates)
    if (frequency) gates.push(frequency)
    const unmet = gates.filter(g => !g.met).map(g => g.kind)
    steps.push({
      kind, rankId: rank.id, rankName: rank.name, rankColor: rank.color, degree: deg,
      classes, required, earned: enoughClasses && unmet.length === 0, gates,
      blockedBy: enoughClasses ? unmet : [],
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

  if (due) return result({ status: 'READY', percent: 100, due, next, ...base })

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
