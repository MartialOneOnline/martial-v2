/**
 * lib/emailChange.ts — Apple relay email -> real email, confirmed by code.
 * Covers Project Audit on 27284ff: no change without the code (P1),
 * concurrent changes keep Auth and Prisma equal (P2), a failed rollback
 * (thrown or returned { error }) is recoverable (P2).
 */
import { describe, it, expect, vi } from 'vitest'
import {
  confirmEmailChange,
  requestEmailChange,
  reconcileEmailChange,
  CODE_TTL_MS,
  MAX_CODE_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  STALE_APPLYING_MS,
  AUTH_TIMEOUT_MS,
  ROUTE_MAX_DURATION_S,
  type AuthEmailApi,
  type ChangeRow,
  type EmailChangeDeps,
  type EmailChangeStore,
} from '@/lib/emailChange'

const RELAY = 'abc123@privaterelay.appleid.com'
const USER = { id: 'u1', authId: 'auth-1' }

function world(opts: { dbEmail?: string; otherEmails?: string[] } = {}) {
  let clock = new Date('2026-11-09T10:00:00Z').getTime()
  const db = { email: opts.dbEmail ?? RELAY }
  const others = new Set(opts.otherEmails ?? [])
  let row: (ChangeRow & { userId: string }) | null = null
  let seq = 0
  const failCommit = { on: false }
  const now = () => new Date(clock)

  // Each method does its check-and-write synchronously, like one SQL statement.
  const store: EmailChangeStore = {
    async getUserEmail() { return db.email },
    async isEmailTaken(email) { return others.has(email) },
    async getRequest() { return row ? { ...row } : null },
    async putPendingRequest(userId, data, cooldownBefore) {
      if (row && row.status === 'APPLYING') return 'busy'
      if (row && row.updatedAt.getTime() > cooldownBefore.getTime()) return 'too_soon'
      row = { id: row?.id ?? `r${++seq}`, userId, ...data, attempts: 0, status: 'PENDING', updatedAt: now() }
      return 'stored'
    },
    async recordFailedAttempt(id, codeHash) {
      if (!row || row.id !== id || row.status !== 'PENDING' || row.codeHash !== codeHash) return null
      row.attempts += 1
      row.updatedAt = now()
      return row.attempts
    },
    async claimForApplying(id, codeHash, maxAttempts) {
      if (!row || row.id !== id || row.status !== 'PENDING' || row.codeHash !== codeHash || row.attempts >= maxAttempts) return false
      row.status = 'APPLYING'
      row.updatedAt = now()
      return true
    },
    async releaseClaim(id, codeHash) {
      if (row && row.id === id && row.status === 'APPLYING' && row.codeHash === codeHash) { row.status = 'PENDING'; row.updatedAt = now() }
    },
    async deleteRequest(id, status, codeHash) {
      if (row?.id !== id || row.status !== status || row.codeHash !== codeHash) return false
      row = null
      return true
    },
    async commitEmail(_userId, id, newEmail) {
      if (failCommit.on) throw new Error('db down')
      if (row?.id !== id || row.status !== 'APPLYING') return false
      row = null
      db.email = newEmail
      return true
    },
  }

  const authState = { email: db.email }
  const auth = {
    getEmail: vi.fn<AuthEmailApi['getEmail']>(async () => authState.email),
    setEmail: vi.fn<AuthEmailApi['setEmail']>(async (_id, email) => { authState.email = email; return { ok: true } }),
  } satisfies AuthEmailApi

  const sent: { to: string; code: string }[] = []
  let nextCode = 100000
  const deps: EmailChangeDeps = {
    store,
    auth,
    sendCode: async (to, code) => { sent.push({ to, code }); return true },
    secret: 'test-secret',
    now,
    generateCode: () => String(nextCode++),
  }

  return {
    deps, db, authState, auth, sent, failCommit,
    row: () => row,
    advance: (ms: number) => { clock += ms },
  }
}

