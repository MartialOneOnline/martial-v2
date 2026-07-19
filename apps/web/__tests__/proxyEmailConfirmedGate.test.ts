/**
 * Tests for proxy.ts's email_confirmed_at gate — self-serve accounts are
 * created unconfirmed (app/api/auth/register) and must not reach protected
 * pages/APIs until they redeem the emailed confirmation link at
 * /auth/confirm. See CONTEXT.md / the audit that introduced this gate for
 * the bug it closes: a school registered without verifying and landed
 * straight on /dashboard.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

const { proxy } = await import('@/proxy')

function req(url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('proxy — email_confirmed_at gate', () => {
  it('redirects an unconfirmed user away from /dashboard to /auth/verify-pending, preserving email + redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: null } } })

    const res = await proxy(req('/dashboard/classes'))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/auth/verify-pending')
    expect(location.searchParams.get('email')).toBe('a@b.com')
    expect(location.searchParams.get('redirect')).toBe('/dashboard/classes')
  })

  it('redirects an unconfirmed user away from /my to /auth/verify-pending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'student@b.com', email_confirmed_at: null } } })

    const res = await proxy(req('/my/events'))

    expect(res.status).toBe(307)
    const location = new URL(res.headers.get('location')!)
    expect(location.pathname).toBe('/auth/verify-pending')
    expect(location.searchParams.get('redirect')).toBe('/my/events')
  })

  it('403s an unconfirmed user hitting a protected API route, as JSON — never a redirect', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: null } } })

    const res = await proxy(req('/api/dashboard/school'))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ error: 'Email not confirmed' })
  })

  it('lets a confirmed user through to /dashboard unimpeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: '2026-01-01T00:00:00Z' } } })

    const res = await proxy(req('/dashboard'))

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('lets a confirmed user through to a protected API route unimpeded', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: '2026-01-01T00:00:00Z' } } })

    const res = await proxy(req('/api/dashboard/school'))

    expect(res.status).toBe(200)
  })

  it('unauthenticated (no session) still 401s/redirects exactly as before — the confirmation check never runs', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const apiRes = await proxy(req('/api/dashboard/school'))
    expect(apiRes.status).toBe(401)

    const pageRes = await proxy(req('/dashboard'))
    expect(pageRes.status).toBe(307)
    expect(new URL(pageRes.headers.get('location')!).pathname).toBe('/login')
  })

  it('/dashboard/preview stays public even for an unconfirmed user — never calls getUser at all', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: null } } })

    const res = await proxy(req('/dashboard/preview'))

    expect(res.status).toBe(200)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('an unrelated public route is unaffected by an unconfirmed session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com', email_confirmed_at: null } } })

    const res = await proxy(req('/explore'))

    expect(res.status).toBe(200)
    expect(mockGetUser).not.toHaveBeenCalled()
  })
})
