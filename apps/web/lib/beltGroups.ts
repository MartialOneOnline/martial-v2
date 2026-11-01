// Grouping students by belt for reports and filters.
//
// SchoolMember.belt is free text and the source of truth ("Marron", "Blue
// Belt", "Azul"…); beltRankId is an optional link into the school's BeltRank
// catalog. A filter has to treat "Marrón", "Marron" and "Brown Belt" as the
// same belt, so every student resolves to one *belt key*:
//   r:<beltRankId>      a belt of the school's catalog
//   n:<normalized name> a belt name the catalog doesn't have
//   none                no belt recorded
import { normalizeForSearch } from './search'

export const NO_BELT_KEY = 'none'

// Same colour in the languages the app speaks — only used when the whole
// name is that colour ("Blue Belt" = "Azul"), so "Gris-Blanco" stays its own.
const COLOR_ALIASES: Record<string, string> = {
  white: 'white', blanco: 'white', blanca: 'white', branca: 'white', branco: 'white', blanche: 'white', blanc: 'white',
  blue: 'blue', azul: 'blue', bleue: 'blue', bleu: 'blue',
  purple: 'purple', morado: 'purple', morada: 'purple', roxa: 'purple', roxo: 'purple', violet: 'purple', violeta: 'purple',
  brown: 'brown', marron: 'brown', marrom: 'brown',
  black: 'black', negro: 'black', negra: 'black', preta: 'black', preto: 'black', noire: 'black', noir: 'black',
  grey: 'grey', gray: 'grey', gris: 'grey', cinza: 'grey',
  yellow: 'yellow', amarillo: 'yellow', amarilla: 'yellow', amarela: 'yellow', amarelo: 'yellow', jaune: 'yellow',
  orange: 'orange', naranja: 'orange', laranja: 'orange',
  green: 'green', verde: 'green', vert: 'green', verte: 'green',
  red: 'red', rojo: 'red', roja: 'red', vermelha: 'red', vermelho: 'red', rouge: 'red',
}

// Fallback colours for belts outside the catalog (the catalog's own colour wins)
const ALIAS_COLORS: Record<string, string> = {
  white: '#E5E7EB', blue: '#1D4ED8', purple: '#6D28D9', brown: '#92400E', black: '#111827',
  grey: '#9CA3AF', yellow: '#EAB308', orange: '#F97316', green: '#16A34A', red: '#DC2626',
}
const NEUTRAL = '#9CA3AF'

const BELT_WORDS = /\b(belt|cinturon|faixa|ceinture|obi)\b/g

/** "Marrón" → "brown", "Blue Belt" → "blue", "Gris-Blanco" → "gris-blanco". */
export function normalizeBeltName(name: string): string {
  const base = normalizeForSearch(name).replace(BELT_WORDS, ' ').replace(/\s+/g, ' ').trim()
  return COLOR_ALIASES[base] ?? base
}

export function isWhiteBelt(name: string | null | undefined): boolean {
  return !!name && normalizeBeltName(name) === 'white'
}

export interface BeltRankRef {
  id: string
  name: string
  color: string
  order: number
  maxDegrees: number
  systemId: string
  systemName: string
}

export interface BeltSystemRef {
  id: string
  name: string
  isDefault: boolean
  ranks: Omit<BeltRankRef, 'systemId' | 'systemName'>[]
}

export interface BeltIndex {
  ranks: BeltRankRef[]
  rankById: Map<string, BeltRankRef>
  rankByName: Map<string, BeltRankRef>
  multipleSystems: boolean
}

/**
 * Systems are expected oldest first. A name shared by two systems ("Blanco"
 * in Kids and Adults) resolves to the default system's rank by name; a
 * student linked to the other one keeps it via beltRankId.
 */
export function buildBeltIndex(systems: BeltSystemRef[]): BeltIndex {
  const ordered = [...systems].sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
  const ranks: BeltRankRef[] = []
  const rankById = new Map<string, BeltRankRef>()
  const rankByName = new Map<string, BeltRankRef>()
  for (const s of ordered) {
    for (const r of [...s.ranks].sort((a, b) => a.order - b.order)) {
      const ref = { ...r, systemId: s.id, systemName: s.name }
      ranks.push(ref)
      rankById.set(r.id, ref)
      const norm = normalizeBeltName(r.name)
      if (!rankByName.has(norm)) rankByName.set(norm, ref)
    }
  }
  const systemsWithRanks = new Set(ranks.map(r => r.systemId))
  return { ranks, rankById, rankByName, multipleSystems: systemsWithRanks.size > 1 }
}

/**
 * The catalog rank a belt name belongs to, or null. A current link wins when
 * it still names the same belt (it tells two systems' "Blanco" apart); a link
 * left behind by a belt change made as text is ignored.
 */
