/**
 * Tests for requireDashboardAccess() — apps/web/lib/auth/server.ts.
 *
 * Hardened in this PR to also enforce that the acting SchoolMember has a
 * staff-facing role (DASHBOARD_ROLES), not just an ACTIVE status.
 * requireSchoolAccess() (lib/auth/contexts.ts) only ever checked `status`,
 * never `role` — so a STUDENT with an ACTIVE SchoolMember row passed it
 * just fine. No route called requireDashboardAccess() before this PR
 * (confirmed via `grep -rn "requireDashboardAccess(" apps/web/app` — only
 * comments referenced it), so this is the first real test coverage for it.
 *
 * We test the real implementation (not a mock of lib/auth/server itself),
 * mocking only its transitive dependencies (Supabase SSR session, Prisma,
 * next/headers) — same pattern already used by guardSuperadmin.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

const mockGetUser = vi.fn()
const mockUserFindUnique = vi.fn()
const mockMemberFindUnique = vi.fn()
const mockPrefFindUnique = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [], get: () => undefined }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    userPreference: { findUnique: mockPrefFindUnique },
    schoolMember: { findUnique: mockMemberFindUnique },
  },
}))

const { requireDashboardAccess } = await import('@/lib/auth/server')

const STAFF_ROLES: SchoolMemberRole[] = [
  'OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST',
]

// Authenticates as a Prisma User with the given *global* Role (SUPERADMIN,
// SCHOOL_OWNER, STUDENT, ...) — independent from the school-level
// SchoolMember.role tested below, exactly like production (see
// hasDashboardAccess's doc comment on why the two roles can diverge).
function authedAs(globalRole: string, id = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: `auth-${id}` } } })
  mockUserFindUnique.mockResolvedValue({ id, role: globalRole, email: 'x@test.com', name: 'X' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('requireDashboardAccess()', () => {
  it('throws UNAUTHORIZED when there is no session', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    await expect(requireDashboardAccess('school-1')).rejects.toThrow('UNAUTHORIZED')
  })

  it('bypasses the SchoolMember check entirely for SUPERADMIN', async () => {
    authedAs('SUPERADMIN')

    const result = await requireDashboardAccess('school-1')

    expect(result.member).toBeNull()
    expect(result.user.role).toBe('SUPERADMIN')
    expect(mockMemberFindUnique).not.toHaveBeenCalled()
  })

  it('throws FORBIDDEN for a STUDENT with an ACTIVE SchoolMember row (the bug this PR closes)', async () => {
    authedAs('SCHOOL_OWNER') // global role is unrelated to the school-level role being tested
    mockMemberFindUnique.mockResolvedValue({ role: 'STUDENT', status: 'ACTIVE' })

    await expect(requireDashboardAccess('school-1')).rejects.toThrow('FORBIDDEN')
  })

  it.each(STAFF_ROLES)('passes for a staff SchoolMember role (%s) and returns { user, member }', async (role) => {
    authedAs('SCHOOL_OWNER')
    mockMemberFindUnique.mockResolvedValue({ role, status: 'ACTIVE' })

    const result = await requireDashboardAccess('school-1')

    expect(result.member).toEqual({ role, status: 'ACTIVE' })
    expect(result.user.id).toBe('user-1')
  })

  it('throws FORBIDDEN when the user has no SchoolMember row in that school at all', async () => {
    authedAs('SCHOOL_OWNER')
    mockMemberFindUnique.mockResolvedValue(null)

    await expect(requireDashboardAccess('school-1')).rejects.toThrow('FORBIDDEN')
  })

  it('throws FORBIDDEN for a non-ACTIVE staff SchoolMember row (status still gates, unchanged)', async () => {
    authedAs('SCHOOL_OWNER')
    mockMemberFindUnique.mockResolvedValue({ role: 'OWNER', status: 'FROZEN' })

    await expect(requireDashboardAccess('school-1')).rejects.toThrow('FORBIDDEN')
  })
})
