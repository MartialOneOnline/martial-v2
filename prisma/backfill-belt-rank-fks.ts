/**
 * backfill-belt-rank-fks.ts
 *
 * One-time (but idempotent/re-runnable) backfill that links existing freeform
 * belt text (Grading.fromBelt/toBelt, SchoolMember.belt) to the structured
 * BeltRank catalog via the new enrichment FKs (fromBeltRankId/toBeltRankId/
 * beltRankId). Freeform text remains the source of truth for display/history
 * — this only fills the FK when a confident match is found. Never guesses.
 *
 * For each school with at least one active GradingSystem, matches against
 * that school's default system's ranks (or its only system if just one).
 * Schools with multiple non-default systems (multi-activity) are supported on
 * a best-effort basis: if a school has >1 system, all systems' ranks are
 * pooled for matching (a name match against any of the school's systems is
 * accepted), since we have no reliable signal here to pick the right one per
 * student without also knowing which class/activity they train.
 *
 * Run from repo root:
 *   DATABASE_URL="..." npx tsx prisma/backfill-belt-rank-fks.ts --dry-run
 *   DATABASE_URL="..." npx tsx prisma/backfill-belt-rank-fks.ts
 */

import { prisma } from '../apps/web/lib/db'

const DRY_RUN = process.argv.includes('--dry-run')

// Canonical belt aliases (ES/EN), mirrors apps/web/app/dashboard/school/gradings/GradingsClient.tsx
const CANONICAL_ALIASES: Record<string, string> = {
  blanco: 'white', blanca: 'white', white: 'white',
  azul: 'blue', blue: 'blue',
  morado: 'purple', morada: 'purple', purple: 'purple',
  marron: 'brown', 'marrón': 'brown', brown: 'brown',
  negro: 'black', negra: 'black', black: 'black',
}

function normalize(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
}

function canonicalKey(name: string): string | null {
  const norm = normalize(name)
  if (CANONICAL_ALIASES[norm]) return CANONICAL_ALIASES[norm]
  // "Blanco Belt", "White Belt" etc — try matching the first word
  const firstWord = norm.split(/\s+/)[0]
  return CANONICAL_ALIASES[firstWord] ?? null
}

function matchRank(freeform: string, ranks: { id: string; name: string }[]): string | null {
  const normFree = normalize(freeform)
  // 1. exact normalized name match
  const exact = ranks.find(r => normalize(r.name) === normFree)
  if (exact) return exact.id
  // 2. canonical belt-color alias match (handles ES/EN mismatches)
  const freeKey = canonicalKey(freeform)
  if (freeKey) {
    const aliasMatch = ranks.find(r => canonicalKey(r.name) === freeKey)
    if (aliasMatch) return aliasMatch.id
  }
  return null
}

async function main() {
  const schools = await prisma.school.findMany({
    where: { gradingSystems: { some: { isActive: true } } },
    select: {
      id: true,
      name: true,
      gradingSystems: {
        where: { isActive: true },
        select: { id: true, ranks: { select: { id: true, name: true } } },
      },
    },
  })

  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Found ${schools.length} school(s) with an active GradingSystem\n`)

  let totalGradingsChecked = 0, totalGradingsMatched = 0
  let totalMembersChecked = 0, totalMembersMatched = 0
  const unmatched: string[] = []

  for (const school of schools) {
    const ranks = school.gradingSystems.flatMap(s => s.ranks)
    if (!ranks.length) continue

    // Gradings for this school with at least one FK still null
    const gradings = await prisma.grading.findMany({
      where: {
        schoolId: school.id,
        OR: [{ toBeltRankId: null }, { AND: [{ fromBelt: { not: null } }, { fromBeltRankId: null }] }],
      },
      select: { id: true, fromBelt: true, toBelt: true, fromBeltRankId: true, toBeltRankId: true },
    })

    for (const g of gradings) {
      totalGradingsChecked++
      const data: { fromBeltRankId?: string; toBeltRankId?: string } = {}

      if (!g.toBeltRankId) {
        const match = matchRank(g.toBelt, ranks)
        if (match) data.toBeltRankId = match
        else unmatched.push(`[${school.name}] Grading ${g.id} toBelt="${g.toBelt}" — no match`)
      }
      if (g.fromBelt && !g.fromBeltRankId) {
        const match = matchRank(g.fromBelt, ranks)
        if (match) data.fromBeltRankId = match
        else unmatched.push(`[${school.name}] Grading ${g.id} fromBelt="${g.fromBelt}" — no match`)
      }

      if (Object.keys(data).length) {
        totalGradingsMatched++
        if (!DRY_RUN) await prisma.grading.update({ where: { id: g.id }, data })
      }
    }

    // SchoolMembers for this school with a freeform belt but no FK yet
    const members = await prisma.schoolMember.findMany({
      where: { schoolId: school.id, belt: { not: null }, beltRankId: null },
      select: { id: true, belt: true },
    })

    for (const m of members) {
      totalMembersChecked++
      const match = matchRank(m.belt!, ranks)
      if (match) {
        totalMembersMatched++
        if (!DRY_RUN) await prisma.schoolMember.update({ where: { id: m.id }, data: { beltRankId: match } })
      } else {
        unmatched.push(`[${school.name}] SchoolMember ${m.id} belt="${m.belt}" — no match`)
      }
    }
  }

  console.log(`Gradings:       ${totalGradingsMatched}/${totalGradingsChecked} matched`)
  console.log(`SchoolMembers:  ${totalMembersMatched}/${totalMembersChecked} matched`)
  if (unmatched.length) {
    console.log(`\nUnmatched (${unmatched.length}) — left as null, review manually:`)
    for (const line of unmatched.slice(0, 50)) console.log(`  ${line}`)
    if (unmatched.length > 50) console.log(`  ... and ${unmatched.length - 50} more`)
  }
  if (DRY_RUN) console.log('\nDry run — no writes performed. Re-run without --dry-run to apply.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
