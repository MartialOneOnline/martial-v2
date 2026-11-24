// Claims E2E guard. Refuses unless the configuration is an isolated test one.
//
// Every environment is evaluated in a NEW process (next-env-probe.cjs) with
// exactly the variables it will have, using Next.js's own loader (@next/env:
// dotenv parsing, quotes, comments, `export`, expansion) — @next/env caches
// the environment of its first call, so evaluating twice in one process can
// report a different config than the server gets. dev.mjs then starts the
// server with exactly the environment that was validated.
//
// Production fingerprints are read with the same loader (plus a raw reading of
// every line as extra fingerprints); if they cannot be obtained reliably the
// guard refuses. Values are compared, never printed.
//
//   node scripts/claims-e2e/guard.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(here, '../..')
export const appDir = path.join(repoRoot, 'apps/web')
const nextEnvPath = createRequire(path.join(appDir, 'package.json')).resolve('@next/env')
const probeScript = path.join(here, 'next-env-probe.cjs')

export const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SECRET_KEY', 'DATABASE_URL', 'DIRECT_URL',
  'NEXT_PUBLIC_APP_URL', 'RESEND_API_KEY', 'CLAIM_INVITE_SECRET', 'E2E_ADMIN_EMAIL', 'E2E_OWNER_EMAIL']

export const allowedRecipients = env => [env.E2E_ADMIN_EMAIL, env.E2E_OWNER_EMAIL].filter(Boolean).map(e => e.trim().toLowerCase())

/** What `next dev` in <dir> loads when started with exactly `baseEnv`, evaluated in a new process. */
export function probeEnv(dir, baseEnv) {
  const out = execFileSync(process.execPath, [probeScript, dir, nextEnvPath], { env: { ...baseEnv }, encoding: 'utf8', maxBuffer: 1 << 26 })
  const i = out.lastIndexOf('__CLAIMS_E2E_PROBE__')
  if (i < 0) throw new Error('Could not evaluate the environment (probe produced no result) — refusing')
  return JSON.parse(out.slice(i + '__CLAIMS_E2E_PROBE__'.length))
}

export function mainCheckoutOf(root = repoRoot) {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { cwd: root, encoding: 'utf8' }).trim()
  return path.dirname(common)
}

const ref = u => { try { const h = new URL(u).hostname; return h.endsWith('.supabase.co') ? h.split('.')[0] : null } catch { return null } }
const dbId = u => { try { const x = new URL(u); return x.hostname ? `${decodeURIComponent(x.username)}@${x.hostname}` : null } catch { return null } }

