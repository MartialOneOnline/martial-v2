/**
 * Backfill SchoolMember.joinedAt with the real V1 signup date, matched by
 * user email against v1-users.csv's `created_at` column.
 *
 * Context: SchoolMember creation paths never set joinedAt for
 * admin-added/imported students (only self-service signup flows did), so
 * most rows are either null or carry the timestamp of whichever bulk-import
 * script run created them (e.g. every row from a given import shares the
 * same second) — neither reflects when the student actually joined.
 * V1's users.created_at is the real historical join date. Any SchoolMember
 * whose user email has no match in v1-users.csv was created directly in V2
 * (post-launch signup) and is left untouched — its joinedAt (real or null)
 * already reflects reality or will be set going forward by the fixed
 * creation paths.
 *
 * Usage:
 *   node scripts/backfill-joined-at-from-v1.mjs --school-id=<v2 id> --dry-run
 *   node scripts/backfill-joined-at-from-v1.mjs --school-id=<v2 id>
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parseCSV } from './lib/rga-belts.mjs'

const DRY_RUN = process.argv.includes('--dry-run')

function getArg(flag, fallback) {
  const prefix = `--${flag}=`
  const hit = process.argv.find(a => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const SCHOOL_ID = getArg('school-id', 'cmq6k2n5t0000x4o0rcvlmhmv') // Roger Gracie Malaga
const CSV_PATH = getArg('v1-users-csv', path.resolve('scripts/v1-users.csv'))

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | School: ${SCHOOL_ID} | CSV: ${CSV_PATH}`)

  const v1Users = parseCSV(CSV_PATH)
  const v1CreatedAtByEmail = new Map()
  for (const u of v1Users) {
    const email = u.email?.trim().toLowerCase()
    if (!email || !u.created_at) continue
    // Keep the earliest created_at if the same email appears more than once in V1
    const existing = v1CreatedAtByEmail.get(email)
    if (!existing || new Date(u.created_at) < new Date(existing)) {
      v1CreatedAtByEmail.set(email, u.created_at)
    }
  }
  console.log(`V1 users with email + created_at: ${v1CreatedAtByEmail.size}`)

  const { data: members, error: mErr } = await db.schema('public')
    .from('school_members')
    .select('id, joinedAt, userId')
    .eq('schoolId', SCHOOL_ID)
    .eq('role', 'STUDENT')
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }
  console.log(`SchoolMember (STUDENT) rows: ${members.length}`)

  const userIds = members.map(m => m.userId)
  const usersByIdMap = new Map()
  const CHUNK = 200
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const chunk = userIds.slice(i, i + CHUNK)
    const { data, error } = await db.schema('public').from('users').select('id,email').in('id', chunk)
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const u of data) usersByIdMap.set(u.id, u.email)
  }

  const updates = []
  let noMatch = 0
  for (const m of members) {
    const email = usersByIdMap.get(m.userId)?.trim().toLowerCase()
    const v1CreatedAt = email ? v1CreatedAtByEmail.get(email) : null
    if (!v1CreatedAt) { noMatch++; continue }
    const newJoinedAt = new Date(v1CreatedAt).toISOString()
    if (m.joinedAt === newJoinedAt) continue // already correct, skip
    updates.push({ id: m.id, email, oldJoinedAt: m.joinedAt, newJoinedAt })
  }

  console.log(`Matched to a V1 email with a real created_at: ${members.length - noMatch}`)
  console.log(`No V1 email match (left untouched): ${noMatch}`)
  console.log(`Rows needing an update: ${updates.length}`)
  console.log('\nSample (first 10):')
  for (const u of updates.slice(0, 10)) {
    console.log(`  ${u.email}: ${u.oldJoinedAt ?? 'null'} -> ${u.newJoinedAt}`)
  }

  if (DRY_RUN) {
    console.log('\nDry run — no writes made.')
    return
  }

  let updated = 0
  for (const u of updates) {
    const { error } = await db.schema('public').from('school_members')
      .update({ joinedAt: u.newJoinedAt })
      .eq('id', u.id)
    if (error) { console.error(`update error for ${u.id} (${u.email}):`, error); continue }
    updated++
  }
  console.log(`\nUpdated ${updated}/${updates.length} rows.`)
}

main().catch(e => { console.error(e); process.exit(1) })
