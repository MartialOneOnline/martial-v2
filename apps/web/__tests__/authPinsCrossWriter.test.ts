/**
 * Pins shared by every writer of a Supabase Auth user (lib/authPins.ts):
 * the account-merge tool and the verified relay → real email change (PR #59)
 * run against ONE fake Supabase Auth, ONE claim table and ONE pin table.
 * Project Audit re-audit 4: a merge write whose answer never came (KEEP a
 * relay address) must not be undone by — or undo — a later email change.
 */
import { describe, it, expect } from 'vitest'
import {
  runAccountMerge, type AuthAdmin, type AuthPin, type AuthUser, type ClaimStore, type MergeDeps, type PinStore, type SideSummary,
} from '@/lib/accountMerge'
import { makeAuthWriteGuard, relayChangeLocked } from '@/lib/authPins'
import { needsRealEmailStep } from '@/lib/privateRelay'
import {
  requestEmailChange, confirmEmailChange, type AuthEmailApi, type ChangeRow, type EmailChangeDeps, type EmailChangeStore,
} from '@/lib/emailChange'

const RELAY = 'abc123@privaterelay.appleid.com'
const FUTURE = '2126-01-01T00:00:00Z'

function world() {
  const clock = new Date('2026-11-14T10:00:00Z').getTime()
  const now = () => new Date(clock)

  // ── one Supabase Auth ──
  const authUsers: Record<string, AuthUser> = {
    'auth-k': { id: 'auth-k', email: RELAY, providers: ['apple'], lastSignInAt: null, bannedUntil: null },
    'auth-g': { id: 'auth-g', email: 'g@gmail.com', providers: ['google'], lastSignInAt: null, bannedUntil: null },
  }
  const late: (() => void)[] = []
  // Writes matching this predicate time out and are applied later by Supabase.
  let lateIf: ((id: string, attrs: { email?: string; ban_duration?: string }) => boolean) | null = null
  const apply = (id: string, attrs: { email?: string; ban_duration?: string }) => {
    const u = authUsers[id]
    if (!u) return
    if (attrs.email) u.email = attrs.email
    if (attrs.ban_duration === 'none') u.bannedUntil = null
    else if (attrs.ban_duration) u.bannedUntil = FUTURE
  }
  const mergeAuth: AuthAdmin = {
    async getUser(id) { const u = authUsers[id]; return u ? { status: 'found', user: { ...u } } : { status: 'missing' } },
    async updateUser(id, attrs) {
      if (lateIf?.(id, attrs)) { late.push(() => apply(id, attrs)); return { error: 'timed out', uncertain: true } }
      apply(id, attrs)
      return { error: null, uncertain: false }
    },
  }
  const emailAuth: AuthEmailApi = {
    async getEmail(id) { return authUsers[id]?.email ?? null },
    async setEmail(id, email) {
      if (lateIf?.(id, { email })) { late.push(() => apply(id, { email })); throw new Error('timed out') }
      apply(id, { email })
      return { ok: true }
    },
  }

  // ── one claim table, one pin table ──
  const claimRows: Record<string, { attemptId: string; holdUntil: number }> = {}
  const claims: ClaimStore = {
    async acquire(ids, attemptId, holdUntil) {
      const busy = ids.map(id => claimRows[id]).find(c => c && c.holdUntil > clock)
      if (busy) return { ok: false, holdUntil: new Date(busy.holdUntil) }
      for (const id of ids) claimRows[id] = { attemptId, holdUntil: holdUntil.getTime() }
      return { ok: true }
    },
    async release(ids, attemptId) { for (const id of ids) if (claimRows[id]?.attemptId === attemptId) delete claimRows[id] },
  }
  const pinRows: Record<string, AuthPin> = {}
  const pins: PinStore = {
    async get(ids) { return ids.map(id => pinRows[id]).filter((p): p is AuthPin => !!p) },
    async put(pin) { pinRows[pin.authId] ??= pin },
    async remove(authId, attemptId) { if (pinRows[authId]?.attemptId === attemptId) delete pinRows[authId] },
  }
  let seq = 0
  const newAttemptId = () => `attempt-${++seq}`
  const guard = makeAuthWriteGuard(claims, pins, { now, newAttemptId })

  // ── Prisma users (K keeps history; G is the duplicate with a Google login) ──
  const users: Record<string, { email: string; supabaseAuthId: string | null }> = {
    K: { email: RELAY, supabaseAuthId: 'auth-k' },
    G: { email: 'g@gmail.com', supabaseAuthId: 'auth-g' },
  }
  const summary = (id: string): SideSummary | null => users[id] ? {
    id, name: 'Manuel', email: users[id]!.email, phone: null, avatarUrl: null, role: 'STUDENT', schoolId: null,
    deletedAt: null, createdAt: new Date('2026-06-01'), supabaseAuthId: users[id]!.supabaseAuthId, activity: id === 'K' ? 100 : 1,
  } : null
  const mergeDeps: MergeDeps = {
    auth: mergeAuth, claims, pins, now, newAttemptId,
    load: async id => summary(id),
    signedWaiverConflicts: async () => 0,
    async commit(input) {
      const final = input.emailFrom === 'keep' ? users[input.keepId]!.email : users[input.mergeId]!.email
      delete users[input.mergeId]
      users[input.keepId] = { email: final, supabaseAuthId: input.keptAuthId }
      return {}
    },
  }

  // ── PR #59 store over the same users ──
  let row: (ChangeRow & { userId: string }) | null = null
  const store: EmailChangeStore = {
    async getUserEmail(userId) { return users[userId]?.email ?? null },
    async getUserAuthId(userId) { return users[userId]?.supabaseAuthId ?? null },
    async isEmailTaken(email, except) { return Object.entries(users).some(([id, u]) => id !== except && u.email === email) },
    async getRequest() { return row ? { ...row } : null },
    async putPendingRequest(userId, data) { row = { id: 'r1', userId, ...data, attempts: 0, status: 'PENDING', updatedAt: now() }; return 'stored' },
    async recordFailedAttempt() { return null },
    async claimForApplying(id, codeHash) { if (row?.id !== id || row.codeHash !== codeHash || row.status !== 'PENDING') return false; row.status = 'APPLYING'; return true },
    async releaseClaim(id) { if (row?.id === id) row.status = 'PENDING' },
    async deleteRequest(id, status) { if (row?.id !== id || row.status !== status) return false; row = null; return true },
    async commitEmail(userId, id, newEmail) { if (row?.id !== id || row.status !== 'APPLYING') return false; row = null; users[userId]!.email = newEmail; return true },
  }
  const sent: string[] = []
  const emailDeps: EmailChangeDeps = {
    store, auth: emailAuth, guard, secret: 's', now,
    sendCode: async (_to, code) => { sent.push(code); return true },
    generateCode: () => '123456',
  }

  return {
    authUsers, users, pinRows, claimRows, mergeDeps, emailDeps, sent,
    lateWrites: (pred: typeof lateIf) => { lateIf = pred },
    applyLateWrites: () => { late.splice(0).forEach(f => f()) },
    row: () => row,
  }
}

