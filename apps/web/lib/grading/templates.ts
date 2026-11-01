// Grading templates (super admin) — a list of belts with their rules, in
// BeltRank's shape, stored as JSON on GradingTemplate.ranks. Applying one
// copies it into a school's own GradingSystem; the school then edits its copy.
//
// Not copied: classTypeIds (which classes count) — those are a school's own
// class/discipline ids, so a template can't know them.
import { parseClassesByDegree, parseFrequency, parseMinAgeByDegree, parseMonthsByDegree } from './rules'

export interface TemplateRank {
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
  periodType: 'WEEK' | 'MONTH' | null
  requireExam: boolean
  requireCompetition: boolean
}

export const MAX_TEMPLATE_RANKS = 40
export const MAX_DEGREES = 10

const HEX = /^#[0-9a-fA-F]{6}$/

function optionalInt(v: unknown, max: number): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(max, Math.round(n))
}

/**
 * Validates a template's belts from a request body. Order = array order.
 * Errors name the belt (1-based) so the admin can find it.
 */
export function parseTemplateRanks(value: unknown): { ok: true; ranks: TemplateRank[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'ranks must be a list' }
  if (value.length > MAX_TEMPLATE_RANKS) return { ok: false, error: `At most ${MAX_TEMPLATE_RANKS} ranks` }
  const ranks: TemplateRank[] = []
  const names = new Set<string>()
  for (const [i, raw] of value.entries()) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const at = `Rank ${i + 1}`
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!name) return { ok: false, error: `${at}: name is required` }
    if (name.length > 60) return { ok: false, error: `${at}: name is too long` }
    const key = name.toLowerCase()
    if (names.has(key)) return { ok: false, error: `${at}: duplicate name "${name}"` }
    names.add(key)
    const freq = parseFrequency(r)
    if (!freq.ok) return { ok: false, error: `${at}: ${freq.error}` }
    const maxDegrees = Math.min(MAX_DEGREES, Math.max(0, Math.round(Number(r.maxDegrees) || 0)))
    ranks.push({
      name,
      color: typeof r.color === 'string' && HEX.test(r.color) ? r.color : '#9CA3AF',
      maxDegrees,
      minAge: optionalInt(r.minAge, 120),
      minMonthsAtPrevious: optionalInt(r.minMonthsAtPrevious, 1200),
      totalClassesRequired: optionalInt(r.totalClassesRequired, 100000),
      // One entry per grading at this belt (each stripe, then the next belt);
      // ages only per stripe.
      classesByDegree: trimTrailingZeros(parseClassesByDegree(r.classesByDegree).slice(0, maxDegrees + 1)),
      monthsByDegree: trimTrailingZeros(parseMonthsByDegree(r.monthsByDegree).slice(0, maxDegrees + 1)),
      minAgeByDegree: trimTrailingZeros(parseMinAgeByDegree(r.minAgeByDegree).slice(0, maxDegrees)),
      ...freq.value,
      requireExam: r.requireExam === true,
      requireCompetition: r.requireCompetition === true,
    })
  }
  return { ok: true, ranks }
}

function trimTrailingZeros(list: number[]): number[] {
  const out = [...list]
  while (out.length && !out[out.length - 1]) out.pop()
  return out
}

/** Stored JSON → ranks; anything malformed is dropped rather than crashing a page. */
export function readTemplateRanks(json: unknown): TemplateRank[] {
  const parsed = parseTemplateRanks(json)
  return parsed.ok ? parsed.ranks : []
}

/** BeltRank create rows for a new school system copied from a template. */
export function beltRanksFromTemplate(ranks: TemplateRank[], systemId: string) {
  return ranks.map((r, order) => ({ ...r, systemId, order, classTypeIds: [] as string[] }))
}
