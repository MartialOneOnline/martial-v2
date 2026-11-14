import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { AuthWriteGuard, AuthWriteHandle } from './authPins'
import { isApplePrivateRelayEmail } from './privateRelay'

// Swapping an Apple "Hide My Email" relay address for a real one, verified
// with a 6-digit code sent to the new address. Only for relay accounts:
// every other email change stays admin/support-only.
//
// Consistency rules (Project Audit on 27284ff and 3428d88):
// - One EmailChangeRequest row per user. Moving it PENDING -> APPLYING with
//   a conditional update is the per-user lock: of two concurrent confirms,
//   only one gets it, and a new request can't replace an APPLYING row.
// - Every write is conditional on the state it expects: a confirm with a
//   wrong code can only delete a PENDING row, never the APPLYING one another
//   confirm owns; the claim also requires attempts < MAX_CODE_ATTEMPTS; the
//   resend cooldown is part of the replacing update itself.
// - Auth is updated first, then Prisma. A Supabase error response means
//   nothing changed; a thrown error (lost response) means "unknown", so Auth
//   is read back before releasing the lock. If Prisma fails, Auth is
//   reverted; if the outcome can't be established, the row stays APPLYING
//   and reconcileEmailChange() aligns Prisma with Auth later.
// - Reconcile only touches rows older than STALE_APPLYING_MS, which is far
//   longer than an attempt can live (route maxDuration + AUTH_TIMEOUT_MS), and
//   commitEmail() only writes users.email while the APPLYING row still
//   exists, so a late attempt can't overwrite a repaired state.
// - Nothing becomes the account's email until the code is confirmed.

export const CODE_TTL_MS = 15 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
// An APPLYING row older than this belongs to a request that died midway.
export const STALE_APPLYING_MS = 2 * 60 * 1000
// Every Supabase Auth admin call is cut off after this (lib/emailChangeStore.ts),
// and the routes set maxDuration = 30 s: both well under STALE_APPLYING_MS.
export const AUTH_TIMEOUT_MS = 10 * 1000
export const ROUTE_MAX_DURATION_S = 30

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type EmailChangeError =
  | 'invalid_email'
  | 'not_relay'
  | 'email_taken'
  | 'too_soon'
  | 'send_failed'
  | 'no_pending'
  | 'code_expired'
  | 'invalid_code'
  | 'too_many_attempts'
  | 'busy'
  | 'update_failed'
  // An earlier account-merge write to this login never got an answer and
  // would set another email; changing it now could be undone later.
  | 'email_locked'
  // The account's login changed since this session started (an admin merged
  // accounts): nothing was written; sign in again and retry.
  | 'account_changed'

export type ChangeRow = {
  id: string
  newEmail: string
  codeHash: string
  attempts: number
  status: 'PENDING' | 'APPLYING'
  expiresAt: Date
  updatedAt: Date
}

// Storage operations, implemented over Prisma in lib/emailChangeStore.ts and
// in memory by the tests. Each one is a single atomic statement (or one
// transaction), conditional on the state it expects.
export interface EmailChangeStore {
  getUserEmail(userId: string): Promise<string | null>
  // users.supabaseAuthId (null if the row is gone or unlinked)
  getUserAuthId(userId: string): Promise<string | null>
  isEmailTaken(email: string, exceptUserId: string): Promise<boolean>
  getRequest(userId: string): Promise<ChangeRow | null>
  // Create a row, or replace a PENDING one last written at or before
  // `cooldownBefore`. 'too_soon': a newer PENDING row exists; 'busy': APPLYING.
  putPendingRequest(
    userId: string,
    data: { newEmail: string; codeHash: string; expiresAt: Date },
    cooldownBefore: Date,
  ): Promise<'stored' | 'too_soon' | 'busy'>
  // Every operation on an existing row also names the code generation it
  // read (codeHash): a request replaces the row in place, keeping its id, so
  // id + status alone can't tell an old confirm from the new code.
  //
  // Adds one failed attempt to this PENDING row; returns the new count, or
  // null if the row changed meanwhile.
  recordFailedAttempt(requestId: string, codeHash: string): Promise<number | null>
  // PENDING -> APPLYING only if the row is still this one, with this code and
  // fewer than maxAttempts failed attempts.
  claimForApplying(requestId: string, codeHash: string, maxAttempts: number): Promise<boolean>
  // APPLYING -> PENDING after a failure that changed nothing.
  releaseClaim(requestId: string, codeHash: string): Promise<void>
  // Deletes the row only if it is still in `status`, with this code.
  deleteRequest(requestId: string, status: 'PENDING' | 'APPLYING', codeHash: string): Promise<boolean>
  // One transaction: delete the APPLYING row and set users.email. Writes
  // nothing and returns false if the row is no longer APPLYING.
  commitEmail(userId: string, requestId: string, newEmail: string): Promise<boolean>
}

