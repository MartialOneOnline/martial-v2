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
