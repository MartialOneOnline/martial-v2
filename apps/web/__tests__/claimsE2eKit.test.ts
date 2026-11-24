/**
 * Safety rails of the claims E2E kit (scripts/claims-e2e) — Project Audit of
 * bbcdd70. Only fictitious values and stubbed network: no real project, key,
 * database or email is involved.
 *
 * Guard: a throwaway git repo plays the "main checkout" (with fictitious
 * production values written in awkward dotenv forms) and a real git worktree
 * of it plays the test checkout.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- untyped .mjs kit */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const KIT = path.resolve(__dirname, '../../../scripts/claims-e2e')
const nextEnvPath = createRequire(path.resolve(__dirname, '../package.json')).resolve('@next/env')

// ── fictitious "production" and "test" values ──────────────────────────────
const P = {
  url: 'https://prodfakeref0000000001.supabase.co',
  pooler: 'postgresql://postgres.prodfakeref0000000001:prodPw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  direct: 'postgresql://postgres.prodfakeref0000000001:prodPw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  secret: 'sb_secret_PRODFAKE_aaaaaaaaaaaaaaaa',
  publishable: 'sb_publishable_PRODFAKE_bbbbbbbbbbbb',
  resend: 're_PRODFAKE_cccccccccccccccccccc',
  stripe: 'sk_live_PRODFAKE_dddddddddddddddddd',
}
// Production written the way real .env files are: quotes + trailing comments,
// `export`, spaces around "=", single quotes — dotenv/Next strip all of that.
const PROD_ENV_LOCAL = [
  `NEXT_PUBLIC_SUPABASE_URL="${P.url}" # production project`,
  `export DATABASE_URL='${P.pooler}'   # pooler`,
  `SUPABASE_SECRET_KEY = "${P.secret}" # do not share`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${P.publishable} # public`,
  `RESEND_API_KEY="${P.resend}"#no space before comment`,
  `STRIPE_SECRET_KEY="${P.stripe}"`,
].join('\n')
const PROD_ROOT_ENV = `DIRECT_URL="${P.direct}" # migrations\n`