// Merge G into K, keeping G's Google login and K's relay address (the case
// Codex built: the uncertain write is KEEP <relay> on the kept login).
const MERGE = { keepId: 'K', mergeId: 'G', loginFrom: 'merge', emailFrom: 'keep' } as const

describe('merge write never answered (KEEP relay) → user tries PR #59 → late write lands', () => {
  async function mergedWithUncertainKeep() {
    const w = world()
    w.lateWrites((id, a) => id === 'auth-g' && a.email === RELAY)
    expect(await runAccountMerge(w.mergeDeps, MERGE, null)).toMatchObject({ ok: false, status: 502 })
    w.lateWrites(null)
    expect(w.pinRows['auth-g']).toMatchObject({ intent: 'KEEP', email: RELAY })
    expect((await runAccountMerge(w.mergeDeps, MERGE, null)).ok).toBe(true) // agreeing retry completes
    expect(w.users.K).toEqual({ email: RELAY, supabaseAuthId: 'auth-g' })
    return w
  }

  it('the email change is refused before a code is sent, and Auth and Prisma stay aligned after the late write', async () => {
    const w = await mergedWithUncertainKeep()
    const r = await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-g' }, { email: 'real@x.com' })
    expect(r).toEqual({ ok: false, error: 'email_locked' })
    expect(w.sent).toEqual([])
    w.applyLateWrites()
    expect(w.authUsers['auth-g']!.email).toBe(RELAY)
    expect(w.users.K!.email).toBe(RELAY)
    // /my and /complete-profile don't trap the student in a step that can't be completed
    expect(relayChangeLocked(w.pinRows['auth-g']!)).toBe(true)
    expect(needsRealEmailStep(w.users.K!.email, relayChangeLocked(w.pinRows['auth-g']!))).toBe(false)
  })

  it('a code requested before the pin existed can’t be applied either (checked again at confirm)', async () => {
    const w = world()
    w.users.K = { email: RELAY, supabaseAuthId: 'auth-k' }
    expect((await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { email: 'real@x.com' })).ok).toBe(true)
    // Meanwhile a merge writes KEEP <relay> to this login and never hears back.
    w.pinRows['auth-k'] = { authId: 'auth-k', attemptId: 'merge-x', intent: 'KEEP', email: RELAY }
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { code: '123456' })).toEqual({ ok: false, error: 'email_locked' })
    expect(w.authUsers['auth-k']!.email).toBe(RELAY) // Auth untouched
    expect(w.users.K!.email).toBe(RELAY)
    expect(w.row()).toBeNull() // the request is dropped, not left APPLYING
  })
})

