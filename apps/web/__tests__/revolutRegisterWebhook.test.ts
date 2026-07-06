/**
 * Tests for POST /api/dashboard/revolut/register-webhook.
 *
 * Covers the root cause found in production: Revolut returns HTTP 400 with
 * code 1041 (not the 422 the docs describe) when a webhook already exists
 * for the URL — the route must recover from that by deleting the stale
 * registration and recreating it, rather than surfacing a generic error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))
vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockFindUnique, update: mockUpdate },
  },
}))

const { POST } = await import('@/app/api/dashboard/revolut/register-webhook/route')

function makeRequest(origin = 'https://martial-v2-web.vercel.app') {
  return new NextRequest('http://localhost/api/dashboard/revolut/register-webhook', {
    method: 'POST',
    headers: { origin },
  })
}

describe('POST /api/dashboard/revolut/register-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'STUDENT' })
    mockGetCurrentSchoolId.mockResolvedValue('school-1')
  })

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 403 for STUDENT role (only OWNER/ADMIN may register)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'STUDENT' })
    mockRequireSchoolAccess.mockResolvedValue({ role: 'STUDENT' })
    const res = await POST(makeRequest())
    expect(res.status).toBe(403)
  })

  it('allows OWNER role', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'STUDENT' })
    mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: 'sk_real_secret_key' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signing_secret: 'wsk_new' }),
    }))

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)
  })

  it('returns 400 when no Revolut secret key is saved', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: null })
    const res = await POST(makeRequest())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/secret key/i)
  })

  it('refuses to register a localhost webhook URL in production', async () => {
    const originalEnv = process.env.NODE_ENV
    // @ts-expect-error — test-only override of a readonly-in-types env var
    process.env.NODE_ENV = 'production'
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: 'sk_real_secret_key' })

    const res = await POST(makeRequest('http://localhost:3000'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/production/i)

    // @ts-expect-error — restore
    process.env.NODE_ENV = originalEnv
  })

  it('recovers from a 400/code-1041 "webhook already exists" by deleting the stale one and recreating', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: 'sk_real_secret_key' })

    const fetchMock = vi.fn()
      // 1) initial create → Revolut says "already exists" via code 1041, HTTP 400
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ timestamp: Date.now(), code: 1041, errorId: 'err-1' }),
      })
      // 2) list existing webhooks
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([{ id: 'stale-id', url: 'https://martial-v2-web.vercel.app/api/webhooks/revolut' }]),
      })
      // 3) delete stale webhook
      .mockResolvedValueOnce({ ok: true, status: 204 })
      // 4) recreate — succeeds this time
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-id', signing_secret: 'wsk_fresh_secret' }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.signatureVerificationEnabled).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'school-1' },
      data: { revolutWebhookSecret: 'wsk_fresh_secret' },
    })
    // The signing secret must never appear in the response sent to the browser.
    expect(JSON.stringify(body)).not.toContain('wsk_fresh_secret')
  })

  it('surfaces the real Revolut error (status + code + errorId) for non-duplicate failures', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: 'sk_real_secret_key' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ code: 9999, message: 'Invalid API key', errorId: 'err-9' }),
    }))

    const res = await POST(makeRequest())
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/401/)
    expect(body.error).toMatch(/9999/)
    expect(body.revolutErrorId).toBe('err-9')
  })

  it('never sends the real secret key as a bearer token typo (e.g. the public key)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN' })
    mockFindUnique.mockResolvedValue({ revolutSecretKey: 'sk_the_real_secret' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signing_secret: 'wsk_x' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await POST(makeRequest())

    // Asserted explicitly (not just a `!`) so this fails with a clear message
    // if the route ever stops calling fetch, instead of a cryptic destructure
    // error — .mock.calls[0] is typed as possibly undefined regardless.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, options] = fetchMock.mock.calls[0]!
    expect(options.headers.Authorization).toBe('Bearer sk_the_real_secret')
  })
})