const TEST: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://testfakeref0000000009.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_TESTFAKE_111111111111',
  SUPABASE_SECRET_KEY: 'sb_secret_TESTFAKE_2222222222222222',
  DATABASE_URL: 'postgresql://postgres.testfakeref0000000009:testPw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
  DIRECT_URL: 'postgresql://postgres.testfakeref0000000009:testPw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  RESEND_API_KEY: 're_TESTFAKE_333333333333333333',
  CLAIM_INVITE_SECRET: 'test-only-secret-44444444',
  E2E_ADMIN_EMAIL: 'admin@e2e.example',
  E2E_OWNER_EMAIL: 'owner@e2e.example',
}
const dotenv = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}=${v}`).join('\n') + '\n'

let tmp = '', main = '', wt = ''
let G: any
const shell = () => ({ PATH: process.env.PATH!, HOME: process.env.HOME! })
const writeTest = (o: Record<string, string>, file = '.env.local') => fs.writeFileSync(path.join(wt, 'apps/web', file), dotenv(o))
const problemsOf = (fn: () => unknown): string => { try { fn(); return 'OK' } catch (e: any) { return String(e.message) } }

beforeAll(async () => {
  G = await import(/* @vite-ignore */ path.join(KIT, 'guard.mjs'))
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'claims-e2e-kit-')))
  main = path.join(tmp, 'main'); wt = path.join(tmp, 'wt')
  fs.mkdirSync(path.join(main, 'apps/web'), { recursive: true })
  const git = (...a: string[]) => execFileSync('git', a, { cwd: main, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } })
  git('init', '-q'); fs.writeFileSync(path.join(main, 'README'), 'x'); git('add', 'README'); git('commit', '-qm', 'init')
  git('worktree', 'add', '-q', wt)
  fs.mkdirSync(path.join(wt, 'apps/web'), { recursive: true })
  fs.writeFileSync(path.join(main, 'apps/web/.env.local'), PROD_ENV_LOCAL)
  fs.writeFileSync(path.join(main, '.env'), PROD_ROOT_ENV)
})
afterAll(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }) })

describe('claims E2E guard', () => {
  it('reads production fingerprints with dotenv/Next semantics (quotes, comments, export, spaces)', () => {
    const fp = G.productionFingerprints(main)
    expect([...fp.refs]).toEqual(['prodfakeref0000000001'])
    expect(fp.dbIds.has('postgres.prodfakeref0000000001@aws-0-eu-west-1.pooler.supabase.com')).toBe(true)
    for (const v of [P.secret, P.publishable, P.resend, P.stripe]) expect(fp.values.has(v)).toBe(true)
    expect(fp.resend.has(P.resend)).toBe(true)
  })

  it('refuses when production fingerprints cannot be obtained reliably', () => {
    const weird = path.join(tmp, 'weird'); fs.mkdirSync(path.join(weird, 'apps/web'), { recursive: true })
    fs.writeFileSync(path.join(weird, 'apps/web/.env.local'), 'NOTHING_USEFUL=1\n')
    expect(() => G.productionFingerprints(weird)).toThrow(/reliable production fingerprints/)
    expect(() => G.productionFingerprints(path.join(tmp, 'nowhere'))).toThrow(/No production env files/)
  })

  it('a clean test config passes, for the shell and for the server environment', () => {
    writeTest(TEST)
    expect(problemsOf(() => G.loadTestEnv({ inherited: shell(), root: wt }))).toBe('OK')
    expect(problemsOf(() => G.validatedServerEnv(shell(), { root: wt }))).toBe('OK')
  })

  it.each([
    ['Supabase project', { NEXT_PUBLIC_SUPABASE_URL: P.url }, /PRODUCTION Supabase project/],
    ['pooler DB', { DATABASE_URL: P.pooler }, /PRODUCTION database/],
    ['direct DB (from the root .env)', { DIRECT_URL: P.direct }, /PRODUCTION database/],
    ['secret key', { SUPABASE_SECRET_KEY: P.secret }, /equals a production value/],
    ['publishable key', { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: P.publishable }, /equals a production value/],
    ['Resend key', { RESEND_API_KEY: P.resend }, /production Resend key/],
    ['a prod secret under another name', { SOME_OTHER_KEY: P.stripe }, /SOME_OTHER_KEY .* equals a production value/],
  ])('refuses the production %s, whatever its dotenv form in either file', (_l, override, re) => {
    for (const quote of ['', '"', "'"]) {
      const o = { ...TEST, ...override }
      fs.writeFileSync(path.join(wt, 'apps/web/.env.local'), Object.entries(o).map(([k, v]) => `${k}=${quote}${v}${quote} # c`).join('\n'))
      expect(problemsOf(() => G.validatedServerEnv(shell(), { root: wt }))).toMatch(re)
    }
    writeTest(TEST)
  })

  it('Codex P1: a shell variable hiding a production value in .env.local no longer passes either check', () => {
    writeTest({ ...TEST, DATABASE_URL: P.pooler })
    // The shell masks the file value with a harmless one…
    const masked = { ...shell(), DATABASE_URL: TEST.DATABASE_URL }
    expect(problemsOf(() => G.loadTestEnv({ inherited: masked, root: wt }))).toMatch(/DATABASE_URL \(apps\/web\/\.env\.local\) points at the PRODUCTION database/)
    // …and the server, which does not get that shell variable, is refused too.
    expect(problemsOf(() => G.validatedServerEnv(shell(), { root: wt }))).toMatch(/PRODUCTION database/)
    writeTest(TEST)
  })

  it('a later .env file or the shell cannot sneak production in', () => {
    writeTest({ DATABASE_URL: P.pooler }, '.env.development.local')
    expect(problemsOf(() => G.validatedServerEnv(shell(), { root: wt }))).toMatch(/PRODUCTION database/)
    fs.rmSync(path.join(wt, 'apps/web/.env.development.local'))
    expect(problemsOf(() => G.loadTestEnv({ inherited: { ...shell(), RESEND_API_KEY: P.resend }, root: wt }))).toMatch(/RESEND_API_KEY \((effective|shell)\) is the production Resend key/)
  })

  it('the server gets exactly the validated environment: a brand-new process loading it like `next dev` sees the same values', () => {
    writeTest(TEST)
    const base = { ...shell(), CLAIMS_E2E_ALLOWED_RECIPIENTS: 'admin@e2e.example,owner@e2e.example' }
    const validated = G.validatedServerEnv(base, { root: wt })
    for (const [k, v] of Object.entries(TEST)) expect(validated[k]).toBe(v)
    // A different process, started with that env, running Next's own loader.
    const fresh = JSON.parse(execFileSync(process.execPath, ['-e', `
      const { loadEnvConfig } = require(${JSON.stringify(nextEnvPath)})
      const { combinedEnv } = loadEnvConfig(${JSON.stringify(path.join(wt, 'apps/web'))}, true, { info() {}, error() {} })
      const e = { ...combinedEnv }; delete e.__NEXT_PROCESSED_ENV
      process.stdout.write(JSON.stringify(e))`], { env: validated, encoding: 'utf8' }))
    expect(fresh).toEqual(validated)
    // Even if .env.local changes after validation, every validated key wins (process env beats files).
    writeTest({ ...TEST, DATABASE_URL: P.pooler })
    const after = JSON.parse(execFileSync(process.execPath, ['-e', `
      const { loadEnvConfig } = require(${JSON.stringify(nextEnvPath)})
      process.stdout.write(JSON.stringify(loadEnvConfig(${JSON.stringify(path.join(wt, 'apps/web'))}, true, { info() {}, error() {} }).combinedEnv.DATABASE_URL))`], { env: validated, encoding: 'utf8' }))
    expect(after).toBe(TEST.DATABASE_URL)
    writeTest(TEST)
  })

  it('refuses the main checkout, missing .env.local, placeholders, non-localhost URL and the same inbox twice', () => {
    expect(problemsOf(() => G.loadTestEnv({ inherited: shell(), root: main }))).toMatch(/main checkout/)
    fs.rmSync(path.join(wt, 'apps/web/.env.local'))
    expect(problemsOf(() => G.loadTestEnv({ inherited: shell(), root: wt }))).toMatch(/No apps\/web\/\.env\.local/)
    writeTest({ ...TEST, RESEND_API_KEY: '<dedicated test key>', NEXT_PUBLIC_APP_URL: 'https://example.vercel.app', E2E_OWNER_EMAIL: 'admin@e2e.example' })
    const msg = problemsOf(() => G.loadTestEnv({ inherited: shell(), root: wt }))
    expect(msg).toMatch(/RESEND_API_KEY is empty or still a placeholder/)
    expect(msg).toMatch(/must be http:\/\/localhost/)
    expect(msg).toMatch(/two different inboxes/)
    writeTest(TEST)
  })
})

