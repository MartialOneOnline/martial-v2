#!/usr/bin/env node
// Recovery for an ownership request closed by mistake with the old
// "Mark resolved" (incident 2026-11-22: "Guidos martial arts", Clovis).
//
// DRY-RUN BY DEFAULT: runs inside a READ ONLY transaction and only prints the
// diagnosis and the plan. It never creates schools, never sends emails and
// never grants access — those steps are done by a super admin in
// Admin → Verification Queue → the request page, after reviewing candidates.
//
// --apply (only with explicit authorization, and only after migration
// 20261122120000_claim_request_ownership_flow is applied) performs the single
// automatic step: RESOLVED → PENDING plus a REOPENED audit event. Idempotent:
// a request that is not RESOLVED, or already linked to a school, is left alone.
//
// Usage:
//   node scripts/recover-claim-request.mjs --email <requester email>
//   node scripts/recover-claim-request.mjs --id <claimRequestId> [--apply --actor <superadmin user id>]
//
// Reads DATABASE_URL from the environment or apps/web/.env.local.

import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { Client } = require('pg')

const args = process.argv.slice(2)
const arg = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const APPLY = args.includes('--apply')
const email = arg('email')?.toLowerCase()
const id = arg('id')
const actor = arg('actor') ?? null
if (!email && !id) { console.error('Pass --email or --id'); process.exit(1) }
if (APPLY && !actor) { console.error('--apply needs --actor <superadmin user id> for the audit trail'); process.exit(1) }

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const file = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../apps/web/.env.local')
  const line = fs.readFileSync(file, 'utf8').split('\n').find(l => l.startsWith('DATABASE_URL='))
  return line?.slice('DATABASE_URL='.length).replace(/^"|"$/g, '')
}

const STOP = new Set(['the', 'and', 'of', 'de', 'academy', 'school', 'club', 'team', 'martial', 'arts', 'art', 'dojo', 'gym', 'center', 'centre', 'jiu', 'jitsu', 'bjj', 'mma'])
const tokens = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’`]s\b/g, '')
  .split(/[^a-z0-9]+/).map(w => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w)).filter(w => w.length >= 3 && !STOP.has(w))

const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } })
await c.connect()
try {
  await c.query(APPLY ? 'BEGIN' : 'BEGIN TRANSACTION READ ONLY')

  const cols = (await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'claim_requests'`)).rows.map(r => r.column_name)
  const migrated = cols.includes('schoolId')
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN (read only)'} · ownership-flow migration applied: ${migrated ? 'yes' : 'NO'}`)

  const reqs = (await c.query(
    `SELECT * FROM claim_requests WHERE ${id ? 'id = $1' : 'lower("contactEmail") = $1'} ORDER BY "createdAt"`, [id ?? email],
  )).rows
  if (reqs.length === 0) { console.log('No matching request.'); process.exit(0) }

  for (const r of reqs) {
    console.log('\n── Request', r.id)
    console.log(`   ${r.schoolName} · ${r.city ?? '—'} · ${r.contactName} <${r.contactEmail}>`)
    console.log(`   status=${r.status} created=${r.createdAt.toISOString()} resolved=${r.resolvedAt?.toISOString() ?? '—'}${migrated ? ` linkedSchool=${r.schoolId ?? '—'}` : ''}`)

    const words = tokens(r.schoolName)
    const candidates = (await c.query(
      `SELECT id, name, slug, status::text, city, country, email, "claimedById" FROM schools
       WHERE ${words.map((_, i) => `name ILIKE $${i + 1}`).join(' OR ') || 'false'} OR lower(city) = lower($${words.length + 1}) OR lower(email) = lower($${words.length + 2})`,
      [...words.map(w => `%${w}%`), r.city ?? '', r.contactEmail],
    )).rows
    console.log(`   Candidate schools (${candidates.length}):`)
    for (const s of candidates) console.log(`     - ${s.name} [${s.status}] ${s.city ?? ''} ${s.country ?? ''} id=${s.id} owner=${s.claimedById ?? '—'}`)

    const invs = (await c.query(
      `SELECT id, status::text, "schoolId", email, "sentToEmail", "usedAt", "revokedAt" FROM school_invitations WHERE lower(email) = lower($1) OR lower("sentToEmail") = lower($1)`, [r.contactEmail],
    )).rows
    console.log(`   Invitations to this address: ${invs.length}`)
    const users = (await c.query(`SELECT id, role::text, "supabaseAuthId" IS NOT NULL AS linked FROM users WHERE lower(email) = lower($1)`, [r.contactEmail])).rows
    const auth = (await c.query(`SELECT id, email_confirmed_at IS NOT NULL AS confirmed FROM auth.users WHERE lower(email) = lower($1)`, [r.contactEmail])).rows
    console.log(`   Prisma users: ${users.length} · Auth users: ${auth.length}`)
    const owners = candidates.length
      ? (await c.query(`SELECT "schoolId", "userId" FROM school_members WHERE role = 'OWNER' AND status = 'ACTIVE' AND "schoolId" = ANY($1)`, [candidates.map(s => s.id)])).rows
      : []
    if (owners.length) console.log(`   Candidates with an ACTIVE OWNER: ${[...new Set(owners.map(o => o.schoolId))].join(', ')}`)

    console.log('   Plan:')
    const plan = []
    if (r.status === 'RESOLVED' && !(migrated && r.schoolId)) plan.push('1. Reopen the request (RESOLVED → PENDING) — the only step this script automates.')
    else plan.push(`1. Reopen: not needed (status ${r.status}).`)
    plan.push(candidates.length
      ? '2. In the request page, review the candidates above and link the right one (or create the school after acknowledging them).'
      : '2. No existing school matches: in the request page, use "School not listed — create it" (Unverified, public email left empty).')
    plan.push(`3. Send the owner invitation to ${r.contactEmail} after confirming the recipient.`)
    plan.push('4. The request completes only when the invitee confirms the email and accepts.')
    for (const s of plan) console.log(`     ${s}`)

    if (APPLY && r.status === 'RESOLVED' && !(migrated && r.schoolId)) {
      if (!migrated) throw new Error('Apply the ownership-flow migration first')
      const res = await c.query(`UPDATE claim_requests SET status = 'PENDING', "resolvedAt" = NULL, "updatedAt" = now() WHERE id = $1 AND status = 'RESOLVED'`, [r.id])
      if (res.rowCount === 1) {
        await c.query(
          `INSERT INTO claim_request_events (id, "claimRequestId", type, "actorUserId", data) VALUES ($1, $2, 'REOPENED', $3, $4)`,
          [`rec_${randomBytes(10).toString('hex')}`, r.id, actor, JSON.stringify({ previousStatus: 'RESOLVED', via: 'scripts/recover-claim-request.mjs', reason: 'Closed by mistake with the legacy "Mark resolved"' })],
        )
        console.log('   APPLIED: request reopened.')
      }
    }
  }
  await c.query(APPLY ? 'COMMIT' : 'ROLLBACK')
} catch (err) {
  await c.query('ROLLBACK').catch(() => {})
  console.error('Failed:', err.message)
  process.exitCode = 1
} finally {
  await c.end()
}
