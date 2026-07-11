/**
 * Tests for GET /api/auth/contexts — read-only listing of every {mode,
 * school} pair a user can switch into, plus whatever active context (if
 * any) is currently persisted in the martial_active_context cookie. This is
 * a new, plural endpoint distinct from the pre-existing GET /api/auth/me and
 * POST/DELETE /api/auth/context (currentSchoolId) — see
 * lib/auth/activeContextCookie.ts for why the two cookie mechanisms are kept
 * separate for now.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
}))

const mockListAvailableContexts = vi.fn()
vi.mock('@/lib/auth/activeContext', () => ({
  listAvailableContexts: mockListAvailableContexts,
}))

const mockGetActiveContext = vi.fn()
vi.mock('@/lib/auth/activeContextCookie', () => ({
  getActiveContext: mockGetActiveContext,
}))

const { GET } = await import('@/app/api/auth/contexts/route')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/auth/contexts', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(401)
    expect(mockListAvailableContexts).not.toHaveBeenCalled()
    expect(mockGetActiveContext).not.toHaveBeenCalled()
  })

  it('returns contexts and activeContext: null when there is no cookie', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockListAvailableContexts.mockResolvedValue([])
    mockGetActiveContext.mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.contexts).toEqual([])
    expect(json.activeContext).toBeNull()
  })

  it('returns a populated contexts list', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    const contexts = [
      { mode: 'dashboard', schoolId: 'school-1', schoolName: 'Alpha BJJ', schoolLogoUrl: null, role: 'OWNER', subtitle: null },
    ]
    mockListAvailableContexts.mockResolvedValue(contexts)
    mockGetActiveContext.mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(json.contexts).toEqual(contexts)
    expect(mockListAvailableContexts).toHaveBeenCalledWith('user-1')
  })

  it('reflects the active context when the cookie is present and revalidated as valid', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockListAvailableContexts.mockResolvedValue([])
    mockGetActiveContext.mockResolvedValue({ mode: 'student', schoolId: 'school-2' })

    const res = await GET()
    const json = await res.json()

    expect(json.activeContext).toEqual({ mode: 'student', schoolId: 'school-2' })
    expect(mockGetActiveContext).toHaveBeenCalledWith('user-1')
  })

  it('returns activeContext: null for a manipulated/invalid cookie, without throwing', async () => {
    // getActiveContext() itself does the revalidation (see
    // activeContextCookie.test.ts) — from this route's point of view, an
    // invalid cookie and a missing cookie are indistinguishable, both come
    // back as null with no error thrown.
    mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
    mockListAvailableContexts.mockResolvedValue([])
    mockGetActiveContext.mockResolvedValue(null)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.activeContext).toBeNull()
  })
})
