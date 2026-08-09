/**
 * Sync a school's payments from a fresh V1 export into V2.
 * 1) Inserts a Transaction for every subscription_bookings row not already
 *    imported (idempotent via notes: 'v1_booking:<id>', same marker as the
 *    original scripts/import-v1-transactions.js).
 * 2) Creates a Membership for any user who has none yet, from their latest
 *    booking (same behaviour as scripts/create-missing-v1-memberships.js).
 * Safe to re-run.
 *
 * Generalized from the original RGA-only script (see scripts/sync-v1-members.mjs
 * for the same treatment applied to member sync): school id and CSV filenames
 * are now parameters instead of hardcoded constants.
 *
 * V1 export files expected in --csv-dir (default ~/Downloads), using
 * whichever is newest per prefix:
 *   subscription_bookings*.csv   (id, user_id, school_id, subscription_id, price, status, ...)
 *   users*.csv                   (id, email, ...)
 *   subscriptions*.csv           (id, title, ...) — V1's plan/subscription catalog
 *
 * Usage:
 *   node scripts/sync-v1-payments.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --dry-run
 *   node scripts/sync-v1-payments.mjs --school-id=<v2 id> --v1-school-id=<v1 id>
 *   node scripts/sync-v1-payments.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --csv-dir=/path/to/csvs
 *
 * Omitting --school-id/--v1-school-id defaults to Roger Gracie Malaga (798),
 * matching the original script's behaviour.
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
const V1_SCHOOL_ID = getArg('v1-school-id', '798')
const CSV_DIR = path.resolve(getArg('csv-dir', path.join(process.env.HOME, 'Downloads')))

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.trim().split('\n')
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.replace(/"/g, ''))
  return lines.slice(1).map(line => {
    line = line.replace(/\r/g, '')
    const cols = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur); cur = '' }
      else cur += ch
    }
    cols.push(cur)
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

// V1's export panel names files "<table> (N).csv" and N keeps climbing on
// every re-export — pick whichever matching file was written most recently
// rather than hardcoding a number.
function findLatestCsv(prefixRegex) {
  const matches = fs.readdirSync(CSV_DIR)
    .filter(f => prefixRegex.test(f) && f.endsWith('.csv'))
    .map(f => ({ f, mtime: fs.statSync(path.join(CSV_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (!matches.length) return null
  return path.join(CSV_DIR, matches[0].f)
}

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function mapMethod(v1Method) {
  if (!v1Method) return 'CASH'
  const m = v1Method.toLowerCase()
  if (m === 'stripe') return 'STRIPE'
  if (m === 'cash') return 'CASH'
  if (m === 'gocardless') return 'DIRECT_DEBIT'
  if (m === 'bank') return 'BANK_TRANSFER'
  return 'OTHER'
}

function mapCurrency(code) {
  if (!code) return 'EUR'
  if (code.includes('€') || code.toLowerCase() === 'eur') return 'EUR'
  if (code.includes('£') || code.toLowerCase() === 'gbp') return 'GBP'
  if (code.includes('$') || code.toLowerCase() === 'usd') return 'USD'
  return 'EUR'
}

function mapMembershipStatus(v1Status) {
  const s = String(v1Status)
  if (s === '3' || s === '4') return 'CANCELLED'
  return 'ACTIVE'
}

// Same mapping as scripts/fix-v1-transaction-status.js — must stay in sync.
// V1 status: 1=pending, 3=canceled, 4=refunded, else (2,6,7,8)=approved/paid.
function mapTransactionStatus(v1Status) {
  switch (String(v1Status)) {
    case '1': return 'PENDING'
    case '3': return 'FAILED'
    case '4': return 'REFUNDED'
    default:  return 'PAID'
  }
}

function parseDate(val) {
  return val && val !== 'NULL' && val !== '' ? new Date(val).toISOString() : null
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`School: ${SCHOOL_ID} (V1 id ${V1_SCHOOL_ID}) | CSV dir: ${CSV_DIR}`)

  const bookingsPath = findLatestCsv(/^subscription_bookings/i)
  const usersPath = findLatestCsv(/^users(\s|\.|$)/i)
  const plansPath = findLatestCsv(/^subscriptions/i)

  for (const [label, p] of [['subscription_bookings', bookingsPath], ['users', usersPath], ['subscriptions', plansPath]]) {
    if (!p) { console.error(`No ${label}*.csv found in ${CSV_DIR}`); process.exit(1) }
    console.log(`  ${label}: ${path.basename(p)}`)
  }

  const bookingsAll = parseCSV(bookingsPath)
  const bookings = bookingsAll.some(b => 'school_id' in b)
    ? bookingsAll.filter(b => b.school_id === V1_SCHOOL_ID)
    : bookingsAll
  if (bookings.length !== bookingsAll.length) {
    console.log(`Filtered subscription_bookings to school_id=${V1_SCHOOL_ID}: ${bookings.length}/${bookingsAll.length} rows`)
  }
  const v1Users  = parseCSV(usersPath)
  const v1Plans  = parseCSV(plansPath)
  console.log(`V1 subscription_bookings rows: ${bookings.length}`)

  const v1UserEmail = Object.fromEntries(v1Users.map(u => [u.id, u.email?.toLowerCase()]))
  const v1PlanTitle = Object.fromEntries(v1Plans.map(p => [p.id, p.title]))

  // Fetch all V2 users by email (need the ones we just synced too)
  const emails = [...new Set(Object.values(v1UserEmail).filter(Boolean))]
  const emailToUserId = {}
  const CHUNK = 150
  for (let i = 0; i < emails.length; i += CHUNK) {
    const { data, error } = await db.schema('public').from('users').select('id,email').in('email', emails.slice(i, i + CHUNK))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const row of data) emailToUserId[row.email.toLowerCase()] = row.id
  }

  // Existing transactions (dedup) — paginated, Supabase caps unpaginated selects at ~1000 rows
  const existingTx = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.schema('public').from('transactions')
      .select('notes').eq('schoolId', SCHOOL_ID).like('notes', 'v1_booking:%')
      .range(from, from + 999)
    if (error) { console.error('tx fetch error:', error); process.exit(1) }
    existingTx.push(...data)
    if (data.length < 1000) break
  }
  const importedBookingIds = new Set(existingTx.map(t => t.notes?.replace('v1_booking:', '').trim()))
  console.log(`Already-imported V1 booking ids (transactions): ${importedBookingIds.size}`)

  // Existing memberships (dedup — one per user for the gap-fill step)
  const { data: existingMems, error: memErr } = await db.schema('public').from('memberships').select('userId').eq('schoolId', SCHOOL_ID)
  if (memErr) { console.error('memberships fetch error:', memErr); process.exit(1) }
  const hasMembership = new Set((existingMems ?? []).map(m => m.userId))
  console.log(`Users with an existing membership: ${hasMembership.size}`)

  // ── 1) New transactions ──────────────────────────────────────────────────
  const txToInsert = []
  let noUser = 0
  for (const b of bookings) {
    if (importedBookingIds.has(b.id)) continue
    const email = v1UserEmail[b.user_id]
    const userId = email ? emailToUserId[email] ?? null : null
    if (!userId) { noUser++; continue }

    const planTitle = v1PlanTitle[b.subscription_id] ?? 'Membresía'
    const periodStart = parseDate(b.activated_at)
    const periodEnd = parseDate(b.expires_at)
    const date = periodStart ?? parseDate(b.created_at) ?? new Date().toISOString()
    const now = new Date().toISOString()

    txToInsert.push({
      id: cuid(),
      schoolId: SCHOOL_ID,
      userId,
      type: 'INCOME',
      category: 'MEMBERSHIP',
      description: planTitle,
      amount: parseFloat(b.price) || 0,
      currency: mapCurrency(b.currency_code),
      date,
      status: mapTransactionStatus(b.status),
      paymentMethod: mapMethod(b.method),
      notes: `v1_booking:${b.id}`,
      periodStart,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    })
  }
  console.log(`\nNew transactions to insert: ${txToInsert.length} | no user match: ${noUser}`)

  // ── 2) Membership gap-fill ───────────────────────────────────────────────
  const latestByUser = {}
  for (const b of bookings) {
    const date = b.activated_at && b.activated_at !== 'NULL' ? b.activated_at : b.created_at
    const existing = latestByUser[b.user_id]
    if (!existing || new Date(date) > new Date(existing._date)) latestByUser[b.user_id] = { ...b, _date: date }
  }
  const memToInsert = []
  for (const [v1UserId, booking] of Object.entries(latestByUser)) {
    const email = v1UserEmail[v1UserId]
    const userId = email ? emailToUserId[email] ?? null : null
    if (!userId || hasMembership.has(userId)) continue

    const planTitle = v1PlanTitle[booking.subscription_id] ?? 'Membresía'
    const startDate = parseDate(booking.activated_at) ?? parseDate(booking.created_at) ?? new Date().toISOString()
    const now = new Date().toISOString()
    memToInsert.push({
      id: cuid(),
      schoolId: SCHOOL_ID,
      userId,
      planName: planTitle,
      price: parseFloat(booking.price) || 0,
      currency: 'EUR',
      paymentMethod: mapMethod(booking.method),
      status: mapMembershipStatus(booking.status),
      startDate,
      endDate: parseDate(booking.expires_at),
      classesUsed: 0,
      notes: `v1_booking:${booking.id}`,
      createdAt: now,
      updatedAt: now,
    })
    hasMembership.add(userId)
  }
  console.log(`Memberships to create (gap-fill): ${memToInsert.length}`)

  if (DRY_RUN) {
    console.log('\nSample new transactions:', txToInsert.slice(0, 3))
    console.log('\nSample new memberships:', memToInsert.slice(0, 3))
    return
  }

  const CH = 100
  for (let i = 0; i < txToInsert.length; i += CH) {
    const { error } = await db.schema('public').from('transactions').insert(txToInsert.slice(i, i + CH))
    if (error) { console.error('transaction insert error:', error); process.exit(1) }
    process.stdout.write(`\rInserted transactions: ${Math.min(i + CH, txToInsert.length)}/${txToInsert.length}`)
  }
  console.log()

  for (let i = 0; i < memToInsert.length; i += CH) {
    const { error } = await db.schema('public').from('memberships').insert(memToInsert.slice(i, i + CH))
    if (error) { console.error('membership insert error:', error); process.exit(1) }
  }
  console.log(`Inserted ${memToInsert.length} memberships.`)
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
