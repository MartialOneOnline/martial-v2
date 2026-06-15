/**
 * Creates Membership records for V1 users who have bookings but no V2 Membership.
 * Uses their latest V1 booking to set plan, dates, method.
 * Safe to re-run — checks existing memberships first.
 */
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://fixipigqxebxferfxlsv.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY
const SCHOOL_ID    = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_SCHOOL_ID = '798'

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

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function mapMethod(v1Method) {
  if (!v1Method) return 'CASH'
  const m = v1Method.toLowerCase()
  if (m === 'stripe')     return 'STRIPE'
  if (m === 'gocardless') return 'DIRECT_DEBIT'
  if (m === 'bank')       return 'BANK_TRANSFER'
  return 'CASH'
}

function mapStatus(v1Status) {
  const s = String(v1Status)
  if (s === '3' || s === '4') return 'CANCELLED'
  return 'ACTIVE'
}

const PLAN_MAP = {
  'Jiu Jitsu Mensual':         { id: 'rgm-mensual',        price: 65  },
  'Jiu Jitsu Trimestral':      { id: 'rgm-trimestral',     price: 180 },
  'Jiu Jitsu Infantil':        { id: 'rgm-infantil',       price: 50  },
  'Family Jiu Jitsu':          { id: 'rgm-family',         price: 100 },
  'Jiu Jitsu Premium + RG TV': { id: 'rgm-premium-rgtv',  price: 85  },
  'Bono 8 Clases':             { id: 'rgm-bono8',          price: 100 },
  'Pase 2 Semanas':            { id: 'rgm-2semanas',       price: 35  },
  'Pase 1 Semana':             { id: 'rgm-1semana',        price: 40  },
  'Pase 1 Día':                { id: 'rgm-1dia',           price: 20  },
  'Clase Privada':             { id: 'rgm-privada',        price: 50  },
  'Prueba 1 Semana':           { id: 'rgm-prueba-semana',  price: 0   },
  'Prueba 1 Día':              { id: 'rgm-prueba-dia',     price: 0   },
}

async function main() {
  console.log('📥 Reading CSVs…')
  const bookings = parseCSV('/Users/pablocabo/Downloads/subscription_bookings (3).csv')
  const v1Plans  = parseCSV('/Users/pablocabo/Downloads/subscriptions (1).csv')
  const v1Users  = parseCSV('/Users/pablocabo/Downloads/users (7).csv')

  const v1PlanTitle = Object.fromEntries(v1Plans.map(p => [p.id, p.title]))
  const v1UserEmail = Object.fromEntries(v1Users.map(u => [u.id, u.email?.toLowerCase()]))

  // Fetch V2 users
  const { data: dbUsers } = await db.from('users').select('id,email')
  const emailToUserId = Object.fromEntries((dbUsers ?? []).map(u => [u.email?.toLowerCase(), u.id]))

  // Fetch existing memberships (userId → exists)
  const { data: existingMems } = await db.from('memberships').select('userId').eq('schoolId', SCHOOL_ID)
  const hasMemSet = new Set((existingMems ?? []).map(m => m.userId))
  console.log(`Existing memberships: ${hasMemSet.size}`)

  // Filter RGA bookings
  const rgaBookings = bookings.filter(b => b.school_id === V1_SCHOOL_ID)

  // Latest booking per V1 user
  const latestByUser = {}
  for (const b of rgaBookings) {
    const date = b.activated_at && b.activated_at !== 'NULL' ? b.activated_at : b.created_at
    const existing = latestByUser[b.user_id]
    if (!existing || new Date(date) > new Date(existing._date)) {
      latestByUser[b.user_id] = { ...b, _date: date }
    }
  }

  const toInsert = []
  let noUser = 0, alreadyHas = 0

  for (const [v1UserId, booking] of Object.entries(latestByUser)) {
    const email    = v1UserEmail[v1UserId]
    const v2UserId = email ? emailToUserId[email] : null
    if (!v2UserId) { noUser++; continue }
    if (hasMemSet.has(v2UserId)) { alreadyHas++; continue }

    const planTitle = v1PlanTitle[booking.subscription_id] ?? 'Membresía'
    const planInfo  = PLAN_MAP[planTitle] ?? null
    const startDate = booking.activated_at && booking.activated_at !== 'NULL'
      ? new Date(booking.activated_at).toISOString()
      : new Date(booking.created_at).toISOString()
    const endDate   = booking.expires_at && booking.expires_at !== 'NULL'
      ? new Date(booking.expires_at).toISOString()
      : null
    const status = mapStatus(booking.status)
    const now = new Date().toISOString()

    toInsert.push({
      id:            cuid(),
      schoolId:      SCHOOL_ID,
      userId:        v2UserId,
      planId:        planInfo?.id ?? null,
      planName:      planTitle,
      price:         parseFloat(booking.price) || planInfo?.price || 0,
      currency:      'EUR',
      paymentMethod: mapMethod(booking.method),
      status,
      startDate,
      endDate,
      classesUsed:   0,
      notes:         `v1_booking:${booking.id}`,
      createdAt:     now,
      updatedAt:     now,
    })
  }

  console.log(`To create: ${toInsert.length} | Already has: ${alreadyHas} | No user match: ${noUser}`)

  if (toInsert.length === 0) { console.log('Nothing to insert.'); return }

  const CHUNK = 50
  let inserted = 0
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const { error } = await db.from('memberships').insert(toInsert.slice(i, i + CHUNK))
    if (error) { console.error('Insert error:', error.message); process.exit(1) }
    inserted += Math.min(CHUNK, toInsert.length - i)
    process.stdout.write(`\r   Inserted ${inserted}/${toInsert.length}…`)
  }
  console.log(`\n🎉 Done! ${inserted} memberships created.`)
}

main().catch(e => { console.error(e); process.exit(1) })
