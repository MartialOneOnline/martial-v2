/**
 * One-off patch for Roger Gracie Malaga SchoolMember belts already written by
 * the buggy version of sync-rga-members.mjs (fixed in this same batch): the
 * naive CSV parser didn't handle RFC4180 doubled-quote escaping, so
 * userdetails.belts (a JSON blob re-quoted as "{""18"":""332""}") came out
 * corrupted, and every imported student fell back to the Blanco/0 default.
 *
 * Scope is belts only — reads the RGA V1 CSVs, selects school_members for
 * the RGA school tagged `notes: 'v1_student:<id>'`, and updates only
 * belt/beltDegree/updatedAt. It does not touch memberships or
 * SchoolMember.status — membership expiry is owned by the daily cron at
 * /api/cron/expire-memberships.
 *
 * Usage:
 *   node scripts/fix-rga-belts.mjs --dry-run
 *   node scripts/fix-rga-belts.mjs
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parseCSV, resolveBelt } from './lib/rga-belts.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  const v1Details = parseCSV(path.resolve(process.env.HOME, 'Downloads/userdetails (8).csv'))
  const v1BeltRanks = parseCSV(path.resolve(process.env.HOME, 'Downloads/belt_ranks (3).csv'))

  const v1DetailsByUserId = new Map(v1Details.map(d => [d.user_id, d]))
  const beltRankById = new Map(v1BeltRanks.map(r => [r.id, r.title]))

  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('id,belt,beltDegree,notes').eq('schoolId', SCHOOL_ID).like('notes', 'v1_student:%')
  if (mErr) { console.error('school_members fetch error:', mErr); process.exit(1) }
  console.log(`\nV1-imported school_members examined: ${members.length}`)

  const beltUpdates = []
  let noDetails = 0, noRank = 0
  for (const m of members) {
    const v1Id = m.notes.replace('v1_student:', '').trim()
    const d = v1DetailsByUserId.get(v1Id)
    if (!d) { noDetails++; continue }

    const rank = resolveBelt(d.belts, beltRankById)
    if (!rank) { noRank++; continue }

    if (m.belt !== rank.belt || m.beltDegree !== rank.degree) {
      beltUpdates.push({ id: m.id, belt: rank.belt, beltDegree: rank.degree, was: { belt: m.belt, beltDegree: m.beltDegree } })
    }
  }
  console.log(`Belt updates needed: ${beltUpdates.length} | no V1 details: ${noDetails} | no resolvable rank: ${noRank}`)

  if (DRY_RUN) {
    console.log('\nSample belt updates:', beltUpdates.slice(0, 8))
    return
  }

  for (const u of beltUpdates) {
    const { error } = await db.schema('public').from('school_members')
      .update({ belt: u.belt, beltDegree: u.beltDegree, updatedAt: new Date().toISOString() }).eq('id', u.id)
    if (error) { console.error('school_member update error:', error); process.exit(1) }
  }
  console.log(`\nUpdated ${beltUpdates.length} school_members (belt).`)
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
