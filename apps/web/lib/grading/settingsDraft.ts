// Settings → Grading: the editable draft of one grading system's belts.
//
// Frequency (min/max per week or month) and "which classes count" are stored
// on every BeltRank (the readiness engine reads them per belt), but the screen
// presents them once for the whole system. The common value is the one most
// belts share; a belt whose frequency differs has its own ("Frecuencia
// propia"). On save the common value is written to every belt that doesn't
// keep its own — no schema change needed.
//
// The screen edits each step's classes explicitly (no "classes per grading
// (default)" field): a belt's steps are resolved once from classesByDegree
// with totalClassesRequired as the fallback, and saved back as an explicit
// list with totalClassesRequired cleared, so what you see is what counts.

export type PeriodType = 'WEEK' | 'MONTH'

export interface DraftRank {
  id: string
  order: number
  name: string
  color: string
  maxDegrees: number
  minAge: number | null
  minMonthsAtPrevious: number | null
  totalClassesRequired: number | null
  classesByDegree: number[]
  monthsByDegree: number[]
  minAgeByDegree: number[]
  classesPerPeriod: number | null
  maxClassesPerPeriod: number | null
  periodType: string | null
  classTypeIds: string[]
  requireExam: boolean
  requireCompetition: boolean
}

export interface Frequency {
  classesPerPeriod: number | null
  maxClassesPerPeriod: number | null
  periodType: PeriodType | null
}

export interface CommonRules extends Frequency {
  classTypeIds: string[]
}

const pos = (n: number | null | undefined): number | null => (typeof n === 'number' && n > 0 ? Math.round(n) : null)

export function normalizeFrequency(f: { classesPerPeriod?: number | null; maxClassesPerPeriod?: number | null; periodType?: string | null }): Frequency {
  const classesPerPeriod = pos(f.classesPerPeriod)
  const maxClassesPerPeriod = pos(f.maxClassesPerPeriod)
  const periodType = f.periodType === 'WEEK' || f.periodType === 'MONTH' ? f.periodType : null
  // No min and no max: the period means nothing
  if (!classesPerPeriod && !maxClassesPerPeriod) return { classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null }
  return { classesPerPeriod, maxClassesPerPeriod, periodType }
}

export function frequencyKey(f: { classesPerPeriod?: number | null; maxClassesPerPeriod?: number | null; periodType?: string | null }): string {
  const n = normalizeFrequency(f)
  return `${n.classesPerPeriod ?? 0}|${n.maxClassesPerPeriod ?? 0}|${n.periodType ?? ''}`
}

const typesKey = (ids: string[]) => [...ids].sort().join(',')

/** The value most belts share; on a tie, the one of the earliest belt. */
function mode<T>(items: T[], key: (t: T) => string): T | undefined {
  const counts = new Map<string, { n: number; first: number; item: T }>()
  items.forEach((it, i) => {
    const k = key(it)
    const c = counts.get(k)
    if (c) c.n++
    else counts.set(k, { n: 1, first: i, item: it })
  })
  let best: { n: number; first: number; item: T } | undefined
  for (const c of counts.values()) if (!best || c.n > best.n || (c.n === best.n && c.first < best.first)) best = c
  return best?.item
}

export function commonRules(ranks: DraftRank[]): CommonRules {
  const sorted = [...ranks].sort((a, b) => a.order - b.order)
  const f = mode(sorted, frequencyKey)
  const t = mode(sorted, r => typesKey(r.classTypeIds))
  // A system without any rule yet starts from "per week" so the stepper has a period
  const freq = f ? normalizeFrequency(f) : { classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null }
  return { ...freq, classTypeIds: t ? [...t.classTypeIds] : [] }
}

export function hasOwnFrequency(rank: DraftRank, common: Frequency): boolean {
  return frequencyKey(rank) !== frequencyKey(common)
}

/** Gradings at a belt: one per stripe, plus the next belt when there is one. */
export function stepCount(rank: Pick<DraftRank, 'maxDegrees'>, hasNext: boolean): number {
  return Math.max(0, rank.maxDegrees) + (hasNext ? 1 : 0)
}

/** Classes per step as they count today: the step's own value, else the old per-belt fallback. */
export function resolvedClasses(rank: DraftRank, hasNext: boolean): number[] {
  return Array.from({ length: stepCount(rank, hasNext) }, (_, i) => rank.classesByDegree[i] || rank.totalClassesRequired || 0)
}

