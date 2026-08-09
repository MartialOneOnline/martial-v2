/**
 * Correct SchoolMember.status for Roger Gracie Malaga's V1-imported students.
 *
 * Background: scripts/sync-v1-members.mjs (formerly sync-rga-members.mjs) (and an earlier, untracked bulk
 * import before it) set every imported SchoolMember to ACTIVE regardless of
 * V1's real member_status. V1's own "Active" list shows 121 students; this
 * script derives the equivalent definitive-active set from a fresh V1 export
 * and applies it: those students -> ACTIVE, every other V1-imported
 * SchoolMember at this school -> ARCHIVED. Never touches Users, Memberships,
 * Transactions, Bookings, or non-V1/non-RGA SchoolMembers.
 *
 * Why 124, not V1's displayed 121: cross-referencing users(9).csv against
 * assignstudents(1).csv shows V1's "121" = member_status='active' AND
 * user_type='3' (student) AND parent_id IS NULL (top-level account only —
 * V1's admin list doesn't count family sub-accounts separately). Of the 125
 * member_status='active' rows: 1 is user_type='2', the school's own V1
 * business account (matches School.v1UserId=798, not a student — excluded
 * unconditionally); 3 are user_type='3' with parent_id set — real students
 * training under a family account, just not counted individually in V1's
 * dashboard. Decision (confirmed with the school owner): treat those 3 as
 * ACTIVE in V2, since V2 has no family-account concept and they do train.
 * 125 - 1 = 124 definitive ACTIVE ids (see lib/rga-active-status.mjs).
 *
 * Matching V2 SchoolMember -> V1 student id:
 *   1. Preferred: SchoolMember.notes === "v1_student:<id>" (set by
 *      sync-v1-members.mjs (formerly sync-rga-members.mjs) for new imports since that script existed).
 *   2. Controlled fallback: User.email matched against v1 users(9).csv
 *      email column, case-insensitively, ONLY when notes carries no
 *      v1_student marker AND the email is unambiguous in the V1 export
 *      (V1 has 2 duplicate emails across different ids — both excluded from
 *      the fallback map entirely, so anyone sharing one is left unmatched
 *      rather than guessed at).
 *   Anything matched by neither method (and any role != STUDENT, e.g. the
 *   2 OWNER dashboard accounts) is left completely untouched.
 *
 * Idempotent: only queues an update when current status != target status;
 * re-running after a successful live run produces zero changes.
 *
 * Usage:
 *   node scripts/fix-rga-active-status.mjs              # dry-run (default)
 *   node scripts/fix-rga-active-status.mjs --live        # actually write
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { deriveActiveV1Ids, buildEmailFallbackMap, resolveMember, matchV1Id } from './lib/rga-active-status.mjs'

const LIVE = process.argv.includes('--live')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'
const V1_USERS_CSV = path.resolve(process.env.HOME, 'Downloads/users (9).csv')

// Same RFC4180-aware parser as scripts/sync-v1-members.mjs (formerly sync-rga-members.mjs).
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

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE — will write' : 'DRY RUN (pass --live to write)'}`)

  // ── 1. Derive the definitive V1 active-student set ────────────────────────
  const v1Users = parseCSV(V1_USERS_CSV)
  const v1UserById = new Map(v1Users.map(u => [u.id, u]))
  const activeV1Ids = deriveActiveV1Ids(v1Users)
  const v1IdByEmail = buildEmailFallbackMap(v1Users)

  const activeRows = v1Users.filter(u => u.member_status === 'active')
  const nonStudentActive = activeRows.filter(u => u.user_type !== '3')
  const childAccounts = activeRows.filter(u => u.user_type === '3' && !(u.parent_id === '' || u.parent_id === 'NULL' || u.parent_id == null))
  const ambiguousEmailCount = (() => {
    const counts = new Map()
    for (const u of v1Users) {
      if (u.email === '' || u.email === 'NULL' || u.email == null) continue
      const e = u.email.trim().toLowerCase()
      counts.set(e, (counts.get(e) ?? 0) + 1)
    }
    return [...counts.values()].filter(c => c > 1).length
  })()

  console.log(`\nV1 export: ${v1Users.length} total users, ${activeRows.length} member_status=active`)
  console.log(`  excluded as non-student (user_type != 3): ${nonStudentActive.length}`)
  console.log(`  family sub-accounts included as active (parent_id set): ${childAccounts.length}`)
  console.log(`  => definitive ACTIVE V1 student ids: ${activeV1Ids.size}`)
  console.log(`  V1 emails excluded from fallback as ambiguous (shared by >1 id): ${ambiguousEmailCount}`)

  // ── 2. Load V2 RGA SchoolMembers + their emails (for the fallback only) ───
  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('id,userId,status,notes,role').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('school_members fetch error:', mErr); process.exit(1) }
  console.log(`\nV2 school_members at RGA: ${members.length}`)

  const userIds = [...new Set(members.map(m => m.userId))]
  const emailByUserId = new Map()
  const CHUNK = 200
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const { data, error } = await db.schema('public').from('users').select('id,email').in('id', userIds.slice(i, i + CHUNK))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const row of data) emailByUserId.set(row.id, (row.email ?? '').trim().toLowerCase())
  }

  // ── 3. Match each SchoolMember to a V1 id, decide target status ───────────
  const ctx = { emailByUserId, v1IdByEmail, v1UserById, activeV1Ids }
  let skippedNonStudent = 0, skippedUnmatched = 0, skippedV1IdMissing = 0
  let matchedByNotes = 0, matchedByEmail = 0
  let alreadyCorrectActive = 0, alreadyCorrectArchived = 0
  const toUpdate = []

  // Match regardless of role — used only for the informational "which V1 ids
  // land where" report below, independent of the STUDENT-only processing gate.
  const matchedV1IdsAnyRole = new Set()
  const matchedV1IdsStudent = new Set()
  for (const m of members) {
    const { v1Id } = matchV1Id(m, emailByUserId, v1IdByEmail)
    if (!v1Id) continue
    matchedV1IdsAnyRole.add(v1Id)
    if (m.role === 'STUDENT') matchedV1IdsStudent.add(v1Id)
  }

  for (const m of members) {
    const result = resolveMember(m, ctx)

    if (result.skipReason === 'non-student-role') { skippedNonStudent++; continue }
    if (result.skipReason === 'unmatched') { skippedUnmatched++; continue }
    if (result.skipReason === 'v1-id-missing-from-export') { skippedV1IdMissing++; continue }

    if (result.matchMethod === 'notes') matchedByNotes++
    else matchedByEmail++

    if (m.status === result.target) {
      if (result.target === 'ACTIVE') alreadyCorrectActive++
      else alreadyCorrectArchived++
      continue
    }
    toUpdate.push({ id: m.id, from: m.status, to: result.target, matchMethod: result.matchMethod })
  }

  const willBeActive = toUpdate.filter(u => u.to === 'ACTIVE').length + alreadyCorrectActive
  const willBeArchived = toUpdate.filter(u => u.to === 'ARCHIVED').length + alreadyCorrectArchived

  console.log(`\nMatched to a V1 student: ${matchedByNotes + matchedByEmail} (by notes: ${matchedByNotes}, by email fallback: ${matchedByEmail})`)
  console.log(`Skipped — role != STUDENT (native dashboard staff): ${skippedNonStudent}`)
  console.log(`Skipped — no notes/email match (not unambiguously V1): ${skippedUnmatched}`)
  console.log(`Skipped — notes cite a V1 id absent from this export: ${skippedV1IdMissing}`)
  console.log(`\nAlready correct — ACTIVE: ${alreadyCorrectActive} | ARCHIVED: ${alreadyCorrectArchived}`)
  console.log(`Updates queued: ${toUpdate.length} (-> ACTIVE: ${toUpdate.filter(u => u.to === 'ACTIVE').length}, -> ARCHIVED: ${toUpdate.filter(u => u.to === 'ARCHIVED').length})`)
  // Scoped to the matched population above — excludes the 2 non-STUDENT and
  // the unmatched members, which keep whatever status they already had.
  console.log(`\nFinal state among matched V1 students — ACTIVE: ${willBeActive} | ARCHIVED: ${willBeArchived}`)

  const noMatchAtAll = [...activeV1Ids].filter(id => !matchedV1IdsAnyRole.has(id))
  const matchedOnlyToNonStudent = [...activeV1Ids].filter(id => matchedV1IdsAnyRole.has(id) && !matchedV1IdsStudent.has(id))
  // Note: "no unambiguous match" is not the same as "no V2 account exists" —
  // a V2 User with the same email may well exist but be excluded from
  // v1IdByEmail because that email is shared by more than one V1 id (see
  // buildEmailFallbackMap), so it can't be safely attributed to this id.
  console.log(`V1-active students with no unambiguous V2 match: ${noMatchAtAll.length}${noMatchAtAll.length ? ` (V1 ids: ${noMatchAtAll.join(', ')})` : ''}`)
  console.log(`V1-active students matched only to a non-STUDENT V2 account (correctly excluded): ${matchedOnlyToNonStudent.length}${matchedOnlyToNonStudent.length ? ` (V1 ids: ${matchedOnlyToNonStudent.join(', ')})` : ''}`)

  if (!LIVE) {
    console.log(`\nDry run only — no writes made. Technical ids queued for update (school_member id -> from/to/method):`)
    console.log(toUpdate.slice(0, 20))
    if (toUpdate.length > 20) console.log(`  ...and ${toUpdate.length - 20} more`)
    return
  }

  console.log('\nApplying updates...')
  let done = 0
  for (const u of toUpdate) {
    const { error } = await db.schema('public').from('school_members').update({ status: u.to }).eq('id', u.id)
    if (error) { console.error(`update failed for ${u.id}:`, error); process.exit(1) }
    done++
    if (done % 50 === 0 || done === toUpdate.length) process.stdout.write(`\r  ${done}/${toUpdate.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
