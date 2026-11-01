/** Whole numbers 0..max, at most `length` entries. Anything else → []. */
function parsePerDegree(value: unknown, max: number, length = 11): number[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, length)
    .map(v => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : 0))
}

/**
 * Sanitises BeltRank.classesByDegree from a request body: whole numbers ≥ 0,
 * at most 11 entries (10 degrees + the next belt). Anything else → [].
 */
export function parseClassesByDegree(value: unknown): number[] {
  return parsePerDegree(value, Number.MAX_SAFE_INTEGER)
}

/** BeltRank.monthsByDegree: same indexing as classesByDegree, up to 100 years per step. */
export function parseMonthsByDegree(value: unknown): number[] {
  return parsePerDegree(value, 1200)
}

/** BeltRank.minAgeByDegree: one entry per stripe (10 max), ages 0–120. */
export function parseMinAgeByDegree(value: unknown): number[] {
  return parsePerDegree(value, 120, 10)
}

export interface FrequencyRules {
  classesPerPeriod: number | null
  maxClassesPerPeriod: number | null
  periodType: 'WEEK' | 'MONTH' | null
}

function positiveInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

/**
 * Min / max classes per week or month. Blank or 0 = no rule. A min or max
 * needs a period, and the max can't be below the min.
 */
export function parseFrequency(input: {
  classesPerPeriod?: unknown; maxClassesPerPeriod?: unknown; periodType?: unknown
}): { ok: true; value: FrequencyRules } | { ok: false; error: string } {
  const classesPerPeriod = positiveInt(input.classesPerPeriod)
  const maxClassesPerPeriod = positiveInt(input.maxClassesPerPeriod)
  const periodType = input.periodType === 'WEEK' || input.periodType === 'MONTH' ? input.periodType : null
  if ((classesPerPeriod || maxClassesPerPeriod) && !periodType) {
    return { ok: false, error: 'periodType (WEEK or MONTH) is required for a min/max frequency' }
  }
  if (classesPerPeriod && maxClassesPerPeriod && maxClassesPerPeriod < classesPerPeriod) {
    return { ok: false, error: 'maxClassesPerPeriod cannot be below classesPerPeriod' }
  }
  return { ok: true, value: { classesPerPeriod, maxClassesPerPeriod, periodType } }
}
