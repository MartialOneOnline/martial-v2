// Claims E2E guard. Refuses unless the configuration the dev server will
// EFFECTIVELY load — process environment inherited from the shell + every
// .env file Next.js reads in apps/web — is an isolated test configuration.
// Compares against production values without ever printing them.
//
//   node scripts/claims-e2e/guard.mjs   → prints OK or the list of problems (exit 1)
//
// Used by setup.mjs (before touching the test database/Auth) and dev.mjs
// (before starting the dev server). Must run from a git worktree: the main
// checkout's apps/web/.env.local is production.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const appDir = path.join(repoRoot, 'apps/web')
const require = createRequire(path.join(appDir, 'package.json'))

const parseFile = f => Object.fromEntries(fs.readFileSync(f, 'utf8').split('\n')
  .filter(l => /^\s*(export\s+)?[A-Z0-9_]+\s*=/.test(l))
  .map(l => { const s = l.replace(/^\s*export\s+/, ''); const i = s.indexOf('='); return [s.slice(0, i).trim(), s.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, '$2')] }))

// The checkout that holds the production .env files (the main worktree).
function mainCheckout() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: repoRoot, encoding: 'utf8' }).trim()
  return path.dirname(common)
}

export const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'DATABASE_URL', 'DIRECT_URL',
  'NEXT_PUBLIC_APP_URL', 'RESEND_API_KEY', 'CLAIM_INVITE_SECRET', 'E2E_ADMIN_EMAIL', 'E2E_OWNER_EMAIL']

export const allowedRecipients = env => [env.E2E_ADMIN_EMAIL, env.E2E_OWNER_EMAIL].filter(Boolean).map(e => e.trim().toLowerCase())

// What `next dev` in apps/web will see: @next/env with the real inherited
// process.env (it never overrides a variable already set in the process).
export function effectiveEnv(inherited = process.env) {
  const { loadEnvConfig } = require('@next/env')
  const saved = { ...process.env }
  try {
    for (const k of Object.keys(process.env)) delete process.env[k]
    Object.assign(process.env, inherited)
    const { combinedEnv, loadedEnvFiles } = loadEnvConfig(appDir, true, { info() {}, error() {} }, true)
    return { env: { ...combinedEnv }, files: loadedEnvFiles.map(f => f.path) }
  } finally {
    for (const k of Object.keys(process.env)) delete process.env[k]
    Object.assign(process.env, saved)
  }
}

export function checkEnv({ env, files }, inherited = process.env) {
  const problems = []
  const main = mainCheckout()
  if (path.resolve(main) === path.resolve(repoRoot)) problems.push('Running from the main checkout, whose apps/web/.env.local is production — use a git worktree')
  if (!files.some(f => path.basename(f) === '.env.local')) problems.push(`No apps/web/.env.local in ${repoRoot} — copy scripts/claims-e2e/env.template there and fill it`)

  for (const k of REQUIRED) if (!env[k] || /<[^>]*>/.test(env[k])) problems.push(`${k} is empty or still a placeholder`)
  if (env.NEXT_PUBLIC_APP_URL && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.NEXT_PUBLIC_APP_URL)) problems.push('NEXT_PUBLIC_APP_URL must be http://localhost:<port>')
  const rcpt = allowedRecipients(env)
  if (rcpt.length === 2 && rcpt[0] === rcpt[1]) problems.push('E2E_ADMIN_EMAIL and E2E_OWNER_EMAIL must be two different inboxes')

  // Production fingerprints, from every production env file (they may disagree).
  const prodFiles = ['apps/web/.env.local', 'apps/web/.env', '.env.local', '.env'].map(f => path.join(main, f)).filter(f => fs.existsSync(f)).map(parseFile)
  if (prodFiles.length === 0) problems.push('Could not read the production env files to compare against — refusing to guess')
  const prodAll = k => prodFiles.map(f => f[k]).filter(v => v && v.length >= 8)
  const prodValues = new Set(prodFiles.flatMap(f => Object.values(f)).filter(v => v && v.length >= 16))
  const ref = u => { try { return new URL(u).hostname.split('.')[0] } catch { return null } }
  const dbId = u => { try { const x = new URL(u); return `${x.username}@${x.hostname}` } catch { return null } }
  const prodRefs = new Set(prodAll('NEXT_PUBLIC_SUPABASE_URL').map(ref).filter(Boolean))
  const prodDbIds = new Set([...prodAll('DATABASE_URL'), ...prodAll('DIRECT_URL')].map(dbId).filter(Boolean))

  if (prodRefs.has(ref(env.NEXT_PUBLIC_SUPABASE_URL))) problems.push('NEXT_PUBLIC_SUPABASE_URL is the PRODUCTION project')
  for (const k of ['DATABASE_URL', 'DIRECT_URL']) {
    const id = dbId(env[k])
    // Supabase pooler users are "postgres.<project-ref>"; direct hosts are "db.<project-ref>.supabase.co".
    if (id && (prodDbIds.has(id) || [...prodRefs].some(r => id.includes(r)))) problems.push(`${k} points at the PRODUCTION database`)
  }
  if (env.RESEND_API_KEY && prodAll('RESEND_API_KEY').includes(env.RESEND_API_KEY)) problems.push('RESEND_API_KEY is the production key — create a dedicated, revocable one')
  // Any effective value (any key: Stripe, Mux, OAuth…) equal to a production secret.
  for (const [k, v] of Object.entries(env)) {
    if (v && prodValues.has(v) && !problems.some(p => p.startsWith(k))) problems.push(`${k} (effective value) equals a production value`)
  }
  // Inherited from the shell: reported separately so the source is clear.
  for (const [k, v] of Object.entries(inherited)) {
    if (v && prodValues.has(v)) problems.push(`${k} is exported in your shell with a production value — unset it`)
  }
  return [...new Set(problems)]
}

export function loadTestEnv(inherited = process.env) {
  const eff = effectiveEnv(inherited)
  const problems = checkEnv(eff, inherited)
  if (problems.length) throw new Error('Test environment NOT safe:\n - ' + problems.join('\n - '))
  return eff.env
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const env = loadTestEnv()
    console.log(`OK: isolated test config. Emails restricted to ${allowedRecipients(env).length} test inboxes.`)
  } catch (e) { console.error(e.message); process.exit(1) }
}
