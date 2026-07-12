/**
 * GET /api/my/events — before this fix, `myBookings` (event ticket
 * purchases) and the schools used to compute visible published events were
 * never scoped to a single school, so a student enrolled at 2+ schools saw
 * every school's events and event-bookings mixed together. Now both are
 * scoped to the active student context (getActiveStudentContext), and the
 * endpoint gains the same staff-only 403 guard already merged for
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
const mockEventBookingFindMany = vi.fn()
const mockSchoolMemberFindMany = vi.fn()
const mockEventFindMany = vi.fn()
const mockEventBookingGroupBy = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    eventBooking: { findMany: mockEventBookingFindMany, groupBy: mockEventBookingGroupBy },
    schoolMember: { findMany: mockSchoolMemberFindMany },
    event: { findMany: mockEventFindMany },
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

const { GET } = await import('@/app/api/my/events/route')

function firstCallWhere(mock: ReturnType<typeof vi.fn>) {
  const call = mock.mock.calls[0]?.[0] as { where: Record<string, unknown> } | undefined
  if (!call) throw new Error('expected mock to have been called')
  return call.where
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', name: 'Test', email: 't@example.com' })
  mockEventBookingFindMany.mockResolvedValue([])
  mockSchoolMemberFindMany.mockResolvedValue([])
  mockEventFindMany.mockResolvedValue([])
  mockEventBookingGroupBy.mockResolvedValue([])
  mockHasDashboardAccess.mockResolvedValue(false)
  mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
})

describe('GET /api/my/events', () => {
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

  it('single school (no cookie needed): scopes myBookings + events to that school', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-1' })

    const res = await GET()

    expect(res.status).toBe(200)
    expect(firstCallWhere(mockEventBookingFindMany).event).toEqual({ schoolId: 'school-1' })
    expect(firstCallWhere(mockEventFindMany).schoolId).toEqual({ in: ['school-1'] })
    expect(mockSchoolMemberFindMany).not.toHaveBeenCalled()
  })

  it('2+ schools, no cookie: 409 student_context_required, never queries events/bookings', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ambiguous' })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('student_context_required')
    expect(mockEventBookingFindMany).not.toHaveBeenCalled()
    expect(mockEventFindMany).not.toHaveBeenCalled()
  })

  it('2+ schools, cookie pointing at school A: only school A data', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-a' })

    await GET()

    expect((firstCallWhere(mockEventBookingFindMany).event as { schoolId: string }).schoolId).toBe('school-a')
    expect(firstCallWhere(mockEventFindMany).schoolId).toEqual({ in: ['school-a'] })
  })

  it('2+ schools, cookie pointing at school B: only school B data', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'ok', schoolId: 'school-b' })

    await GET()

    expect((firstCallWhere(mockEventBookingFindMany).event as { schoolId: string }).schoolId).toBe('school-b')
    expect(firstCallWhere(mockEventFindMany).schoolId).toEqual({ in: ['school-b'] })
  })

  it('staff-only account (0 student contexts, has dashboard access): 403', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(true)

    const res = await GET()

    expect(res.status).toBe(403)
    expect(mockEventBookingFindMany).not.toHaveBeenCalled()
  })

  it('brand-new user (0 student contexts, no dashboard access): 200, falls back to the unscoped schoolMember lookup (unchanged pre-existing behaviour)', async () => {
    mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
    mockHasDashboardAccess.mockResolvedValue(false)
    mockSchoolMemberFindMany.mockResolvedValue([])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.events).toEqual([])
    expect(firstCallWhere(mockEventBookingFindMany).event).toBeUndefined()
    expect(mockSchoolMemberFindMany).toHaveBeenCalled()
  })
})
