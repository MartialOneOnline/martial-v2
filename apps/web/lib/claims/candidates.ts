import { prisma } from '@/lib/db'
import { normalizeForSearch } from '@/lib/search'

// Candidate schools for a request — shown to a super admin for human review.
// Nothing here links anything: a similar name or matching email is a hint,
// never proof of ownership.

// Words too generic to identify a school on their own.
const STOP = new Set([
  'the', 'and', 'of', 'de', 'del', 'la', 'el', 'los', 'las', 'do', 'da', 'des', 'du', 'le', 'y', 'e', 'et',
  'academy', 'academia', 'academie', 'school', 'escuela', 'escola', 'ecole', 'club', 'clube', 'team', 'equipo',
  'martial', 'arts', 'art', 'artes', 'marciales', 'marciais', 'martiaux', 'dojo', 'gym', 'gimnasio', 'center', 'centre', 'centro',
  'jiu', 'jitsu', 'jujitsu', 'bjj', 'mma', 'brazilian', 'karate', 'judo', 'boxing', 'muay', 'thai', 'kickboxing',
])

export function significantTokens(value: string): string[] {
  return normalizeForSearch(value)
    .replace(/['’`]s\b/g, '') // "Guido's" → "guido"
    .split(/[^a-z0-9]+/)
    .map(w => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)) // "guidos" → "guido"
    .filter(w => w.length >= 3 && !STOP.has(w))
}

export type CandidateInput = { schoolName: string; city: string | null; contactEmail: string; sourceSchoolId: string | null }

export type CandidateSchool = {
  id: string; name: string; slug: string; status: string; city: string | null; country: string | null
  email: string | null; hasOwner: boolean; score: number; reasons: string[]
}

export function scoreCandidate(
  input: CandidateInput,
  school: { id: string; name: string; city: string | null; email: string | null; website: string | null },
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const want = significantTokens(input.schoolName)
  const have = new Set(significantTokens(school.name))
  const shared = want.filter(w => have.has(w) || [...have].some(h => h.startsWith(w) || w.startsWith(h)))
  if (normalizeForSearch(school.name).trim() === normalizeForSearch(input.schoolName).trim()) {
    score += 60; reasons.push('Same name')
  } else if (shared.length > 0) {
    score += Math.min(45, 20 * shared.length); reasons.push(`Name shares “${shared.join(' ')}”`)
  }
  if (input.city && school.city && normalizeForSearch(school.city).trim() === normalizeForSearch(input.city).trim()) {
    score += 25; reasons.push('Same city')
  }
  const email = input.contactEmail.toLowerCase()
  if (school.email && school.email.toLowerCase() === email) { score += 20; reasons.push('Same contact email') }
  const domain = email.split('@')[1]
  const freeMail = /^(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|aol|proton|protonmail)\./.test(domain ?? '')
  if (domain && !freeMail && school.website && school.website.toLowerCase().includes(domain)) { score += 15; reasons.push('Email domain matches website') }
  if (input.sourceSchoolId === school.id) { score += 30; reasons.push('Request started from this school page') }
  return { score, reasons }
}

export async function findCandidateSchools(input: CandidateInput, extraQuery?: string): Promise<CandidateSchool[]> {
  const tokens = [...new Set([...significantTokens(input.schoolName), ...(extraQuery ? significantTokens(extraQuery) : [])])].slice(0, 6)
  const or: Record<string, unknown>[] = tokens.map(t => ({ name: { contains: t, mode: 'insensitive' } }))
  if (extraQuery?.trim()) or.push({ name: { contains: extraQuery.trim(), mode: 'insensitive' } }, { slug: { contains: extraQuery.trim().toLowerCase() } })
  if (input.city?.trim()) or.push({ city: { equals: input.city.trim(), mode: 'insensitive' } })
  or.push({ email: { equals: input.contactEmail, mode: 'insensitive' } })
  if (input.sourceSchoolId) or.push({ id: input.sourceSchoolId })

  const rows = await prisma.school.findMany({
    where: { OR: or },
    take: 60,
    select: {
      id: true, name: true, slug: true, status: true, city: true, country: true, email: true, website: true, claimedById: true,
      members: { where: { role: 'OWNER', status: 'ACTIVE' }, select: { userId: true }, take: 1 },
    },
  })

  return rows
    .map(s => {
      const { score, reasons } = scoreCandidate(input, s)
      return {
        id: s.id, name: s.name, slug: s.slug, status: s.status, city: s.city, country: s.country, email: s.email,
        hasOwner: Boolean(s.claimedById) || s.members.length > 0, score, reasons,
      }
    })
    .filter(c => c.score > 0 || (extraQuery && c.name.toLowerCase().includes(extraQuery.toLowerCase())))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 12)
}