/** Draft the screen edits: steps made explicit, nothing else changed. */
export function toDraft(ranks: DraftRank[]): DraftRank[] {
  const sorted = [...ranks].sort((a, b) => a.order - b.order)
  return sorted.map((r, i) => ({
    ...r,
    classesByDegree: resolvedClasses(r, i < sorted.length - 1),
    monthsByDegree: [...(r.monthsByDegree ?? [])],
    minAgeByDegree: [...(r.minAgeByDegree ?? [])],
    classTypeIds: [...(r.classTypeIds ?? [])],
  }))
}

function trimZeros(list: number[]): number[] {
  const out = list.map(n => (n > 0 ? Math.round(n) : 0))
  while (out.length && !out[out.length - 1]) out.pop()
  return out
}

/** Months a belt takes with this frequency — an estimate for the screen, not a rule. */
export function estimateMonths(totalClasses: number, freq: Frequency): number | null {
  const per = freq.maxClassesPerPeriod ?? freq.classesPerPeriod
  if (!totalClasses || !per || !freq.periodType) return null
  const periods = Math.ceil(totalClasses / per)
  const months = freq.periodType === 'WEEK' ? Math.round(periods / 4.345) : periods
  return Math.max(1, months)
}

export interface BeltEstimate {
  totalClasses: number
  /** From classes alone, at the belt's frequency (null when it can't be estimated) */
  classMonths: number | null
  /** The longest of: classes, the minimum months per step, the time required before the next belt */
  months: number | null
}

export function estimateBelt(rank: DraftRank, next: DraftRank | null, freq: Frequency): BeltEstimate {
  const steps = stepCount(rank, !!next)
  const totalClasses = rank.classesByDegree.slice(0, steps).reduce((s, n) => s + (n || 0), 0)
  const classMonths = estimateMonths(totalClasses, freq)
  const stepMonths = rank.monthsByDegree.slice(0, steps).reduce((s, n) => s + (n || 0), 0)
  const candidates = [classMonths ?? 0, stepMonths, next?.minMonthsAtPrevious ?? 0].filter(n => n > 0)
  return { totalClasses, classMonths, months: candidates.length ? Math.max(...candidates) : null }
}

export interface RankSavePayload {
  id: string
  name: string
  color: string
  maxDegrees: number
  minAge: number | null
  minMonthsAtPrevious: number | null
  totalClassesRequired: null
  classesByDegree: number[]
  monthsByDegree: number[]
  minAgeByDegree: number[]
  classesPerPeriod: number | null
  maxClassesPerPeriod: number | null
  periodType: PeriodType | null
  classTypeIds: string[]
  requireExam: boolean
  requireCompetition: boolean
}

/**
 * What one Save sends for every belt: explicit steps, the common frequency
 * unless the belt keeps its own, and the common "which classes count".
 */
export function buildSavePayload(draft: DraftRank[], common: CommonRules, ownFrequency: Record<string, boolean>): RankSavePayload[] {
  const sorted = [...draft].sort((a, b) => a.order - b.order)
  const commonFreq = normalizeFrequency(common)
  return sorted.map((r, i) => {
    const steps = stepCount(r, i < sorted.length - 1)
    const freq = ownFrequency[r.id] ? normalizeFrequency(r) : commonFreq
    return {
      id: r.id,
      name: r.name.trim(),
      color: r.color,
      maxDegrees: r.maxDegrees,
      minAge: pos(r.minAge),
      minMonthsAtPrevious: pos(r.minMonthsAtPrevious),
      totalClassesRequired: null,
      classesByDegree: trimZeros(r.classesByDegree.slice(0, steps)),
      monthsByDegree: trimZeros(r.monthsByDegree.slice(0, steps)),
      minAgeByDegree: trimZeros(r.minAgeByDegree.slice(0, r.maxDegrees)),
      ...freq,
      classTypeIds: [...common.classTypeIds],
      requireExam: r.requireExam,
      requireCompetition: r.requireCompetition,
    }
  })
}

/** A max below the min can't be saved (same rule as the API). */
export function frequencyInvalid(f: Frequency): boolean {
  return !!(f.classesPerPeriod && f.maxClassesPerPeriod && f.maxClassesPerPeriod < f.classesPerPeriod)
}
