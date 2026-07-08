/**
 * Route-level authorization matrix — verifies the actual dashboard API
 * handlers enforce the conservative permission policy end-to-end, not just
 * that hasPermission() returns the right booleans in isolation (see
 * permissions.test.ts). This is what a reviewer actually cares about: can a
 * MANAGER hit DELETE and get through?
 *
 * Strategy: mock getAuthUser/getCurrentSchoolId/requireSchoolAccess so we
 * control the acting SchoolMember role, then call the route handler with a
 * minimal/invalid body. Every handler here runs its permission check before
 * touching the request body or Prisma, so a denied role always gets 403 and
 * an allowed role always gets past 403 into ordinary validation (400/404) —
 * that boundary is exactly what we're asserting, not the business logic.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))

vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))

const mockClassFindFirst = vi.fn()
const mockPlanFindFirst = vi.fn()
const mockSchoolMemberFindFirst = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: mockClassFindFirst },
    membershipPlan: { findFirst: mockPlanFindFirst },
    schoolMember: { findFirst: mockSchoolMemberFindFirst },
  },
}))

const classesRoute = await import('@/app/api/dashboard/classes/route')
const classByIdRoute = await import('@/app/api/dashboard/classes/[id]/route')
const planByIdRoute = await import('@/app/api/dashboard/membership-plans/[id]/route')
const bulkRoute = await import('@/app/api/dashboard/members/bulk/route')
const memberByIdRoute = await import('@/app/api/dashboard/members/[id]/route')
const membershipRoute = await import('@/app/api/dashboard/members/[id]/membership/route')

const ALL_ROLES: SchoolMemberRole[] = [
  'OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST', 'STUDENT',
]

function setActingRole(role: SchoolMemberRole) {
  mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role, status: 'ACTIVE' })
}

function jsonRequest(url: string, method: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function idParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// Runs `action` once per role and asserts 403 exactly for the denied roles.
async function expectRoleGate(allowedRoles: SchoolMemberRole[], action: () => Promise<Response>) {
  for (const role of ALL_ROLES) {
    setActingRole(role)
    const res = await action()
    if (allowedRoles.includes(role)) {
      expect(res.status, `${role} should pass the permission gate`).not.toBe(403)
    } else {
      expect(res.status, `${role} should be forbidden`).toBe(403)
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockClassFindFirst.mockResolvedValue(null)
  mockPlanFindFirst.mockResolvedValue(null)
  mockSchoolMemberFindFirst.mockResolvedValue(null)
})

describe('dashboard role authorization matrix', () => {
  it('POST /api/dashboard/classes (create) — OWNER/ADMIN/MANAGER only, not INSTRUCTOR', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      classesRoute.POST(jsonRequest('/api/dashboard/classes', 'POST', {}))
    )
  })

  it('PUT /api/dashboard/classes/[id] (update) — OWNER/ADMIN/MANAGER only, not INSTRUCTOR', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      classByIdRoute.PUT(jsonRequest('/api/dashboard/classes/c1', 'PUT', {}), idParams('c1'))
    )
  })

  it('DELETE /api/dashboard/classes/[id] (delete) — OWNER/ADMIN only', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      classByIdRoute.DELETE(jsonRequest('/api/dashboard/classes/c1', 'DELETE', {}), idParams('c1'))
    )
  })

  it('DELETE /api/dashboard/membership-plans/[id] — OWNER/ADMIN only', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      planByIdRoute.DELETE(jsonRequest('/api/dashboard/membership-plans/p1', 'DELETE', {}), idParams('p1'))
    )
  })

  it('POST /api/dashboard/members/bulk (import) — OWNER/ADMIN only, not MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      bulkRoute.POST(jsonRequest('/api/dashboard/members/bulk', 'POST', { rows: [] }))
    )
  })

  it('DELETE /api/dashboard/members/[id] (delete member+user) — OWNER/ADMIN only, not MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      memberByIdRoute.DELETE(jsonRequest('/api/dashboard/members/m1', 'DELETE', {}), idParams('m1'))
    )
  })

  it('POST /api/dashboard/members/[id]/membership (assign) — OWNER/ADMIN/MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      membershipRoute.POST(jsonRequest('/api/dashboard/members/m1/membership', 'POST', {}), idParams('m1'))
    )
  })

  it('PATCH /api/dashboard/members/[id]/membership (cancel) — OWNER/ADMIN/MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      membershipRoute.PATCH(
        jsonRequest('/api/dashboard/members/m1/membership', 'PATCH', { action: 'cancel' }),
        idParams('m1')
      )
    )
  })
})
