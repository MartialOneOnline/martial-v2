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

import { getUserBounded } from '../lib/auth/proxyRefresh'

describe('getUserBounded', () => {
  const user = { id: 'u1' }

  it('returns the user when Auth answers', async () => {
    await expect(getUserBounded(async () => ({ data: { user }, error: null }))).resolves.toEqual({ kind: 'user', user })
  })

  it('reports no session for a real auth rejection', async () => {
    const error = { name: 'AuthApiError', status: 400, message: 'Invalid Refresh Token' }
    await expect(getUserBounded(async () => ({ data: { user: null }, error }))).resolves.toEqual({ kind: 'none' })
  })

  it('treats a hung Auth call as unavailable instead of waiting', async () => {
    const started = Date.now()
    const result = await getUserBounded<{ id: string }>(() => new Promise(() => {}), 30)
    expect(result).toEqual({ kind: 'unavailable' })
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('treats network / server errors as unavailable, not as signed out', async () => {
    for (const error of [
      { name: 'AuthRetryableFetchError', status: 0 },
      { name: 'AuthUnknownError', status: 502 },
    ]) {
      await expect(getUserBounded(async () => ({ data: { user: null }, error }))).resolves.toEqual({ kind: 'unavailable' })
    }
    await expect(getUserBounded(async () => { throw new Error('boom') })).resolves.toEqual({ kind: 'unavailable' })
  })
})
