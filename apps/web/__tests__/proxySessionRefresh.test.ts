/**
 * proxy.ts refreshes the Supabase session on every request that carries a
 * session cookie, not only on the protected prefixes. Without this, a student
 * who reopened the app the next day and booked through /api/bookings had
 * their refresh token rotated inside the route handler without the new
 * cookies reaching the browser, and Supabase then revoked the session on the
 * next request (refresh-token reuse detection): logged out every day.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
const mockGetSession = vi.fn()
let pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = []

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: (c: typeof pendingCookies) => void } }) => ({
    auth: {
      getUser: mockGetUser,
      getSession: async () => {
        if (pendingCookies.length) opts.cookies.setAll(pendingCookies)
        return mockGetSession()
      },
    },
  }),
}))

const { proxy, shouldRefreshSession } = await import('@/proxy')

const SESSION_COOKIE = 'sb-fixipigqxebxferfxlsv-auth-token'

function req(url: string, cookies: Record<string, string> = {}) {
  const r = new NextRequest(new URL(url, 'http://localhost:3000'), { method: 'GET' })
  for (const [name, value] of Object.entries(cookies)) r.cookies.set(name, value)
  return r
}

beforeEach(() => {
  vi.clearAllMocks()
  pendingCookies = []
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
})

describe('proxy — session refresh outside protected routes', () => {
  it('sends the rotated session cookies back on /api/bookings', async () => {
    pendingCookies = [{ name: SESSION_COOKIE, value: 'rotated', options: { path: '/', maxAge: 400 * 86400 } }]

    const res = await proxy(req('/api/bookings', { [SESSION_COOKIE]: 'old' }))

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(res.status).toBe(200)
    expect(res.cookies.get(SESSION_COOKIE)?.value).toBe('rotated')
  })

  it('also refreshes on public pages and chunked session cookies', async () => {
    pendingCookies = [{ name: `${SESSION_COOKIE}.0`, value: 'rotated', options: {} }]

    const res = await proxy(req('/school/rgm', { [`${SESSION_COOKIE}.0`]: 'old' }))

    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(res.cookies.get(`${SESSION_COOKIE}.0`)?.value).toBe('rotated')
  })

  it('never blocks a public route, even if the refresh throws', async () => {
    mockGetSession.mockRejectedValue(new Error('network'))

    const res = await proxy(req('/api/bookings', { [SESSION_COOKIE]: 'old' }))

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('does nothing for visitors without a session cookie', async () => {
    const res = await proxy(req('/explore', { other: 'x' }))

    expect(mockGetSession).not.toHaveBeenCalled()
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
  })

  it('leaves routes that write the session themselves alone', () => {
    const cookies = { [SESSION_COOKIE]: 'old' }
    for (const path of [
      '/api/auth/login',
      '/api/auth/google/idtoken',
      '/api/auth/signout',
      '/api/auth/register',
      '/auth/callback',
      '/auth/logout',
      '/auth/impersonate',
      '/api/webhooks/stripe',
      '/api/cron/renewals',
    ]) {
      expect(shouldRefreshSession(req(path, cookies)), path).toBe(false)
    }
    for (const path of ['/api/bookings', '/api/auth/me', '/api/auth/contexts', '/api/memberships/trial', '/']) {
      expect(shouldRefreshSession(req(path, cookies)), path).toBe(true)
    }
  })

  it('protected routes keep using getUser() as before', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await proxy(req('/my/classes', { [SESSION_COOKIE]: 'old' }))

    expect(mockGetUser).toHaveBeenCalledTimes(1)
    expect(mockGetSession).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
  })
})
