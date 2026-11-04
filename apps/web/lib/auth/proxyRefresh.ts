// Pure helpers for proxy.ts's public-route session refresh (unit tested in
// __tests__/proxyRefresh.test.ts).

// Sign-in / sign-out / callback routes write (or clear) the session cookies
// themselves — refreshing the old session in front of them would add a
// second, conflicting Set-Cookie for the same names. The few /api/auth
// routes that only *read* the session do want a fresh token first.
const AUTH_READ_ROUTES = new Set([
  '/api/auth/me',
  '/api/auth/contexts',
  '/api/auth/context',
  '/api/auth/login-event',
])

export function shouldRefreshPublic(pathname: string) {
  if (pathname.startsWith('/auth/')) return false
  if (pathname.startsWith('/api/auth/')) return AUTH_READ_ROUTES.has(pathname)
  // Webhooks and crons never carry a browser session.
  if (pathname.startsWith('/api/webhooks') || pathname.startsWith('/api/cron')) return false
  return true
}

export function isSessionCookieName(name: string) {
  return name.startsWith('sb-') && /-auth-token(\.\d+)?$/.test(name)
}

// ── Bounded session check ────────────────────────────────────────────────
// supabase.auth.getUser() in proxy.ts runs before the page is served. If the
// Auth server is slow or unreachable it could hang for a minute (the SDK
// retries a failed refresh with backoff for up to ~30s), so /login — the
// mobile app's entry screen — never even rendered and no client-side
// timeout could help. Each Auth request is cut off by its own fetch timeout
// (see authFetchWithTimeout) and the whole check by PROXY_AUTH_DEADLINE_MS.
// A timeout or network error is "unavailable", never "no session": the
// caller must not clear cookies or treat the user as signed out for it.

export const PROXY_AUTH_FETCH_TIMEOUT_MS = 3000
export const PROXY_AUTH_DEADLINE_MS = 5000

export type ProxyAuthResult<U> =
  | { kind: 'user'; user: U }
  | { kind: 'none' }
  | { kind: 'unavailable' }

type GetUserResult<U> = { data: { user: U | null }; error: unknown }

function isTemporaryAuthError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const { name, status } = error as { name?: string; status?: number }
  // AuthRetryableFetchError = network failure/abort; 5xx/0 = Auth server
  // trouble. Neither says anything about whether the session is valid.
  return name === 'AuthRetryableFetchError' || status === 0 || (typeof status === 'number' && status >= 500)
}

export async function getUserBounded<U>(
  getUser: () => Promise<GetUserResult<U>>,
  deadlineMs = PROXY_AUTH_DEADLINE_MS,
): Promise<ProxyAuthResult<U>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timedOut = new Promise<'timeout'>(resolve => { timer = setTimeout(() => resolve('timeout'), deadlineMs) })
  try {
    const result = await Promise.race([getUser(), timedOut])
    if (result === 'timeout') return { kind: 'unavailable' }
    if (result.data.user) return { kind: 'user', user: result.data.user }
    return isTemporaryAuthError(result.error) ? { kind: 'unavailable' } : { kind: 'none' }
  } catch {
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}

// fetch for the proxy's Supabase client: every Auth request is aborted after
// PROXY_AUTH_FETCH_TIMEOUT_MS so a hung connection is actually cancelled,
// not just raced.
export const authFetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(PROXY_AUTH_FETCH_TIMEOUT_MS)
  const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  return fetch(input, { ...init, signal })
}
