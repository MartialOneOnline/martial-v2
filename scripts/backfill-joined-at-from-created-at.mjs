/**
 * Backfill SchoolMember.joinedAt = SchoolMember.createdAt for STUDENT rows
 * that have no V1 history (no v1_student: note) and are still null after
 * backfill-joined-at-from-v1.mjs. For these, the row's own creation
 * timestamp IS the real join moment — they were never V1 records, so there
 * is no earlier "real" date to recover from V1 exports.
 *
 * Usage:
 *   node scripts/backfill-joined-at-from-created-at.mjs --school-id=<v2 id> --dry-run
 *   node scripts/backfill-joined-at-from-created-at.mjs --school-id=<v2 id>
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

function getArg(flag, fallback) {
  const prefix = `--${flag}=`
  const hit = process.argv.find(a => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : fallback
}

const SCHOOL_ID = getArg('school-id', 'cmq6k2n5t0000x4o0rcvlmhmv')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'} | School: ${SCHOOL_ID}`)

  const { data: members, error } = await db.schema('public').from('school_members')
    .select('id, notes, joinedAt, createdAt, userId')
    .eq('schoolId', SCHOOL_ID).eq('role', 'STUDENT')
    .is('joinedAt', null)
  if (error) { console.error('fetch error:', error); process.exit(1) }

  const targets = members.filter(m => !m.notes?.startsWith('v1_student:'))
  console.log(`Null joinedAt, no V1 tag: ${targets.length} (of ${members.length} total null)`)

  const userIds = targets.map(m => m.userId)
  const { data: users } = userIds.length
    ? await db.schema('public').from('users').select('id,email').in('id', userIds)
    : { data: [] }
  const emailById = new Map((users ?? []).map(u => [u.id, u.email]))

  for (const m of targets) {
    console.log(`  ${emailById.get(m.userId)}: null -> ${m.createdAt}`)
  }

  if (DRY_RUN) {
    console.log('\nDry run — no writes made.')
    return
  }

  let updated = 0
  for (const m of targets) {
    const { error: uErr } = await db.schema('public').from('school_members')
      .update({ joinedAt: m.createdAt })
      .eq('id', m.id)
    if (uErr) { console.error(`update error for ${m.id}:`, uErr); continue }
    updated++
  }
  console.log(`\nUpdated ${updated}/${targets.length} rows.`)
}

main().catch(e => { console.error(e); process.exit(1) })
