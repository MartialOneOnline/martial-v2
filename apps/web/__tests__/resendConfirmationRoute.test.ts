/**
 * Tests for POST /api/auth/resend-confirmation.
 *
 * Security contract under test (P1 audit findings):
 * - Response is always { ok: true }, regardless of whether the email exists,
 *   is malformed, is already confirmed, or is rate limited — anything more
 *   specific would let this public endpoint enumerate registered/confirmed
 *   accounts.
 * - A magiclink is generated ONLY for a genuinely unconfirmed account. An
 *   already-confirmed account must be a silent no-op — this endpoint must
 *   never become a passwordless-login channel for confirmed users.
 * - Per-IP and per-email rate limiting short-circuits before any DB/Supabase
 *   call.
 * - The sanitized ?redirect= (if any) is embedded in the generated link's
 *   redirectTo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFindFirst = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: { user: { findFirst: mockFindFirst } },
}))

const mockGetUserById = vi.fn()
const mockGenerateLink = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { getUserById: mockGetUserById, generateLink: mockGenerateLink } },
  }),
}))

const mockSendConfirmEmail = vi.fn()
vi.mock('@/lib/email/sendConfirmEmail', () => ({
  sendConfirmEmail: mockSendConfirmEmail,
}))

const mockIsRateLimited = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  isRateLimited: mockIsRateLimited,
}))

const { POST } = await import('@/app/api/auth/resend-confirmation/route')

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/resend-confirmation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsRateLimited.mockReturnValue(false)
  mockGenerateLink.mockResolvedValue({ data: { properties: { action_link: 'https://supabase.example/verify?token=abc&type=magiclink' } }, error: null })
  mockSendConfirmEmail.mockResolvedValue({ success: true, emailId: 'email-1' })
})

describe('POST /api/auth/resend-confirmation — indistinguishable no-op cases', () => {
  it('always responds { ok: true } for an invalid email format, without touching the DB', async () => {
    const res = await POST(postRequest({ email: 'not-an-email' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('responds { ok: true } for a well-formed but unregistered email, and generates no link', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await POST(postRequest({ email: 'nobody@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGenerateLink).not.toHaveBeenCalled()
    expect(mockSendConfirmEmail).not.toHaveBeenCalled()
  })

  it('responds { ok: true } for an already-confirmed account and does NOT generate a link (anti passwordless-login)', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: '2026-01-01T00:00:00Z' } }, error: null })

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGetUserById).toHaveBeenCalledWith('auth-1')
    expect(mockGenerateLink).not.toHaveBeenCalled()
    expect(mockSendConfirmEmail).not.toHaveBeenCalled()
  })

  it('is a no-op when the Prisma user has no supabaseAuthId (data integrity edge case)', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: null })

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGetUserById).not.toHaveBeenCalled()
  })

  it('malformed JSON body responds { ok: true } without throwing', async () => {
    const req = new NextRequest('http://localhost/api/auth/resend-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })
})

describe('POST /api/auth/resend-confirmation — genuinely pending account (happy path)', () => {
  it('generates a magiclink and sends it for a still-unconfirmed account', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })

    const res = await POST(postRequest({ email: 'jane@example.com', lang: 'es' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({
      type: 'magiclink',
      email: 'jane@example.com',
    }))
    expect(mockSendConfirmEmail).toHaveBeenCalledWith(expect.objectContaining({
      recipientEmail: 'jane@example.com',
      name: 'Jane',
      confirmUrl: 'https://supabase.example/verify?token=abc&type=magiclink',
      lang: 'es',
    }))
  })

  it('embeds a sanitized ?redirect= in the generated link redirectTo', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })

    await POST(postRequest({ email: 'jane@example.com', redirect: '/my/events' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).toContain('/auth/confirm?redirect=')
    expect(call.options.redirectTo).toContain(encodeURIComponent('/my/events'))
  })

  it('drops an unsafe ?redirect= (external host) instead of embedding it', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })

    await POST(postRequest({ email: 'jane@example.com', redirect: 'https://evil.com' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).not.toContain('redirect=')
    expect(call.options.redirectTo).not.toContain('evil.com')
  })

  it('drops a looping ?redirect= back into /auth/**', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })

    await POST(postRequest({ email: 'jane@example.com', redirect: '/auth/verify-pending' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).not.toContain('redirect=')
  })
})

describe('POST /api/auth/resend-confirmation — rate limiting', () => {
  it('short-circuits on a rate-limited IP before touching the DB', async () => {
    mockIsRateLimited.mockImplementation((key: string) => key.startsWith('resend-confirmation:ip:'))

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('short-circuits on a rate-limited email before touching Supabase', async () => {
    mockIsRateLimited.mockImplementation((key: string) => key.startsWith('resend-confirmation:email:'))

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/resend-confirmation — upstream failures degrade to the same generic response', () => {
  it('generateLink failure still responds { ok: true } and never calls sendConfirmEmail', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })
    mockGenerateLink.mockResolvedValue({ data: null, error: { message: 'Supabase down' } })

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockSendConfirmEmail).not.toHaveBeenCalled()
  })

  it('sendConfirmEmail (Resend) failure still responds { ok: true }, without throwing', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: { user: { email_confirmed_at: null } }, error: null })
    mockSendConfirmEmail.mockResolvedValue({ success: false, error: 'Resend API down' })

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })

  it('a getUserById lookup failure is treated as "do not send" (fail safe), not "send anyway"', async () => {
    mockFindFirst.mockResolvedValue({ name: 'Jane', supabaseAuthId: 'auth-1' })
    mockGetUserById.mockResolvedValue({ data: null, error: { message: 'lookup failed' } })

    const res = await POST(postRequest({ email: 'jane@example.com' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })
})