describe('the other direction: PR #59 write never answered → a later merge', () => {
  async function uncertainEmailChange() {
    const w = world()
    w.users.K = { email: RELAY, supabaseAuthId: 'auth-k' }
    await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { email: 'real@x.com' })
    w.lateWrites((id, a) => id === 'auth-k' && a.email === 'real@x.com')
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { code: '123456' })).toEqual({ ok: false, error: 'update_failed' })
    w.lateWrites(null)
    expect(w.pinRows['auth-k']).toMatchObject({ intent: 'KEEP', email: 'real@x.com' })
    return w
  }

  it('a merge that would retire that login or give it another email is refused', async () => {
    const w = await uncertainEmailChange()
    // Keep G's login → retire auth-k: refused
    expect(await runAccountMerge(w.mergeDeps, MERGE, null)).toMatchObject({ ok: false, status: 409 })
    // Keep auth-k but with G's email: refused
    expect(await runAccountMerge(w.mergeDeps, { ...MERGE, loginFrom: 'keep', emailFrom: 'merge' }, null)).toMatchObject({ ok: false, status: 409 })
    expect(w.authUsers['auth-k']).toMatchObject({ email: RELAY, bannedUntil: null })
    w.applyLateWrites()
    expect(w.authUsers['auth-k']!.email).toBe('real@x.com')
  })
})

