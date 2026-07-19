/**
 * GET /api/my/payments — before this fix, `where` only filtered by
 * `userId`, so a student enrolled at 2+ schools got every school's
 * transaction history mixed into one paginated list. Now the query is
 * scoped to schoolId from the active student context
 * (getActiveStudentContext), and the endpoint gains the same staff-only 403
 * guard already merged for GET/PATCH /api/my (myRouteStaffGuard.test.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const mockUserFindUnique = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockTransactionCount = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    transaction: { findMany: mockTransactionFindMany, count: mockTransactionCount },
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

const { GET } = await import('@/app/api/my/payments/route')

function req() {
  return new NextRequest('http://localhost/api/my/payments')
}

function firstCallWhere(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined
  if (!call) throw new Error('expected mock to have been called')
  return call.where
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
  mockTransactionFindMany.mockResolvedValue([])
  mockTransactionCount.mockResolvedValue(0)
  mockHasDashboardAccess.mockResolvedValue(false)
  mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
})

describe('GET /api/my/payments', () => {
  it('401s when there is no authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET(req())

    expect(res.status).toBe(401)
  })

  it('401s when the user row does not exist (now routed through the shared getAuthUser() gate)', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const res = await GET(req())

    expect(res.status).toBe(401)
  })

  it('401s a self-deleted (anonymized) account even with a live Supabase session', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() })

    const res = await GET(req())

    expect(res.status).toBe(401)
    expect(mockTransactionFindMany).not.toHaveBeenCalled()
  })

  it('single school, no cookie: scopes by that schoolId, 200', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-1' })

    const res = await GET(req())

    expect(res.status).toBe(200)
    expect(firstCallWhere(mockTransactionFindMany).schoolId).toBe('school-1')
  })

  it('2+ schools, no cookie: 409 student_context_required, never queries transactions', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ambiguous' })

    const res = await GET(req())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('student_context_required')
    expect(mockTransactionFindMany).not.toHaveBeenCalled()
    expect(mockTransactionCount).not.toHaveBeenCalled()
  })

  it('2+ schools, cookie pointing at school A: only school A data', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-a' })

    await GET(req())

    expect(firstCallWhere(mockTransactionFindMany).schoolId).toBe('school-a')
  })

  it('2+ schools, cookie pointing at school B: only school B data', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-b' })

    await GET(req())

    expect(firstCallWhere(mockTransactionFindMany).schoolId).toBe('school-b')
  })

  it('staff-only account (0 student contexts, has dashboard access): 403', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(true)

    const res = await GET(req())

    expect(res.status).toBe(403)
    expect(mockTransactionFindMany).not.toHaveBeenCalled()
  })

  it('brand-new user (0 student contexts, no dashboard access): 200, unfiltered by school (unchanged pre-existing behaviour)', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(false)

    const res = await GET(req())

    expect(res.status).toBe(200)
    expect(firstCallWhere(mockTransactionFindMany).schoolId).toBeUndefined()
  })
})
