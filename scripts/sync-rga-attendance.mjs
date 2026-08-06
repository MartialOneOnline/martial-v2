/**
 * Sync Roger Gracie Malaga attendance from a fresh V1 export into V2.
 * Inserts a Booking for every class_bookings row not already imported
 * (idempotent via notes: 'v1_class_booking:<id>').
 *
 * V1 class_id -> V2 Class.id map is hardcoded below (only 10 classes ever
 * existed for this school per userclasses export — see project memory).
 * class_id=0 and any id not in the map (6,7,36,154,164,165 — deleted V1
 * classes with orphaned bookings; 190,191 — one-off seminars with no V2
 * equivalent) are skipped and counted, not guessed into the wrong class.
 *
 * Usage:
 *   node scripts/sync-rga-attendance.mjs --dry-run
 *   node scripts/sync-rga-attendance.mjs
 */
// V1's dump stores naive wall-clock strings in Europe/Madrid local time; the
// existing V2 bookings store the UTC-converted equivalent (confirmed: V1
// "10:00:00" == V2 "08:00:00" for the same real session, the CEST offset).
// Setting TZ before any Date is constructed makes `new Date(naiveString)`
// interpret it as Madrid local time (DST-aware), so .toISOString() below
// yields the correct UTC instant instead of drifting by whatever zone this
// machine happens to be in.
process.env.TZ = 'Europe/Madrid'

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

// V1 class_id -> V2 Class.id. 180 (Seminario y Graduación) and 192 (Graduación
// 6 Junio) both fold into the "Graduación" class; 190/191 are plain seminars
// with no V2 equivalent and are intentionally left unmapped (skipped below).
const CLASS_MAP = {
  '2':   'rgm-bjj-todos',
  '3':   'rgm-bjj-avanzado',
  '4':   'rgm-bjj-iniciacion',
  '5':   'rgm-nogi',
  '96':  'cmqbhfmlp000180o08fi4m8qq',
  '166': 'rgm-open-mat',
  '180': 'cmqbhfmlp000180o08fi4m8qq',
  '192': 'cmqbhfmlp000180o08fi4m8qq',
}

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

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function nullIfEmpty(v) {
  if (!v || v === 'NULL' || v.trim() === '') return null
  return v.trim()
}

// V1's dump is naive Europe/Madrid local time — convert to the naive UTC
// string V2 already stores (confirmed by direct comparison: V1 "10:00:00"
// == V2 "08:00:00" for the same real class session, the CEST offset).
// Relies on process.env.TZ = 'Europe/Madrid' set at the top of this file so
// `new Date(...)` interprets the naive string correctly (DST-aware) instead
// of using whatever zone this machine happens to be in.
function v1ToUtc(v) {
  const s = nullIfEmpty(v)
  if (!s) return null
  return new Date(s.replace(' ', 'T')).toISOString().replace(/\.\d{3}Z$/, '')
}

// V2's existing scheduledAt is already a naive UTC string — only clean up
// formatting here, no timezone conversion (it must NOT go through the Madrid
// interpretation above, or it would be shifted a second time).
function existingUtc(v) {
  if (!v) return null
  return v.replace(' ', 'T').slice(0, 19)
}

function deriveStatus(row) {
  if (nullIfEmpty(row.cacneled_at)) return 'CANCELLED'
  if (nullIfEmpty(row.present_at)) return 'COMPLETED'
  const sessionStart = new Date(row.session_start.replace(' ', 'T'))
  return sessionStart < new Date() ? 'NO_SHOW' : 'CONFIRMED'
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  const rows    = parseCSV(path.resolve(process.env.HOME, 'Downloads/class_bookings (6).csv'))
  const v1Users = parseCSV(path.resolve(process.env.HOME, 'Downloads/users (9).csv'))
  console.log(`V1 class_bookings rows: ${rows.length}`)

  const v1UserEmail = Object.fromEntries(v1Users.map(u => [u.id, u.email?.toLowerCase()]))

  // Fetch V2 users by email
  const emails = [...new Set(Object.values(v1UserEmail).filter(Boolean))]
  const emailToUserId = {}
  const CHUNK = 150
  for (let i = 0; i < emails.length; i += CHUNK) {
    const { data, error } = await db.schema('public').from('users').select('id,email').in('email', emails.slice(i, i + CHUNK))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const r of data) emailToUserId[r.email.toLowerCase()] = r.id
  }

  // Existing bookings for this school's classes carry no V1 marker at all
  // (checked: 27,610 rows, notes is null on every one — they came from a
  // different, undocumented import). Dedup instead on the natural key
  // (userId, classId, scheduledAt) — fetch in pages since there are tens of
  // thousands of rows.
  const { data: classes } = await db.schema('public').from('classes').select('id').eq('schoolId', SCHOOL_ID)
  const classIds = classes.map(c => c.id)

  const existingKeys = new Set()
  {
    let from = 0
    const PAGE = 1000
    for (;;) {
      const { data, error } = await db.schema('public').from('bookings')
        .select('userId,classId,scheduledAt').in('classId', classIds).range(from, from + PAGE - 1)
      if (error) { console.error('bookings fetch error:', error); process.exit(1) }
      for (const b of data) existingKeys.add(`${b.userId}|${b.classId}|${existingUtc(b.scheduledAt)}`)
      if (data.length < PAGE) break
      from += PAGE
    }
  }
  console.log(`Existing (userId, classId, scheduledAt) keys already in V2: ${existingKeys.size}`)

  const toInsert = []
  let noClass = 0, noUser = 0, alreadyDone = 0
  const skippedClassIds = {}

  for (const r of rows) {
    const classId = CLASS_MAP[r.class_id]
    if (!classId) { noClass++; skippedClassIds[r.class_id] = (skippedClassIds[r.class_id] || 0) + 1; continue }

    const email = v1UserEmail[r.student_id]
    const userId = email ? emailToUserId[email] ?? null : null
    if (!userId) { noUser++; continue }

    const scheduledAt = v1ToUtc(r.session_start)
    if (!scheduledAt) continue

    const key = `${userId}|${classId}|${scheduledAt}`
    if (existingKeys.has(key)) { alreadyDone++; continue }
    existingKeys.add(key) // guard against dupes within this same CSV/run too

    toInsert.push({
      id: cuid(),
      userId,
      classId,
      scheduledAt,
      attendedAt: v1ToUtc(r.present_at),
      status: deriveStatus(r),
      notes: `v1_class_booking:${r.id}`,
      createdAt: v1ToUtc(r.created_at) ?? new Date().toISOString(),
      updatedAt: v1ToUtc(r.updated_at) ?? new Date().toISOString(),
    })
  }

  console.log(`\nAlready imported (skip): ${alreadyDone}`)
  console.log(`Skipped — no V2 class mapping: ${noClass}`, skippedClassIds)
  console.log(`Skipped — no user match: ${noUser}`)
  console.log(`New bookings to insert: ${toInsert.length}`)

  if (DRY_RUN) {
    console.log('\nSample:', toInsert.slice(0, 5))
    const statusCounts = {}
    for (const b of toInsert) statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
    console.log('Status distribution of new rows:', statusCounts)
    return
  }

  const CH = 500
  for (let i = 0; i < toInsert.length; i += CH) {
    const { error } = await db.schema('public').from('bookings').insert(toInsert.slice(i, i + CH))
    if (error) { console.error('booking insert error:', error); process.exit(1) }
    process.stdout.write(`\rInserted: ${Math.min(i + CH, toInsert.length)}/${toInsert.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