describe('requestEmailChange', () => {
  it('sends a code to the new address and changes nothing yet (P1)', async () => {
    const w = world()
    const r = await requestEmailChange(w.deps, USER, { email: '  Hugo@Gmail.com ', lang: 'es' })
    expect(r).toMatchObject({ ok: true, email: 'hugo@gmail.com' })
    expect(w.sent).toEqual([{ to: 'hugo@gmail.com', code: '100000' }])
    expect(w.db.email).toBe(RELAY)
    expect(w.authState.email).toBe(RELAY)
    expect(w.auth.setEmail).not.toHaveBeenCalled()
  })

  it('only works for relay accounts, and only towards a real, free address', async () => {
    expect(await requestEmailChange(world({ dbEmail: 'hugo@gmail.com' }).deps, USER, { email: 'x@y.com' }))
      .toEqual({ ok: false, error: 'not_relay' })
    expect(await requestEmailChange(world({ dbEmail: 'x@privaterelay.appleid.com.evil.io' }).deps, USER, { email: 'x@y.com' }))
      .toEqual({ ok: false, error: 'not_relay' })
    expect(await requestEmailChange(world().deps, USER, { email: 'other@privaterelay.appleid.com' }))
      .toEqual({ ok: false, error: 'invalid_email' })
    expect(await requestEmailChange(world().deps, USER, { email: 'not-an-email' }))
      .toEqual({ ok: false, error: 'invalid_email' })
    expect(await requestEmailChange(world({ otherEmails: ['taken@x.com'] }).deps, USER, { email: 'taken@x.com' }))
      .toEqual({ ok: false, error: 'email_taken' })
  })

  it('enforces a cooldown between codes', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    expect(await requestEmailChange(w.deps, USER, { email: 'a@x.com' })).toEqual({ ok: false, error: 'too_soon' })
    w.advance(RESEND_COOLDOWN_MS)
    expect(await requestEmailChange(w.deps, USER, { email: 'a@x.com' })).toMatchObject({ ok: true })
  })
})

