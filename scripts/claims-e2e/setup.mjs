// Prepares the ISOLATED claims E2E environment. Nothing here can reach
// production: every value comes from the effective apps/web configuration of
// this worktree after guard.mjs has rejected production fingerprints (in the
// .env files and in variables inherited from the shell), and child processes get an
// environment built from scratch (no inherited DATABASE_URL/DIRECT_URL).
//
//   node scripts/claims-e2e/setup.mjs            → guard + migrate deploy + seed (idempotent)
//   node scripts/claims-e2e/setup.mjs --db-only  → skip Supabase Auth (seed DB rows only)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { appDir, loadTestEnv, repoRoot, validatedServerEnv } from './guard.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = repoRoot
const require = createRequire(path.join(appDir, 'package.json'))
const { Client } = require('pg')
const dbOnly = process.argv.includes('--db-only')

let env
try {
  loadTestEnv() // the shell as it is
  // Values used below = what the server will get (files only, no shell variables).
  env = validatedServerEnv({ PATH: process.env.PATH, HOME: process.env.HOME })
} catch (e) { console.error(e.message); process.exit(1) }
console.log('guard: OK')

// 1. Migrations — the full chain, including 20261122120000_claim_request_ownership_flow.
const clean = { PATH: process.env.PATH, HOME: process.env.HOME, DIRECT_URL: env.DIRECT_URL, DATABASE_URL: env.DIRECT_URL }
const mig = spawnSync('npx', ['prisma', 'migrate', 'deploy'], { cwd: root, env: clean, stdio: 'inherit' })
if (mig.status !== 0) { console.error('migrate deploy failed — nothing seeded'); process.exit(1) }

// 2. Auth: the super admin used to review requests (owner account is created by the flow itself).
let adminAuthId = null
let password = null
const credFile = path.join(here, '.credentials.txt') // gitignored
if (!dbOnly) {
  const { createClient } = require('@supabase/supabase-js')
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) throw listErr
  const existing = list.users.find(u => u.email?.toLowerCase() === env.E2E_ADMIN_EMAIL.toLowerCase())
  if (existing) {
    adminAuthId = existing.id
  } else {
    password = crypto.randomBytes(18).toString('base64url')
    const { data, error } = await admin.auth.admin.createUser({ email: env.E2E_ADMIN_EMAIL, password, email_confirm: true })
    if (error) throw error
    adminAuthId = data.user.id
    fs.writeFileSync(credFile, `TEST super admin (isolated project only)\nemail: ${env.E2E_ADMIN_EMAIL}\npassword: ${password}\n`, { mode: 0o600 })
  }
  // The owner inbox must start WITHOUT an Auth account to exercise the "new account" path.
  if (list.users.some(u => u.email?.toLowerCase() === env.E2E_OWNER_EMAIL.toLowerCase())) {
    console.warn('note: the owner address already has an Auth account in the test project — the run will exercise the "existing account" path')
  }
}

// 3. Database rows.
const c = new Client({ connectionString: env.DIRECT_URL, ssl: /localhost|127\.0\.0\.1/.test(env.DIRECT_URL) ? false : { rejectUnauthorized: false } })
await c.connect()
try {
  await c.query('BEGIN')
  await c.query(`INSERT INTO platform_settings (id, "superAdminEmail", "updatedAt") VALUES ('singleton', $1, now())
                 ON CONFLICT (id) DO UPDATE SET "superAdminEmail" = EXCLUDED."superAdminEmail", "updatedAt" = now()`, [env.E2E_ADMIN_EMAIL])
  await c.query(`INSERT INTO users (id, email, name, role, "supabaseAuthId", "updatedAt") VALUES ('e2e_admin', $1, 'E2E Super Admin', 'SUPERADMIN', $2, now())
                 ON CONFLICT (email) DO UPDATE SET role = 'SUPERADMIN', "supabaseAuthId" = COALESCE(EXCLUDED."supabaseAuthId", users."supabaseAuthId"), "updatedAt" = now()`, [env.E2E_ADMIN_EMAIL, adminAuthId])
  const schools = [
    ['e2e_school_unverified', 'Claims E2E Dojo', 'claims-e2e-dojo', 'UNVERIFIED', 'Málaga'],
    ['e2e_school_verified', 'Claims E2E Verified Academy', 'claims-e2e-verified', 'VERIFIED', 'Málaga'],
  ]
  for (const [id, name, slug, status, city] of schools) {
    await c.query(`INSERT INTO schools (id, name, slug, status, city, country, "updatedAt") VALUES ($1, $2, $3, $4::"SchoolStatus", $5, 'ES', now())
                   ON CONFLICT (id) DO NOTHING`, [id, name, slug, status, city])
  }
  await c.query('COMMIT')
} catch (e) { await c.query('ROLLBACK'); throw e } finally { await c.end() }

console.log('seed: OK — super admin, platform settings, 2 schools (UNVERIFIED + VERIFIED)')
if (password) console.log(`admin credentials written to ${credFile} (mode 600, gitignored)`)
console.log('next: node scripts/claims-e2e/dev.mjs, then follow scripts/claims-e2e/RUNBOOK.md')
