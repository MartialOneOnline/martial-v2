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
