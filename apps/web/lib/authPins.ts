import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { isApplePrivateRelayEmail } from '@/lib/privateRelay'
import { pinAgrees, RUN_HOLD_MS, type AuthIntent, type ClaimStore, type PinStore } from '@/lib/accountMerge'

// Claims and pins guard every write to a Supabase Auth user that an account
// merge may also write — the merge tool itself (lib/accountMerge.ts) and the
// verified email change of PR #59 (lib/emailChange.ts); self-delete checks
// the pins before its ban fallback (app/api/my/account).
//
//   account_merge_claims   — one writer per user at a time
//   account_merge_auth_pins — the intent of an Auth write, kept forever when
//                             its outcome is unknown (the request may still
//                             be applied by Supabase at any time); every later
//                             writer must agree with it.

// account_merge_claims: one row per user. acquire() takes every row or none
// (one transaction; ids in a fixed order so two acquirers can't deadlock).
// An expired claim is taken over in place.
export const prismaClaimStore: ClaimStore = {
  async acquire(userIds, attemptId, holdUntil) {
    class Busy extends Error { constructor(public holdUntil: Date) { super('busy') } }
    try {
      await prisma.$transaction(async tx => {
        for (const userId of [...userIds].sort()) {
          const taken = await tx.$queryRaw<{ userId: string }[]>`
            INSERT INTO account_merge_claims ("userId", "attemptId", "holdUntil")
            VALUES (${userId}, ${attemptId}, ${holdUntil})
            ON CONFLICT ("userId") DO UPDATE
              SET "attemptId" = EXCLUDED."attemptId", "holdUntil" = EXCLUDED."holdUntil", "createdAt" = now()
              WHERE account_merge_claims."holdUntil" <= now()
            RETURNING "userId"`
          if (taken.length === 0) {
            const row = await tx.accountMergeClaim.findUnique({ where: { userId }, select: { holdUntil: true } })
            throw new Busy(row?.holdUntil ?? holdUntil)
          }
        }
      })
      return { ok: true }
    } catch (err) {
      if (err instanceof Busy) return { ok: false, holdUntil: err.holdUntil }
      throw err
    }
  },
  async release(userIds, attemptId) {
    await prisma.accountMergeClaim.deleteMany({ where: { userId: { in: userIds }, attemptId } })
  },
}

// account_merge_auth_pins: see PinStore in lib/accountMerge.ts.
export const prismaPinStore: PinStore = {
  async get(authIds) {
    if (authIds.length === 0) return []
    const rows = await prisma.accountMergeAuthPin.findMany({ where: { authId: { in: authIds } } })
    return rows.map(r => (r.intent === 'KEEP'
      ? { authId: r.authId, attemptId: r.attemptId, intent: 'KEEP' as const, email: r.email }
      : { authId: r.authId, attemptId: r.attemptId, intent: 'RETIRE' as const }))
  },
  async put(pin) {
    await prisma.accountMergeAuthPin.createMany({
      data: [{ authId: pin.authId, attemptId: pin.attemptId, intent: pin.intent, email: pin.intent === 'KEEP' ? pin.email : '' }],
      skipDuplicates: true,
    })
  },
  async remove(authId, attemptId) {
    await prisma.accountMergeAuthPin.deleteMany({ where: { authId, attemptId } })
  },
}


// For Auth writers other than the merge tool.
export type AuthWriteHandle = {
  // Before each Auth write. False = an earlier write whose answer never came
  // disagrees (don't write). True = go ahead; this intent is pinned first.
  beforeWrite(wanted: AuthIntent): Promise<boolean>
  // After that write: keep the pin only if its outcome is unknown.
  afterWrite(uncertain: boolean): Promise<void>
  // Always, at the end: frees the user claim.
  release(): Promise<void>
}

export type AuthWriteGuard = {
  // Read-only check, e.g. before sending a confirmation code.
  conflicts(authId: string, wanted: AuthIntent): Promise<boolean>
  // Claims the user (exclusive with a running merge); 'busy' if one runs.
  begin(userId: string, authId: string): Promise<{ ok: true; handle: AuthWriteHandle } | { ok: false; reason: 'busy' }>
}

export function makeAuthWriteGuard(
  claims: ClaimStore,
  pins: PinStore,
  opts: { now?: () => Date; newAttemptId?: () => string } = {},
): AuthWriteGuard {
  const now = opts.now ?? (() => new Date())
  return {
    async conflicts(authId, wanted) {
      const [pin] = await pins.get([authId])
      return !!pin && !pinAgrees(pin, wanted)
    },
    async begin(userId, authId) {
      const attemptId = opts.newAttemptId?.() ?? randomUUID()
      const claim = await claims.acquire([userId], attemptId, new Date(now().getTime() + RUN_HOLD_MS))
      if (!claim.ok) return { ok: false, reason: 'busy' }
      let own = false // this attempt's pin for the write in progress
      return {
        ok: true,
        handle: {
          async beforeWrite(wanted) {
            const [pin] = await pins.get([authId])
            // Any pin still here guards a write whose answer never came —
            // someone else's, or our own earlier one (a settled one is
            // removed in afterWrite). It stays; this write must agree with it.
            if (pin) return pinAgrees(pin, wanted)
            await pins.put({ ...wanted, authId, attemptId })
            own = true
            return true
          },
          async afterWrite(uncertain) {
            if (!own) return
            own = false
            // Unknown outcome: the pin now outlives this attempt, never cleared by it.
            if (!uncertain) await pins.remove(authId, attemptId)
          },
          async release() {
            await claims.release([userId], attemptId).catch(err => console.error('[auth-pins] could not release claim', err))
          },
        },
      }
    },
  }
}

export const authWriteGuard = makeAuthWriteGuard(prismaClaimStore, prismaPinStore)

// The single pin on this Auth user, if any (read-only).
export async function getAuthPin(authId: string) {
  const [pin] = await prismaPinStore.get([authId])
  return pin ?? null
}

// A relay address can't be swapped for a real one while a pending write
// would retire this login or keep a relay address on it.
export function relayChangeLocked(pin: { intent: 'RETIRE' } | { intent: 'KEEP'; email: string } | null): boolean {
  if (!pin) return false
  return pin.intent === 'RETIRE' || isApplePrivateRelayEmail(pin.email)
}
