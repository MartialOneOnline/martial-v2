/**
 * Shared belt-resolution helpers for the Roger Gracie Malaga V1 import scripts
 * (scripts/sync-rga-members.mjs, scripts/fix-rga-belts.mjs).
 *
 * V1's userdetails.select_belt column is unpopulated ("NULL") in the export —
 * the real rank lives in userdetails.belts, a JSON map of activity_id ->
 * belt_ranks.id (e.g. {"18":"332"} or {"18":1120}, id may be a string or a
 * number depending on the row). belt_ranks.title encodes both color and
 * stripe count as "<Color>[ <N> Grado(s)]" (e.g. "Azul 2 Grado"), with a V1
 * data typo "Nagro" for "Negro" on the id-1123 row.
 */
import fs from 'fs'

// RFC4180-aware: handles doubled-quote escaping ("" inside a quoted field
// means a literal "), which several columns here rely on (e.g. userdetails.belts
// is a JSON blob like {"18":"332"} re-quoted as "{""18"":""332""}").
export function parseLine(line) {
  const cols = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = false
      } else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { cols.push(cur); cur = '' }
      else cur += ch
    }
  }
  cols.push(cur)
  return cols
}

export function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.trim().split('\n')
  const headers = parseLine(lines[0].replace(/\r/g, ''))
  return lines.slice(1).map(line => {
    const cols = parseLine(line.replace(/\r/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

export const VALID_BELTS = ['Blanco', 'Azul', 'Morado', 'Marron', 'Negro']

export function mapBelt(v1Belt) {
  if (!v1Belt) return 'Blanco'
  const b = v1Belt.trim()
  const map = { white: 'Blanco', blue: 'Azul', purple: 'Morado', brown: 'Marron', black: 'Negro' }
  const lower = b.toLowerCase()
  if (VALID_BELTS.includes(b)) return b
  if (map[lower]) return map[lower]
  return 'Blanco'
}

export function parseBeltRankTitle(title) {
  if (!title) return null
  const t = title.trim().replace(/^Nagro\b/i, 'Negro') // fixes a V1 data typo ("Nagro 4 Grados")
  const m = t.match(/^(\p{L}+)(?:\s+(\d+)\s+Grados?)?$/u)
  if (!m) return null
  const belt = mapBelt(m[1])
  const degree = m[2] ? parseInt(m[2], 10) : 0
  return { belt, degree }
}

export function resolveBeltRankId(belts) {
  if (!belts || belts === 'NULL') return null
  let parsed
  try { parsed = JSON.parse(belts) } catch { return null }
  if (Array.isArray(parsed)) return parsed.length ? String(parsed[0]) : null
  if (parsed && typeof parsed === 'object') {
    if (parsed['18'] != null) return String(parsed['18'])
    const first = Object.values(parsed)[0]
    return first != null ? String(first) : null
  }
  return null
}

/**
 * Full pipeline: userdetails.belts (raw JSON string) + belt_ranks.id -> title
 * map -> { belt, degree }, or null if unresolvable (missing/empty belts,
 * unknown rank id, or an unparseable title).
 */
export function resolveBelt(belts, beltRankById) {
  const rankId = resolveBeltRankId(belts)
  if (!rankId) return null
  return parseBeltRankTitle(beltRankById.get(rankId))
}

export function nullIfEmpty(v) {
  if (!v || v === 'NULL' || v.trim() === '') return null
  return v.trim()
}
