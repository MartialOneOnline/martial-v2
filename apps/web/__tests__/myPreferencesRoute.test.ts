import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))

const mockUserFindUnique = vi.fn()
const mockUpsert = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: mockUserFindUnique },
  userPreference: { upsert: mockUpsert },
} }))

const { GET, PATCH } = await import('@/app/api/my/preferences/route')

const defaults = {
  notifyClassReminders: true,
  notifyBookingConfirmed: true,
  notifyMembershipUpdates: true,
  notifyPromotions: false,
}

function patch(body: unknown) {
  return new Request('http://localhost/api/my/preferences', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: null })
  mockUpsert.mockResolvedValue(defaults)
})

describe('/api/my/preferences', () => {
  it('requires authentication for reads', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await GET()).status).toBe(401)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects an already self-deleted account even with a live session', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() })
    expect((await GET()).status).toBe(401)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('creates default preferences on first GET', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ preferences: defaults })
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' }, create: { userId: 'user-1' }, update: {},
    }))
  })

  it('persists a supported boolean preference for the authenticated user', async () => {
    const res = await PATCH(patch({ notifyPromotions: true }))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', notifyPromotions: true },
      update: { notifyPromotions: true },
    }))
  })

  it('rejects non-boolean and unsupported-only payloads', async () => {
    expect((await PATCH(patch({ notifyPromotions: 'yes' }))).status).toBe(400)
    expect((await PATCH(patch({ role: 'SUPERADMIN' }))).status).toBe(400)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
