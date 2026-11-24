// Classifies one Resend `emails.send` response for transactional owner
// invitations.
//
// Same semantics as the bulk-campaign classifier being built in the
// `claude/campaign-rate-limit` branch (lib/email/resendOutcome.ts there, not
// on main yet): the key question is whether Resend *confirmed it did not
// accept* the email (safe to send again with a new Idempotency-Key) or the
// outcome is unknown (only safe to retry with the SAME key inside Resend's
// 24h idempotency window). When that module lands on main, this file should
// delegate to `classifySendResponse` instead of keeping its own table.
// Transactional mail is sent directly (not through the bulk lane) there too.

export type SendResponseLike = {
  data: { id: string } | null
  error: { name?: string | null; message?: string | null; statusCode?: number | null } | null
}

export type DeliveryOutcome =
  | { kind: 'accepted'; id: string }
  | { kind: 'rejected'; code: string; message: string } // nothing was sent
  | { kind: 'uncertain'; code: string; message: string } // may have been sent

export function classifyInviteSend(res: SendResponseLike): DeliveryOutcome {
  if (!res.error) {
    if (res.data?.id) return { kind: 'accepted', id: res.data.id }
    return { kind: 'uncertain', code: 'missing_id', message: 'Resend returned no email id' }
  }
  const code = res.error.name ?? 'application_error'
  const message = res.error.message || code
  const status = typeof res.error.statusCode === 'number' ? res.error.statusCode : null

  // Same key reused with a different body: an earlier request with this key
  // exists, so the email may already be out. Never treat as "not sent".
  if (code === 'invalid_idempotent_request') return { kind: 'uncertain', code, message }
  if (code === 'concurrent_idempotent_requests' || code === 'resource_locked') return { kind: 'uncertain', code, message }
  // 429 / quota / auth problems are rejected before processing.
  if (status === 429 || code === 'rate_limit_exceeded' || code.endsWith('_quota_exceeded')) return { kind: 'rejected', code, message }
  // No HTTP status (network error, abort) or a 5xx: unknown.
  if (status === null || status >= 500) return { kind: 'uncertain', code, message }
  return { kind: 'rejected', code, message }
}

// Thrown errors from the SDK (it normally returns {error}) are unknown outcomes.
export function classifyThrown(err: unknown): DeliveryOutcome {
  const message = err instanceof Error ? err.message : 'Unknown error'
  return { kind: 'uncertain', code: 'exception', message }
}
