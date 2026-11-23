import type { Prisma } from '@/lib/prisma-client/client'

// Audit trail for ownership requests (`claim_request_events`). Every admin
// decision and every delivery/acceptance outcome lands here with its actor,
// so the detail page can show what was done and why.
export type ClaimEventType =
  | 'SUBMITTED'
  | 'ADMIN_NOTIFY_FAILED'
  | 'SCHOOL_LINKED'
  | 'SCHOOL_CREATED'
  | 'SCHOOL_UNLINKED'
  | 'REJECTED'
  | 'REOPENED'
  | 'INVITATION_PREPARED'
  | 'INVITATION_SENT' // accepted by Resend (not proof of delivery)
  | 'INVITATION_SEND_FAILED' // definitively rejected by Resend
  | 'INVITATION_SEND_UNCERTAIN' // timeout / network / 5xx
  | 'INVITATION_RESENT' // explicit resend: new link, old one revoked
  | 'LEGACY_LINK_OPENED' // someone opened a pre-2026-11 /claim/<id> link (no longer valid)
  | 'INVITATION_REVOKED'
  | 'INVITATION_OPENED'
  | 'VERIFY_LINK_SENT'
  | 'OWNER_CONFLICT'
  | 'IDENTITY_CONFLICT'
  | 'ACCESS_GRANTED'

type EventClient = { claimRequestEvent: { create: (args: { data: Prisma.ClaimRequestEventUncheckedCreateInput }) => Promise<unknown> } }

export async function recordClaimEvent(
  db: EventClient,
  claimRequestId: string,
  type: ClaimEventType,
  opts: { actorUserId?: string | null; data?: Record<string, unknown> } = {},
): Promise<void> {
  await db.claimRequestEvent.create({
    data: {
      claimRequestId,
      type,
      actorUserId: opts.actorUserId ?? null,
      data: (opts.data ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}

// Never let an audit write turn a completed external action into a 500.
export async function recordClaimEventSafe(
  db: EventClient,
  claimRequestId: string | null | undefined,
  type: ClaimEventType,
  opts: { actorUserId?: string | null; data?: Record<string, unknown> } = {},
): Promise<void> {
  if (!claimRequestId) return
  try {
    await recordClaimEvent(db, claimRequestId, type, opts)
  } catch (err) {
    console.error(`[claims] failed to record ${type} for ${claimRequestId}:`, err)
  }
}
