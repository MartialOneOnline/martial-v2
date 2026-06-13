/**
 * Tests for guardSuperadmin() — Priority 1 security guard.
 *
 * We test the guard logic directly by mocking Supabase auth and Prisma.
 * guardSuperadmin() reads the cookie session via Supabase SSR and checks the DB role.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockFindUnique = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockFindUnique },
    userPreference: { findUnique: vi.fn() },
  },
}))

// cookies() is called inside getAuthUser(), not guardSuperadmin directly for our path
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const { guardSuperadmin } = await import('@/lib/auth/server')

function makeRequest() {
  return new NextRequest('http://localhost/api/admin/test', {
    method: 'GET',
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('guardSuperadmin()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await guardSuperadmin(makeRequest())

    expect(result).not.toBeNull()
    expect(result!.status).toBe(401)
    const body = await result!.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 when user exists but role is not SUPERADMIN', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-123' } } })
    mockFindUnique.mockResolvedValue({ role: 'STUDENT' })

    const result = await guardSuperadmin(makeRequest())

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
    const body = await result!.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 403 when auth user has no DB record', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-999' } } })
    mockFindUnique.mockResolvedValue(null)

    const result = await guardSuperadmin(makeRequest())

    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })

  it('returns null (allow) when user is SUPERADMIN', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-sa' } } })
    mockFindUnique.mockResolvedValue({ role: 'SUPERADMIN' })

    const result = await guardSuperadmin(makeRequest())

    expect(result).toBeNull()
  })
})
