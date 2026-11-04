import { describe, it, expect } from 'vitest'
import { isSessionCookieName, shouldRefreshPublic } from '../lib/auth/proxyRefresh'

describe('proxy public-route session refresh', () => {
  it('refreshes on public pages, including the app entry screen', () => {
    expect(shouldRefreshPublic('/login')).toBe(true)
    expect(shouldRefreshPublic('/')).toBe(true)
    expect(shouldRefreshPublic('/explore')).toBe(true)
  })

  it('refreshes before the /api/auth routes that only read the session', () => {
    expect(shouldRefreshPublic('/api/auth/me')).toBe(true)
    expect(shouldRefreshPublic('/api/auth/contexts')).toBe(true)
    expect(shouldRefreshPublic('/api/auth/login-event')).toBe(true)
  })

  it('leaves routes that write or clear the session alone', () => {
    expect(shouldRefreshPublic('/auth/callback')).toBe(false)
    expect(shouldRefreshPublic('/auth/logout')).toBe(false)
    expect(shouldRefreshPublic('/api/auth/login')).toBe(false)
    expect(shouldRefreshPublic('/api/auth/google/callback')).toBe(false)
    expect(shouldRefreshPublic('/api/auth/signout')).toBe(false)
  })

  it('skips webhooks and crons', () => {
    expect(shouldRefreshPublic('/api/webhooks/stripe')).toBe(false)
    expect(shouldRefreshPublic('/api/cron/expire-memberships')).toBe(false)
  })

  it('recognises Supabase session cookies, chunked or not, but not the PKCE verifier', () => {
    expect(isSessionCookieName('sb-fixipigqxebxferfxlsv-auth-token')).toBe(true)
    expect(isSessionCookieName('sb-fixipigqxebxferfxlsv-auth-token.0')).toBe(true)
    expect(isSessionCookieName('sb-fixipigqxebxferfxlsv-auth-token-code-verifier')).toBe(false)
    expect(isSessionCookieName('currentSchoolId')).toBe(false)
  })
})
