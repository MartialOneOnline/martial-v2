/**
 * Sync Roger Gracie Malaga students from a fresh V1 export into V2.
 * Creates any missing User + SchoolMember (matched/linked by email).
 * Safe to re-run — skips anyone who already has a SchoolMember for this school.
 *
 * Usage:
 *   node scripts/sync-rga-members.mjs --dry-run
 *   node scripts/sync-rga-members.mjs
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

function nullIfEmpty(v) {
  if (!v || v === 'NULL' || v.trim() === '') return null
  return v.trim()
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)

  const assign = parseCSV(path.resolve(process.env.HOME, 'Downloads/assignstudents (1).csv'))
  const v1Users = parseCSV(path.resolve(process.env.HOME, 'Downloads/users (9).csv'))
  const v1Details = parseCSV(path.resolve(process.env.HOME, 'Downloads/userdetails (8).csv'))

  const v1UserById = new Map(v1Users.map(u => [u.id, u]))
  const v1DetailsByUserId = new Map(v1Details.map(d => [d.user_id, d]))

  const studentIds = [...new Set(assign.map(a => a.student_id))]
  console.log(`V1 assignstudents rows for RGA: ${assign.length} (${studentIds.length} unique student ids)`)

  // Resolve V1 user + details for each student id, skip if no matching users.csv row or no email
  const candidates = []
  let noV1User = 0, noEmail = 0
  for (const sid of studentIds) {
    const u = v1UserById.get(sid)
    if (!u) { noV1User++; continue }
    const email = nullIfEmpty(u.email)?.toLowerCase()
    if (!email) { noEmail++; continue }
    const d = v1DetailsByUserId.get(sid)
    candidates.push({ v1Id: sid, v1User: u, v1Details: d, email })
  }
  console.log(`Candidates with email: ${candidates.length} | no V1 user row: ${noV1User} | no email: ${noEmail}`)

  // Fetch existing V2 users by email in chunks
  const emails = candidates.map(c => c.email)
  const existingUserByEmail = new Map()
  const CHUNK = 150
  for (let i = 0; i < emails.length; i += CHUNK) {
    const chunk = emails.slice(i, i + CHUNK)
    const { data, error } = await db.schema('public').from('users').select('id,email').in('email', chunk)
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const row of data) existingUserByEmail.set(row.email.toLowerCase(), row.id)
  }
  console.log(`Existing V2 users matched by email: ${existingUserByEmail.size}`)

  // Fetch existing RGA SchoolMembers
  const { data: existingMembers, error: mErr } = await db.schema('public').from('school_members').select('userId').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }
  const existingMemberUserIds = new Set(existingMembers.map(m => m.userId))
  console.log(`Existing RGA school_members: ${existingMemberUserIds.size}`)

  const usersToCreate = []
  const membersToCreate = []
  let alreadyMember = 0

  for (const c of candidates) {
    let v2UserId = existingUserByEmail.get(c.email)

    if (!v2UserId) {
      v2UserId = cuid()
      const d = c.v1Details
      const name = d ? `${nullIfEmpty(d.first_name) ?? ''} ${nullIfEmpty(d.last_name) ?? ''}`.trim() : ''
      usersToCreate.push({
        id: v2UserId,
        email: c.email,
        name: name || c.v1User.name || c.email.split('@')[0],
        phone: d ? (nullIfEmpty(d.mobile_number) ?? nullIfEmpty(d.phone_number)) : null,
        dateOfBirth: d && nullIfEmpty(d.dob) ? new Date(d.dob).toISOString() : null,
        role: 'STUDENT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      existingUserByEmail.set(c.email, v2UserId)
    }

    if (existingMemberUserIds.has(v2UserId)) { alreadyMember++; continue }

    const d = c.v1Details
    membersToCreate.push({
      id: cuid(),
      schoolId: SCHOOL_ID,
      userId: v2UserId,
      role: 'STUDENT',
      status: 'ACTIVE',
      belt: d ? mapBelt(nullIfEmpty(d.select_belt)) : 'Blanco',
      beltDegree: 0,
      emergencyContact: d ? nullIfEmpty(d.emergency_contact_number) : null,
      notes: `v1_student:${c.v1Id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    existingMemberUserIds.add(v2UserId)
  }

  console.log(`\nUsers to create: ${usersToCreate.length}`)
  console.log(`SchoolMembers to create: ${membersToCreate.length}`)
  console.log(`Already a member: ${alreadyMember}`)

  if (DRY_RUN) {
    console.log('\nSample users to create:', usersToCreate.slice(0, 5))
    console.log('\nSample members to create:', membersToCreate.slice(0, 5))
    return
  }

  if (usersToCreate.length) {
    for (let i = 0; i < usersToCreate.length; i += 100) {
      const { error } = await db.schema('public').from('users').insert(usersToCreate.slice(i, i + 100))
      if (error) { console.error('user insert error:', error); process.exit(1) }
    }
    console.log(`Inserted ${usersToCreate.length} users.`)
  }

  if (membersToCreate.length) {
    for (let i = 0; i < membersToCreate.length; i += 100) {
      const { error } = await db.schema('public').from('school_members').insert(membersToCreate.slice(i, i + 100))
      if (error) { console.error('member insert error:', error); process.exit(1) }
    }
    console.log(`Inserted ${membersToCreate.length} school_members.`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
