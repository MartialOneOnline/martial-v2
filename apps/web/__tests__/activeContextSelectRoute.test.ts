/**
 * Tests for POST/DELETE /api/auth/context/select — sets/clears the
 * martial_active_context cookie for the Facebook-style context switcher.
 * Deliberately a new path, not new methods on the pre-existing
 * api/auth/context/route.ts (currentSchoolId) — see
 * lib/auth/activeContextCookie.ts for why.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
}))

const mockIsValidContext = vi.fn()
vi.mock('@/lib/auth/activeContext', () => ({
  ACTIVE_CONTEXT_MODES: ['dashboard', 'student'],
  isValidContext: mockIsValidContext,
}))

const mockUpsert = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    userPreference: { upsert: mockUpsert },
  },
}))

const { ACTIVE_CONTEXT_COOKIE_NAME, ACTIVE_CONTEXT_COOKIE_MAX_AGE, CURRENT_SCHOOL_ID_COOKIE_NAME } =
  await vi.importActual<typeof import('@/lib/auth/activeContextCookie')>('@/lib/auth/activeContextCookie')

const { POST, DELETE } = await import('@/app/api/auth/context/select/route')

function postRequest(body: unknown) {
  return new Request('http://localhost/api/auth/context/select', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/auth/context/select', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1' }))

    expect(res.status).toBe(401)
    expect(mockIsValidContext).not.toHaveBeenCalled()
  })

  it('200s a valid context, sets the cookie, and echoes {activeContext}', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(true)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ activeContext: { mode: 'dashboard', schoolId: 'school-1' } })

    const cookie = res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)
    expect(cookie).toBeDefined()
    expect(JSON.parse(cookie!.value)).toEqual({ mode: 'dashboard', schoolId: 'school-1' })
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.sameSite).toBe('lax')
    expect(cookie!.path).toBe('/')
    expect(cookie!.maxAge).toBe(ACTIVE_CONTEXT_COOKIE_MAX_AGE)
  })

  it('403s when isValidContext rejects the context (valid shape, wrong role for that school) and sets no cookie', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(false)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1' }))

    expect(res.status).toBe(403)
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
  })

  it('403s when schoolId belongs to another user (isValidContext does the DB check)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(false)

    const res = await POST(postRequest({ mode: 'student', schoolId: 'someone-elses-school' }))

    expect(res.status).toBe(403)
    expect(mockIsValidContext).toHaveBeenCalledWith('user-1', { mode: 'student', schoolId: 'someone-elses-school' })
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
  })

  it('400s when mode is outside the whitelist', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'admin', schoolId: 'school-1' }))

    expect(res.status).toBe(400)
    expect(mockIsValidContext).not.toHaveBeenCalled()
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
  })

  it('400s when mode does not match case-exactly (e.g. "DASHBOARD")', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'DASHBOARD', schoolId: 'school-1' }))

    expect(res.status).toBe(400)
  })

  it('400s when schoolId is an empty string', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: '' }))

    expect(res.status).toBe(400)
    expect(mockIsValidContext).not.toHaveBeenCalled()
  })

  it('400s when schoolId is the wrong type (number)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 42 }))

    expect(res.status).toBe(400)
  })

  it('400s when schoolId is the wrong type (array)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: ['school-1'] }))

    expect(res.status).toBe(400)
  })

  it('ignores extra fields in the body — never reflected in the response', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(true)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1', role: 'SUPERADMIN', extra: 'x' }))
    const json = await res.json()

    expect(json).toEqual({ activeContext: { mode: 'dashboard', schoolId: 'school-1' } })
    expect(mockIsValidContext).toHaveBeenCalledWith('user-1', { mode: 'dashboard', schoolId: 'school-1' })
  })
})

// Bug fix under test: the 57 /api/dashboard/** routes only ever read the
// pre-existing currentSchoolId cookie, never martial_active_context. Before
// this fix, selecting a 'dashboard' context here left currentSchoolId
// untouched/stale, so the dashboard kept serving whatever school it last
// pointed to (or none) instead of the one just chosen.
describe('POST /api/auth/context/select — currentSchoolId sync (dashboard-mode bug fix)', () => {
  it("mode: 'dashboard' valid → 200, Set-Cookie has BOTH cookies with the same schoolId, and upserts UserPreference.lastSchoolId", async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(true)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1' }))

    expect(res.status).toBe(200)

    const activeCookie = res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)
    expect(activeCookie).toBeDefined()
    expect(JSON.parse(activeCookie!.value)).toEqual({ mode: 'dashboard', schoolId: 'school-1' })

    const schoolCookie = res.cookies.get(CURRENT_SCHOOL_ID_COOKIE_NAME)
    expect(schoolCookie).toBeDefined()
    expect(schoolCookie!.value).toBe('school-1')
    expect(schoolCookie!.httpOnly).toBe(true)
    expect(schoolCookie!.sameSite).toBe('lax')
    expect(schoolCookie!.path).toBe('/')
    expect(schoolCookie!.maxAge).toBe(60 * 60 * 24 * 7)
    // Deliberately a different (shorter) TTL than martial_active_context's 60 days.
    expect(schoolCookie!.maxAge).not.toBe(ACTIVE_CONTEXT_COOKIE_MAX_AGE)

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', lastSchoolId: 'school-1', lastContextType: 'SCHOOL' },
      update: { lastSchoolId: 'school-1', lastContextType: 'SCHOOL' },
    })
  })

  it("mode: 'student' valid → 200, Set-Cookie has ONLY martial_active_context — no currentSchoolId cookie at all, no upsert", async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(true)

    const res = await POST(postRequest({ mode: 'student', schoolId: 'school-1' }))

    expect(res.status).toBe(200)
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeDefined()
    expect(res.cookies.get(CURRENT_SCHOOL_ID_COOKIE_NAME)).toBeUndefined()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("mode: 'dashboard' but isValidContext() returns false (403) → no cookie at all is set (neither old nor new)", async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockIsValidContext.mockResolvedValue(false)

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: 'school-1' }))

    expect(res.status).toBe(403)
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
    expect(res.cookies.get(CURRENT_SCHOOL_ID_COOKIE_NAME)).toBeUndefined()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('mode outside the whitelist (400) → no cookie at all is set', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'admin', schoolId: 'school-1' }))

    expect(res.status).toBe(400)
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
    expect(res.cookies.get(CURRENT_SCHOOL_ID_COOKIE_NAME)).toBeUndefined()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('schoolId empty/wrong type (400) → no cookie at all is set', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(postRequest({ mode: 'dashboard', schoolId: '' }))

    expect(res.status).toBe(400)
    expect(res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)).toBeUndefined()
    expect(res.cookies.get(CURRENT_SCHOOL_ID_COOKIE_NAME)).toBeUndefined()
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/auth/context/select', () => {
  it('clears the cookie and responds { ok: true } without requiring a session', async () => {
    const res = await DELETE()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
    expect(mockGetAuthUser).not.toHaveBeenCalled()

    const cookie = res.cookies.get(ACTIVE_CONTEXT_COOKIE_NAME)
    expect(cookie?.value).toBe('')
    expect(cookie?.maxAge).toBe(0)
  })
})
