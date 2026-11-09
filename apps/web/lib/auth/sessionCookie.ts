// Supabase stores the session as sb-<project>-auth-token, split into
// numbered chunks (.0, .1…) when large. Anything else that shares the prefix,
// such as the PKCE sb-<project>-auth-token-code-verifier, is not a session.
// Shared by proxy.ts and app/login (no Next.js imports here).
const SESSION_COOKIE_NAME = /^sb-.+-auth-token(?:\.\d+)?$/

export function isSessionCookieName(name: string): boolean {
  return SESSION_COOKIE_NAME.test(name)
}

export function hasSessionCookie(names: Iterable<string>): boolean {
  for (const name of names) if (isSessionCookieName(name)) return true
  return false
}

// /login resumes an existing session instead of showing the form (the mobile
// app always opens on /login). If that resume bounced straight back here
// (e.g. the proxy refused the session the API accepted), don't try again
// for this long: show the form instead of looping.
export const LOGIN_RESUME_GUARD_KEY = 'martial_login_resume_at'
export const LOGIN_RESUME_GUARD_MS = 15_000

export function shouldResumeSession(input: {
  hasSessionCookie: boolean
  // Returning from Google/Apple/Microsoft (?oauth=1) has its own handler,
  // and ?error= must show the error on the form.
  oauthCallback: boolean
  oauthError: boolean
  lastAttemptAt: number | null
  now: number
}): boolean {
  if (!input.hasSessionCookie || input.oauthCallback || input.oauthError) return false
  if (input.lastAttemptAt !== null && input.now - input.lastAttemptAt < LOGIN_RESUME_GUARD_MS) return false
  return true
}

// The loop guard has to survive a full navigation (/login → /my → proxy
// bounce → /login), so it lives in sessionStorage, or in a short-lived
// cookie when storage is blocked. Every write is read back: a guard that
// can't be persisted is reported as such, and the caller must then ask the
// user to continue instead of redirecting on its own.
export type ResumeGuardEnv = {
  storage: Pick<Storage, 'getItem' | 'setItem'> | null
  readCookies: () => string
  writeCookie: (cookie: string) => void
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

function cookieValue(all: string, name: string): string | null {
  for (const part of all.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return null
}

export function readResumeGuard(env: ResumeGuardEnv): number | null {
  const values = [
    safe(() => env.storage?.getItem(LOGIN_RESUME_GUARD_KEY) ?? null, null),
    safe(() => cookieValue(env.readCookies(), LOGIN_RESUME_GUARD_KEY), null),
  ]
  const times = values.map(v => (v ? Number(v) : NaN)).filter(n => Number.isFinite(n) && n > 0)
  return times.length ? Math.max(...times) : null
}

// Returns true only if the value can be read back afterwards.
export function writeResumeGuard(env: ResumeGuardEnv, now: number): boolean {
  const value = String(now)
  const stored = safe(() => {
    env.storage?.setItem(LOGIN_RESUME_GUARD_KEY, value)
    return env.storage?.getItem(LOGIN_RESUME_GUARD_KEY) === value
  }, false)
  if (stored) return true
  return safe(() => {
    env.writeCookie(`${LOGIN_RESUME_GUARD_KEY}=${value}; Max-Age=${Math.ceil(LOGIN_RESUME_GUARD_MS / 1000)}; Path=/; SameSite=Lax`)
    return cookieValue(env.readCookies(), LOGIN_RESUME_GUARD_KEY) === value
  }, false)
}
