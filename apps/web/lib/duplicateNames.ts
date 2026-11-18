import { normalizeForSearch } from '@/lib/search'

export type DuplicateReason = 'name' | 'phone' | 'similar_name'

// Connecting words carry no identity: "María de la Cruz" = "María Cruz".
const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von'])

// A short name that fits more accounts than this is a common name, not a lead.
const MAX_PARTIAL_MATCHES = 3

export function nameTokens(name: string | null): string[] {
  if (!name) return []
  const words = normalizeForSearch(name).match(/[\p{L}\p{N}]+/gu) ?? []
  return [...new Set(words.filter(w => !PARTICLES.has(w)))]
}

// Pairs where one account's name is the other's with surnames left out
// ("Inigo Perez" / "Íñigo Pérez Gómez"). Identical names are not
// returned: the exact-name check already reports those.
export function findPartialNamePairs(people: { id: string; name: string | null }[]): [string, string][] {
  const byFirstName = new Map<string, { id: string; tokens: string[] }[]>()
  for (const { id, name } of people) {
    const tokens = nameTokens(name)
    if (tokens.length < 2) continue // one word alone identifies nobody
    const group = byFirstName.get(tokens[0]!)
    if (group) group.push({ id, tokens })
    else byFirstName.set(tokens[0]!, [{ id, tokens }])
  }

  const pairs: [string, string][] = []
  for (const group of byFirstName.values()) {
    for (const short of group) {
      const matches = group.filter(long =>
        long.tokens.length > short.tokens.length && short.tokens.every(t => long.tokens.includes(t)))
      if (matches.length > MAX_PARTIAL_MATCHES) continue
      for (const long of matches) pairs.push([short.id, long.id])
    }
  }
  return pairs
}
