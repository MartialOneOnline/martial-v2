/**
 * Remove duplicate RGA transactions created by repeated runs of
 * scripts/import-v1-transactions.js / scripts/sync-rga-payments.mjs.
 *
 * Both scripts dedupe against existing rows with an un-paginated Supabase
 * select (default page size ~1000), so once the school passed that many
 * imported v1_booking:* transactions, later runs stopped seeing the older
 * ones and re-inserted them. This script groups all v1_booking:* rows by
 * their booking id (the `notes` marker), keeps the OLDEST row per booking
 * (earliest createdAt, i.e. the first-ever import), and deletes the rest.
 *
 * Defaults to a dry run — prints what would be deleted without touching
 * the DB. Pass --live to actually delete.
 *
 * Usage:
 *   node scripts/dedupe-rga-transactions.mjs            # dry run
 *   node scripts/dedupe-rga-transactions.mjs --live      # actually delete
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
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv' // Roger Gracie Malaga

async function fetchAllV1Transactions() {
  const PAGE = 1000
  let rows = []
  let from = 0
  while (true) {
    const { data, error } = await db.schema('public').from('transactions')
      .select('id,notes,amount,status,createdAt')
      .eq('schoolId', SCHOOL_ID)
      .like('notes', 'v1_booking:%')
      .order('createdAt', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) { console.error('fetch error:', error); process.exit(1) }
    rows = rows.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE — will delete' : 'DRY RUN'}`)

  const rows = await fetchAllV1Transactions()
  console.log(`Fetched ${rows.length} v1_booking:* transactions for school ${SCHOOL_ID}`)

  const byBooking = new Map()
  for (const row of rows) {
    const key = row.notes
    if (!byBooking.has(key)) byBooking.set(key, [])
    byBooking.get(key).push(row)
  }

  const idsToDelete = []
  let duplicateGroups = 0
  let duplicatePaidAmount = 0
  for (const [, group] of byBooking) {
    if (group.length <= 1) continue
    duplicateGroups++
    // group is already sorted by createdAt ascending (query order preserved per key)
    const [keep, ...drop] = group
    for (const row of drop) {
      idsToDelete.push(row.id)
      if (row.status === 'PAID') duplicatePaidAmount += row.amount
    }
  }

  console.log(`Unique booking ids: ${byBooking.size}`)
  console.log(`Booking ids with duplicates: ${duplicateGroups}`)
  console.log(`Duplicate rows to delete: ${idsToDelete.length}`)
  console.log(`Duplicate PAID amount being removed: €${duplicatePaidAmount.toFixed(2)}`)

  if (!LIVE) {
    console.log('\nDry run only — no rows deleted. Re-run with --live to apply.')
    return
  }

  if (idsToDelete.length === 0) {
    console.log('\nNothing to delete.')
    return
  }

  const CHUNK = 200
  let deleted = 0
  for (let i = 0; i < idsToDelete.length; i += CHUNK) {
    const chunk = idsToDelete.slice(i, i + CHUNK)
    const { error } = await db.schema('public').from('transactions').delete().in('id', chunk)
    if (error) { console.error('delete error:', error); process.exit(1) }
    deleted += chunk.length
    process.stdout.write(`\rDeleted ${deleted}/${idsToDelete.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
