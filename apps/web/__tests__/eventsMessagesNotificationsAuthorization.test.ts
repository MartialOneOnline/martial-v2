/**
 * Route-level authorization matrix for Events/Messages/Notifications —
 * companion to dashboardRoleAuthorization.test.ts. This migration preserves
 * the pre-existing (already restrictive) route allowlists rather than
 * widening them, so the expected-allowed sets below intentionally do NOT
 * match the "MANAGER can operate" pattern used for classes/members/leads —
 * see permissions.test.ts and the PR report for the detected conflicts.
 *
 * Strategy: same as dashboardRoleAuthorization.test.ts — mock auth to control
 * the acting SchoolMember role, then call the handler with a minimal/invalid
 * body or empty result sets so the boundary we assert on is purely the 403
 * permission gate, not downstream business logic.
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

const mockEventFindMany = vi.fn()
const mockEventFindFirst = vi.fn()
const mockInstructorFindMany = vi.fn()
const mockNotificationFindMany = vi.fn()
const mockNotificationCount = vi.fn()
const mockNotificationUpdateMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    event: { findMany: mockEventFindMany, findFirst: mockEventFindFirst },
    instructor: { findMany: mockInstructorFindMany },
    notification: {
      findMany: mockNotificationFindMany,
      count: mockNotificationCount,
      updateMany: mockNotificationUpdateMany,
    },
  },
}))

vi.mock('@/lib/services/eventCapacity', () => ({
  getBookedCounts: vi.fn().mockResolvedValue({ byTicket: new Map() }),
}))

vi.mock('@/lib/services/paymentCapabilities', () => ({
  getSchoolPaymentCapabilities: vi.fn().mockResolvedValue({ availableMethods: [] }),
  sanitizePaymentMethods: vi.fn().mockReturnValue([]),
}))

const eventsRoute = await import('@/app/api/dashboard/events/route')
const eventByIdRoute = await import('@/app/api/dashboard/events/[id]/route')
const messagesRoute = await import('@/app/api/dashboard/messages/route')
const notificationsRoute = await import('@/app/api/dashboard/notifications/route')

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

function getRequest(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

function idParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

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
  mockEventFindMany.mockResolvedValue([])
  mockEventFindFirst.mockResolvedValue(null)
  mockInstructorFindMany.mockResolvedValue([])
  mockNotificationFindMany.mockResolvedValue([])
  mockNotificationCount.mockResolvedValue(0)
  mockNotificationUpdateMany.mockResolvedValue({ count: 0 })
})

describe('events/messages/notifications role authorization matrix', () => {
  it('GET /api/dashboard/events (view) — OWNER/ADMIN/INSTRUCTOR only, not MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'INSTRUCTOR'], () => eventsRoute.GET())
  })

  it('POST /api/dashboard/events (create) — OWNER/ADMIN only, not MANAGER/INSTRUCTOR', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      eventsRoute.POST(jsonRequest('/api/dashboard/events', 'POST', {}))
    )
  })

  it('PUT /api/dashboard/events/[id] (update) — OWNER/ADMIN only', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      eventByIdRoute.PUT(jsonRequest('/api/dashboard/events/e1', 'PUT', {}), idParams('e1'))
    )
  })

  it('DELETE /api/dashboard/events/[id] (delete) — OWNER/ADMIN only', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      eventByIdRoute.DELETE(jsonRequest('/api/dashboard/events/e1', 'DELETE', {}), idParams('e1'))
    )
  })

  it('POST /api/dashboard/messages (broadcast) — OWNER/ADMIN only, not MANAGER', async () => {
    await expectRoleGate(['OWNER', 'ADMIN'], () =>
      messagesRoute.POST(jsonRequest('/api/dashboard/messages', 'POST', {}))
    )
  })

  it('GET /api/dashboard/notifications — OWNER/ADMIN/MANAGER only, not RECEPTIONIST', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      notificationsRoute.GET(getRequest('/api/dashboard/notifications'))
    )
  })

  it('PATCH /api/dashboard/notifications (mark read) — OWNER/ADMIN/MANAGER only', async () => {
    await expectRoleGate(['OWNER', 'ADMIN', 'MANAGER'], () =>
      notificationsRoute.PATCH(jsonRequest('/api/dashboard/notifications', 'PATCH', {}))
    )
  })
})
