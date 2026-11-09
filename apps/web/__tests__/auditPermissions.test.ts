/**
 * Audit Lote 2 (2026-11-09) — requireDashboardPermission(), the real
 * implementation in lib/auth/server.ts (SEC-05, ROLE-01).
 * Only its transitive dependencies are mocked (Supabase session, Prisma,
 * next/headers), same pattern as requireDashboardAccess.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

const mockGetUser = vi.fn()
const mockUserFindUnique = vi.fn()
const mockMemberFindUnique = vi.fn()
const mockMemberCount = vi.fn()
const mockStaffRoleFindUnique = vi.fn()

vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [], get: () => undefined }) }))
vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    userPreference: { findUnique: vi.fn() },
    schoolMember: { findUnique: mockMemberFindUnique, count: mockMemberCount },
    staffRole: { findUnique: mockStaffRoleFindUnique },
  },
}))

const { requireDashboardPermission } = await import('@/lib/auth/server')
const { hasDashboardAccess, DASHBOARD_ROLES } = await import('@/lib/auth/contexts')

function authedAs(globalRole: string) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', role: globalRole, email: 'x@test.com', name: 'X' })
}
function memberOf(role: SchoolMemberRole, opts: { status?: string; customRoleId?: string | null } = {}) {
  mockMemberFindUnique.mockResolvedValue({ role, status: opts.status ?? 'ACTIVE', customRoleId: opts.customRoleId ?? null })
}
const analytics = () => requireDashboardPermission('school.analytics.view', 'school-1')

beforeEach(() => {
  vi.clearAllMocks()
  authedAs('SCHOOL_OWNER')
})

describe('requireDashboardPermission — base roles follow the permission matrix', () => {
  it.each(['OWNER', 'ADMIN', 'MANAGER'] as SchoolMemberRole[])('%s with analytics passes', async (role) => {
    memberOf(role)
    await expect(analytics()).resolves.toMatchObject({ member: { role } })
  })

  it.each(['INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] as SchoolMemberRole[])('%s without analytics is FORBIDDEN', async (role) => {
    memberOf(role)
    await expect(analytics()).rejects.toThrow('FORBIDDEN')
  })

  it('STUDENT is FORBIDDEN even for a permission it has (not a dashboard role)', async () => {
    memberOf('STUDENT')
    await expect(requireDashboardPermission('school.classes.view', 'school-1')).rejects.toThrow('FORBIDDEN')
  })

  it('a member of another school (no row here) is FORBIDDEN', async () => {
    mockMemberFindUnique.mockResolvedValue(null)
    await expect(analytics()).rejects.toThrow('FORBIDDEN')
  })

  it('SUPERADMIN passes without a SchoolMember row', async () => {
    authedAs('SUPERADMIN')
    await expect(analytics()).resolves.toMatchObject({ member: null })
    expect(mockMemberFindUnique).not.toHaveBeenCalled()
  })

  it('no session is UNAUTHORIZED', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(analytics()).rejects.toThrow('UNAUTHORIZED')
  })
})

describe('requireDashboardPermission — CUSTOM roles use their own StaffRole permissions (ROLE-01)', () => {
  it('ACTIVE CUSTOM with the permission passes', async () => {
    memberOf('CUSTOM', { customRoleId: 'role-a' })
    mockStaffRoleFindUnique.mockResolvedValue({ permissions: ['school.analytics.view'] })
    await expect(analytics()).resolves.toMatchObject({ member: { role: 'CUSTOM' } })
    expect(mockStaffRoleFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'role-a' } }))
  })

  it('ACTIVE CUSTOM without the permission is FORBIDDEN', async () => {
    memberOf('CUSTOM', { customRoleId: 'role-b' })
    mockStaffRoleFindUnique.mockResolvedValue({ permissions: ['school.classes.view'] })
    await expect(analytics()).rejects.toThrow('FORBIDDEN')
  })

  it('CUSTOM with no StaffRole attached gets nothing', async () => {
    memberOf('CUSTOM', { customRoleId: null })
    await expect(analytics()).rejects.toThrow('FORBIDDEN')
  })

  it('INACTIVE CUSTOM is FORBIDDEN even with the permission', async () => {
    memberOf('CUSTOM', { customRoleId: 'role-a', status: 'INACTIVE' })
    mockStaffRoleFindUnique.mockResolvedValue({ permissions: ['school.analytics.view'] })
    await expect(analytics()).rejects.toThrow('FORBIDDEN')
  })
})

describe('dashboard entry (ROLE-01)', () => {
  it('CUSTOM is a dashboard role, STUDENT is not', () => {
    expect(DASHBOARD_ROLES).toContain('CUSTOM')
    expect(DASHBOARD_ROLES).not.toContain('STUDENT')
  })

  it('hasDashboardAccess counts ACTIVE CUSTOM members', async () => {
    mockMemberCount.mockResolvedValue(1)
    await expect(hasDashboardAccess('user-1')).resolves.toBe(true)
    expect(mockMemberCount.mock.calls[0]![0].where).toMatchObject({ status: 'ACTIVE', role: { in: expect.arrayContaining(['CUSTOM']) } })
  })
})
