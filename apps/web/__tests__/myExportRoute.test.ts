import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))

const mockUserFindUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }))

const { GET } = await import('@/app/api/my/export/route')

const baseUser = {
  id: 'user-1', name: 'Student', email: 'student@example.com', phone: null,
  avatarUrl: null, dateOfBirth: null, createdAt: new Date('2026-01-01'), deletedAt: null,
  bookings: [{ id: 'booking-1' }], eventBookings: [{ id: 'event-booking-1' }], campBookings: [{ id: 'camp-booking-1' }],
  memberships: [{ id: 'membership-1' }], transactions: [{ id: 'transaction-1' }], contentAccesses: [{ id: 'content-access-1' }],
  reviews: [{ id: 'review-1' }], schoolMembers: [{ id: 'school-member-1' }], gradings: [{ id: 'grading-1' }],
  userWaivers: [{ id: 'waiver-1' }], loginHistory: [{ id: 'login-1' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
})

describe('GET /api/my/export', () => {
  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await GET()).status).toBe(401)
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('rejects an already self-deleted account even with a live session', async () => {
    mockUserFindUnique.mockResolvedValue({ ...baseUser, deletedAt: new Date() })
    expect((await GET()).status).toBe(404)
  })

  it('exports the full promised scope of the authenticated user relations as a JSON attachment', async () => {
    mockUserFindUnique.mockResolvedValue(baseUser)

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="my-data.json"')
    expect(json.profile.id).toBe('user-1')
    expect(json.bookings).toEqual([{ id: 'booking-1' }])
    expect(json.eventBookings).toEqual([{ id: 'event-booking-1' }])
    expect(json.campBookings).toEqual([{ id: 'camp-booking-1' }])
    expect(json.contentAccesses).toEqual([{ id: 'content-access-1' }])
    expect(json.reviews).toEqual([{ id: 'review-1' }])
    expect(json.schoolMembers).toEqual([{ id: 'school-member-1' }])
    expect(json.gradings).toEqual([{ id: 'grading-1' }])
    expect(json.waivers).toEqual([{ id: 'waiver-1' }])
    expect(json.loginHistory).toEqual([{ id: 'login-1' }])

    expect(mockUserFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { supabaseAuthId: 'auth-1' } }))
    const firstCall = mockUserFindUnique.mock.calls[0]
    if (!firstCall) throw new Error('Expected user lookup')
    const select = firstCall[0].select
    for (const relation of [
      'bookings', 'eventBookings', 'campBookings', 'memberships', 'transactions',
      'contentAccesses', 'reviews', 'schoolMembers', 'gradings', 'userWaivers', 'loginHistory',
    ]) {
      expect(select[relation]).toBeDefined()
    }
  })
})