describe('makeAuthWriteGuard', () => {
  it('is busy while a merge holds the user, and the confirm leaves the code usable', async () => {
    const w = world()
    w.users.K = { email: RELAY, supabaseAuthId: 'auth-k' }
    await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { email: 'real@x.com' })
    w.claimRows.K = { attemptId: 'merge-running', holdUntil: Date.parse(FUTURE) }
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { code: '123456' })).toEqual({ ok: false, error: 'busy' })
    expect(w.row()?.status).toBe('PENDING')
    expect(w.authUsers['auth-k']!.email).toBe(RELAY)
  })

  it('a clean email change leaves no pin and no claim', async () => {
    const w = world()
    w.users.K = { email: RELAY, supabaseAuthId: 'auth-k' }
    await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { email: 'real@x.com' })
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { code: '123456' })).toEqual({ ok: true, email: 'real@x.com' })
    expect(w.pinRows).toEqual({})
    expect(w.claimRows).toEqual({})
  })

  it('an uncertain pin of its own is never cleared by a later write of the same attempt', async () => {
    const w = world()
    const g = await makeAuthWriteGuard(
      { acquire: async () => ({ ok: true }), release: async () => {} },
      { get: async ids => ids.map(id => w.pinRows[id]).filter((p): p is AuthPin => !!p), put: async p => { w.pinRows[p.authId] ??= p }, remove: async (a, t) => { if (w.pinRows[a]?.attemptId === t) delete w.pinRows[a] } },
      { newAttemptId: () => 't1' },
    ).begin('K', 'auth-k')
    if (!g.ok) throw new Error('busy')
    expect(await g.handle.beforeWrite({ intent: 'KEEP', email: 'a@x.com' })).toBe(true)
    await g.handle.afterWrite(true) // unknown outcome
    expect(await g.handle.beforeWrite({ intent: 'KEEP', email: 'b@x.com' })).toBe(false) // disagrees with its own pending write
    expect(await g.handle.beforeWrite({ intent: 'KEEP', email: 'a@x.com' })).toBe(true)
    await g.handle.afterWrite(false)
    expect(w.pinRows['auth-k']).toMatchObject({ email: 'a@x.com' }) // still guarding the first write
  })
})

describe('Project Audit re-audit 5: a merge between requesting the code and confirming it', () => {
  it('the confirm from the old login writes nothing (account_changed); the kept login can then finish it', async () => {
    const w = world()
    // Code requested by K, signed in with its own Apple login.
    expect((await requestEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { email: 'real@x.com' })).ok).toBe(true)
    // An admin merges G into K, keeping G's Google login (K's login is retired).
    expect((await runAccountMerge(w.mergeDeps, MERGE, null)).ok).toBe(true)
    expect(w.users.K).toEqual({ email: RELAY, supabaseAuthId: 'auth-g' })
    const gBefore = { ...w.authUsers['auth-g']! }
    const kBefore = { ...w.authUsers['auth-k']! }

    // The old session confirms: nothing is written anywhere.
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-k' }, { code: '123456' })).toEqual({ ok: false, error: 'account_changed' })
    expect(w.authUsers['auth-g']).toEqual(gBefore)
    expect(w.authUsers['auth-k']).toEqual(kBefore) // the retired login is not touched
    expect(w.users.K!.email).toBe(RELAY)
    expect(w.row()?.status).toBe('PENDING') // recoverable

    // Signed in again with the kept login, the same code completes it: Auth = Prisma.
    expect(await confirmEmailChange(w.emailDeps, { id: 'K', authId: 'auth-g' }, { code: '123456' })).toEqual({ ok: true, email: 'real@x.com' })
    expect(w.authUsers['auth-g']!.email).toBe('real@x.com')
    expect(w.users.K!.email).toBe('real@x.com')
  })

  it('a merge can’t start while a confirm holds the user', async () => {
    const w = world()
    const g = await makeAuthWriteGuard(
      { acquire: async (ids, a, until) => w.mergeDeps.claims.acquire(ids, a, until), release: async (ids, a) => w.mergeDeps.claims.release(ids, a) },
      w.mergeDeps.pins,
    ).begin('K', 'auth-k')
    expect(g.ok).toBe(true)
    expect(await runAccountMerge(w.mergeDeps, MERGE, null)).toMatchObject({ ok: false, status: 409 })
    if (g.ok) await g.handle.release()
    expect((await runAccountMerge(w.mergeDeps, MERGE, null)).ok).toBe(true)
  })
})