describe('confirmEmailChange', () => {
  it('applies the change to Auth and the DB with the right code', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    const r = await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })
    expect(r).toEqual({ ok: true, email: 'a@x.com' })
    expect(w.db.email).toBe('a@x.com')
    expect(w.authState.email).toBe('a@x.com')
    expect(w.row()).toBeNull()
  })

  it('rejects wrong codes and gives up after the maximum attempts', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) {
      expect(await confirmEmailChange(w.deps, USER, { code: '999999' })).toEqual({ ok: false, error: 'invalid_code' })
    }
    expect(await confirmEmailChange(w.deps, USER, { code: '999999' })).toEqual({ ok: false, error: 'too_many_attempts' })
    expect(w.row()).toBeNull()
    // Even the right code is useless now.
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'no_pending' })
    expect(w.db.email).toBe(RELAY)
  })

  it('rejects an expired code', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.advance(CODE_TTL_MS)
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'code_expired' })
    expect(w.db.email).toBe(RELAY)
  })

  it('a newer request replaces the older code (A then B)', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.advance(RESEND_COOLDOWN_MS)
    await requestEmailChange(w.deps, USER, { email: 'b@x.com' })
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'invalid_code' })
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[1]!.code })).toEqual({ ok: true, email: 'b@x.com' })
    expect(w.db.email).toBe('b@x.com')
    expect(w.authState.email).toBe('b@x.com')
  })

  it('concurrent confirms: one wins, Auth and the DB end up equal (P2)', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'b@x.com' })
    const code = w.sent[0]!.code
    // Hold the first Auth write so both confirms overlap.
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    w.auth.setEmail.mockImplementationOnce(async (_id, email) => { await gate; w.authState.email = email; return { ok: true } })

    // Started together: both read the PENDING row before either claims it,
    // so only the conditional PENDING -> APPLYING update stops the second.
    const both = Promise.all([
      confirmEmailChange(w.deps, USER, { code }),
      confirmEmailChange(w.deps, USER, { code }),
    ])
    await new Promise(r => setTimeout(r, 0))
    release()
    const results = await both

    expect(results).toContainEqual({ ok: true, email: 'b@x.com' })
    expect(results).toContainEqual({ ok: false, error: 'busy' })
    expect(w.auth.setEmail).toHaveBeenCalledTimes(1)
    expect(w.db.email).toBe('b@x.com')
    expect(w.authState.email).toBe('b@x.com')
  })

  it('a new request cannot replace a change that is being applied', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    w.auth.setEmail.mockImplementationOnce(async (_id, email) => { await gate; w.authState.email = email; return { ok: true } })

    const confirming = confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })
    await new Promise(r => setTimeout(r, 0))
    w.advance(RESEND_COOLDOWN_MS)
    expect(await requestEmailChange(w.deps, USER, { email: 'b@x.com' })).toEqual({ ok: false, error: 'busy' })
    release()
    expect(await confirming).toEqual({ ok: true, email: 'a@x.com' })
    expect(w.db.email).toBe('a@x.com')
    expect(w.authState.email).toBe('a@x.com')
  })

  it('Auth refusing (returned error) changes nothing and keeps the code usable', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.auth.setEmail.mockResolvedValueOnce({ ok: false, taken: true })
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'email_taken' })
    expect(w.db.email).toBe(RELAY)
    expect(w.authState.email).toBe(RELAY)
    expect(w.row()?.status).toBe('PENDING')
  })

  it('DB failure with a successful revert leaves both on the old email', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.failCommit.on = true
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'update_failed' })
    expect(w.authState.email).toBe(RELAY)
    expect(w.db.email).toBe(RELAY)
    expect(w.row()?.status).toBe('PENDING')
  })

  it.each([
    ['returned { error }', (async () => ({ ok: false, taken: false })) as AuthEmailApi['setEmail']],
    ['thrown error', (async () => { throw new Error('auth down') }) as AuthEmailApi['setEmail']],
  ])('DB failure with a failed revert (%s) is repaired by reconcile (P2)', async (_label, revert) => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.failCommit.on = true
    w.auth.setEmail
      .mockImplementationOnce(async (_id, email) => { w.authState.email = email; return { ok: true } })
      .mockImplementationOnce(revert)

    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'update_failed' })
    expect(w.authState.email).toBe('a@x.com')
    expect(w.db.email).toBe(RELAY)
    expect(w.row()?.status).toBe('APPLYING')

    // Too fresh to touch: it may still be in progress.
    w.failCommit.on = false
    await reconcileEmailChange(w.deps, USER)
    expect(w.db.email).toBe(RELAY)

    w.advance(STALE_APPLYING_MS)
    await reconcileEmailChange(w.deps, USER)
    expect(w.db.email).toBe('a@x.com')
    expect(w.authState.email).toBe('a@x.com')
    expect(w.row()).toBeNull()
  })

  it('reconcile drops a stale APPLYING row when Auth kept the old email', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.auth.setEmail.mockImplementationOnce(() => new Promise(() => {})) // request dies here
    void confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })
    await new Promise(r => setTimeout(r, 0))
    expect(w.row()?.status).toBe('APPLYING')

    w.advance(STALE_APPLYING_MS)
    await reconcileEmailChange(w.deps, USER)
    expect(w.row()).toBeNull()
    expect(w.db.email).toBe(RELAY)
    expect(w.authState.email).toBe(RELAY)
  })

  it('refuses if the account stopped being a relay account meanwhile', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.db.email = 'changed-by-support@x.com'
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'not_relay' })
    expect(w.auth.setEmail).not.toHaveBeenCalled()
  })

  // ── Project Audit on 3428d88 ────────────────────────────────────────────
  it('a wrong code reaching the 5th attempt cannot delete a row another confirm is applying', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    const good = w.sent[0]!.code
    for (let i = 1; i < MAX_CODE_ATTEMPTS - 1; i++) await confirmEmailChange(w.deps, USER, { code: '999999' })
    // 3 failures so far. Hold the good confirm inside Auth, after its claim.
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    w.auth.setEmail.mockImplementationOnce(async (_id, email) => { await gate; w.authState.email = email; return { ok: true } })
    const applying = confirmEmailChange(w.deps, USER, { code: good })
    await new Promise(r => setTimeout(r, 0))
    expect(w.row()?.status).toBe('APPLYING')

    // A 4th and 5th wrong code meanwhile: the row is APPLYING, not theirs.
    await confirmEmailChange(w.deps, USER, { code: '999999' })
    await confirmEmailChange(w.deps, USER, { code: '999999' })
    expect(w.row()?.status).toBe('APPLYING')
    w.advance(RESEND_COOLDOWN_MS)
    expect(await requestEmailChange(w.deps, USER, { email: 'b@x.com' })).toEqual({ ok: false, error: 'busy' })

    release()
    expect(await applying).toEqual({ ok: true, email: 'a@x.com' })
    expect(w.db.email).toBe('a@x.com')
    expect(w.authState.email).toBe('a@x.com')
  })

  it('the claim fails once the attempts ran out between reading and claiming', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    for (let i = 1; i < MAX_CODE_ATTEMPTS; i++) await confirmEmailChange(w.deps, USER, { code: '999999' })
    // 4 failures. The good confirm reads the row, then a 5th failure lands
    // before its claim.
    // getRequest call 1 is reconcile's, call 2 is the confirm's own read.
    const realGet = w.deps.store.getRequest
    let calls = 0
    w.deps.store.getRequest = async (uid) => {
      const r = await realGet(uid)
      if (++calls === 2 && r) await w.deps.store.recordFailedAttempt(r.id, r.codeHash)
      return r
    }
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'too_many_attempts' })
    expect(w.auth.setEmail).not.toHaveBeenCalled()
    expect(w.db.email).toBe(RELAY)
  })

  it('a lost Auth response that did apply is detected and committed (no split)', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.auth.setEmail.mockImplementationOnce(async (_id, email) => { w.authState.email = email; throw new Error('socket hang up') })
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: true, email: 'a@x.com' })
    expect(w.db.email).toBe('a@x.com')
    expect(w.authState.email).toBe('a@x.com')
    expect(w.row()).toBeNull()
  })

  it('a thrown Auth call that may still land keeps the lock until reconcile settles it', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.auth.setEmail.mockImplementationOnce(async () => { throw new Error('timeout') })
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'update_failed' })
    expect(w.row()?.status).toBe('APPLYING') // not released

    // The write lands late on Supabase's side.
    w.authState.email = 'a@x.com'
    w.advance(STALE_APPLYING_MS)
    await reconcileEmailChange(w.deps, USER)
    expect(w.db.email).toBe('a@x.com')
    expect(w.row()).toBeNull()
  })

  it('a late attempt cannot write the DB after reconcile settled its row, and reverts Auth', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    w.auth.setEmail.mockImplementationOnce(async (_id, email) => { await gate; w.authState.email = email; return { ok: true } })
    const late = confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })
    await new Promise(r => setTimeout(r, 0))

    w.advance(STALE_APPLYING_MS)
    await reconcileEmailChange(w.deps, USER) // Auth still old: drops the row
    expect(w.row()).toBeNull()

    release()
    expect(await late).toEqual({ ok: false, error: 'update_failed' })
    expect(w.db.email).toBe(RELAY)
    expect(w.authState.email).toBe(RELAY)
  })

  it('an attempt cannot outlive STALE_APPLYING_MS (route maxDuration + Auth timeout)', async () => {
    expect(ROUTE_MAX_DURATION_S * 1000 + AUTH_TIMEOUT_MS).toBeLessThan(STALE_APPLYING_MS)
    const { readFileSync } = await import('node:fs')
    for (const f of ['app/api/my/email/route.ts', 'app/api/my/email/confirm/route.ts']) {
      expect(readFileSync(f, 'utf8'), f).toContain(`export const maxDuration = ${ROUTE_MAX_DURATION_S}`)
    }
  })
})

