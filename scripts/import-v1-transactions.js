/**
 * Import V1 subscription_bookings → Transaction records for Roger Gracie Malaga
 * Run: node scripts/import-v1-transactions.js
 * Safe to re-run: skips rows where notes contains the V1 booking ID
 */

const fs   = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY
const SCHOOL_ID    = 'cmq6k2n5t0000x4o0rcvlmhmv'  // Roger Gracie Malaga
const V1_SCHOOL_ID = '798'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const text    = fs.readFileSync(filePath, 'utf8')
  const lines   = text.trim().split('\n')
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.replace(/"/g, ''))
  return lines.slice(1).map(line => {
    line = line.replace(/\r/g, '')
    const cols = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

// ── Method mapping ────────────────────────────────────────────────────────────
function mapMethod(v1Method) {
  if (!v1Method) return null
  const m = v1Method.toLowerCase()
  if (m === 'stripe')      return 'STRIPE'
  if (m === 'cash')        return 'CASH'
  if (m === 'gocardless')  return 'DIRECT_DEBIT'
  if (m === 'bank')        return 'BANK_TRANSFER'
  return 'OTHER'
}

// ── Currency normalisation ────────────────────────────────────────────────────
function mapCurrency(code) {
  if (!code) return 'EUR'
  if (code.includes('€') || code.toLowerCase() === 'eur') return 'EUR'
  if (code.includes('£') || code.toLowerCase() === 'gbp') return 'GBP'
  if (code.includes('$') || code.toLowerCase() === 'usd') return 'USD'
  return 'EUR'
}

// ── cuid-like ID generator (simple) ─────────────────────────────────────────
function cuid() {
  const ts   = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 12)
  return 'c' + ts + rand
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📥 Reading CSV files…')

  const bookings      = parseCSV('/Users/pablocabo/Downloads/subscription_bookings (2).csv')
  const v1Users       = parseCSV('/Users/pablocabo/Downloads/users (7).csv')
  const v1Plans       = parseCSV('/Users/pablocabo/Downloads/subscriptions (1).csv')

  // Build lookup maps
  const v1UserEmail   = Object.fromEntries(v1Users.map(u => [u.id, u.email]))
  const v1PlanTitle   = Object.fromEntries(v1Plans.map(p => [p.id, p.title]))

  // Fetch existing DB users (email → id)
  console.log('🔍 Fetching users from DB…')
  const { data: dbUsers, error: uErr } = await db
    .schema('public').from('users').select('id, email')
  if (uErr) { console.error('Error fetching users:', uErr); process.exit(1) }
  const emailToUserId = Object.fromEntries(dbUsers.map(u => [u.email?.toLowerCase(), u.id]))

  // Fetch existing transaction notes to skip duplicates
  console.log('🔍 Checking existing transactions…')
  const { data: existing } = await db
    .schema('public').from('transactions')
    .select('notes')
    .eq('schoolId', SCHOOL_ID)
    .like('notes', 'v1_booking:%')
  const importedIds = new Set(
    (existing ?? []).map(t => t.notes?.replace('v1_booking:', '').trim())
  )
  console.log(`   Already imported: ${importedIds.size} bookings`)

  // Filter RGA bookings with price > 0
  const rgaBookings = bookings.filter(b =>
    b.school_id === V1_SCHOOL_ID && parseFloat(b.price) > 0
  )
  console.log(`📋 Total V1 paid bookings for RGA: ${rgaBookings.length}`)

  // Build Transaction rows
  const toInsert = []
  let skipped = 0, noUser = 0

  for (const b of rgaBookings) {
    const bookingId = b.id
    if (importedIds.has(bookingId)) { skipped++; continue }

    const v1Email  = v1UserEmail[b.user_id]?.toLowerCase()
    const userId   = v1Email ? (emailToUserId[v1Email] ?? null) : null
    if (!userId) noUser++

    const planTitle = v1PlanTitle[b.subscription_id] ?? 'Membresía'

    function parseDate(val) {
      return val && val !== 'NULL' && val !== '' ? new Date(val).toISOString() : null
    }

    const periodStart = parseDate(b.activated_at)
    const periodEnd   = parseDate(b.expires_at)
    const date = periodStart ?? new Date(b.created_at).toISOString()

    const now = new Date().toISOString()
    toInsert.push({
      id:            cuid(),
      schoolId:      SCHOOL_ID,
      userId:        userId,
      type:          'INCOME',
      category:      'MEMBERSHIP',
      description:   planTitle,
      amount:        parseFloat(b.price),
      currency:      mapCurrency(b.currency_code),
      date,
      status:        'PAID',
      paymentMethod: mapMethod(b.method),
      notes:         `v1_booking:${bookingId}`,
      periodStart,
      periodEnd,
      createdAt:     now,
      updatedAt:     now,
    })
  }

  console.log(`✅ To insert: ${toInsert.length}`)
  console.log(`⏭  Skipped (already imported): ${skipped}`)
  console.log(`⚠️  No user match: ${noUser}`)

  if (toInsert.length === 0) {
    console.log('Nothing to import.')
    return
  }

  // Batch insert in chunks of 200
  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK)
    const { error } = await db.schema('public').from('transactions').insert(chunk)
    if (error) {
      console.error(`Error inserting chunk ${i}–${i + CHUNK}:`, error.message)
      process.exit(1)
    }
    inserted += chunk.length
    process.stdout.write(`\r   Inserted ${inserted}/${toInsert.length}…`)
  }

  console.log(`\n🎉 Done! ${inserted} transactions imported.`)
}

main().catch(e => { console.error(e); process.exit(1) })
