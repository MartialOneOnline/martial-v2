/**
 * One-off: link a school's students to its belt catalog (Settings → Grading)
 * and spell their belt the way the catalog does ("Blue Belt" → "Azul").
 *
 * Uses the same rule as the users report, grading readiness and the member
 * PATCH (resolveBeltRank in apps/web/lib/beltGroups.ts): the belt text wins,
 * a link is kept when it names the same belt. Belts outside the catalog
 * (e.g. "Coral") are left as text and listed, never invented.
 *
 * Only touches school_members.belt / beltRankId / updatedAt of STUDENTs of
 * the given school. --apply first writes a JSON backup of every row it
 * changes (id, belt, beltRankId before) so it can be undone.
 *
 * Usage (from the repo root):
 *   npx tsx --env-file=apps/web/.env.local scripts/link-belts-to-catalog.ts --school="Roger Gracie Malaga"
 *   npx tsx --env-file=apps/web/.env.local scripts/link-belts-to-catalog.ts --school="Roger Gracie Malaga" --apply
 */
import fs from 'fs'
import path from 'path'
import pg from 'pg'
import { buildBeltIndex, resolveBeltRank, type BeltSystemRef } from '../apps/web/lib/beltGroups'

const APPLY = process.argv.includes('--apply')
const schoolArg = process.argv.find(a => a.startsWith('--school='))?.slice('--school='.length)
if (!schoolArg) { console.error('Missing --school="<name or id>"'); process.exit(1) }

interface Row { id: string; name: string; belt: string | null; beltRankId: string | null }
interface Change extends Row { newBelt: string | null; newRankId: string | null }

async function main() {
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const schools = await db.query<{ id: string; name: string }>(
      `select id, name from schools where id = $1 or name ilike $2`, [schoolArg, `%${schoolArg}%`])
    if (schools.rows.length !== 1) {
      console.error(`--school must match exactly one school, matched ${schools.rows.length}:`, schools.rows.map(s => s.name))
      process.exit(1)
    }
    const school = schools.rows[0]!
    console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (nothing is written)'}\nSchool: ${school.name} (${school.id})`)

    const sys = await db.query(
      `select gs.id, gs.name, gs."isDefault",
              coalesce(json_agg(json_build_object('id', br.id, 'name', br.name, 'color', br.color, 'order', br."order", 'maxDegrees', br."maxDegrees"))
                       filter (where br.id is not null), '[]') ranks
         from grading_systems gs left join belt_ranks br on br."systemId" = gs.id
        where gs."schoolId" = $1 and gs."isActive" = true
        group by gs.id order by gs."createdAt" asc`, [school.id])
    const systems = sys.rows as BeltSystemRef[]
    if (!systems.some(s => s.ranks.length)) { console.log('This school has no belt catalog — nothing to link.'); return }
    for (const s of systems) console.log(`Catalog "${s.name}"${s.isDefault ? ' (default)' : ''}: ${[...s.ranks].sort((a, b) => a.order - b.order).map(r => r.name).join(', ')}`)
    const index = buildBeltIndex(systems)

    const members = (await db.query<Row>(
      `select sm.id, coalesce(u.name, u.email) as name, sm.belt, sm."beltRankId"
         from school_members sm join users u on u.id = sm."userId"
        where sm."schoolId" = $1 and sm.role = 'STUDENT'`, [school.id])).rows

    const changes: Change[] = []
    const outside = new Map<string, number>()
    let noBelt = 0, alreadyOk = 0
    for (const m of members) {
      const text = m.belt?.trim() || null
      const rank = resolveBeltRank(text, m.beltRankId, index)
      if (!rank) {
        if (text) outside.set(text, (outside.get(text) ?? 0) + 1); else noBelt++
        // A link left next to a belt the catalog doesn't have would contradict the text
        if (m.beltRankId) changes.push({ ...m, newBelt: m.belt, newRankId: null })
        continue
      }
      const newBelt = text === rank.name ? m.belt : rank.name
      if (newBelt === m.belt && rank.id === m.beltRankId) { alreadyOk++; continue }
      changes.push({ ...m, newBelt, newRankId: rank.id })
    }

    const rankName = (id: string | null) => (id ? index.rankById.get(id)?.name ?? `? (${id})` : '—')
    const tally = (keyOf: (c: Change) => string | null) => {
      const t = new Map<string, number>()
      for (const c of changes) { const k = keyOf(c); if (k) t.set(k, (t.get(k) ?? 0) + 1) }
      return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ change: k, students: n }))
    }

    console.log(`\nStudents: ${members.length} | already correct: ${alreadyOk} | to change: ${changes.length} | no belt: ${noBelt}`)
    const links = tally(c => (c.newRankId !== c.beltRankId ? `${rankName(c.beltRankId)} → ${rankName(c.newRankId)}` : null))
    console.log('\nCatalog link (beltRankId):'); links.length ? console.table(links) : console.log('  none')
    const renames = tally(c => (c.newBelt !== c.belt ? `"${c.belt ?? ''}" → "${c.newBelt ?? ''}"` : null))
    console.log('Belt text:'); renames.length ? console.table(renames) : console.log('  none')
    console.log('Belts outside the catalog (left as they are):', outside.size ? Object.fromEntries(outside) : 'none')
    const textChanges = changes.filter(c => c.newBelt !== c.belt)
    if (textChanges.length && textChanges.length <= 20) {
      console.log('\nStudents whose belt text changes:')
      console.table(textChanges.map(c => ({ student: c.name, from: c.belt, to: c.newBelt })))
    }

    if (!APPLY || !changes.length) { if (!APPLY) console.log('\nDry run — re-run with --apply to write these changes.'); return }

    const backup = path.resolve(process.cwd(), `belt-cleanup-backup-${school.id}-${Date.now()}.json`)
    fs.writeFileSync(backup, JSON.stringify(changes.map(c => ({ id: c.id, belt: c.belt, beltRankId: c.beltRankId })), null, 2))
    console.log(`\nBackup of the previous values: ${backup}`)
    await db.query('begin')
    for (const c of changes) {
      await db.query(
        `update school_members set belt = $2, "beltRankId" = $3, "updatedAt" = now() where id = $1 and "schoolId" = $4`,
        [c.id, c.newBelt, c.newRankId, school.id])
    }
    await db.query('commit')
    console.log(`Updated ${changes.length} students.`)
  } catch (e) {
    await db.query('rollback').catch(() => {})
    throw e
  } finally {
    await db.end()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
