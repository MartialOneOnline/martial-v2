/**
 * Regression coverage for migrating GET /api/auth/me and GET /api/admin/me
 * to the shared getAuthUser() helper (previously each duplicated its own
 * Supabase+prisma lookup with no deletedAt check — see the delete-account
 * PII/auth-surface review). getAuthUser() itself already gates on deletedAt
 * (apps/web/__tests__/authServerDeletedAt.test.ts); this file only confirms
 * both routes are actually wired to it and reject a null result.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined }) }))

const mockPreferenceFindUnique = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { userPreference: { findUnique: mockPreferenceFindUnique } } }))

const mockGetUserContexts = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({ getUserContexts: mockGetUserContexts }))

const { GET: authMeGET } = await import('@/app/api/auth/me/route')
const { GET: adminMeGET } = await import('@/app/api/admin/me/route')

beforeEach(() => {
  vi.clearAllMocks()
  mockPreferenceFindUnique.mockResolvedValue(null)
  mockGetUserContexts.mockResolvedValue([])
})

describe('GET /api/auth/me', () => {
  it('401s (via getAuthUser() returning null) when there is no session or the account is self-deleted', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await authMeGET()
    expect(res.status).toBe(401)
    expect(mockPreferenceFindUnique).not.toHaveBeenCalled()
  })

  it('200s with the resolved identity for a real session', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'STUDENT', email: 'a@example.com', name: 'Alice' })
    const res = await authMeGET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.user.id).toBe('user-1')
  })
})

describe('GET /api/admin/me', () => {
  it('401s (via getAuthUser() returning null) when there is no session or the account is self-deleted', async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await adminMeGET()
    expect(res.status).toBe(401)
  })

  it('403s a real but non-SUPERADMIN session', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'STUDENT', email: 'a@example.com', name: 'Alice' })
    const res = await adminMeGET()
    expect(res.status).toBe(403)
  })

  it('200s a real SUPERADMIN session', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SUPERADMIN', email: 'a@example.com', name: 'Alice' })
    const res = await adminMeGET()
    expect(res.status).toBe(200)
  })
})
