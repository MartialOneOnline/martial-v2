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
    async putPendingRequest(userId, data) {
      if (row && row.status === 'APPLYING') return false
      row = { id: row?.id ?? `r${++seq}`, userId, ...data, attempts: 0, status: 'PENDING', updatedAt: now() }
      return true
    },
    async recordFailedAttempt(id) {
      if (!row || row.id !== id || row.status !== 'PENDING') return null
      row.attempts += 1
      row.updatedAt = now()
      return row.attempts
    },
    async claimForApplying(id, codeHash) {
      if (!row || row.id !== id || row.status !== 'PENDING' || row.codeHash !== codeHash) return false
      row.status = 'APPLYING'
      row.updatedAt = now()
      return true
    },
    async releaseClaim(id) {
      if (row && row.id === id && row.status === 'APPLYING') { row.status = 'PENDING'; row.updatedAt = now() }
    },
    async deleteRequest(id) { if (row?.id === id) row = null },
    async commitEmail(_userId, id, newEmail) {
      if (failCommit.on) throw new Error('db down')
      db.email = newEmail
      if (row?.id === id) row = null
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
})