describe('claims E2E Resend recipient allowlist', () => {
  const reached: string[] = []
  let savedFetch: typeof fetch
  let check: (input: any, init?: any) => Promise<string | null>
  const E = 'https://api.resend.com/emails', B = 'https://api.resend.com/emails/batch'
  const enc = (o: unknown) => new TextEncoder().encode(JSON.stringify(o))

  beforeAll(async () => {
    savedFetch = globalThis.fetch
    globalThis.fetch = (async (input: any) => { reached.push(typeof input === 'string' ? input : input.url ?? String(input)); return new Response('{"id":"ok"}') }) as typeof fetch
    process.env.CLAIMS_E2E_ALLOWED_RECIPIENTS = 'admin@e2e.example,owner@e2e.example'
    check = (await import(/* @vite-ignore */ path.join(KIT, 'resend-allowlist.mjs'))).checkResendRequest
  })
  afterAll(() => { globalThis.fetch = savedFetch; delete process.env.CLAIMS_E2E_ALLOWED_RECIPIENTS })

  const outsider = { to: 'student@real.example' }
  it.each([
    ['string', () => [E, { method: 'POST', body: JSON.stringify(outsider) }]],
    ['Buffer', () => [E, { method: 'POST', body: Buffer.from(JSON.stringify(outsider)) }]],
    ['Uint8Array', () => [E, { method: 'POST', body: enc(outsider) }]],
    ['ArrayBuffer', () => [E, { method: 'POST', body: enc(outsider).buffer }]],
    ['DataView', () => [E, { method: 'POST', body: new DataView(enc(outsider).buffer) }]],
    ['Blob', () => [E, { method: 'POST', body: new Blob([JSON.stringify(outsider)]) }]],
    ['Request with string body', () => [new Request(E, { method: 'POST', body: JSON.stringify(outsider) })]],
    ['Request with Uint8Array body', () => [new Request(E, { method: 'POST', body: enc(outsider) })]],
    ['batch (one outsider among allowed)', () => [B, { method: 'POST', body: Buffer.from(JSON.stringify([{ to: 'admin@e2e.example' }, outsider])) }]],
    ['cc', () => [E, { method: 'POST', body: enc({ to: 'admin@e2e.example', cc: ['x@real.example'] }) }]],
    ['bcc as "Name <addr>"', () => [E, { method: 'POST', body: enc({ to: ['owner@e2e.example'], bcc: 'Someone <y@real.example>' }) }]],
  ])('blocks an outside recipient sent as %s — nothing reaches the network', async (_l, args) => {
    const before = reached.length
    const res = await fetch(...(args() as [any, any]))
    expect(res.status).toBe(422)
    expect((await res.json()).message).toMatch(/not sent/)
    expect(reached.length).toBe(before)
  })

  it.each([
    ['ReadableStream', () => new ReadableStream({ start(c) { c.enqueue(enc(outsider)); c.close() } }), /cannot be inspected/],
    ['URLSearchParams', () => new URLSearchParams({ to: 'student@real.example' }), /cannot be inspected/],
    ['FormData', () => { const f = new FormData(); f.set('to', 'x'); return f }, /cannot be inspected/],
    ['invalid JSON', () => '{to:', /not valid JSON/],
    ['invalid UTF-8 bytes', () => new Uint8Array([0xff, 0xfe, 0xfd]), /cannot be inspected/],
    ['no recipients', () => JSON.stringify({ subject: 'x' }), /without recipients/],
  ])('blocks a body it cannot vouch for: %s', async (_l, body, re) => {
    expect(await check(E, { method: 'POST', body: body(), duplex: 'half' })).toMatch(re)
  })

  it('blocks other sending endpoints (broadcasts) and host tricks; lets allowed mail, reads and other hosts through', async () => {
    expect(await check('https://api.resend.com/broadcasts/b1/send', { method: 'POST', body: '{}' })).toMatch(/non-GET Resend call/)
    expect(await check('https://API.RESEND.COM:443/emails', { method: 'POST', body: JSON.stringify(outsider) })).toMatch(/non-test recipient/)
    expect(await check(E, { method: 'POST', body: Buffer.from(JSON.stringify({ to: 'Owner <OWNER@e2e.example>', reply_to: 'requester@real.example' })) })).toBeNull()
    expect(await check(B, { method: 'POST', body: JSON.stringify([{ to: 'admin@e2e.example' }, { to: ['owner@e2e.example'] }]) })).toBeNull()
    expect(await check('https://api.resend.com/emails/abc', { method: 'GET' })).toBeNull()
    expect(await check('https://example.com/emails', { method: 'POST', body: JSON.stringify(outsider) })).toBeNull()

    const before = reached.length
    expect((await fetch(E, { method: 'POST', body: Buffer.from(JSON.stringify({ to: 'admin@e2e.example' })) })).status).toBe(200)
    expect(reached.length).toBe(before + 1)
  })

  it('refuses to load without an allowlist', () => {
    const out = (() => {
      try {
        execFileSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(path.join(KIT, 'resend-allowlist.mjs'))})`], { env: { PATH: process.env.PATH! } as unknown as NodeJS.ProcessEnv, stdio: 'pipe' })
        return 'loaded'
      } catch (e: any) { return String(e.stderr) }
    })()
    expect(out).toMatch(/CLAIMS_E2E_ALLOWED_RECIPIENTS is empty/)
  })
})
