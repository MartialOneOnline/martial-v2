/**
 * proxy.ts public-route refresh, run against the real @supabase/ssr and
 * auth-js with a stubbed network. A hung Supabase Auth must not hold a
 * public page (even /explore or a school page) open: the proxy gives up
 * after PUBLIC_REFRESH_TIMEOUT_MS, aborts the token request, keeps the
 * existing cookies and ignores anything the SDK writes afterwards.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const PROJECT_URL = 'https://audit.supabase.co'
const COOKIE = 'sb-audit-auth-token'

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = PROJECT_URL
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test'
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function expiredSessionCookie() {
  const now = Math.floor(Date.now() / 1000)
  const session = {
    access_token: 'expired-access',
    refresh_token: 'R0',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now - 3600,
    user: { id: 'u1', aud: 'authenticated', email: 's@b.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
  }
  return 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
}

function req(path: string) {
  const r = new NextRequest(new URL(path, 'http://localhost:3000'))
  r.cookies.set(COOKIE, expiredSessionCookie())
  return r
}

describe('proxy — public refresh deadline (real SDK)', () => {
  it('serves the page after the deadline, aborts the token request and keeps the cookies', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const signals: AbortSignal[] = []
    // Hangs until aborted; records every token request (including retries).
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal
      signals.push(signal)
      return new Promise<Response>((_resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'))
        signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      })
    }))

    const { proxy, PUBLIC_REFRESH_TIMEOUT_MS } = await import('@/proxy')
    const startedAt = Date.now()
    const res = await proxy(req('/explore'))
    const elapsed = Date.now() - startedAt

    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
    expect(elapsed).toBeGreaterThanOrEqual(PUBLIC_REFRESH_TIMEOUT_MS - 50)
    expect(elapsed).toBeLessThan(PUBLIC_REFRESH_TIMEOUT_MS + 1000)
    expect(signals.length).toBeGreaterThan(0)
    expect(signals.every(s => s.aborted)).toBe(true)
    // A transient failure must not clear the session cookie.
    expect(res.cookies.getAll()).toEqual([])

    // Retries after the deadline are aborted immediately and can't write.
    await new Promise(r => setTimeout(r, 700))
    expect(signals.every(s => s.aborted)).toBe(true)
    expect(res.cookies.getAll()).toEqual([])
  }, 10_000)

  it('still returns the rotated cookies when Auth answers in time', async () => {
    const now = Math.floor(Date.now() / 1000)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      access_token: 'fresh-access',
      refresh_token: 'R1',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      user: { id: 'u1', aud: 'authenticated', email: 's@b.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' },
    }), { status: 200, headers: { 'content-type': 'application/json' } })))

    const { proxy } = await import('@/proxy')
    const res = await proxy(req('/api/bookings'))

    expect(res.status).toBe(200)
    const written = res.cookies.get(COOKIE)?.value ?? ''
    expect(written.startsWith('base64-')).toBe(true)
    const session = JSON.parse(Buffer.from(written.slice('base64-'.length), 'base64url').toString())
    expect(session.refresh_token).toBe('R1')
  })
})