describe('resend cooldown under concurrency', () => {
  it('two simultaneous resends: only one stores and sends a code', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.advance(RESEND_COOLDOWN_MS)
    const results = await Promise.all([
      requestEmailChange(w.deps, USER, { email: 'b@x.com' }),
      requestEmailChange(w.deps, USER, { email: 'c@x.com' }),
    ])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(results).toContainEqual({ ok: false, error: 'too_soon' })
    expect(w.sent).toHaveLength(2) // the first request + one resend
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[1]!.code })).toMatchObject({ ok: true })
  })
})

// ── Project Audit on ecb927e ────────────────────────────────────────────────
describe('code generations', () => {
  it('an old (expired) confirm cannot delete the code that replaced it', async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    w.advance(CODE_TTL_MS) // first code expired

    // Hold the old confirm's delete; meanwhile a new code replaces the row.
    const realDelete = w.deps.store.deleteRequest
    let release!: () => void
    const gate = new Promise<void>(r => { release = r })
    w.deps.store.deleteRequest = async (...args) => { await gate; return realDelete(...args) }
    const old = confirmEmailChange(w.deps, USER, { code: w.sent[0]!.code })
    await new Promise(r => setTimeout(r, 0))
    w.deps.store.deleteRequest = realDelete

    expect(await requestEmailChange(w.deps, USER, { email: 'b@x.com' })).toMatchObject({ ok: true })
    release()
    expect(await old).toEqual({ ok: false, error: 'code_expired' })

    expect(w.row()?.newEmail).toBe('b@x.com')
    expect(await confirmEmailChange(w.deps, USER, { code: w.sent[1]!.code })).toEqual({ ok: true, email: 'b@x.com' })
  })

  it("an old confirm's wrong code does not count against the new code", async () => {
    const w = world()
    await requestEmailChange(w.deps, USER, { email: 'a@x.com' })
    const row = w.row()!
    w.advance(RESEND_COOLDOWN_MS)
    await requestEmailChange(w.deps, USER, { email: 'b@x.com' })
    expect(await w.deps.store.recordFailedAttempt(row.id, row.codeHash)).toBeNull()
    expect(w.row()?.attempts).toBe(0)
  })
})

