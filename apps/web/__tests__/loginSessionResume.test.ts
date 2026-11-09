import { describe, it, expect } from 'vitest'
import {
  hasSessionCookie,
  isSessionCookieName,
  shouldResumeSession,
  LOGIN_RESUME_GUARD_MS,
} from '@/lib/auth/sessionCookie'

describe('session cookie detection', () => {
  it('accepts the session cookie and its numbered chunks only', () => {
    expect(isSessionCookieName('sb-abc-auth-token')).toBe(true)
    expect(isSessionCookieName('sb-abc-auth-token.0')).toBe(true)
    expect(isSessionCookieName('sb-abc-auth-token-code-verifier')).toBe(false)
    expect(isSessionCookieName('sb-abc-auth-token.x')).toBe(false)
    expect(isSessionCookieName('currentSchoolId')).toBe(false)
    expect(hasSessionCookie(['currentSchoolId', 'sb-abc-auth-token.1'])).toBe(true)
    expect(hasSessionCookie(['sb-abc-auth-token-code-verifier'])).toBe(false)
  })
})

describe('/login session resume', () => {
  const base = { hasSessionCookie: true, oauthCallback: false, oauthError: false, lastAttemptAt: null, now: 1_000_000 }

  it('resumes a signed-in visitor (mobile app cold start on /login)', () => {
    expect(shouldResumeSession(base)).toBe(true)
  })

  it('shows the form without a session cookie', () => {
    expect(shouldResumeSession({ ...base, hasSessionCookie: false })).toBe(false)
  })

  it('leaves the OAuth return and OAuth errors to their own handling', () => {
    expect(shouldResumeSession({ ...base, oauthCallback: true })).toBe(false)
    expect(shouldResumeSession({ ...base, oauthError: true })).toBe(false)
  })

  it('does not loop when the last resume bounced straight back', () => {
    expect(shouldResumeSession({ ...base, lastAttemptAt: base.now - 2_000 })).toBe(false)
    expect(shouldResumeSession({ ...base, lastAttemptAt: base.now - LOGIN_RESUME_GUARD_MS })).toBe(true)
  })
})
