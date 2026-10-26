// Grading readiness — what grading a student is due, based on attendance.
//
// Rule semantics (confirmed with the school owner, 2026-10-26): a rank's
// `totalClassesRequired` is "classes per grading while at this belt". From
// the last grading on, every N attended classes earns the next stripe; after
// the rank's last stripe, the next N earn the belt change. A student who
// hasn't been graded in a while can therefore be due several stripes at once
// (e.g. 30 classes at 8/stripe → 3 stripes).
//
// We never go past the next belt: a belt is the instructor's call, so the
// count stops there. The belt step also needs the NEXT rank's minAge and
// minMonthsAtPrevious. Training frequency (classesPerPeriod) is shown as
// information but doesn't block — attendance already reflects it.

export type ReadinessStatus = 'READY' | 'ALMOST_READY' | 'NOT_READY' | 'NO_RULES' | 'TOP_RANK'

export type RequirementKind = 'FREQUENCY' | 'MONTHS' | 'AGE'

export interface Requirement {
  kind: RequirementKind
  current: number
  required: number
  /** 0–100, capped */
  percent: number
  met: boolean
  /** FREQUENCY only */
  periodType?: 'WEEK' | 'MONTH'
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
  /** Enough classes AND (belt step) age / months met */
  earned: boolean
  /** Belt step only: which gate is holding it back despite enough classes */
  blockedBy: Array<'AGE' | 'MONTHS'>
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
  classesPerPeriod: number | null
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
  /** When the current belt (not stripe) was awarded — for months-at-belt */
  beltSince: Date | null
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
  classesSince: number
  classesPerStep: number | null
  countSince: string | null
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
    classesSince: 0, classesPerStep: null, countSince: since ? since.toISOString() : null, ...r,
  })

  if (!current) return result({ status: 'NO_RULES' })

  const nextRank = ranks.find(r => r.order > current.order) ?? null
  const degree = Math.min(input.currentDegree, current.maxDegrees)
  if (degree >= current.maxDegrees && !nextRank) return result({ status: 'TOP_RANK' })

  const counted = input.attended.filter(c =>
    c.scheduledAt <= now && (!since || c.scheduledAt >= since) && classCounts(current, c))
  const classesSince = counted.length
  const perStep = current.totalClassesRequired && current.totalClassesRequired > 0 ? current.totalClassesRequired : null

  const requirements: Requirement[] = []

  // ── Belt gates (next rank) ────────────────────────────────────────────────
  const blockedBy: Array<'AGE' | 'MONTHS'> = []
  if (nextRank?.minMonthsAtPrevious && nextRank.minMonthsAtPrevious > 0) {
    const months = input.beltSince ? wholeMonthsBetween(input.beltSince, now) : 0
    const met = months >= nextRank.minMonthsAtPrevious
    if (!met) blockedBy.push('MONTHS')
    requirements.push({ kind: 'MONTHS', current: months, required: nextRank.minMonthsAtPrevious, percent: pct(months, nextRank.minMonthsAtPrevious), met })
  }
  // An unknown birth date doesn't block — many schools never collected it.
  if (nextRank?.minAge && nextRank.minAge > 0 && input.dateOfBirth) {
    const age = ageAt(input.dateOfBirth, now)
    const met = age >= nextRank.minAge
    if (!met) blockedBy.push('AGE')
    requirements.push({ kind: 'AGE', current: age, required: nextRank.minAge, percent: pct(age, nextRank.minAge), met })
  }
  const beltGates = requirements.filter(r => r.kind === 'MONTHS' || r.kind === 'AGE')

  // ── Steps: remaining stripes, then the next belt ──────────────────────────
  const steps: GradingStep[] = []
  let i = 0
  const pushStep = (kind: 'DEGREE' | 'BELT', rank: RankRules, deg: number) => {
    i++
    const classes = perStep ? Math.max(0, Math.min(perStep, classesSince - (i - 1) * perStep)) : null
    const enoughClasses = perStep ? classesSince >= i * perStep : true
    const gates = kind === 'BELT' ? blockedBy : []
    steps.push({
      kind, rankId: rank.id, rankName: rank.name, rankColor: rank.color, degree: deg,
      classes, required: perStep, earned: enoughClasses && gates.length === 0,
      blockedBy: enoughClasses ? gates : [],
    })
  }
  // Without a classes rule there is nothing to measure stripes by.
  if (perStep) for (let d = degree + 1; d <= current.maxDegrees; d++) pushStep('DEGREE', current, d)
  if (nextRank && (perStep || beltGates.length)) pushStep('BELT', nextRank, 0)

  // ── Frequency (information only) ──────────────────────────────────────────
  if (current.classesPerPeriod && current.classesPerPeriod > 0 && (current.periodType === 'WEEK' || current.periodType === 'MONTH')) {
    const isWeek = current.periodType === 'WEEK'
    const windowStart = isWeek
      ? new Date(now.getTime() - FREQUENCY_WINDOW_WEEKS * 7 * DAY_MS)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - FREQUENCY_WINDOW_MONTHS, now.getUTCDate()))
    const from = since && since > windowStart ? since : windowStart
    const spanDays = Math.max(7, (now.getTime() - from.getTime()) / DAY_MS)
    const periods = isWeek ? spanDays / 7 : spanDays / 30.44
    const avg = Math.round((counted.filter(c => c.scheduledAt >= from).length / periods) * 10) / 10
    requirements.unshift({
      kind: 'FREQUENCY', current: avg, required: current.classesPerPeriod,
      percent: pct(avg, current.classesPerPeriod), met: avg >= current.classesPerPeriod,
      periodType: current.periodType,
    })
  }

  const manualChecks: Array<'EXAM' | 'COMPETITION'> = []
  if (nextRank?.requireExam) manualChecks.push('EXAM')
  if (nextRank?.requireCompetition) manualChecks.push('COMPETITION')

  const base = { steps, requirements, manualChecks, classesSince, classesPerStep: perStep }
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
  if (next?.kind === 'BELT') parts.push(...beltGates.map(g => g.percent))
  const percent = parts.length ? Math.min(...parts) : 0
  return result({
    status: percent >= ALMOST_READY_THRESHOLD ? 'ALMOST_READY' : 'NOT_READY',
    percent, due: null, next, ...base,
  })
}
