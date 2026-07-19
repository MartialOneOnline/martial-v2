import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))

const mockUpsert = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { userPreference: { upsert: mockUpsert } } }))

const { POST } = await import('@/app/api/dashboard/getting-started/dismiss/route')

beforeEach(() => {
  vi.clearAllMocks()
  mockUpsert.mockResolvedValue({ userId: 'user-1', gettingStartedDismissedAt: new Date() })
})

describe('POST /api/dashboard/getting-started/dismiss', () => {
  it('401s with no authenticated session, without touching the DB', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await POST()
    expect(res.status).toBe(401)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('upserts gettingStartedDismissedAt for the authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
    const res = await POST()
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', gettingStartedDismissedAt: expect.any(Date) },
      update: { gettingStartedDismissedAt: expect.any(Date) },
    })
  })
})
