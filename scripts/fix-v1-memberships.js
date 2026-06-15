/**
 * Fix V2 Membership records for Roger Gracie Malaga.
 * - Finds latest active V1 subscription_booking per user
 * - Maps V1 subscription_id → V2 planId/planName
 * - Updates memberships with correct planId, planName, startDate, endDate, paymentMethod
 * Safe to re-run.
 */

const fs   = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL  = 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_KEY  = process.env.SUPABASE_SECRET_KEY
const SCHOOL_ID     = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_SCHOOL_ID  = '798'

const db = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseCSV(filePath) {
  const text    = fs.readFileSync(filePath, 'utf8')
  const lines   = text.trim().split('\n')
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.replace(/"/g, ''))
  return lines.slice(1).map(line => {
    line = line.replace(/\r/g, '')
    const cols = []; let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

function mapMethod(v1Method) {
  if (!v1Method) return 'CASH'
  const m = v1Method.toLowerCase()
  if (m === 'stripe')     return 'STRIPE'
  if (m === 'gocardless') return 'DIRECT_DEBIT'
  if (m === 'bank')       return 'BANK_TRANSFER'
  return 'CASH'
}

// V1 subscription title → V2 plan id (based on existing plans in DB)
const PLAN_MAP = {
  'Jiu Jitsu Mensual':     'rgm-mensual',
  'Jiu Jitsu Trimestral':  'rgm-trimestral',
  'Jiu Jitsu Infantil':    'rgm-infantil',
  'Family Jiu Jitsu':      'rgm-family',
  'Jiu Jitsu Premium + RG TV': 'rgm-premium-rgtv',
  'Bono 8 Clases':         'rgm-bono8',
  'Pase 2 Semanas':        'rgm-2semanas',
  'Pase 1 Semana':         'rgm-1semana',
  'Pase 1 Día':            'rgm-1dia',
  'Clase Privada':         'rgm-privada',
  'Prueba 1 Semana':       'rgm-prueba-semana',
  'Prueba 1 Día':          'rgm-prueba-dia',
}

async function main() {
  console.log('📥 Reading CSVs…')
  const bookings = parseCSV('/Users/pablocabo/Downloads/subscription_bookings (3).csv')
  const v1Plans  = parseCSV('/Users/pablocabo/Downloads/subscriptions (1).csv')
  const v1Users  = parseCSV('/Users/pablocabo/Downloads/users (7).csv')

  // Build maps
  const v1PlanTitle  = Object.fromEntries(v1Plans.map(p => [p.id, p.title]))
  const v1UserEmail  = Object.fromEntries(v1Users.map(u => [u.id, u.email?.toLowerCase()]))

  // Fetch V2 users (email → id)
  console.log('🔍 Fetching V2 users…')
  const { data: dbUsers } = await db.from('users').select('id,email')
  const emailToUserId = Object.fromEntries((dbUsers ?? []).map(u => [u.email?.toLowerCase(), u.id]))

  // Fetch existing V2 memberships for this school
  console.log('🔍 Fetching V2 memberships…')
  const { data: memberships } = await db.from('memberships').select('id,userId').eq('schoolId', SCHOOL_ID)
  const userIdToMembershipId = Object.fromEntries((memberships ?? []).map(m => [m.userId, m.id]))
  console.log(`   Found ${memberships?.length ?? 0} memberships`)

  // Filter RGA bookings (all statuses — we want latest per user)
  const rgaBookings = bookings.filter(b => b.school_id === V1_SCHOOL_ID)

  // Find latest booking per V1 user_id (by activated_at or created_at)
  const latestByUser = {}
  for (const b of rgaBookings) {
    const date = b.activated_at && b.activated_at !== 'NULL' ? b.activated_at : b.created_at
    const existing = latestByUser[b.user_id]
    if (!existing || new Date(date) > new Date(existing._date)) {
      latestByUser[b.user_id] = { ...b, _date: date }
    }
  }

  console.log(`📋 Unique V1 users with bookings: ${Object.keys(latestByUser).length}`)

  let updated = 0, skipped = 0, noMatch = 0
  const now = new Date().toISOString()

  for (const [v1UserId, booking] of Object.entries(latestByUser)) {
    const email   = v1UserEmail[v1UserId]
    const v2UserId = email ? emailToUserId[email] : null
    if (!v2UserId) { noMatch++; continue }

    const membershipId = userIdToMembershipId[v2UserId]
    if (!membershipId) { skipped++; continue }

    const planTitle = v1PlanTitle[booking.subscription_id] ?? 'Membresía'
    const planId    = PLAN_MAP[planTitle] ?? null
    const startDate = booking.activated_at && booking.activated_at !== 'NULL'
      ? new Date(booking.activated_at).toISOString()
      : new Date(booking.created_at).toISOString()
    const endDate   = booking.expires_at && booking.expires_at !== 'NULL'
      ? new Date(booking.expires_at).toISOString()
      : null
    const paymentMethod = mapMethod(booking.method)

    // Map V1 status to V2
    const v1Status = String(booking.status)
    const status = (v1Status === '3' || v1Status === '4') ? 'CANCELLED' : 'ACTIVE'

    const { error } = await db
      .from('memberships')
      .update({ planId, planName: planTitle, startDate, endDate, paymentMethod, status, updatedAt: now })
      .eq('id', membershipId)

    if (error) { console.error(`Error updating ${membershipId}:`, error.message); continue }
    updated++
  }

  console.log(`\n✅ Updated: ${updated}`)
  console.log(`⏭  No V2 membership found: ${skipped}`)
  console.log(`⚠️  No user match: ${noMatch}`)
}

main().catch(e => { console.error(e); process.exit(1) })
