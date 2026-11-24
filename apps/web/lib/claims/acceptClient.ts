// Browser-side steps of accepting an owner invitation on /claim/[token].
// Kept out of the page so the recovery rules can be tested without a DOM.
// Safe to import from client components: no server-only code here.

type Fetch = typeof fetch

export type CompleteResult =
  | { kind: 'ok' }
  // Definite answers: nothing more to do on this path.
  | { kind: 'invalid'; reason: string }
  | { kind: 'reload' } // signed out or another account: show the current state
  | { kind: 'error'; code: string }
  // No answer (network) or a server error: access may already have been
  // granted. Repeating POST /complete is safe — the same person gets success
  // and the currentSchoolId cookie — so the page must keep offering it and
  // must not reload the invitation (which would then read 410 USED).
  | { kind: 'uncertain' }

export async function postComplete(token: string, fetchImpl: Fetch = fetch): Promise<CompleteResult> {
  let res: Response
  try {
    res = await fetchImpl(`/api/claim/${encodeURIComponent(token)}/complete`, { method: 'POST' })
  } catch {
    return { kind: 'uncertain' }
  }
  if (res.status >= 500) return { kind: 'uncertain' }
  const data = await res.json().catch(() => null)
  if (!data) return { kind: 'uncertain' }
  if (res.ok && data.ok) return { kind: 'ok' }
  if (data.error === 'INVALID_LINK') return { kind: 'invalid', reason: data.reason ?? 'NOT_FOUND' }
  if (data.error === 'WRONG_ACCOUNT' || data.error === 'NOT_AUTHENTICATED') return { kind: 'reload' }
  return { kind: 'error', code: typeof data.error === 'string' ? data.error : 'generic' }
}

export type SessionResult =
  | { kind: 'ok' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'error'; code: string }

export async function postSession(
  token: string, verify: { tokenHash: string; type: string }, fetchImpl: Fetch = fetch,
): Promise<SessionResult> {
  let res: Response
  try {
    res = await fetchImpl(`/api/claim/${encodeURIComponent(token)}/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(verify),
    })
  } catch {
    return { kind: 'error', code: 'generic' }
  }
  const data = await res.json().catch(() => ({}))
  if (res.ok) return { kind: 'ok' }
  if (res.status === 404 || (res.status === 410 && data.error !== 'verify_expired')) {
    return { kind: 'invalid', reason: data.error ?? 'NOT_FOUND' }
  }
  return { kind: 'error', code: data.error ?? 'generic' }
}

// One click on "Confirm and continue": redeem the email token, then accept.
// /complete is never called unless the session step succeeded.
export async function confirmAndComplete(
  token: string, verify: { tokenHash: string; type: string }, fetchImpl: Fetch = fetch,
): Promise<{ step: 'session'; result: SessionResult } | { step: 'complete'; result: CompleteResult }> {
  const session = await postSession(token, verify, fetchImpl)
  if (session.kind !== 'ok') return { step: 'session', result: session }
  return { step: 'complete', result: await postComplete(token, fetchImpl) }
}
