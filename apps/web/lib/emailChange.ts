import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { isApplePrivateRelayEmail } from './privateRelay'

// Swapping an Apple "Hide My Email" relay address for a real one, verified
// with a 6-digit code sent to the new address. Only for relay accounts:
// every other email change stays admin/support-only.
//
// Consistency rules (Project Audit on 27284ff):
// - One EmailChangeRequest row per user. Moving it PENDING -> APPLYING with
//   a conditional update is the per-user lock: of two concurrent confirms,
//   only one gets it, and a new request can't replace an APPLYING row.
// - Auth is updated first, then Prisma. If Prisma fails, Auth is reverted;
//   if that revert fails too (thrown or returned { error }), the row stays
//   APPLYING and reconcileEmailChange() aligns Prisma with Auth later.
// - Nothing becomes the account's email until the code is confirmed.

export const CODE_TTL_MS = 15 * 60 * 1000
export const RESEND_COOLDOWN_MS = 60 * 1000
export const MAX_CODE_ATTEMPTS = 5
// An APPLYING row older than this belongs to a request that died midway.
export const STALE_APPLYING_MS = 2 * 60 * 1000

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
// in memory by the tests. Each one is a single atomic statement.
export interface EmailChangeStore {
  getUserEmail(userId: string): Promise<string | null>
  isEmailTaken(email: string, exceptUserId: string): Promise<boolean>
  getRequest(userId: string): Promise<ChangeRow | null>
  // Create, or replace a PENDING row. Returns false if an APPLYING row exists.
  putPendingRequest(userId: string, data: { newEmail: string; codeHash: string; expiresAt: Date }): Promise<boolean>
  // Adds one failed attempt to this PENDING row; returns the new count, or
  // null if the row changed meanwhile.
  recordFailedAttempt(requestId: string): Promise<number | null>
  // PENDING -> APPLYING only if the row is still this one with this code.
  claimForApplying(requestId: string, codeHash: string): Promise<boolean>
  // Back to PENDING after a failure that changed nothing.
  releaseClaim(requestId: string): Promise<void>
  deleteRequest(requestId: string): Promise<void>
  // In one transaction: users.email = newEmail and delete the request.
  commitEmail(userId: string, requestId: string, newEmail: string): Promise<void>
}

export interface AuthEmailApi {
  getEmail(authId: string): Promise<string | null>
  // Must surface both thrown errors and Supabase's returned { error }.
  setEmail(authId: string, email: string): Promise<{ ok: true } | { ok: false; taken: boolean }>
}

export type EmailChangeDeps = {
  store: EmailChangeStore
  auth: AuthEmailApi
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
  if (!opts.force && now.getTime() - row.updatedAt.getTime() < STALE_APPLYING_MS) return

  const authEmail = normalizeEmail(await deps.auth.getEmail(user.authId))
  const dbEmail = normalizeEmail(await deps.store.getUserEmail(user.id))
  if (authEmail && authEmail === row.newEmail) {
    if (dbEmail !== row.newEmail) await deps.store.commitEmail(user.id, row.id, row.newEmail)
    else await deps.store.deleteRequest(row.id)
  } else if (authEmail && authEmail === dbEmail) {
    await deps.store.deleteRequest(row.id)
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

  const existing = await deps.store.getRequest(user.id)
  if (existing?.status === 'APPLYING') return { ok: false, error: 'busy' }
  if (existing && now.getTime() - existing.updatedAt.getTime() < RESEND_COOLDOWN_MS) {
    return { ok: false, error: 'too_soon' }
  }

  const code = (deps.generateCode ?? defaultCode)()
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS)
  const stored = await deps.store.putPendingRequest(user.id, {
    newEmail,
    codeHash: hashCode(deps.secret, user.id, newEmail, code),
    expiresAt,
  })
  if (!stored) return { ok: false, error: 'busy' }

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
    await deps.store.deleteRequest(row.id)
    return { ok: false, error: 'code_expired' }
  }
  if (row.attempts >= MAX_CODE_ATTEMPTS) {
    await deps.store.deleteRequest(row.id)
    return { ok: false, error: 'too_many_attempts' }
  }

  const expected = hashCode(deps.secret, user.id, row.newEmail, code)
  if (!/^\d{6}$/.test(code) || !sameHash(expected, row.codeHash)) {
    const attempts = await deps.store.recordFailedAttempt(row.id)
    if (attempts !== null && attempts >= MAX_CODE_ATTEMPTS) {
      await deps.store.deleteRequest(row.id)
      return { ok: false, error: 'too_many_attempts' }
    }
    return { ok: false, error: 'invalid_code' }
  }

  // The lock: only one caller moves this exact row to APPLYING.
  if (!(await deps.store.claimForApplying(row.id, row.codeHash))) return { ok: false, error: 'busy' }

  // Re-check under the lock.
  const oldEmail = await deps.store.getUserEmail(user.id)
  if (!oldEmail || !isApplePrivateRelayEmail(oldEmail)) {
    await deps.store.deleteRequest(row.id)
    return { ok: false, error: 'not_relay' }
  }
  if (await deps.store.isEmailTaken(row.newEmail, user.id)) {
    await deps.store.deleteRequest(row.id)
    return { ok: false, error: 'email_taken' }
  }

  let authResult: Awaited<ReturnType<AuthEmailApi['setEmail']>>
  try {
    authResult = await deps.auth.setEmail(user.authId, row.newEmail)
  } catch (err) {
    deps.log?.('[emailChange] auth update threw', err)
    authResult = { ok: false, taken: false }
  }
  if (!authResult.ok) {
    // Nothing changed: let them try again (or request another code).
    await deps.store.releaseClaim(row.id)
    return { ok: false, error: authResult.taken ? 'email_taken' : 'update_failed' }
  }

  try {
    await deps.store.commitEmail(user.id, row.id, row.newEmail)
    return { ok: true, email: row.newEmail }
  } catch (err) {
    deps.log?.('[emailChange] db update failed, reverting auth email', err)
  }

  let reverted = false
  try {
    const revert = await deps.auth.setEmail(user.authId, oldEmail)
    reverted = revert.ok
  } catch (err) {
    deps.log?.('[emailChange] auth revert threw', err)
  }
  if (reverted) {
    await deps.store.releaseClaim(row.id).catch(err => deps.log?.('[emailChange] release failed', err))
  } else {
    // Row stays APPLYING: reconcileEmailChange() will align the DB with Auth.
    deps.log?.('[emailChange] auth revert failed; left for reconciliation', { userId: user.id })
  }
  return { ok: false, error: 'update_failed' }
}
