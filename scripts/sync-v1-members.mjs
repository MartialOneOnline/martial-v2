/**
 * Sync a school's students from a fresh V1 export into V2.
 * Creates any missing User + SchoolMember (matched/linked by email).
 * Safe to re-run — skips anyone who already has a SchoolMember for this school.
 *
 * Generalized from the original RGA-only script (see git history /
 * scripts/fix-rga-active-status.mjs for background): that version hardcoded
 * the school id, hardcoded CSV filenames, and set every new SchoolMember to
 * ACTIVE regardless of V1's real member_status — which is why
 * fix-rga-active-status.mjs had to exist as a separate cleanup pass. This
 * version takes the school as a parameter and derives the correct status
 * (ACTIVE vs ARCHIVED) straight from V1 at creation time, so that follow-up
 * pass shouldn't be needed for the next school.
 *
 * V1 export files expected in --csv-dir (default ~/Downloads), using
 * whichever is newest per prefix (V1's export panel appends " (N)" and
 * increments N on every re-export, so exact filenames change):
 *   assignstudents*.csv   (id, school_id, student_id, ...)
 *   users*.csv            (id, user_type, parent_id, member_status, email, name, ...)
 *   userdetails*.csv      (user_id, first_name, last_name, belts, select_belt, ...)
 *   belt_ranks*.csv       (id, title)
 *
 * Usage:
 *   node scripts/sync-v1-members.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --dry-run
 *   node scripts/sync-v1-members.mjs --school-id=<v2 id> --v1-school-id=<v1 id>
 *   node scripts/sync-v1-members.mjs --school-id=<v2 id> --v1-school-id=<v1 id> --csv-dir=/path/to/csvs
 *
 * Omitting --school-id/--v1-school-id defaults to Roger Gracie Malaga (798),
 * matching the original script's behaviour.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { parseCSV, mapBelt, resolveBelt, nullIfEmpty } from './lib/rga-belts.mjs'
import { deriveActiveV1Ids } from './lib/rga-active-status.mjs'

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

function cuid() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

// V1's export panel names files "<table> (N).csv" (or bare "<table>.csv" for
// the first export) and N keeps climbing on every re-export — pick whichever
// matching file was written most recently rather than hardcoding a number.
function findLatestCsv(prefixRegex) {
  const matches = fs.readdirSync(CSV_DIR)
    .filter(f => prefixRegex.test(f) && f.endsWith('.csv'))
    .map(f => ({ f, mtime: fs.statSync(path.join(CSV_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  if (!matches.length) return null
  return path.join(CSV_DIR, matches[0].f)
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`School: ${SCHOOL_ID} (V1 id ${V1_SCHOOL_ID}) | CSV dir: ${CSV_DIR}`)

  const assignPath = findLatestCsv(/^assignstudents/i)
  const usersPath = findLatestCsv(/^users(\s|\.|$)/i)
  const detailsPath = findLatestCsv(/^userdetails/i)
  const beltRanksPath = findLatestCsv(/^belt_ranks/i)

  for (const [label, p] of [['assignstudents', assignPath], ['users', usersPath], ['userdetails', detailsPath], ['belt_ranks', beltRanksPath]]) {
    if (!p) { console.error(`No ${label}*.csv found in ${CSV_DIR}`); process.exit(1) }
    console.log(`  ${label}: ${path.basename(p)}`)
  }

  const assignAll = parseCSV(assignPath)
  const assign = assignAll.filter(a => a.school_id === V1_SCHOOL_ID)
  if (assign.length !== assignAll.length) {
    console.log(`Filtered assignstudents to school_id=${V1_SCHOOL_ID}: ${assign.length}/${assignAll.length} rows`)
  }
  const v1Users = parseCSV(usersPath)
  const v1Details = parseCSV(detailsPath)
  const v1BeltRanks = parseCSV(beltRanksPath)

  const v1UserById = new Map(v1Users.map(u => [u.id, u]))
  const v1DetailsByUserId = new Map(v1Details.map(d => [d.user_id, d]))
  const beltRankById = new Map(v1BeltRanks.map(r => [r.id, r.title]))
  const activeV1Ids = deriveActiveV1Ids(v1Users)

  const studentIds = [...new Set(assign.map(a => a.student_id))]
  console.log(`V1 assignstudents rows: ${assign.length} (${studentIds.length} unique student ids)`)

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

  // Fetch existing SchoolMembers for this school
  const { data: existingMembers, error: mErr } = await db.schema('public').from('school_members').select('userId').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }
  const existingMemberUserIds = new Set(existingMembers.map(m => m.userId))
  console.log(`Existing school_members: ${existingMemberUserIds.size}`)

  const usersToCreate = []
  const membersToCreate = []
  let alreadyMember = 0
  let activeCount = 0, archivedCount = 0

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
    const rank = d ? resolveBelt(d.belts, beltRankById) : null
    const belt = rank ? rank.belt : (d ? mapBelt(nullIfEmpty(d.select_belt)) : 'Blanco')
    const beltDegree = rank ? rank.degree : 0
    const status = activeV1Ids.has(c.v1Id) ? 'ACTIVE' : 'ARCHIVED'
    if (status === 'ACTIVE') activeCount++; else archivedCount++
    membersToCreate.push({
      id: cuid(),
      schoolId: SCHOOL_ID,
      userId: v2UserId,
      role: 'STUDENT',
      status,
      belt,
      beltDegree,
      emergencyContact: d ? nullIfEmpty(d.emergency_contact_number) : null,
      notes: `v1_student:${c.v1Id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    existingMemberUserIds.add(v2UserId)
  }

  console.log(`\nUsers to create: ${usersToCreate.length}`)
  console.log(`SchoolMembers to create: ${membersToCreate.length} (-> ACTIVE: ${activeCount}, ARCHIVED: ${archivedCount})`)
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
