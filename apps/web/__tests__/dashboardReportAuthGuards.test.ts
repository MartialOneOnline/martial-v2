/**
 * Route-level regression tests for the P1/P2 authorization gap closed in
 * this PR: 7 GET endpoints under /api/dashboard/** called requireSchoolAccess()
 * (which only checks SchoolMember.status === 'ACTIVE', never .role) and
 * stopped there — a STUDENT with an ACTIVE SchoolMember row could call them
 * directly and read admin-only data (billing, full member roster with PII,
 * per-transaction revenue). Fixed by routing all 7 through the hardened
 * requireDashboardAccess() (apps/web/lib/auth/server.ts), which now also
 * requires the member's role to be in DASHBOARD_ROLES.
 *
 * Strategy: mock getAuthUser/getCurrentSchoolId/requireDashboardAccess (all
 * from '@/lib/auth/server') so we control the acting user/role directly,
 * same approach as dashboardUploadAuth.test.ts and
 * dashboardRoleAuthorization.test.ts. requireDashboardAccess()'s own STUDENT
 * vs. staff-role behavior is unit-tested separately in
 * requireDashboardAccess.test.ts — this file only asserts that each route
 * actually calls it and maps its outcome to the right HTTP status, and that
 * the underlying data/response shape is unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

// ── auth mocks ────────────────────────────────────────────────────────────────
const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireDashboardAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
  requireDashboardAccess: mockRequireDashboardAccess,
}))

// ── prisma mock — generic per-model defaults, enough for each route's
// handler body to run to completion without touching a real DB ──────────────
function makeModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    groupBy: vi.fn().mockResolvedValue([]),
    upsert: vi.fn().mockResolvedValue({
      planCurrency: 'EUR',
      planPriceMonthly: 0,
      planPriceQuarterly: 0,
      planPriceAnnual: 0,
      stripePriceIdMonthly: null,
      stripePriceIdQuarterly: null,
      stripePriceIdAnnual: null,
    }),
  }
}

const mockPrisma = {
  schoolSubscription: makeModel(),
  platformSettings: makeModel(),
  schoolMember: makeModel(),
  class: makeModel(),
  booking: makeModel(),
  membership: makeModel(),
  lead: makeModel(),
  grading: makeModel(),
  transaction: makeModel(),
  school: makeModel(),
  instructor: makeModel(),
  schoolDiscipline: makeModel(),
  membershipPlan: makeModel(),
}

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))

// Only apps/dashboard/classes/route.ts (untouched by this PR) still calls
// requireSchoolAccess() directly — mocked here purely for the regression
// test at the bottom of this file.
const mockRequireSchoolAccess = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))

const billingRoute = await import('@/app/api/dashboard/billing/route')
const statsRoute = await import('@/app/api/dashboard/stats/route')
const paymentsReportRoute = await import('@/app/api/dashboard/reports/payments/route')
const usersReportRoute = await import('@/app/api/dashboard/reports/users/route')
const absentsReportRoute = await import('@/app/api/dashboard/reports/absents/route')
const bookingsReportRoute = await import('@/app/api/dashboard/reports/bookings/route')
const planMembersRoute = await import('@/app/api/dashboard/membership-plans/[id]/members/route')
const classesRoute = await import('@/app/api/dashboard/classes/route')

const STAFF_ROLES: SchoolMemberRole[] = [
  'OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST',
]

function getRequest(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
}

function idParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

function asStaff(role: SchoolMemberRole = 'OWNER') {
  mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireDashboardAccess.mockResolvedValue({
    user: { id: 'user-1', role: 'SCHOOL_OWNER' },
    member: { role, status: 'ACTIVE' },
  })
}

function asStudent() {
  mockGetAuthUser.mockResolvedValue({ id: 'user-2', role: 'STUDENT' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireDashboardAccess.mockRejectedValue(new Error('FORBIDDEN'))
}

function asSuperadmin() {
  mockGetAuthUser.mockResolvedValue({ id: 'admin-1', role: 'SUPERADMIN' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireDashboardAccess.mockResolvedValue({
    user: { id: 'admin-1', role: 'SUPERADMIN' },
    member: null,
  })
}

function asLoggedOut() {
  mockGetAuthUser.mockResolvedValue(null)
  mockGetCurrentSchoolId.mockResolvedValue(null)
  mockRequireDashboardAccess.mockRejectedValue(new Error('UNAUTHORIZED'))
}

beforeEach(() => {
  vi.clearAllMocks()
})

type RouteCase = {
  name: string
  call: () => Promise<Response>
}

const ROUTES: RouteCase[] = [
  { name: 'GET /api/dashboard/billing', call: () => billingRoute.GET(getRequest('/api/dashboard/billing')) },
  { name: 'GET /api/dashboard/stats', call: () => statsRoute.GET(getRequest('/api/dashboard/stats')) },
  { name: 'GET /api/dashboard/reports/payments', call: () => paymentsReportRoute.GET(getRequest('/api/dashboard/reports/payments')) },
  { name: 'GET /api/dashboard/reports/users', call: () => usersReportRoute.GET(getRequest('/api/dashboard/reports/users')) },
  { name: 'GET /api/dashboard/reports/absents', call: () => absentsReportRoute.GET(getRequest('/api/dashboard/reports/absents')) },
  { name: 'GET /api/dashboard/reports/bookings', call: () => bookingsReportRoute.GET(getRequest('/api/dashboard/reports/bookings')) },
  {
    name: 'GET /api/dashboard/membership-plans/[id]/members',
    call: () => planMembersRoute.GET(getRequest('/api/dashboard/membership-plans/p1/members'), idParams('p1')),
  },
]

describe('dashboard report/billing auth guards — STUDENT is forbidden (bug this PR closes)', () => {
  it.each(ROUTES.map(r => [r.name, r] as const))('%s → 403 for an active STUDENT SchoolMember', async (_name, route) => {
    asStudent()
    const res = await route.call()
    expect(res.status).toBe(403)
    expect(mockRequireDashboardAccess).toHaveBeenCalledWith('school-1')
  })
})

describe('dashboard report/billing auth guards — legitimate staff role passes', () => {
  it.each(ROUTES.map(r => [r.name, r] as const))('%s → 200 for an OWNER', async (_name, route) => {
    asStaff('OWNER')
    const res = await route.call()
    expect(res.status).toBe(200)
  })
})

describe('dashboard report/billing auth guards — SUPERADMIN bypass', () => {
  // Representative subset (billing + one report), per task guidance — the
  // bypass mechanics themselves are exercised for every DASHBOARD_ROLES/
  // SUPERADMIN case in requireDashboardAccess.test.ts.
  it('GET /api/dashboard/billing → 200 for SUPERADMIN with no SchoolMember needed', async () => {
    asSuperadmin()
    const res = await billingRoute.GET(getRequest('/api/dashboard/billing'))
    expect(res.status).toBe(200)
  })

  it('GET /api/dashboard/reports/payments → 200 for SUPERADMIN with no SchoolMember needed', async () => {
    asSuperadmin()
    const res = await paymentsReportRoute.GET(getRequest('/api/dashboard/reports/payments'))
    expect(res.status).toBe(200)
  })
})

describe('dashboard report/billing auth guards — no session', () => {
  it.each(ROUTES.map(r => [r.name, r] as const))('%s → 401 with no authenticated user', async (_name, route) => {
    asLoggedOut()
    const res = await route.call()
    expect(res.status).toBe(401)
  })
})

describe('dashboard report/billing auth guards — role gate for every staff role', () => {
  it.each(STAFF_ROLES)('GET /api/dashboard/billing → 200 for staff role %s', async (role) => {
    asStaff(role)
    const res = await billingRoute.GET(getRequest('/api/dashboard/billing'))
    expect(res.status).toBe(200)
  })
})

describe('regression — routes explicitly out of scope for this PR', () => {
  it('GET /api/dashboard/classes still returns 200 for a STUDENT (hasPermission(\'school.classes.view\') allows it by design — untouched by this PR)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'user-2', role: 'STUDENT' })
    mockGetCurrentSchoolId.mockResolvedValue('school-1')
    mockRequireSchoolAccess.mockResolvedValue({ role: 'STUDENT', status: 'ACTIVE' })

    const res = await classesRoute.GET()

    expect(res.status).toBe(200)
    // Confirms this route was NOT migrated to requireDashboardAccess().
    expect(mockRequireDashboardAccess).not.toHaveBeenCalled()
  })
})
