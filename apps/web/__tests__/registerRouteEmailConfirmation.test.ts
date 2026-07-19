/**
 * Tests for POST /api/auth/register, focused on the email-confirmation gate
 * (self-serve accounts are created unconfirmed, never auto-signed-in) and
 * the audit fixes layered on top of it:
 * - `emailSent` in the response must reflect the REAL outcome of the
 *   confirmation email send, not a blind assumption — a Resend/Supabase
 *   hiccup must not roll back an already-created account, but the client
 *   must be told the truth so it can offer a resend.
 * - A sanitized `?redirect=` is embedded in the confirmation link so it
 *   survives register -> email -> /auth/confirm -> destination.
 * - Pre-existing behavior (orphan-heal, Prisma-failure rollback, basic
 *   validation) is covered as regression baseline since this route had no
 *   prior test file.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockDisciplineFindMany = vi.fn()
const mockUserFindFirst = vi.fn()
const mockUserCreate = vi.fn()
const mockTransaction = vi.fn()
const mockSchoolFindUnique = vi.fn()
const mockSchoolCreate = vi.fn()
const mockSchoolMemberCreate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    discipline: { findMany: mockDisciplineFindMany },
    user: { findFirst: mockUserFindFirst, create: mockUserCreate },
    $transaction: mockTransaction,
  },
}))

const mockCreateUser = vi.fn()
const mockGenerateLink = vi.fn()
const mockDeleteUser = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: mockCreateUser, generateLink: mockGenerateLink, deleteUser: mockDeleteUser } },
  }),
}))

const mockSignInWithPassword = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
}))

const mockSendConfirmEmail = vi.fn()
vi.mock('@/lib/email/sendConfirmEmail', () => ({
  sendConfirmEmail: mockSendConfirmEmail,
}))

const { POST } = await import('@/app/api/auth/register/route')

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const studentBody = {
  accountType: 'student',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  password: 'password123',
}

const schoolBody = {
  accountType: 'school',
  fullName: 'Jane Owner',
  email: 'owner@example.com',
  password: 'password123',
  school: { name: 'Alpha BJJ', city: 'Madrid', country: 'ES', disciplines: ['bjj'] },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  mockDeleteUser.mockResolvedValue({ error: null })
  mockGenerateLink.mockResolvedValue({ data: { properties: { action_link: 'https://supabase.example/verify?token=abc&type=magiclink' } }, error: null })
  mockSendConfirmEmail.mockResolvedValue({ success: true, emailId: 'email-1' })
  mockUserFindFirst.mockResolvedValue(null)
  mockDisciplineFindMany.mockResolvedValue([{ slug: 'bjj' }])
  mockUserCreate.mockResolvedValue({ id: 'user-1' })
  mockSchoolFindUnique.mockResolvedValue(null)
  mockSchoolCreate.mockResolvedValue({ id: 'school-1' })
  mockSchoolMemberCreate.mockResolvedValue({})
  mockTransaction.mockImplementation(async (fn: any) => fn({
    user: { create: mockUserCreate },
    school: { findUnique: mockSchoolFindUnique, create: mockSchoolCreate },
    schoolMember: { create: mockSchoolMemberCreate },
  }))
})

describe('POST /api/auth/register — unconfirmed by default, no auto-login', () => {
  it('student: creates the Supabase user with email_confirm: false and never signs in client-side', async () => {
    const res = await POST(postRequest(studentBody))
    const json = await res.json()

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ email_confirm: false }))
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true, requiresEmailConfirmation: true, emailSent: true, accountType: 'student' })
  })

  it('school: same, plus schoolId in the response', async () => {
    const res = await POST(postRequest(schoolBody))
    const json = await res.json()

    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ email_confirm: false }))
    expect(json).toEqual({ ok: true, requiresEmailConfirmation: true, emailSent: true, accountType: 'school', schoolId: 'school-1' })
  })

  it('propagates lang through to sendConfirmEmail', async () => {
    await POST(postRequest({ ...studentBody, lang: 'pt' }))

    expect(mockSendConfirmEmail).toHaveBeenCalledWith(expect.objectContaining({ lang: 'pt' }))
  })
})

describe('POST /api/auth/register — honest emailSent (no false success)', () => {
  it('emailSent: false when generateLink fails — account is still created, not rolled back', async () => {
    mockGenerateLink.mockResolvedValue({ data: null, error: { message: 'Supabase down' } })

    const res = await POST(postRequest(studentBody))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.emailSent).toBe(false)
    expect(mockUserCreate).toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('emailSent: false when Resend fails — account is still created, not rolled back', async () => {
    mockSendConfirmEmail.mockResolvedValue({ success: false, error: 'Resend API down' })

    const res = await POST(postRequest(schoolBody))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.emailSent).toBe(false)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/register — ?redirect= preservation', () => {
  it('embeds a sanitized redirect in the confirmation link', async () => {
    await POST(postRequest({ ...studentBody, redirect: '/my/events' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).toContain('/auth/confirm?redirect=')
    expect(call.options.redirectTo).toContain(encodeURIComponent('/my/events'))
  })

  it('never trusts the client redirect blindly — an external URL is dropped server-side', async () => {
    await POST(postRequest({ ...studentBody, redirect: 'https://evil.com' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).not.toContain('evil.com')
    expect(call.options.redirectTo).not.toContain('redirect=')
  })

  it('drops a looping redirect back into /auth/**', async () => {
    await POST(postRequest({ ...studentBody, redirect: '/auth/verify-pending' }))

    const call = mockGenerateLink.mock.calls[0]![0]
    expect(call.options.redirectTo).not.toContain('redirect=')
  })
})

describe('POST /api/auth/register — orphan-heal (legacy Supabase-only user, no Prisma row)', () => {
  it('heals by signing in with the submitted password and proceeds to create the Prisma row', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'orphan-auth-1' } }, error: null })

    const res = await POST(postRequest(studentBody))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ supabaseAuthId: 'orphan-auth-1' }),
    }))
    // Orphan-heal never rolls back on a later Prisma failure — it wasn't newly created this request.
  })

  it('409s EMAIL_ALREADY_EXISTS when the orphan-heal sign-in also fails (wrong password / genuinely someone else\'s account)', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid credentials' } })

    const res = await POST(postRequest(studentBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe('EMAIL_ALREADY_EXISTS')
    expect(mockUserCreate).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/register — Prisma failure rolls back a newly-created Supabase user', () => {
  it('deletes the just-created Supabase user and 409s when the email is already taken in Prisma (race)', async () => {
    mockUserCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } })

    const res = await POST(postRequest(studentBody))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe('EMAIL_ALREADY_EXISTS')
    expect(mockDeleteUser).toHaveBeenCalledWith('auth-1')
  })

  it('does NOT roll back an orphan-healed (pre-existing) Supabase user on the same failure', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: null }, error: { message: 'User already registered' } })
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'orphan-auth-1' } }, error: null })
    mockUserCreate.mockRejectedValue({ code: 'P2002', meta: { target: ['email'] } })

    const res = await POST(postRequest(studentBody))

    expect(res.status).toBe(409)
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })
})

describe('POST /api/auth/register — basic validation (regression baseline)', () => {
  it('400s on missing required fields', async () => {
    const res = await POST(postRequest({ accountType: 'student', email: 'jane@example.com' }))
    expect(res.status).toBe(400)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })

  it('400s on an invalid email', async () => {
    const res = await POST(postRequest({ ...studentBody, email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_EMAIL')
  })

  it('409s up front when a Prisma user already exists for the email — never calls Supabase', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'existing-user' })

    const res = await POST(postRequest(studentBody))

    expect(res.status).toBe(409)
    expect(mockCreateUser).not.toHaveBeenCalled()
  })
})
