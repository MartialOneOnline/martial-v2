/**
 * Backfill SchoolMember.joinedAt for STUDENT rows tagged v1_student:<id>
 * that had no match in the (stale) V1 CSV export, using the earliest real
 * activity on record — membership.startDate, booking.scheduledAt, or
 * transaction.date — whichever is earliest. This is a real signal (not a
 * guess): genuinely old V1 members carry old synced activity, while
 * genuinely new members (whose V1 signup just predates the last sync and
 * isn't in our CSV snapshot) have activity starting right when they
 * actually joined.
 *
 * Only touches rows where joinedAt is still null. Leaves a row untouched
 * if it has no activity at all (no membership/booking/transaction) — no
 * real signal to backfill from, so it stays null rather than guess.
 *
 * Usage:
 *   node scripts/backfill-joined-at-from-activity.mjs --school-id=<v2 id> --dry-run
 *   node scripts/backfill-joined-at-from-activity.mjs --school-id=<v2 id>
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
    .select('id, notes, userId')
    .eq('schoolId', SCHOOL_ID).eq('role', 'STUDENT')
    .is('joinedAt', null)
    .like('notes', 'v1_student:%')
  if (error) { console.error('fetch error:', error); process.exit(1) }
  console.log(`Candidates (v1_student-tagged, still null): ${members.length}`)

  const userIds = members.map(m => m.userId)
  const { data: users } = await db.schema('public').from('users').select('id,email').in('id', userIds)
  const emailById = new Map(users.map(u => [u.id, u.email]))

  const results = []
  for (const m of members) {
    const [{ data: memberships }, { data: bookings }, { data: transactions }] = await Promise.all([
      db.schema('public').from('memberships').select('startDate').eq('userId', m.userId).eq('schoolId', SCHOOL_ID).order('startDate', { ascending: true }).limit(1),
      db.schema('public').from('bookings').select('scheduledAt, class:classes!inner(schoolId)').eq('userId', m.userId).eq('class.schoolId', SCHOOL_ID).order('scheduledAt', { ascending: true }).limit(1),
      db.schema('public').from('transactions').select('date').eq('userId', m.userId).eq('schoolId', SCHOOL_ID).order('date', { ascending: true }).limit(1),
    ])

    const candidates = [
      memberships?.[0]?.startDate,
      bookings?.[0]?.scheduledAt,
      transactions?.[0]?.date,
    ].filter(Boolean).map(d => new Date(d))

    if (candidates.length === 0) {
      results.push({ id: m.id, email: emailById.get(m.userId), earliest: null })
      continue
    }
    const earliest = new Date(Math.min(...candidates.map(d => d.getTime())))
    results.push({ id: m.id, email: emailById.get(m.userId), earliest: earliest.toISOString() })
  }

  const toUpdate = results.filter(r => r.earliest)
  const noActivity = results.filter(r => !r.earliest)

  console.log(`\nWith activity to backfill from: ${toUpdate.length}`)
  for (const r of toUpdate) console.log(`  ${r.email}: -> ${r.earliest}`)
  console.log(`\nNo activity at all (left null): ${noActivity.length}`)
  for (const r of noActivity) console.log(`  ${r.email}`)

  if (DRY_RUN) {
    console.log('\nDry run — no writes made.')
    return
  }

  let updated = 0
  for (const r of toUpdate) {
    const { error: uErr } = await db.schema('public').from('school_members')
      .update({ joinedAt: r.earliest })
      .eq('id', r.id)
    if (uErr) { console.error(`update error for ${r.id}:`, uErr); continue }
    updated++
  }
  console.log(`\nUpdated ${updated}/${toUpdate.length} rows.`)
}

main().catch(e => { console.error(e); process.exit(1) })
