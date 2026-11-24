// Classifies one Resend send response (resend@6 SDK: never throws, returns
// { data, error, headers }; a network failure or abort comes back as
// application_error with statusCode null and headers null).
//
// The key distinction is whether Resend *confirmed it did not accept* the
// email (safe to send again, even with a new Idempotency-Key) or the outcome is
// unknown (only safe to retry with the SAME key, inside Resend's 24h window).

export type SendResponseLike = {
  data: { id: string } | null
  error: { name?: string | null; message?: string | null; statusCode?: number | null } | null
  headers?: Record<string, string> | null
}

export type SendOutcome =
  | { kind: 'accepted'; id: string }
  // 429 rate_limit_exceeded — rejected before processing.
  | { kind: 'rate_limited'; retryAfterMs: number | null; message: string; code: string; status: number }
  // 429 daily/monthly quota — Resend doesn't queue or retry these.
  | { kind: 'quota'; scope: 'daily' | 'monthly'; message: string; code: string; status: number }
  // API key / account problems: not the recipient's fault, nothing sends until fixed.
  | { kind: 'config'; message: string; code: string; status: number }
  // Same key reused with a different body: a previous request with this key
  // exists, so the email may already have gone out. Never resend blindly.
  | { kind: 'idempotency_conflict'; message: string; code: string; status: number }
  // Network error, timeout, 5xx or the same key still in flight: unknown.
  | { kind: 'uncertain'; retryAfterMs: number | null; message: string; code: string; status: number | null }
  // Validation-type rejection for this email (bad address, invalid field…).
  | { kind: 'permanent'; message: string; code: string; status: number }

const CONFIG_CODES = new Set([
  'missing_api_key', 'invalid_api_key', 'restricted_api_key', 'suspended_api_key', 'invalid_access', 'invalid_permission',
])

function header(headers: Record<string, string> | null | undefined, name: string): string | undefined {
  if (!headers) return undefined
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() === lower) return v
  return undefined
}

// Retry-After (seconds, or an HTTP date), falling back to ratelimit-reset (seconds).
export function retryAfterMs(headers: Record<string, string> | null | undefined, nowMs: number): number | null {
  const ra = header(headers, 'retry-after')
  if (ra !== undefined && ra.trim() !== '') {
    const secs = Number(ra)
    if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs * 1000)
    const at = Date.parse(ra)
    if (Number.isFinite(at)) return Math.max(0, at - nowMs)
  }
  const reset = header(headers, 'ratelimit-reset')
  if (reset !== undefined && reset.trim() !== '') {
    const secs = Number(reset)
    if (Number.isFinite(secs) && secs >= 0) return Math.ceil(secs * 1000)
  }
  return null
}

// Used count reported by Resend (x-resend-daily-quota is only sent to free plans).
export function quotaUsed(headers: Record<string, string> | null | undefined, scope: 'daily' | 'monthly'): number | null {
  const raw = header(headers, scope === 'daily' ? 'x-resend-daily-quota' : 'x-resend-monthly-quota')
  if (raw === undefined) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function classifySendResponse(res: SendResponseLike, nowMs: number): SendOutcome {
  if (!res.error) {
    if (res.data?.id) return { kind: 'accepted', id: res.data.id }
    // 2xx without an id: Resend accepted something we can't correlate.
    return { kind: 'uncertain', retryAfterMs: null, message: 'Resend returned no email id', code: 'missing_id', status: null }
  }
  const code = res.error.name ?? 'application_error'
  const message = res.error.message || code
  const status = typeof res.error.statusCode === 'number' ? res.error.statusCode : null

  if (code === 'daily_quota_exceeded') return { kind: 'quota', scope: 'daily', message, code, status: status ?? 429 }
  if (code === 'monthly_quota_exceeded') return { kind: 'quota', scope: 'monthly', message, code, status: status ?? 429 }
  if (code === 'rate_limit_exceeded' || (status === 429 && code !== 'concurrent_idempotent_requests')) {
    return { kind: 'rate_limited', retryAfterMs: retryAfterMs(res.headers, nowMs), message, code, status: 429 }
  }
  if (code === 'invalid_idempotent_request') return { kind: 'idempotency_conflict', message, code, status: status ?? 409 }
  if (code === 'concurrent_idempotent_requests' || code === 'resource_locked') {
    return { kind: 'uncertain', retryAfterMs: retryAfterMs(res.headers, nowMs), message, code, status }
  }
  if (CONFIG_CODES.has(code) || status === 401) return { kind: 'config', message, code, status: status ?? 401 }
  // No HTTP status: the request may or may not have reached Resend.
  if (status === null || status >= 500) {
    return { kind: 'uncertain', retryAfterMs: retryAfterMs(res.headers, nowMs), message, code, status }
  }
  return { kind: 'permanent', message, code, status }
}
