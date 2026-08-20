/**
 * Dedupe RGM (Roger Gracie Malaga) bookings that were double-imported by two
 * uncoordinated V1->V2 migration scripts:
 *   - prisma/seed-rgm-bookings.ts   (ran 2026-06-22, stale CSV, guessed
 *     classId via modulo distribution when no direct V1->V2 class map existed)
 *   - scripts/sync-rga-attendance.mjs (ran ~2026-08-05/06, explicit correct
 *     CLASS_MAP, tags its own rows with notes: 'v1_class_booking:<v1_id>')
 *
 * A student can only be in one real class at one instant, so any two rows
 * sharing the same (userId, scheduledAt) — regardless of classId — represent
 * the same real V1 session imported more than once.
 *
 * Follows the convention from docs/operations/cleanup_bookings_dupes_2026-07.sql:
 * duplicates are CANCELLED (status -> 'CANCELLED'), never deleted, so nothing
 * of consequence is destroyed and the action is trivially reversible.
 *
 * Keep-row priority within a duplicate group:
 *   1. A row tagged by sync-rga-attendance.mjs (notes LIKE 'v1_class_booking:%')
 *      — it has the correct classId mapping and the real V1 timestamps.
 *   2. Otherwise, the lexicographically smallest id (deterministic tiebreak).
 * Rows already CANCELLED are never picked to "keep" if a non-cancelled
 * alternative exists, and are left untouched if they're the one being kept
 * (nothing to cancel).
 *
 * Usage:
 *   node scripts/dedupe-rgm-bookings.mjs                 # dry run (default) — writes a report, touches nothing
 *   node scripts/dedupe-rgm-bookings.mjs --live           # applies the CANCEL updates
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const LIVE = process.argv.includes('--live')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

const norm = s => (s || '').replace(' ', 'T').slice(0, 19)
const isV1Sync = b => !!(b.notes && b.notes.startsWith('v1_class_booking:'))

async function fetchAll() {
  const { data: classes, error: ce } = await db.schema('public').from('classes').select('id,name').eq('schoolId', SCHOOL_ID)
  if (ce) { console.error('classes fetch error:', ce); process.exit(1) }
  const classIds = classes.map(c => c.id)
  const classNames = Object.fromEntries(classes.map(c => [c.id, c.name]))

  let from = 0, all = []
  for (;;) {
    const { data, error } = await db.schema('public').from('bookings')
      .select('id,userId,classId,scheduledAt,status,notes,createdAt')
      .in('classId', classIds)
      .order('id', { ascending: true })
      .range(from, from + 999)
    if (error) { console.error('bookings fetch error:', error); process.exit(1) }
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return { all, classNames }
}

function planDedup(all) {
  const groups = new Map()
  for (const b of all) {
    const k = `${b.userId}|${norm(b.scheduledAt)}`
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(b)
  }

  const plan = []
  for (const [key, rows] of groups) {
    if (rows.length < 2) continue
    const nonCancelled = rows.filter(r => r.status !== 'CANCELLED')
    // if everything in the group is already cancelled, nothing to do
    if (nonCancelled.length < 2) continue

    const v1Rows = nonCancelled.filter(isV1Sync).sort((a, b) => a.id.localeCompare(b.id))
    const keep = v1Rows[0] ?? [...nonCancelled].sort((a, b) => a.id.localeCompare(b.id))[0]
    const toCancel = nonCancelled.filter(r => r.id !== keep.id)
    if (toCancel.length === 0) continue

    plan.push({
      key,
      userId: keep.userId,
      scheduledAt: keep.scheduledAt,
      keep: { id: keep.id, classId: keep.classId, status: keep.status, source: isV1Sync(keep) ? 'sync-rga-attendance' : 'other' },
      cancel: toCancel.map(r => ({ id: r.id, classId: r.classId, status: r.status, source: isV1Sync(r) ? 'sync-rga-attendance' : 'other' })),
    })
  }
  return plan
}

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE' : 'DRY RUN'}`)
  const { all, classNames } = await fetchAll()
  console.log(`Total bookings fetched for RGM: ${all.length}`)

  const plan = planDedup(all)
  const totalToCancel = plan.reduce((s, g) => s + g.cancel.length, 0)
  const sameClass = plan.reduce((s, g) => s + g.cancel.filter(c => c.classId === g.keep.classId).length, 0)
  const diffClass = totalToCancel - sameClass

  console.log(`\nDuplicate groups found: ${plan.length}`)
  console.log(`Rows that would be cancelled: ${totalToCancel}`)
  console.log(`  same classId as kept row: ${sameClass}`)
  console.log(`  different classId than kept row (class-mapping collision): ${diffClass}`)

  const byStatus = {}
  for (const g of plan) for (const c of g.cancel) byStatus[c.status] = (byStatus[c.status] || 0) + 1
  console.log('Status breakdown of rows to be cancelled:', byStatus)

  const reportPath = path.resolve(process.cwd(), 'scripts', `dedupe-rgm-bookings-report-${LIVE ? 'applied' : 'dryrun'}.json`)
  fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), mode: LIVE ? 'LIVE' : 'DRY RUN', totalBookings: all.length, duplicateGroups: plan.length, rowsToCancel: totalToCancel, sameClass, diffClass, byStatus, classNames, plan }, null, 2))
  console.log(`\nFull plan written to ${reportPath}`)

  console.log('\nFirst 5 example groups:')
  for (const g of plan.slice(0, 5)) {
    console.log(`- user ${g.userId} @ ${g.scheduledAt}: keep ${g.keep.id} (${classNames[g.keep.classId]}, ${g.keep.status}, ${g.keep.source}); cancel ${g.cancel.map(c => `${c.id} (${classNames[c.classId]}, ${c.status}, ${c.source})`).join(', ')}`)
  }

  if (!LIVE) {
    console.log('\nDry run only — no rows were modified. Re-run with --live to apply.')
    return
  }

  const ids = plan.flatMap(g => g.cancel.map(c => c.id))
  const CH = 500
  for (let i = 0; i < ids.length; i += CH) {
    const chunk = ids.slice(i, i + CH)
    const { error } = await db.schema('public').from('bookings')
      .update({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
      .in('id', chunk)
    if (error) { console.error('update error:', error); process.exit(1) }
    process.stdout.write(`\rCancelled: ${Math.min(i + CH, ids.length)}/${ids.length}`)
  }
  console.log('\nDone.')

  // Re-verify: zero non-cancelled duplicate groups remain
  const { all: after } = await fetchAll()
  const remaining = planDedup(after)
  const remainingRows = remaining.reduce((s, g) => s + g.cancel.length, 0)
  if (remainingRows > 0) {
    console.error(`WARNING: ${remainingRows} duplicate rows still remain after cleanup — investigate before re-running.`)
    process.exit(1)
  }
  console.log('Verified: 0 duplicate groups remain.')
}

main().catch(e => { console.error(e); process.exit(1) })
