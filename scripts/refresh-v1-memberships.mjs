/**
 * Refresh existing V2 Membership records with a school's latest V1 renewal.
 *
 * Gap this closes: scripts/sync-v1-payments.mjs only ever *creates* a
 * Membership when a user has none — once one exists, later V1 renewal
 * bookings land fine as Transaction rows but the Membership itself (plan,
 * price, dates, status) is never touched again. Combined with the daily
 * expire-memberships cron (apps/web/lib/services/membership.ts,
 * expireLapsedMemberships — flips ACTIVE -> EXPIRED once endDate is
 * EXPIRY_GRACE_PERIOD_DAYS=30 in the past), that means anyone who renewed in
 * V1 after their V2 Membership.endDate had already lapsed sits stuck showing
 * EXPIRED/CANCELLED in V2 even though they're actively training and paying.
 *
 * This script finds every Membership whose endDate is meaningfully older
 * (>2 days) than what the user's latest V1 subscription_booking says, and
 * overwrites planName/price/paymentMethod/startDate/endDate/status/notes to
 * match V1. Status is derived the same way the app's own expiry cron would
 * treat it (ACTIVE if endDate is within the grace period, EXPIRED if it's
 * further in the past, CANCELLED if V1's booking itself was
 * cancelled/refunded) — so this brings memberships current without fighting
 * whatever the cron does to them afterwards.
 *
 * Does NOT touch SchoolMember.status — that's handled separately (see
 * scripts/fix-rga-active-status.mjs) and, per the currently ACTIVE
 * SchoolMembers this fixes, is already correct.
 *
 * Safe to re-run — recomputes and only updates rows still stale.
 *
 * Usage:
 *   node scripts/refresh-v1-memberships.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --dry-run
 *   node scripts/refresh-v1-memberships.mjs --school-id=<v2 id> --v1-school-id=<v1 id>
 *
 * Omitting --school-id/--v1-school-id defaults to Roger Gracie Malaga (798).
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
const EXPIRY_GRACE_PERIOD_DAYS = 30 // must match apps/web/lib/services/membership.ts

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

function findLatestCsv(prefixRegex) {
  const matches = fs.readdirSync(CSV_DIR)
    .filter(f => prefixRegex.test(f) && f.endsWith('.csv'))
    .map(f => ({ f, mtime: fs.statSync(path.join(CSV_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (!matches.length) return null
  return path.join(CSV_DIR, matches[0].f)
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

function parseDate(val) {
  return val && val !== 'NULL' && val !== '' ? new Date(val) : null
}

function graceCutoff() {
  const d = new Date()
  d.setDate(d.getDate() - EXPIRY_GRACE_PERIOD_DAYS)
  return d
}

// Mirrors how apps/web/lib/services/membership.ts's expiry cron would
// eventually treat this membership, so we don't hand it a status the cron
// would immediately contradict.
function deriveStatus(booking) {
  const s = String(booking.status)
  if (s === '3' || s === '4') {
    const cancelledAt = parseDate(booking.updated_at) ?? new Date()
    return { status: 'CANCELLED', cancelledAt: cancelledAt.toISOString() }
  }
  const expires = parseDate(booking.expires_at)
  if (expires && expires < graceCutoff()) return { status: 'EXPIRED', cancelledAt: null }
  return { status: 'ACTIVE', cancelledAt: null }
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
  const bookings = bookingsAll.some(b => 'school_id' in b) ? bookingsAll.filter(b => b.school_id === V1_SCHOOL_ID) : bookingsAll
  const v1Users = parseCSV(usersPath)
  const v1Plans = parseCSV(plansPath)

  const v1UserEmail = new Map(v1Users.map(u => [u.id, u.email?.toLowerCase()]).filter(([, e]) => e))
  const v1IdByEmail = new Map([...v1UserEmail.entries()].map(([id, email]) => [email, id]))
  const v1PlanTitle = new Map(v1Plans.map(p => [p.id, p.title]))

  // Latest booking per V1 user id — same rule as sync-v1-payments.mjs.
  const latestByV1UserId = new Map()
  for (const b of bookings) {
    const date = b.activated_at && b.activated_at !== 'NULL' ? b.activated_at : b.created_at
    const existing = latestByV1UserId.get(b.user_id)
    if (!existing || new Date(date) > new Date(existing._date)) latestByV1UserId.set(b.user_id, { ...b, _date: date })
  }
  console.log(`V1 users with at least one booking: ${latestByV1UserId.size}`)

  const memberships = []
  const CHUNK = 1000
  for (let from = 0; ; from += CHUNK) {
    const { data, error } = await db.schema('public').from('memberships')
      .select('id,userId,status,planName,price,paymentMethod,startDate,endDate,notes')
      .eq('schoolId', SCHOOL_ID).range(from, from + CHUNK - 1)
    if (error) { console.error('memberships fetch error:', error); process.exit(1) }
    memberships.push(...data)
    if (data.length < CHUNK) break
  }
  console.log(`Existing memberships at school: ${memberships.length}`)

  const userIds = [...new Set(memberships.map(m => m.userId))]
  const emailByUserId = new Map()
  for (let i = 0; i < userIds.length; i += 150) {
    const { data, error } = await db.schema('public').from('users').select('id,email').in('id', userIds.slice(i, i + 150))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const row of data) emailByUserId.set(row.id, row.email.toLowerCase())
  }

  const toUpdate = []
  let noEmail = 0, noV1Id = 0, noBooking = 0, current = 0
  for (const m of memberships) {
    const email = emailByUserId.get(m.userId)
    if (!email) { noEmail++; continue }
    const v1Id = v1IdByEmail.get(email)
    if (!v1Id) { noV1Id++; continue }
    const booking = latestByV1UserId.get(v1Id)
    if (!booking) { noBooking++; continue }

    const v1Expires = parseDate(booking.expires_at)
    const v2Expires = parseDate(m.endDate)
    const diffDays = v1Expires ? (v1Expires - (v2Expires ?? new Date(0))) / (1000 * 60 * 60 * 24) : -1
    if (diffDays <= 2) { current++; continue }

    const { status, cancelledAt } = deriveStatus(booking)
    const planTitle = v1PlanTitle.get(booking.subscription_id) ?? m.planName
    toUpdate.push({
      id: m.id,
      email,
      from: { status: m.status, endDate: m.endDate, planName: m.planName },
      to: {
        planName: planTitle,
        price: parseFloat(booking.price) || 0,
        paymentMethod: mapMethod(booking.method),
        startDate: (parseDate(booking.activated_at) ?? parseDate(booking.created_at) ?? new Date()).toISOString(),
        endDate: v1Expires ? v1Expires.toISOString() : null,
        status,
        cancelledAt,
        notes: `v1_booking:${booking.id}`,
        updatedAt: new Date().toISOString(),
      },
    })
  }

  console.log(`\nAlready current (endDate matches V1 within 2 days): ${current}`)
  console.log(`No V2 user email: ${noEmail} | no matching V1 id: ${noV1Id} | no V1 booking: ${noBooking}`)
  console.log(`Stale memberships to refresh: ${toUpdate.length}`)
  const byStatus = {}
  for (const u of toUpdate) byStatus[u.to.status] = (byStatus[u.to.status] ?? 0) + 1
  console.log(`  -> new status breakdown:`, byStatus)

  if (DRY_RUN) {
    console.log('\nSample updates:')
    console.log(toUpdate.slice(0, 10).map(u => ({ email: u.email, fromStatus: u.from.status, fromEndDate: u.from.endDate, toStatus: u.to.status, toEndDate: u.to.endDate })))
    if (toUpdate.length > 10) console.log(`  ...and ${toUpdate.length - 10} more`)
    return
  }

  let done = 0
  for (const u of toUpdate) {
    const { error } = await db.schema('public').from('memberships').update(u.to).eq('id', u.id)
    if (error) { console.error(`update failed for ${u.id} (${u.email}):`, error); process.exit(1) }
    done++
    if (done % 25 === 0 || done === toUpdate.length) process.stdout.write(`\r  ${done}/${toUpdate.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