// Raw reading (no dotenv semantics): every right-hand side, with and without
// quotes/comments. Only ADDS fingerprints, so it can only make the guard stricter.
function rawValues(text) {
  const out = []
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?[\w.-]+\s*[=:]\s*(.*)$/.exec(line)
    if (!m) continue
    const v = m[1].trim()
    out.push(v, v.replace(/\s+#.*$/, '').trim(), v.replace(/^(['"`])(.*?)\1.*$/, '$2'))
  }
  return out
}

/** Fingerprints of production: from the main checkout's apps/web and root env files. */
export function productionFingerprints(mainRoot) {
  const files = ['apps/web/.env.local', 'apps/web/.env', 'apps/web/.env.development.local', 'apps/web/.env.development', '.env.local', '.env']
    .map(f => path.join(mainRoot, f)).filter(f => fs.existsSync(f))
  if (files.length === 0) throw new Error('No production env files found in the main checkout — cannot compare, refusing')
  const parsed = [probeEnv(path.join(mainRoot, 'apps/web'), {}), probeEnv(mainRoot, {})]
  const byKey = {}
  for (const p of parsed) for (const f of p.files) for (const [k, v] of Object.entries(f.values)) (byKey[k] ??= new Set()).add(v)
  const all = k => [...(byKey[k] ?? [])].filter(v => v && v.length >= 8)
  const values = new Set([...Object.values(byKey).flatMap(s => [...s]), ...files.flatMap(f => rawValues(fs.readFileSync(f, 'utf8')))]
    .map(v => v.trim()).filter(v => v.length >= 16))
  const refs = new Set(all('NEXT_PUBLIC_SUPABASE_URL').map(ref).filter(Boolean))
  const dbIds = new Set([...all('DATABASE_URL'), ...all('DIRECT_URL')].map(dbId).filter(Boolean))
  const resend = new Set(all('RESEND_API_KEY'))
  if (refs.size === 0 || dbIds.size === 0) throw new Error('Could not read reliable production fingerprints (Supabase project and database) — refusing')
  return { refs, dbIds, values, resend }
}

/**
 * @param probe      result of probeEnv for the environment being checked
 * @param opts       { inherited, repoRoot, mainRoot, prod, filesOnly }
 *   filesOnly: probeEnv of the same dir with an EMPTY environment — what the
 *   files say on their own (dotenv expansion replaces a file value with an
 *   inherited variable of the same name, so `probe` alone can hide it).
 */
export function checkEnv(probe, { inherited = {}, repoRoot: root = repoRoot, mainRoot, prod, filesOnly } = {}) {
  const problems = []
  const env = probe.env
  if (path.resolve(mainRoot) === path.resolve(root)) problems.push('Running from the main checkout, whose apps/web/.env.local is production — use a git worktree')
  if (!probe.files.some(f => path.basename(f.path) === '.env.local')) problems.push('No apps/web/.env.local — copy scripts/claims-e2e/env.template there and fill it')

  for (const k of REQUIRED) if (!env[k] || /<[^>]*>/.test(env[k])) problems.push(`${k} is empty or still a placeholder`)
  if (env.NEXT_PUBLIC_APP_URL && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(env.NEXT_PUBLIC_APP_URL)) problems.push('NEXT_PUBLIC_APP_URL must be http://localhost:<port>')
  const rcpt = allowedRecipients(env)
  if (rcpt.length === 2 && rcpt[0] === rcpt[1]) problems.push('E2E_ADMIN_EMAIL and E2E_OWNER_EMAIL must be two different inboxes')

  const isProdUrl = u => prod.refs.has(ref(u))
  const isProdDb = u => { const id = dbId(u); return !!id && (prod.dbIds.has(id) || [...prod.refs].some(r => id.includes(r))) }
  // Effective values AND every value written in any loaded file (a file value
  // masked by a shell variable today is what the server gets without it).
  const sources = [['effective', env], ...(filesOnly ?? probe).files.map(f => [`apps/web/${f.path}`, f.values]), ['shell', inherited]]
  for (const [where, vars] of sources) {
    for (const [k, raw] of Object.entries(vars ?? {})) {
      const v = String(raw ?? '').trim()
      if (!v) continue
      if (isProdUrl(v)) problems.push(`${k} (${where}) is the PRODUCTION Supabase project`)
      else if (isProdDb(v)) problems.push(`${k} (${where}) points at the PRODUCTION database`)
      else if (prod.resend.has(v)) problems.push(`${k} (${where}) is the production Resend key — create a dedicated, revocable one`)
      else if (prod.values.has(v)) problems.push(`${k} (${where}) equals a production value`)
    }
  }
  return [...new Set(problems)]
}

function fail(problems, what) {
  if (problems.length) throw new Error(`${what} NOT safe:\n - ` + problems.join('\n - '))
}

/** Checks the shell as it is (inherited variables + files) and returns the effective env. */
export function loadTestEnv({ inherited = process.env, root = repoRoot } = {}) {
  const mainRoot = mainCheckoutOf(root)
  const prod = productionFingerprints(mainRoot)
  const probe = probeEnv(path.join(root, 'apps/web'), inherited)
  const filesOnly = probeEnv(path.join(root, 'apps/web'), {})
  fail(checkEnv(probe, { inherited, repoRoot: root, mainRoot, prod, filesOnly }), 'Test environment')
  return probe.env
}

/** The exact environment the server will be started with, validated. */
export function validatedServerEnv(baseEnv, { root = repoRoot } = {}) {
  const mainRoot = mainCheckoutOf(root)
  const prod = productionFingerprints(mainRoot)
  const probe = probeEnv(path.join(root, 'apps/web'), baseEnv)
  const filesOnly = probeEnv(path.join(root, 'apps/web'), {})
  fail(checkEnv(probe, { inherited: baseEnv, repoRoot: root, mainRoot, prod, filesOnly }), 'Server environment')
  return probe.env
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const env = loadTestEnv()
    console.log(`OK: isolated test config. Emails restricted to ${allowedRecipients(env).length} test inboxes.`)
  } catch (e) { console.error(e.message); process.exit(1) }
}