export function resolveBeltRank(
  belt: string | null | undefined, beltRankId: string | null | undefined, index: BeltIndex,
): BeltRankRef | null {
  const linked = beltRankId ? index.rankById.get(beltRankId) ?? null : null
  const text = belt?.trim()
  if (!text) return linked
  const norm = normalizeBeltName(text)
  if (linked && normalizeBeltName(linked.name) === norm) return linked
  return index.rankByName.get(norm) ?? null
}

export function beltKey(member: { belt: string | null; beltRankId: string | null }, index: BeltIndex): string {
  const rank = resolveBeltRank(member.belt, member.beltRankId, index)
  if (rank) return `r:${rank.id}`
  const text = member.belt?.trim()
  return text ? `n:${normalizeBeltName(text)}` : NO_BELT_KEY
}

export function beltColor(name: string | null | undefined, rank: BeltRankRef | null): string {
  if (rank) return rank.color
  if (!name) return NEUTRAL
  return ALIAS_COLORS[normalizeBeltName(name)] ?? NEUTRAL
}

export interface BeltOption {
  key: string
  /** Display name; empty for NO_BELT_KEY (the client labels it) */
  name: string
  color: string
  /** Grading system name when the school has more than one, else null */
  group: string | null
  /** Students on the roster with this belt / of them ACTIVE */
  count: number
  activeCount: number
  maxDegrees: number
}

export interface BeltMember {
  id: string
  belt: string | null
  beltRankId: string | null
  beltDegree: number | null
  status: string
}

/**
 * One option per catalog belt (even with nobody on it yet, in catalog
 * order), then belts outside the catalog by size, then "no belt".
 */
export function beltOptions(members: BeltMember[], index: BeltIndex): BeltOption[] {
  const byKey = new Map<string, BeltOption>()
  for (const r of index.ranks) {
    byKey.set(`r:${r.id}`, {
      key: `r:${r.id}`, name: r.name, color: r.color, group: index.multipleSystems ? r.systemName : null,
      count: 0, activeCount: 0, maxDegrees: r.maxDegrees,
    })
  }
  // Most used spelling names a non-catalog belt ("Blue Belt" ×3 vs "blue belt" ×1)
  const spellings = new Map<string, Map<string, number>>()
  for (const m of members) {
    const key = beltKey(m, index)
    let opt = byKey.get(key)
    if (!opt) {
      opt = { key, name: '', color: NEUTRAL, group: null, count: 0, activeCount: 0, maxDegrees: 0 }
      byKey.set(key, opt)
    }
    opt.count++
    if (m.status === 'ACTIVE') opt.activeCount++
    opt.maxDegrees = Math.max(opt.maxDegrees, m.beltDegree ?? 0)
    if (key.startsWith('n:')) {
      const text = m.belt!.trim()
      const s = spellings.get(key) ?? new Map<string, number>()
      s.set(text, (s.get(text) ?? 0) + 1)
      spellings.set(key, s)
    }
  }
  for (const [key, s] of spellings) {
    const name = [...s.entries()].sort((a, b) => b[1] - a[1])[0]![0]
    const opt = byKey.get(key)!
    opt.name = name
    opt.color = beltColor(name, null)
  }
  const all = [...byKey.values()]
  const catalog = all.filter(o => o.key.startsWith('r:'))
  const other = all.filter(o => o.key.startsWith('n:')).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const none = all.filter(o => o.key === NO_BELT_KEY)
  return [...catalog, ...other, ...none]
}

export interface BeltFilter { belts: string[]; degrees: number[] }

export function matchesBeltFilter(member: BeltMember, filter: BeltFilter, index: BeltIndex): boolean {
  if (filter.belts.length && !filter.belts.includes(beltKey(member, index))) return false
  if (filter.degrees.length && !filter.degrees.includes(member.beltDegree ?? 0)) return false
  return true
}

/**
 * Belt filter values from the query string. Accepts belt keys and, for old
 * links, plain names ("?belt=Marrón"), which resolve to the same key.
 */
export function parseBeltFilter(beltValues: string[], degreeValues: string[], index: BeltIndex): BeltFilter {
  const belts = new Set<string>()
  // One value per belt (repeated params) — a name may contain a comma
  for (const raw of beltValues) {
    const v = raw.trim()
    if (!v) continue
    if (v === NO_BELT_KEY || v.startsWith('r:') || v.startsWith('n:')) belts.add(v)
    else belts.add(beltKey({ belt: v, beltRankId: null }, index))
  }
  const degrees = new Set<number>()
  for (const raw of degreeValues) {
    const n = Number(raw)
    if (raw.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 20) degrees.add(n)
  }
  return { belts: [...belts], degrees: [...degrees].sort((a, b) => a - b) }
}