export interface AuthEmailApi {
  getEmail(authId: string): Promise<string | null>
  // { ok: false } only when Auth answered and refused (nothing changed).
  // Anything that leaves the outcome unknown — network failure, lost
  // response, timeout, 5xx, including the SDK's returned
  // AuthRetryableFetchError — must throw, so the caller reads Auth back.
  setEmail(authId: string, email: string): Promise<{ ok: true } | { ok: false; taken: boolean }>
}

export type EmailChangeDeps = {
  store: EmailChangeStore
  auth: AuthEmailApi
  // Claims + pins shared with the account-merge tool (lib/authPins.ts).
  // Always set in production (emailChangeDeps()).
  guard?: AuthWriteGuard
  sendCode: (to: string, code: string, lang: string | null) => Promise<boolean>
  secret: string
  now?: () => Date
  generateCode?: () => string
  log?: (msg: string, err?: unknown) => void
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: EmailChangeError }

export function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function hashCode(secret: string, userId: string, email: string, code: string): string {
  return createHmac('sha256', secret).update(`${userId}:${email}:${code}`).digest('hex')
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, 'hex')
  const y = Buffer.from(b, 'hex')
  return x.length === y.length && timingSafeEqual(x, y)
}

const defaultCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

// Repairs an APPLYING row left by a request that failed midway: Auth is the
// source of truth for login, so Prisma follows whatever Auth has.
export async function reconcileEmailChange(
  deps: EmailChangeDeps,
  user: { id: string; authId: string },
  opts: { force?: boolean } = {},
): Promise<void> {
  try {
    await reconcile(deps, user, opts)
  } catch (err) {
    // Never block the user's request over a repair that can run next time.
    deps.log?.('[emailChange] reconcile failed', err)
  }
}

async function reconcile(
  deps: EmailChangeDeps,
  user: { id: string; authId: string },
  opts: { force?: boolean },
): Promise<void> {
  const now = (deps.now ?? (() => new Date()))()
  const row = await deps.store.getRequest(user.id)
  if (!row || row.status !== 'APPLYING') return
  // Younger rows may still belong to a live attempt.
  if (!opts.force && now.getTime() - row.updatedAt.getTime() < STALE_APPLYING_MS) return

  const authEmail = normalizeEmail(await deps.auth.getEmail(user.authId))
  const dbEmail = normalizeEmail(await deps.store.getUserEmail(user.id))
  if (authEmail && authEmail === row.newEmail) {
    if (dbEmail !== row.newEmail) await deps.store.commitEmail(user.id, row.id, row.newEmail)
    else await deps.store.deleteRequest(row.id, 'APPLYING', row.codeHash)
  } else if (authEmail && authEmail === dbEmail) {
    await deps.store.deleteRequest(row.id, 'APPLYING', row.codeHash)
  } else {
    deps.log?.('[emailChange] cannot reconcile: Auth and DB disagree with the request', { userId: user.id })
  }
}

