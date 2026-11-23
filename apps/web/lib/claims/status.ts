// Pure display/state helpers shared by API routes and admin UI.

export const INVITATION_TTL_DAYS = 7
export const INVITATION_TTL_MS = INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
// A SENDING lock older than this means the function died mid-send: the
// outcome is unknown, so it is shown (and retried) as UNCERTAIN.
export const SENDING_STALE_MS = 3 * 60 * 1000
// Resend keeps an Idempotency-Key for 24 h. A retry under the same key is only
// treated as duplicate-safe well inside that window (margin for clock skew and
// a slow request); after it, only an explicit resend (new link) is allowed.
export const SAME_KEY_RETRY_WINDOW_MS = 20 * 60 * 60 * 1000

export type InvitationLike = {
  status: string
  deliveryStatus: string | null
  deliveryStartedAt: Date | string | null
  expiresAt: Date | string | null
  usedAt: Date | string | null
  revokedAt: Date | string | null
  isActive: boolean
}

export type InvitationState =
  | 'accepted' // the invitee accepted — OWNER granted
  | 'revoked'
  | 'expired'
  | 'prepared' // token issued, not sent
  | 'sending'
  | 'failed' // Resend rejected it: nothing was sent
  | 'uncertain' // unknown whether it was sent
  | 'sent' // accepted by Resend (not proof of delivery)
  | 'opened' // the invitee opened the link
  | 'legacy' // pre-2026-11 invitation with an old-style link that no longer works

const t = (d: Date | string | null) => (d ? new Date(d).getTime() : null)

export function isSendingStale(inv: Pick<InvitationLike, 'deliveryStatus' | 'deliveryStartedAt'>, now = Date.now()): boolean {
  const started = t(inv.deliveryStartedAt)
  return inv.deliveryStatus === 'SENDING' && (started === null || now - started > SENDING_STALE_MS)
}

export function invitationState(inv: InvitationLike, now = Date.now()): InvitationState {
  if (inv.usedAt || inv.status === 'REGISTERED') return 'accepted'
  if (inv.revokedAt || !inv.isActive) return 'revoked'
  if (!inv.deliveryStatus) return 'legacy'
  const exp = t(inv.expiresAt)
  if (inv.deliveryStatus === 'PREPARED') return 'prepared'
  if (inv.deliveryStatus === 'SENDING') return isSendingStale(inv, now) ? 'uncertain' : 'sending'
  if (inv.deliveryStatus === 'FAILED') return 'failed'
  if (exp !== null && exp <= now) return 'expired'
  if (inv.deliveryStatus === 'UNCERTAIN') return 'uncertain'
  return inv.status === 'OPENED' ? 'opened' : 'sent'
}

// Open = still able to become an accepted owner invitation (blocks a second
// one for the same school).
export function isInvitationOpen(inv: Pick<InvitationLike, 'usedAt' | 'revokedAt' | 'isActive' | 'status'>): boolean {
  return !inv.usedAt && !inv.revokedAt && inv.isActive && inv.status !== 'REGISTERED' && inv.status !== 'DECLINED'
}

export const INVITATION_STATE_LABEL: Record<InvitationState, string> = {
  accepted: 'Accepted — access granted',
  revoked: 'Revoked',
  expired: 'Expired',
  prepared: 'Prepared — not sent',
  sending: 'Sending…',
  failed: 'Send failed — not sent',
  uncertain: 'Send outcome unknown',
  sent: 'Sent (accepted by Resend)',
  opened: 'Opened by the invitee',
  legacy: 'Old link (no longer valid)',
}

export type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'RESOLVED' | 'DISMISSED'

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending review',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed — owner has access',
  RESOLVED: 'Closed (legacy) — association not reviewed',
  DISMISSED: 'Rejected',
}

export function nextStep(p: {
  status: RequestStatus
  hasSchool: boolean
  schoolHasOwner: boolean
  invitation: InvitationState | null
}): string {
  switch (p.status) {
    case 'COMPLETED': return 'Done. The owner has access to the linked school.'
    case 'DISMISSED': return 'Rejected. Reopen it if it was closed by mistake.'
    case 'RESOLVED': return 'Closed with the old “Mark resolved” — nothing was recorded. Reopen it to review and link the school.'
    case 'PENDING': return 'Review the request and link an existing school, or create one.'
    case 'IN_PROGRESS':
      if (!p.hasSchool) return 'Link a school.'
      if (p.schoolHasOwner) return 'The linked school already has an owner. Ownership changes need a manual review — do not invite.'
      switch (p.invitation) {
        case null: case 'revoked': case 'legacy': return 'Check the recipient and send the invitation.'
        case 'prepared': return 'Send the prepared invitation.'
        case 'sending': return 'Sending… refresh in a moment.'
        case 'failed': return 'The email was not sent. Fix the cause and retry.'
        case 'uncertain': return 'Unknown whether the email went out. “Retry” resends the identical email without duplicating it for 20 h after the first attempt; after that, check the Resend logs and use “Resend” (new link, old one disabled).'
        case 'expired': return 'The link expired. Resend to issue a new one.'
        case 'sent': case 'opened': return 'Waiting for the invitee to accept.'
        case 'accepted': return 'Accepted.'
      }
  }
  return ''
}
