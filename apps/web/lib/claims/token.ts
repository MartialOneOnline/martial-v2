import { createHash, createHmac, randomBytes } from 'crypto'

// School-owner invitation tokens.
//
// The emailed link carries a raw bearer token; the DB only stores its SHA-256
// (`SchoolInvitation.tokenHash`). The raw token is not random-and-forgotten:
// it is HMAC(secret, "<invitationId>:<tokenNonce>"), with the random nonce
// stored on the row. That lets a *technical retry* (the previous send's
// outcome is unknown) rebuild the byte-identical email and resend it under the
// same Resend Idempotency-Key — Resend then dedupes instead of delivering a
// second copy. An *explicit resend* rotates the nonce, which changes the token
// and hash, so every older link stops working.
//
// Someone with read access to the DB alone cannot derive a token: they would
// also need the server secret.

function secret(): string {
  const value = process.env.CLAIM_INVITE_SECRET || process.env.SUPABASE_SECRET_KEY
  if (!value) throw new Error('CLAIM_INVITE_SECRET (or SUPABASE_SECRET_KEY) must be set to issue owner invitations')
  return value
}

export function newTokenNonce(): string {
  return randomBytes(16).toString('base64url')
}

export function deriveInvitationToken(invitationId: string, nonce: string): string {
  return createHmac('sha256', secret()).update(`claim-invite:${invitationId}:${nonce}`).digest('base64url')
}

export function hashInvitationToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// "al***@example.com" — enough for the invitee to recognise their address on
// the public page, not enough to be useful to someone holding a forwarded link.
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/
export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email)
}
