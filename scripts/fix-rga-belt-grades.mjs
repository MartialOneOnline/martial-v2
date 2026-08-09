/**
 * Fix SchoolMember.belt / beltDegree for Roger Gracie Malaga using V1's own
 * "Gradings" report as ground truth (scripts/rga-gradings-report.csv — hand
 * transcribed from MartialApp-Gradings.pdf, exported directly from V1's
 * admin panel on 2026-08-09).
 *
 * Background: cross-checking that report against V2 found 186 wrong belts
 * out of 464 matched students (40%) — the dominant pattern (83 cases, 45%
 * of mismatches) is V2 sitting exactly one stripe/grado behind V1 in the
 * same color, consistent with an off-by-one bug in the original
 * userdetails.belts JSON resolution at import time (see
 * scripts/lib/rga-belts.mjs resolveBelt). 67 cases are a completely wrong
 * belt COLOR, 20 of those on currently ACTIVE students.
 *
 * Matching: V1 report (Name, BeltRank) -> email via the fresh V1 students
 * export (Name, Email) -> V2 SchoolMember via email. Two safety exclusions,
 * left untouched rather than guessed at:
 *   - Names that appear more than once in the V1 report with a DIFFERENT
 *     belt (e.g. "Pablo Cabo" — almost certainly two different people).
 *   - Names that map to more than one distinct email in the students CSV.
 * Only touches belt + beltDegree (the two fields the schema documents as
 * "source of truth for display/history") — never beltRankId, beltDate,
 * status, or anything else.
 *
 * Usage:
 *   node scripts/fix-rga-belt-grades.mjs --dry-run
 *   node scripts/fix-rga-belt-grades.mjs
 *   node scripts/fix-rga-belt-grades.mjs --school-id=<v2 id> --v1-report=<path> --students-csv=<path>
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
const V1_REPORT_PATH = path.resolve(getArg('v1-report', './scripts/rga-gradings-report.csv'))
const STUDENTS_CSV_PATH = path.resolve(getArg('students-csv', path.join(process.env.HOME, 'Downloads/Roger Gracie Malaga-students (4).csv')))

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

function parseCsvSimple(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',')
  return lines.slice(1).map(line => {
    const cols = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue }
      if (ch === ',' && !inQ) { cols.push(cur); cur = ''; continue }
      cur += ch
    }
    cols.push(cur)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cols[i] ?? '').trim()]))
  })
}

function parseBeltTitle(title) {
  const t = title.trim()
  const m = t.match(/^(\p{L}+)(?:\s+(\d+)\s+Grados?)?$/u)
  if (!m) return null
  const map = { blanco: 'Blanco', azul: 'Azul', morado: 'Morado', marron: 'Marron', negro: 'Negro' }
  const belt = map[m[1].toLowerCase()] ?? m[1]
  const degree = m[2] ? parseInt(m[2], 10) : 0
  return { belt, degree }
}

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`)
  console.log(`School: ${SCHOOL_ID}`)
  console.log(`V1 report: ${V1_REPORT_PATH}`)
  console.log(`Students CSV: ${STUDENTS_CSV_PATH}`)

  const v1Report = parseCsvSimple(fs.readFileSync(V1_REPORT_PATH, 'utf8'))

  const beltsByName = new Map()
  const ambiguousNames = new Set()
  for (const r of v1Report) {
    const parsed = parseBeltTitle(r.BeltRank)
    if (!parsed) continue
    const key = r.Name.trim().toLowerCase()
    const existing = beltsByName.get(key)
    if (existing && (existing.belt !== parsed.belt || existing.degree !== parsed.degree)) {
      ambiguousNames.add(key)
    } else {
      beltsByName.set(key, parsed)
    }
  }
  console.log(`\nV1 report: ${v1Report.length} rows, ${beltsByName.size} unique names, ${ambiguousNames.size} ambiguous (skipped)`)

  const studentsCsv = parseCsvSimple(fs.readFileSync(STUDENTS_CSV_PATH, 'utf8'))
  const emailByName = new Map()
  const nameCollisions = new Set()
  for (const r of studentsCsv) {
    const key = r.Name.trim().toLowerCase()
    if (emailByName.has(key) && emailByName.get(key) !== r.Email.trim().toLowerCase()) nameCollisions.add(key)
    emailByName.set(key, r.Email.trim().toLowerCase())
  }
  console.log(`Students CSV: ${studentsCsv.length} rows, ${nameCollisions.size} name collisions (skipped)`)

  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('id,belt,beltDegree,status,userId').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }

  const userIds = [...new Set(members.map(m => m.userId))]
  const users = []
  for (let i = 0; i < userIds.length; i += 200) {
    const { data, error } = await db.schema('public').from('users').select('id,email,name').in('id', userIds.slice(i, i + 200))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    users.push(...data)
  }
  const userById = new Map(users.map(u => [u.id, u]))
  const memberByEmail = new Map()
  for (const m of members) {
    const user = userById.get(m.userId)
    if (user) memberByEmail.set(user.email.toLowerCase(), { ...m, email: user.email, name: user.name })
  }

  let noEmail = 0, noV2Member = 0, alreadyCorrect = 0
  const toUpdate = []

  for (const [nameKey, v1Belt] of beltsByName) {
    if (ambiguousNames.has(nameKey)) continue
    if (nameCollisions.has(nameKey)) continue
    const email = emailByName.get(nameKey)
    if (!email) { noEmail++; continue }
    const member = memberByEmail.get(email)
    if (!member) { noV2Member++; continue }

    const v2Belt = member.belt ?? 'Blanco'
    const v2Degree = member.beltDegree ?? 0
    if (v2Belt === v1Belt.belt && v2Degree === v1Belt.degree) { alreadyCorrect++; continue }

    toUpdate.push({
      id: member.id,
      name: member.name,
      email,
      status: member.status,
      from: `${v2Belt} ${v2Degree}`,
      to: `${v1Belt.belt} ${v1Belt.degree}`,
      belt: v1Belt.belt,
      beltDegree: v1Belt.degree,
    })
  }

  console.log(`\nAlready correct: ${alreadyCorrect}`)
  console.log(`No email found for name: ${noEmail}`)
  console.log(`No V2 SchoolMember for that email: ${noV2Member}`)
  console.log(`Updates queued: ${toUpdate.length}`)
  const activeUpdates = toUpdate.filter(u => u.status === 'ACTIVE')
  console.log(`  ...of which ACTIVE students: ${activeUpdates.length}`)

  if (DRY_RUN) {
    console.log('\nAll updates:')
    console.log(toUpdate.map(u => `${u.name} (${u.email}, ${u.status}): ${u.from} -> ${u.to}`).join('\n'))
    return
  }

  if (!toUpdate.length) { console.log('\nNothing to update.'); return }

  console.log('\nApplying updates...')
  let done = 0
  for (const u of toUpdate) {
    const { error } = await db.schema('public').from('school_members')
      .update({ belt: u.belt, beltDegree: u.beltDegree })
      .eq('id', u.id)
    if (error) { console.error(`update failed for ${u.email}:`, error); process.exit(1) }
    done++
    if (done % 25 === 0 || done === toUpdate.length) process.stdout.write(`\r  ${done}/${toUpdate.length}`)
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
