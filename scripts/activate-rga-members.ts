/**
 * Bulk-activate Roger Gracie Malaga members who were imported from V1 but
 * have no Supabase Auth account yet (User.supabaseAuthId is null) — creates
 * their auth account via Supabase's admin "invite" link and emails them the
 * same branded activation email used for regular new-member invites.
 *
 * Does NOT touch SchoolMember — that already exists from the V1 import, this
 * only creates the missing auth identity. On first login, resolveDbUser()
 * links the new Supabase auth user to the existing Prisma User by email, so
 * their imported membership/attendance/belt history shows up automatically.
 *
 * Usage:
 *   npx tsx scripts/activate-rga-members.ts --dry-run
 *   npx tsx scripts/activate-rga-members.ts --test you@example.com,other@example.com
 *   npx tsx scripts/activate-rga-members.ts
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const DRY_RUN = process.argv.includes('--dry-run')
const testArgIndex = process.argv.indexOf('--test')
const TEST_EMAILS = testArgIndex !== -1
  ? (process.argv[testArgIndex + 1] ?? '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  : null

const envPath = path.resolve(process.cwd(), 'apps/web/.env.local')
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8').split('\n')
    .filter(l => l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const SCHOOL_ID = 'cmq6k2n5t0000x4o0rcvlmhmv'

async function main() {
  // The lib modules below read process.env directly at import time — populate
  // it from .env.local BEFORE importing them (dynamic import inside main(),
  // since a static top-level import would be hoisted above the env setup,
  // and top-level await isn't available in this tsx/CJS transform).
  for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v
  const {
    buildInviteStudentEmail,
    detectLang,
    getInviteSubject,
  } = await import('../apps/web/lib/email/templates/inviteStudent')
  const { getResend, FROM, APP_URL } = await import('../apps/web/lib/email/resend')

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : TEST_EMAILS ? `TEST (${TEST_EMAILS.join(', ')})` : 'LIVE — full send'}`)

  const { data: school, error: schoolErr } = await db.schema('public').from('schools')
    .select('name,city,language').eq('id', SCHOOL_ID).single()
  if (schoolErr || !school) { console.error('school fetch error:', schoolErr); process.exit(1) }

  const { data: members, error: mErr } = await db.schema('public').from('school_members')
    .select('userId').eq('schoolId', SCHOOL_ID)
  if (mErr) { console.error('members fetch error:', mErr); process.exit(1) }
  console.log(`Total RGA school_members: ${members.length}`)

  const userIds = members.map(m => m.userId)
  const candidates: { id: string; email: string; name: string | null }[] = []
  const CHUNK = 150
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const { data, error } = await db.schema('public').from('users')
      .select('id,email,name,supabaseAuthId').in('id', userIds.slice(i, i + CHUNK))
    if (error) { console.error('users fetch error:', error); process.exit(1) }
    for (const u of data) if (!u.supabaseAuthId) candidates.push({ id: u.id, email: u.email, name: u.name })
  }
  console.log(`Members without a Supabase Auth account: ${candidates.length}`)

  const targets = TEST_EMAILS
    ? candidates.filter(c => TEST_EMAILS.includes(c.email.toLowerCase()))
    : candidates

  if (TEST_EMAILS) {
    console.log(`Matched test emails among candidates: ${targets.length}/${TEST_EMAILS.length}`)
    const missing = TEST_EMAILS.filter(e => !targets.some(t => t.email.toLowerCase() === e))
    if (missing.length) console.log('Not found among no-auth candidates (already activated or not a member):', missing)
  }

  console.log(`\nWill process: ${targets.length}`)
  if (DRY_RUN) {
    console.log(targets.slice(0, 20).map(t => t.email))
    if (targets.length > 20) console.log(`...and ${targets.length - 20} more`)
    return
  }
  if (targets.length === 0) { console.log('Nothing to do.'); return }

  const lang = detectLang(school.language)
  let sent = 0, failed = 0

  for (const c of targets) {
    try {
      const redirectTo = `${APP_URL}/auth/accept-invite?schoolId=${encodeURIComponent(SCHOOL_ID)}`
      let { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
        type: 'invite',
        email: c.email,
        options: { redirectTo },
      })
      // A prior run's link may have already created the Supabase auth user
      // (that happens at generateLink time, independent of whether the link
      // was ever actually clicked — e.g. an email scanner pre-fetched and
      // burned it). "invite" only works for brand-new auth users, so fall
      // back to "magiclink" for anyone already in that half-created state —
      // same fallback the real member-invite route uses.
      if (linkErr && /already.*registered|already exists/i.test(linkErr.message)) {
        ;({ data: linkData, error: linkErr } = await db.auth.admin.generateLink({
          type: 'magiclink',
          email: c.email,
          options: { redirectTo },
        }))
      }
      const inviteUrl = linkData?.properties?.action_link
      if (linkErr || !inviteUrl) {
        console.error(`  ✗ ${c.email} — generateLink failed:`, linkErr?.message)
        failed++
        continue
      }

      const html = buildInviteStudentEmail({
        studentName: c.name,
        schoolName: school.name,
        schoolCity: school.city,
        inviteUrl,
        lang,
      })

      const { error: sendErr } = await getResend().emails.send({
        from: FROM,
        to: c.email,
        subject: getInviteSubject(school.name, lang),
        html,
      })
      if (sendErr) {
        console.error(`  ✗ ${c.email} — Resend error:`, sendErr.message)
        failed++
        continue
      }

      sent++
      console.log(`  ✓ ${c.email}`)
    } catch (err) {
      console.error(`  ✗ ${c.email} — unexpected error:`, err)
      failed++
    }
    // Gentle pacing — avoid bursting Supabase admin API / Resend rate limits.
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\nDone. Sent: ${sent} | Failed: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
