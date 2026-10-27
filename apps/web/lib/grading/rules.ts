/**
 * Sanitises BeltRank.classesByDegree from a request body: whole numbers ≥ 0,
 * at most 11 entries (10 degrees + the next belt). Anything else → [].
 */
export function parseClassesByDegree(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 11)
    .map(v => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0))
}
