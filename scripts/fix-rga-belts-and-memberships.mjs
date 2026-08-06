/**
 * One-off patch for Roger Gracie Malaga records already written by the buggy
 * versions of sync-rga-members.mjs / sync-rga-payments.mjs:
 *  - SchoolMembers were all created belt='Blanco', beltDegree=0 (select_belt
 *    is unpopulated in the V1 export; the real rank lives in userdetails.belts).
 *  - Memberships had status derived only from the V1 status code, ignoring
 *    expires_at, so long-lapsed periods were left ACTIVE.
 * Re-derives both from the same V1 CSVs using the corrected logic and updates
 * only the rows whose notes tag them as V1-imported (v1_student:/v1_booking:).
 *
 * Usage:
 *   node scripts/fix-rga-belts-and-memberships.mjs --dry-run
 *   node scripts/fix-rga-belts-and-memberships.mjs
 */
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

// RFC4180-aware: handles doubled-quote escaping ("" inside a quoted field
// means a literal "), which several columns here rely on (e.g. userdetails.belts
// is a JSON blob like {"18":"332"} re-quoted as "{""18"":""332""}").
function parseLine(line) {
  const cols = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = false
      } else cur += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === ',') { cols.push(cur); cur = '' }
      else cur += ch
    }
  }
  cols.push(cur)
  return cols
}

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  const lines = text.trim().split('\n')
  const headers = parseLine(lines[0].replace(/\r/g, ''))
  return lines.slice(1).map(line => {
    const cols = parseLine(line.replace(/\r/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
  })
}

function nullIfEmpty(v) {
  if (!v || v === 'NULL' || v.trim() === '') return null
  return v.trim()
}

const VALID_BELTS = ['Blanco', 'Azul', 'Morado', 'Marron', 'Negro']
function mapBelt(v1Belt) {
  if (!v1Belt) return 'Blanco'
  const b = v1Belt.trim()
  const map = { white: 'Blanco', blue: 'Azul', purple: 'Morado', brown: 'Marron', black: 'Negro' }
  const lower = b.toLowerCase()
  if (VALID_BELTS.includes(b)) return b
  if (map[lower]) return map[lower]
  return 'Blanco'
}

function parseBeltRankTitle(title) {
  if (!title) return null
  const t = title.trim().replace(/^Nagro\b/i, 'Negro')
  const m = t.match(/^(\p{L}+)(?:\s+(\d+)\s+Grados?)?$/u)
  if (!m) return null
  const belt = mapBelt(m[1])
  const degree = m[2] ? parseInt(m[2], 10) : 0
  return { belt, degree }
}

function resolveBeltRankId(belts) {
  if (!belts || belts === 'NULL') return null
  let parsed
  try { parsed = JSON.parse(belts) } catch { return null }
  if (Array.isArray(parsed)) return parsed.length ? String(parsed[0]) : null
  if (parsed && typeof parsed === 'object') {
    if (parsed['18'] != null) return String(parsed['18'])
    const first = Object.values(parsed)[0]
    return first != null ? String(first) : null
  }
  return null
}

function parseDate(val) {
  return val && val !== 'NULL' && val !== '' ? new Date(val).toISOString() : null
}

function mapMembershipStatus(v1Status, expiresAt) {
  const s = String(v1Status)
  if (s === '3' || s === '4') return 'CANCELLED'
  const end = parseDate(expiresAt)
  if (end && new Date(end) < new Date()) return 'EXPIRED'
  return 'ACTIVE'
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  const v1Details = parseCSV(path.resolve(process.env.HOME, 'Downloads/userdetails (8).csv'))
  const v1BeltRanks = parseCSV(path.resolve(process.env.HOME, 'Downloads/belt_ranks (3).csv'))
  const bookings = parseCSV(path.resolve(process.env.HOME, 'Downloads/subscription_bookings (4).csv'))

  const v1DetailsByUserId = new Map(v1Details.map(d => [d.user_id, d]))
  const beltRankById = new Map(v1BeltRanks.map(r => [r.id, r.title]))
  const bookingById = new Map(bookings.map(b => [b.id, b]))

  // ── 1) Belts ──────────────────────────────────────────────────────────────
  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('id,belt,beltDegree,notes').eq('schoolId', SCHOOL_ID).like('notes', 'v1_student:%')
  if (mErr) { console.error('school_members fetch error:', mErr); process.exit(1) }
  console.log(`\nV1-imported school_members: ${members.length}`)

  const beltUpdates = []
  let noDetails = 0, noRank = 0
  for (const m of members) {
    const v1Id = m.notes.replace('v1_student:', '').trim()
    const d = v1DetailsByUserId.get(v1Id)
    if (!d) { noDetails++; continue }

    const rankId = resolveBeltRankId(d.belts)
    const rank = rankId ? parseBeltRankTitle(beltRankById.get(rankId)) : null
    if (!rank) { noRank++; continue }

    if (m.belt !== rank.belt || m.beltDegree !== rank.degree) {
      beltUpdates.push({ id: m.id, belt: rank.belt, beltDegree: rank.degree, was: { belt: m.belt, beltDegree: m.beltDegree } })
    }
  }
  console.log(`Belt updates needed: ${beltUpdates.length} | no V1 details: ${noDetails} | no resolvable rank: ${noRank}`)

  // ── 2) Membership status ─────────────────────────────────────────────────
  const { data: mems, error: memErr } = await db.schema('public').from('memberships')
    .select('id,userId,status,notes').eq('schoolId', SCHOOL_ID).like('notes', 'v1_booking:%')
  if (memErr) { console.error('memberships fetch error:', memErr); process.exit(1) }
  console.log(`\nV1-imported memberships: ${mems.length}`)

  const statusUpdates = []
  let noBooking = 0
  for (const m of mems) {
    const bookingId = m.notes.replace('v1_booking:', '').trim()
    const booking = bookingById.get(bookingId)
    if (!booking) { noBooking++; continue }

    const correctStatus = mapMembershipStatus(booking.status, booking.expires_at)
    if (m.status !== correctStatus) {
      statusUpdates.push({ id: m.id, userId: m.userId, status: correctStatus, was: m.status })
    }
  }
  console.log(`Membership status updates needed: ${statusUpdates.length} | no matching booking: ${noBooking}`)

  // Mirror syncSchoolMemberStatusForMembership (lib/services/membership.ts) so
  // the SchoolMember-level status (shown in the roster) stays consistent with
  // the Membership status we're about to correct.
  const schoolMemberUpdates = []
  for (const u of statusUpdates) {
    if (u.status !== 'CANCELLED' && u.status !== 'EXPIRED') continue
    const { data: others, error } = await db.schema('public').from('memberships')
      .select('id').eq('userId', u.userId).eq('schoolId', SCHOOL_ID).eq('status', 'ACTIVE').neq('id', u.id)
    if (error) { console.error('other-memberships fetch error:', error); process.exit(1) }
    if (others.length) continue // user still has another active membership at this school

    const { data: sm, error: smErr } = await db.schema('public').from('school_members')
      .select('id,status').eq('userId', u.userId).eq('schoolId', SCHOOL_ID).maybeSingle()
    if (smErr) { console.error('school_member lookup error:', smErr); process.exit(1) }
    if (!sm || sm.status === 'ARCHIVED' || sm.status === 'INACTIVE') continue

    schoolMemberUpdates.push({ id: sm.id, status: 'INACTIVE', was: sm.status })
  }
  console.log(`SchoolMember status updates needed (following expiry): ${schoolMemberUpdates.length}`)

  if (DRY_RUN) {
    console.log('\nSample belt updates:', beltUpdates.slice(0, 8))
    console.log('\nSample status updates:', statusUpdates.slice(0, 8))
    console.log('\nSample school_member status updates:', schoolMemberUpdates.slice(0, 8))
    return
  }

  for (const u of beltUpdates) {
    const { error } = await db.schema('public').from('school_members')
      .update({ belt: u.belt, beltDegree: u.beltDegree, updatedAt: new Date().toISOString() }).eq('id', u.id)
    if (error) { console.error('school_member update error:', error); process.exit(1) }
  }
  console.log(`\nUpdated ${beltUpdates.length} school_members (belt).`)

  for (const u of statusUpdates) {
    const { error } = await db.schema('public').from('memberships')
      .update({ status: u.status, updatedAt: new Date().toISOString() }).eq('id', u.id)
    if (error) { console.error('membership update error:', error); process.exit(1) }
  }
  console.log(`Updated ${statusUpdates.length} memberships.`)

  for (const u of schoolMemberUpdates) {
    const { error } = await db.schema('public').from('school_members')
      .update({ status: u.status, updatedAt: new Date().toISOString() }).eq('id', u.id)
    if (error) { console.error('school_member status update error:', error); process.exit(1) }
  }
  console.log(`Updated ${schoolMemberUpdates.length} school_members (status).`)
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
