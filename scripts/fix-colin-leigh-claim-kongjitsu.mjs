/**
 * One-off fix: colin.leigh@pm.me registered as a STUDENT by mistake — he
 * actually owns his own school ("Kongjitsu"), which does not exist as a
 * School record yet.
 *
 * There is currently no admin UI/API that can link an existing user to a
 * (new or existing) school as OWNER — the only code path that does this is
 * `POST /api/claim/[id]` (apps/web/app/api/claim/[id]/route.ts:126-189),
 * which is driven by a SchoolInvitation id and can't target an arbitrary
 * existing user directly. This script mirrors that route's DB writes by
 * hand: create the School, promote User.role, upsert SchoolMember OWNER,
 * and set UserPreference.lastSchoolId — same shape, same order.
 *
 * Usage:
 *   node scripts/fix-colin-leigh-claim-kongjitsu.mjs          # dry run (default) — writes nothing
 *   node scripts/fix-colin-leigh-claim-kongjitsu.mjs --live   # applies the writes
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const LIVE = process.argv.includes('--live')

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY)

const USER_EMAIL = 'colin.leigh@pm.me'
const SCHOOL_NAME = 'Kongjitsu'

function genId() {
  return crypto.randomBytes(12).toString('base64url').replace(/[^a-z0-9]/gi, '').slice(0, 24)
}

function slugify(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function main() {
  console.log(`Mode: ${LIVE ? 'LIVE' : 'DRY RUN'}`)

  const { data: user, error: ue } = await db.from('users').select('id,email,name,role').eq('email', USER_EMAIL).maybeSingle()
  if (ue) { console.error('user fetch error:', ue); process.exit(1) }
  if (!user) { console.error(`No user found with email ${USER_EMAIL}`); process.exit(1) }
  console.log('User:', user)

  const { data: existingMemberships, error: eme } = await db.from('school_members').select('id,schoolId,role,status').eq('userId', user.id)
  if (eme) { console.error('school_members fetch error:', eme); process.exit(1) }
  if (existingMemberships?.length) {
    console.error(`User already has ${existingMemberships.length} SchoolMember row(s), aborting to avoid duplicating:`, existingMemberships)
    process.exit(1)
  }

  const baseSlug = slugify(SCHOOL_NAME)
  let finalSlug = baseSlug
  let attempt = 0
  for (;;) {
    const { data: clash, error } = await db.from('schools').select('id').eq('slug', finalSlug).maybeSingle()
    if (error) { console.error('slug check error:', error); process.exit(1) }
    if (!clash) break
    attempt++
    finalSlug = `${baseSlug}-${attempt}`
  }
  if (finalSlug !== baseSlug) console.log(`Slug "${baseSlug}" taken, using "${finalSlug}"`)

  const schoolId = genId()
  const now = new Date().toISOString()

  console.log('\nPlan:')
  console.log(`  1. Create School: id=${schoolId} name="${SCHOOL_NAME}" slug="${finalSlug}" status=CLAIMED source=SELF_REGISTERED type=SCHOOL`)
  console.log(`  2. Update User ${user.id}: role ${user.role} -> SCHOOL_OWNER`)
  console.log(`  3. Create SchoolMember: schoolId=${schoolId} userId=${user.id} role=OWNER status=ACTIVE`)
  console.log(`  4. Upsert UserPreference.lastSchoolId = ${schoolId}`)

  if (!LIVE) {
    console.log('\nDry run only — no rows written. Re-run with --live to apply.')
    return
  }

  const { error: se } = await db.from('schools').insert({
    id: schoolId, name: SCHOOL_NAME, slug: finalSlug, status: 'CLAIMED', source: 'SELF_REGISTERED', type: 'SCHOOL',
    createdAt: now, updatedAt: now,
  })
  if (se) { console.error('school insert error:', se); process.exit(1) }

  const { error: uue } = await db.from('users').update({ role: 'SCHOOL_OWNER', updatedAt: now }).eq('id', user.id)
  if (uue) { console.error('user update error:', uue); process.exit(1) }

  const { error: sme } = await db.from('school_members').insert({
    id: genId(), schoolId, userId: user.id, role: 'OWNER', status: 'ACTIVE', joinedAt: now, createdAt: now, updatedAt: now,
  })
  if (sme) { console.error('school_member insert error:', sme); process.exit(1) }

  const { data: pref, error: pfe } = await db.from('user_preferences').select('id').eq('userId', user.id).maybeSingle()
  if (pfe) { console.error('user_preferences fetch error:', pfe); process.exit(1) }
  if (pref) {
    const { error } = await db.from('user_preferences').update({ lastSchoolId: schoolId, updatedAt: now }).eq('userId', user.id)
    if (error) { console.error('user_preferences update error:', error); process.exit(1) }
  } else {
    const { error } = await db.from('user_preferences').insert({ id: genId(), userId: user.id, lastSchoolId: schoolId, createdAt: now, updatedAt: now })
    if (error) { console.error('user_preferences insert error:', error); process.exit(1) }
  }

  console.log('\nDone. schoolId =', schoolId)
}

main().catch(e => { console.error(e); process.exit(1) })
