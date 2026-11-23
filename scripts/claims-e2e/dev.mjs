// Starts the web dev server for the claims E2E check — only after the guard
// passes for the exact environment the server will get:
//   • a minimal process environment (nothing inherited from your shell except
//     PATH/HOME/locale), plus the apps/web .env files Next.js loads;
//   • the Resend recipient allowlist preloaded into every server process;
//   • the test database's platform super-admin email must be a test inbox.
//
//   node scripts/claims-e2e/dev.mjs
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { appDir, allowedRecipients, checkEnv, effectiveEnv, loadTestEnv } from './guard.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(path.join(appDir, 'package.json'))

// 1. The shell as it is (catches production values exported in it)…
const env = loadTestEnv()
const allowed = allowedRecipients(env)

// 2. …and the exact environment the server process will start with.
const childEnv = {
  PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG ?? 'en_US.UTF-8', TERM: process.env.TERM ?? 'xterm',
  NODE_OPTIONS: `--import=${pathToFileURL(path.join(here, 'resend-allowlist.mjs')).href}`,
  CLAIMS_E2E_ALLOWED_RECIPIENTS: allowed.join(','),
  NEXT_TELEMETRY_DISABLED: '1',
}
const problems = checkEnv(effectiveEnv(childEnv), childEnv)
if (problems.length) { console.error('Server environment NOT safe:\n - ' + problems.join('\n - ')); process.exit(1) }

// 3. Platform notices go to PlatformSettings.superAdminEmail: it must be a test inbox.
const { Client } = require('pg')
const c = new Client({ connectionString: env.DIRECT_URL, ssl: /localhost|127\.0\.0\.1/.test(env.DIRECT_URL) ? false : { rejectUnauthorized: false } })
await c.connect()
try {
  const { rows } = await c.query(`SELECT "superAdminEmail" FROM platform_settings WHERE id = 'singleton'`)
  const admin = rows[0]?.superAdminEmail?.toLowerCase()
  if (!admin || !allowed.includes(admin)) { console.error('PlatformSettings.superAdminEmail in the TEST database is not a test inbox — run scripts/claims-e2e/setup.mjs first'); process.exit(1) }
} finally { await c.end() }

const port = new URL(env.NEXT_PUBLIC_APP_URL).port || '3000'
console.log(`guard: OK — starting dev server on :${port}; emails limited to ${allowed.length} test inboxes`)
const child = spawn('npx', ['next', 'dev', '--port', port], { cwd: appDir, env: childEnv, stdio: 'inherit' })
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
child.on('exit', code => process.exit(code ?? 0))
