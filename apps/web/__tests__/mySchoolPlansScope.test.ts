/**
 * GET /api/my/school-plans — before this fix, `schoolIds` always came from
 * every SchoolMember row the user belonged to (any status/role, any
 * school), so a student enrolled at 2+ schools was offered plans from every
 * school mixed together. Now schoolIds collapses to the single active
 * student context's school when resolved (getActiveStudentContext), and
 * the endpoint gains the same staff-only 403 guard already merged for
 * GET/PATCH /api/my (myRouteStaffGuard.test.ts).
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
const mockSchoolMemberFindMany = vi.fn()
const mockSchoolFindMany = vi.fn()
const mockPlanFindMany = vi.fn()
const mockMembershipFindMany = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    schoolMember: { findMany: mockSchoolMemberFindMany },
    school: { findMany: mockSchoolFindMany },
    membershipPlan: { findMany: mockPlanFindMany },
    membership: { findMany: mockMembershipFindMany },
  },
}))

const mockHasDashboardAccess = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({
  hasDashboardAccess: mockHasDashboardAccess,
}))

const mockGetActiveStudentContext = vi.fn()
vi.mock('@/lib/auth/activeContextCookie', () => ({
  getActiveStudentContext: mockGetActiveStudentContext,
}))

const { GET } = await import('@/app/api/my/school-plans/route')

function firstCallWhere(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined
  if (!call) throw new Error('expected mock to have been called')
  return call.where
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
  mockSchoolMemberFindMany.mockResolvedValue([])
  mockSchoolFindMany.mockResolvedValue([])
  mockPlanFindMany.mockResolvedValue([])
  mockMembershipFindMany.mockResolvedValue([])
  mockHasDashboardAccess.mockResolvedValue(false)
  mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
})

describe('GET /api/my/school-plans', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('404s when the user row does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const res = await GET()

    expect(res.status).toBe(404)
  })

  it('single school, no cookie: uses that schoolId directly, no schoolMember lookup needed, 200', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-1' })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.plans).toEqual([])
    expect(mockSchoolMemberFindMany).not.toHaveBeenCalled()
    expect(firstCallWhere(mockPlanFindMany).schoolId).toEqual({ in: ['school-1'] })
  })

  it('2+ schools, no cookie: 409 student_context_required, never queries plans', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ambiguous' })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('student_context_required')
    expect(mockPlanFindMany).not.toHaveBeenCalled()
  })

  it('2+ schools, cookie pointing at school A: only school A plans', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-a' })

    await GET()

    expect(firstCallWhere(mockPlanFindMany).schoolId).toEqual({ in: ['school-a'] })
  })

  it('2+ schools, cookie pointing at school B: only school B plans', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-b' })

    await GET()

    expect(firstCallWhere(mockPlanFindMany).schoolId).toEqual({ in: ['school-b'] })
  })

  it('staff-only account (0 student contexts, has dashboard access): 403', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(true)

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockPlanFindMany).not.toHaveBeenCalled()
  })

  it('brand-new user (0 student contexts, no dashboard access): 200 empty, falls back to the unscoped schoolMember lookup (unchanged pre-existing behaviour)', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(false)
    mockSchoolMemberFindMany.mockResolvedValue([])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.plans).toEqual([])
    expect(mockSchoolMemberFindMany).toHaveBeenCalled()
    expect(mockPlanFindMany).not.toHaveBeenCalled()
  })
})