export async function requestEmailChange(
  deps: EmailChangeDeps,
  user: { id: string; authId: string },
  input: { email: unknown; lang?: string | null },
): Promise<Result<{ email: string; expiresAt: Date }>> {
  const now = (deps.now ?? (() => new Date()))()
  const newEmail = normalizeEmail(input.email)
  if (!EMAIL_RE.test(newEmail) || isApplePrivateRelayEmail(newEmail)) return { ok: false, error: 'invalid_email' }

  await reconcileEmailChange(deps, user)
  const current = await deps.store.getUserEmail(user.id)
  if (!isApplePrivateRelayEmail(current)) return { ok: false, error: 'not_relay' }
  if (await deps.store.isEmailTaken(newEmail, user.id)) return { ok: false, error: 'email_taken' }
  // Don't send a code that could never be applied.
  if (await deps.guard?.conflicts(user.authId, { intent: 'KEEP', email: newEmail })) return { ok: false, error: 'email_locked' }

  // The cooldown is checked by the replacing update itself, so of two
  // concurrent resends only one stores (and sends) a code.
  const code = (deps.generateCode ?? defaultCode)()
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS)
  const stored = await deps.store.putPendingRequest(
    user.id,
    { newEmail, codeHash: hashCode(deps.secret, user.id, newEmail, code), expiresAt },
    new Date(now.getTime() - RESEND_COOLDOWN_MS),
  )
  if (stored !== 'stored') return { ok: false, error: stored }

  if (!(await deps.sendCode(newEmail, code, input.lang ?? null))) return { ok: false, error: 'send_failed' }
  return { ok: true, email: newEmail, expiresAt }
}

export async function confirmEmailChange(
  deps: EmailChangeDeps,
  user: { id: string; authId: string },
  input: { code: unknown },
): Promise<Result<{ email: string }>> {
  const now = (deps.now ?? (() => new Date()))()
  const code = typeof input.code === 'string' ? input.code.replace(/\s/g, '') : ''

  await reconcileEmailChange(deps, user)
  const row = await deps.store.getRequest(user.id)
  if (!row) return { ok: false, error: 'no_pending' }
  if (row.status === 'APPLYING') return { ok: false, error: 'busy' }
  if (row.expiresAt.getTime() <= now.getTime()) {
    await deps.store.deleteRequest(row.id, 'PENDING', row.codeHash)
    return { ok: false, error: 'code_expired' }
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await deps.store.deleteRequest(row.id, 'PENDING', row.codeHash)
    return { ok: false, error: 'too_many_attempts' }
  }

  const expected = hashCode(deps.secret, user.id, row.newEmail, code)
  if (!/^\d{6}$/.test(code) || !sameHash(expected, row.codeHash)) {
    const attempts = await deps.store.recordFailedAttempt(row.id, row.codeHash)
    if (attempts !== null && attempts >= MAX_CODE_ATTEMPTS) {
      // Only a PENDING row: never the one another confirm is applying.
      await deps.store.deleteRequest(row.id, 'PENDING', row.codeHash)
      return { ok: false, error: 'too_many_attempts' }
    }
    return { ok: false, error: 'invalid_code' }
  }

  // The lock: only one caller moves this exact row to APPLYING, and not once
  // the attempts ran out meanwhile.
  if (!(await deps.store.claimForApplying(row.id, row.codeHash, MAX_CODE_ATTEMPTS))) {
    const current = await deps.store.getRequest(user.id)
    const exhausted = !current || current.id !== row.id || current.attempts >= MAX_CODE_ATTEMPTS
    return { ok: false, error: exhausted ? 'too_many_attempts' : 'busy' }
  }

  // Claim the user against a running account merge BEFORE re-reading
  // anything (lib/authPins.ts), so what is checked below can't change before
  // the write.
  let handle: AuthWriteHandle | null = null
  if (deps.guard) {
    const began = await deps.guard.begin(user.id, user.authId)
    if (!began.ok) {
      await deps.store.releaseClaim(row.id, row.codeHash)
      return { ok: false, error: 'busy' }
    }
    handle = began.handle
  }
  try {
    // Re-check under both locks. The login must still be the one this
    // session signed in with: a merge may have moved the account to another
    // login (or retired this one) since the code was requested.
    if ((await deps.store.getUserAuthId(user.id)) !== user.authId) {
      await deps.store.releaseClaim(row.id, row.codeHash)
      return { ok: false, error: 'account_changed' }
    }
    const oldEmail = await deps.store.getUserEmail(user.id)
    if (!oldEmail || !isApplePrivateRelayEmail(oldEmail)) {
      await deps.store.deleteRequest(row.id, 'APPLYING', row.codeHash)
      return { ok: false, error: 'not_relay' }
    }
    if (await deps.store.isEmailTaken(row.newEmail, user.id)) {
      await deps.store.deleteRequest(row.id, 'APPLYING', row.codeHash)
      return { ok: false, error: 'email_taken' }
    }
    return await applyEmailChange(deps, user, row, oldEmail, handle)
  } finally {
    await handle?.release()
  }
}