// ── Real Supabase SDK, simulated network ────────────────────────────────────
vi.mock('@/lib/db', () => ({ prisma: {} }))

describe('supabaseAuthEmailApi (real @supabase/supabase-js)', () => {
  const URL_ = 'https://audit.supabase.co'
  const AUTH_ID = '11111111-1111-4111-8111-111111111111'
  const SDK_USER = { id: 'u1', authId: AUTH_ID }
  function user(email: string) {
    return { id: AUTH_ID, aud: 'authenticated', email, app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  }
  async function adapter() {
    process.env.NEXT_PUBLIC_SUPABASE_URL = URL_
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test'
    const { supabaseAuthEmailApi } = await import('@/lib/emailChangeStore')
    return supabaseAuthEmailApi()
  }

  it('a lost response (SDK returns AuthRetryableFetchError) throws instead of reporting a refusal', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed') }))
    try {
      const auth = await adapter()
      await expect(auth.setEmail(AUTH_ID, 'a@x.com')).rejects.toBeTruthy()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('a 5xx is unknown too; a 422 "already registered" is a definite refusal', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ msg: 'upstream' }), { status: 502 })))
      await expect((await adapter()).setEmail(AUTH_ID, 'a@x.com')).rejects.toBeTruthy()

      vi.stubGlobal('fetch', vi.fn(async () => new Response(
        JSON.stringify({ code: 422, error_code: 'email_exists', msg: 'A user with this email address has already been registered' }),
        { status: 422, headers: { 'content-type': 'application/json' } },
      )))
      expect(await (await adapter()).setEmail(AUTH_ID, 'a@x.com')).toEqual({ ok: false, taken: true })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('end to end: Auth applies the email, the response is lost, the change is committed (no split)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let authEmail = RELAY
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'PUT') {
        authEmail = JSON.parse(String(init?.body)).email
        throw new TypeError('socket hang up') // applied, but the answer never arrives
      }
      return new Response(JSON.stringify(user(authEmail)), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    try {
      const w = world()
      w.deps.auth = await adapter()
      await requestEmailChange(w.deps, SDK_USER, { email: 'a@x.com' })
      expect(await confirmEmailChange(w.deps, SDK_USER, { code: w.sent[0]!.code })).toEqual({ ok: true, email: 'a@x.com' })
      expect(authEmail).toBe('a@x.com')
      expect(w.db.email).toBe('a@x.com')
      expect(w.row()).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('end to end: lost response and Auth still old -> lock kept for reconcile, never released to PENDING', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET').toUpperCase() === 'PUT') throw new TypeError('fetch failed')
      return new Response(JSON.stringify(user(RELAY)), { status: 200, headers: { 'content-type': 'application/json' } })
    }))
    try {
      const w = world()
      w.deps.auth = await adapter()
      await requestEmailChange(w.deps, SDK_USER, { email: 'a@x.com' })
      expect(await confirmEmailChange(w.deps, SDK_USER, { code: w.sent[0]!.code })).toEqual({ ok: false, error: 'update_failed' })
      expect(w.row()?.status).toBe('APPLYING')
      expect(w.db.email).toBe(RELAY)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
