/**
 * GET/PATCH /api/my — before this fix, schoolMembers was fetched with no
 * role filter (`schoolMembers[0]` in app/my/profile/page.tsx picked whatever
 * row came back first), so a staff-only account's OWNER/ADMIN/... SchoolMember
 * row rendered as a fake, empty student profile. Now the query is scoped to
 * role: 'STUDENT' and both handlers 403 a caller who has staff (dashboard)
 * access but no real STUDENT membership anywhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
  },
}))

vi.mock('@/lib/school-modules', () => ({
  getSchoolModules: (m: unknown) => m,
}))

const mockHasDashboardAccess = vi.fn()
const mockHasStudentAccess = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({
  hasDashboardAccess: mockHasDashboardAccess,
  hasStudentAccess: mockHasStudentAccess,
}))

const { GET, PATCH } = await import('@/app/api/my/route')

function baseUser(schoolMembers: unknown[]) {
  return {
    id: 'user-1', name: 'Test', email: 't@example.com', phone: null,
    avatarUrl: null, dateOfBirth: null, role: 'STUDENT',
    memberships: [],
    bookings: [],
    schoolMembers,
    gradings: [],
  }
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/my', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
})

describe('GET /api/my', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('403s a staff-only account (dashboard access, no STUDENT membership)', async () => {
    // The route's own schoolMembers query already filters role: 'STUDENT',
    // so a staff-only account naturally comes back with an empty list.
    mockUserFindUnique.mockResolvedValue(baseUser([]))
    mockHasDashboardAccess.mockResolvedValue(true)

    const res = await GET()

    expect(res.status).toBe(403)
  })

  it('200s a normal STUDENT account', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser([
      { id: 'sm-1', belt: 'Blue Belt', beltDegree: 1, beltDate: null, role: 'STUDENT', status: 'ACTIVE', school: null },
    ]))
    mockHasDashboardAccess.mockResolvedValue(false)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.user.schoolMembers).toHaveLength(1)
  })

  it('200s a staff account that is *also* a real STUDENT somewhere (dual role)', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser([
      { id: 'sm-1', belt: null, beltDegree: null, beltDate: null, role: 'STUDENT', status: 'ACTIVE', school: null },
    ]))
    mockHasDashboardAccess.mockResolvedValue(true)

    const res = await GET()

    expect(res.status).toBe(200)
  })

  it('200s a user with no SchoolMember at all (unchanged pre-existing behaviour)', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser([]))
    mockHasDashboardAccess.mockResolvedValue(false)

    const res = await GET()

    expect(res.status).toBe(200)
  })

  it('404s when the user row does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/my', () => {
  beforeEach(() => {
    mockUserUpdate.mockResolvedValue({ id: 'user-1', name: 'New Name', phone: null, dateOfBirth: null, avatarUrl: null })
  })

  it('401s when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await PATCH(patchRequest({ name: 'New Name' }))

    expect(res.status).toBe(401)
  })

  it('403s a staff-only account and never touches prisma.user.update', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
    mockHasDashboardAccess.mockResolvedValue(true)
    mockHasStudentAccess.mockResolvedValue(false)

    const res = await PATCH(patchRequest({ name: 'New Name' }))

    expect(res.status).toBe(403)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })

  it('allows a normal STUDENT account to update their profile', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
    mockHasDashboardAccess.mockResolvedValue(false)
    mockHasStudentAccess.mockResolvedValue(false)

    const res = await PATCH(patchRequest({ name: 'New Name' }))

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalled()
  })

  it('allows a staff account that is also a real STUDENT (dual role)', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
    mockHasDashboardAccess.mockResolvedValue(true)
    mockHasStudentAccess.mockResolvedValue(true)

    const res = await PATCH(patchRequest({ name: 'New Name' }))

    expect(res.status).toBe(200)
    expect(mockUserUpdate).toHaveBeenCalled()
  })
})