async function applyEmailChange(
  deps: EmailChangeDeps,
  user: { id: string; authId: string },
  row: ChangeRow,
  oldEmail: string,
  handle: AuthWriteHandle | null,
): Promise<Result<{ email: string }>> {
  if (handle && !(await handle.beforeWrite({ intent: 'KEEP', email: row.newEmail }))) {
    await deps.store.deleteRequest(row.id, 'APPLYING', row.codeHash)
    return { ok: false, error: 'email_locked' }
  }
  const authOutcome = await setAuthEmail(deps, user.authId, row.newEmail)
  await handle?.afterWrite(authOutcome === 'unknown')
  if (authOutcome === 'unknown') {
    // Can't tell whether Auth changed: keep the lock; reconcile settles it.
    return { ok: false, error: 'update_failed' }
  }
  if (authOutcome !== 'applied') {
    // Supabase answered and nothing changed: let them try again.
    await deps.store.releaseClaim(row.id, row.codeHash)
    return { ok: false, error: authOutcome === 'taken' ? 'email_taken' : 'update_failed' }
  }

  let committed = false
  try {
    committed = await deps.store.commitEmail(user.id, row.id, row.newEmail)
    if (committed) return { ok: true, email: row.newEmail }
    deps.log?.('[emailChange] lock lost before commit (reconciled meanwhile), reverting auth email', { userId: user.id })
  } catch (err) {
    deps.log?.('[emailChange] db update failed, reverting auth email', err)
  }

  if (handle && !(await handle.beforeWrite({ intent: 'KEEP', email: oldEmail }))) {
    // Can't safely write it back: leave the row APPLYING; reconcileEmailChange()
    // aligns the DB with Auth.
    deps.log?.('[emailChange] auth revert blocked by a pending merge write; left for reconciliation', { userId: user.id })
    return { ok: false, error: 'update_failed' }
  }
  const revert = await setAuthEmail(deps, user.authId, oldEmail)
  await handle?.afterWrite(revert === 'unknown')
  if (revert === 'applied') {
    await deps.store.releaseClaim(row.id, row.codeHash).catch(err => deps.log?.('[emailChange] release failed', err))
  } else {
    // Row stays APPLYING (if it still exists): reconcileEmailChange() will
    // align the DB with Auth.
    deps.log?.('[emailChange] auth revert failed; left for reconciliation', { userId: user.id })
  }
  return { ok: false, error: 'update_failed' }
}

// 'applied' / 'taken' / 'failed' when Supabase answered; when the call threw
// (timeout, lost response), 'applied' if Auth already has the new email and
// 'unknown' otherwise.
async function setAuthEmail(
  deps: EmailChangeDeps,
  authId: string,
  email: string,
): Promise<'applied' | 'taken' | 'failed' | 'unknown'> {
  try {
    const r = await deps.auth.setEmail(authId, email)
    return r.ok ? 'applied' : r.taken ? 'taken' : 'failed'
  } catch (err) {
    deps.log?.('[emailChange] auth update threw; reading it back', err)
  }
  try {
    const current = normalizeEmail(await deps.auth.getEmail(authId))
    if (current === normalizeEmail(email)) return 'applied'
    // Still the other value, but the cut-off request could yet land on
    // Supabase's side: don't release. Reconcile settles it once the row is
    // older than STALE_APPLYING_MS.
    return 'unknown'
  } catch (err) {
    deps.log?.('[emailChange] auth read-back failed', err)
    return 'unknown'
  }
}
