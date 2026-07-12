/**
 * Route-level regression tests for the last 2 P3 authorization gaps
 * documented in Sesión 68 as explicitly out of scope for that PR:
 * GET /api/dashboard/classes/today and GET /api/dashboard/school both called
 * requireSchoolAccess() (which only checks SchoolMember.status === 'ACTIVE',
 * never .role) and stopped there — a STUDENT with an ACTIVE SchoolMember row
 * could call them directly. Fixed here by routing both GETs through the
 * already-hardened requireDashboardAccess() (apps/web/lib/auth/server.ts),
 * exactly the same pattern used for the 7 endpoints in Sesión 68 (see
 * dashboardReportAuthGuards.test.ts).
 *
 * Strategy: mock getAuthUser/getCurrentSchoolId/requireDashboardAccess (all
 * from '@/lib/auth/server'), same approach as dashboardReportAuthGuards.test.ts.
 * requireDashboardAccess()'s own STUDENT vs. staff-role behavior is unit-tested
 * separately in requireDashboardAccess.test.ts — this file only asserts that
 * both routes actually call it, map its outcome to the right HTTP status, and
 * that the response shape (including the school GET's payment-secret gating,
 * which is NOT part of this PR and must remain unchanged) is preserved.
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

// classes/route.ts (untouched by this PR, used for the regression check
// below) calls requireSchoolAccess() directly from '@/lib/auth/contexts'.
// school/route.ts's PATCH (also untouched) still imports it too, so it must
// stay a real-ish mock rather than being omitted.
const mockRequireSchoolAccess = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))

const FAKE_CLASS = {
  id: 'class-1',
  name: 'Fundamentals BJJ',
  capacity: 20,
  isActive: true,
  level: 'All levels',
  coverUrl: null,
  schedule: [{ dayOfWeek: new Date().getDay(), startTime: '18:00', endTime: '19:30' }],
  instructor: { name: 'Pablo Cabo', photoUrl: null },
  bookings: [],
}

const FAKE_SCHOOL = {
  id: 'school-1',
  name: 'Roger Gracie Málaga',
  slug: 'roger-gracie-malaga',
  status: 'ACTIVE',
  city: 'Málaga',
  country: 'ES',
  address: null,
  postcode: null,
  logoUrl: null,
  coverUrl: null,
  coverPosY: 50,
  email: 'x@test.com',
  phone: null,
  website: null,
  description: null,
  tagline: null,
  instagram: null,
  facebook: null,
  youtube: null,
  tiktok: null,
  language: 'es',
  defaultBookingSettings: null,
  cancelPolicy: 'IMMEDIATE',
  stripePublishableKey: null,
  revolutPublicKey: null,
  modules: null,
  hasFreeTrialCls: false,
  stripeSecretKey: 'sk_live_abcd1234',
  stripeWebhookSecret: 'whsec_abcd1234',
  revolutSecretKey: 'rv_secret_abcd1234',
  revolutWebhookSecret: 'rv_whsec_abcd1234',
}

const mockClassFindMany = vi.fn().mockResolvedValue([FAKE_CLASS])
const mockSchoolFindUnique = vi.fn().mockResolvedValue(FAKE_SCHOOL)
const mockPlatformSettingsUpsert = vi.fn().mockResolvedValue({ enabledPaymentMethods: ['STRIPE', 'CASH'] })
const mockInstructorFindMany = vi.fn().mockResolvedValue([])
const mockSchoolDisciplineFindMany = vi.fn().mockResolvedValue([])

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findMany: mockClassFindMany },
    school: { findUnique: mockSchoolFindUnique },
    platformSettings: { upsert: mockPlatformSettingsUpsert },
    // Only used by the untouched classes/route.ts regression test below
    // (via getSchoolPaymentCapabilities()'s own prisma.school.findUnique,
    // and the route's own instructor/schoolDiscipline listing).
    instructor: { findMany: mockInstructorFindMany },
    schoolDiscipline: { findMany: mockSchoolDisciplineFindMany },
  },
}))

const classesTodayRoute = await import('@/app/api/dashboard/classes/today/route')
const schoolRoute = await import('@/app/api/dashboard/school/route')
const classesRoute = await import('@/app/api/dashboard/classes/route')

const STAFF_ROLES: SchoolMemberRole[] = [
  'OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST',
]

function getRequest(url: string) {
  return new NextRequest(`http://localhost${url}`, { method: 'GET' })
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
  mockClassFindMany.mockResolvedValue([FAKE_CLASS])
  mockSchoolFindUnique.mockResolvedValue(FAKE_SCHOOL)
  mockPlatformSettingsUpsert.mockResolvedValue({ enabledPaymentMethods: ['STRIPE', 'CASH'] })
})

describe('GET /api/dashboard/classes/today — auth guard', () => {
  it('403 for an active STUDENT SchoolMember', async () => {
    asStudent()
    const res = await classesTodayRoute.GET(getRequest('/api/dashboard/classes/today'))
    expect(res.status).toBe(403)
    expect(mockRequireDashboardAccess).toHaveBeenCalledWith('school-1')
  })

  it('200 for a legitimate staff role (OWNER), same data as before', async () => {
    asStaff('OWNER')
    const res = await classesTodayRoute.GET(getRequest('/api/dashboard/classes/today'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.classes).toHaveLength(1)
    expect(body.classes[0]).toMatchObject({ id: 'class-1', name: 'Fundamentals BJJ' })
  })

  it.each(STAFF_ROLES)('200 for staff role %s', async (role) => {
    asStaff(role)
    const res = await classesTodayRoute.GET(getRequest('/api/dashboard/classes/today'))
    expect(res.status).toBe(200)
  })

  it('200 for SUPERADMIN with no SchoolMember needed', async () => {
    asSuperadmin()
    const res = await classesTodayRoute.GET(getRequest('/api/dashboard/classes/today'))
    expect(res.status).toBe(200)
  })

  it('401 with no authenticated user', async () => {
    asLoggedOut()
    const res = await classesTodayRoute.GET(getRequest('/api/dashboard/classes/today'))
    expect(res.status).toBe(401)
  })
})

describe('GET /api/dashboard/school — auth guard', () => {
  it('403 for an active STUDENT SchoolMember', async () => {
    asStudent()
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(403)
    expect(mockRequireDashboardAccess).toHaveBeenCalledWith('school-1')
  })

  it('200 for a legitimate staff role (OWNER), same data as before, secrets gated as OWNER (unchanged)', async () => {
    asStaff('OWNER')
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.school.id).toBe('school-1')
    expect(body.school.name).toBe('Roger Gracie Málaga')
    // OWNER may see secret *masked/configured* flags, never the raw values
    expect(body.school.stripeSecretKeyConfigured).toBe(true)
    expect(body.school.stripeSecretKeyMasked).toBe('••••1234')
    expect(body.school.stripeSecretKey).toBeUndefined()
    expect(body.enabledPaymentMethods).toEqual(['STRIPE', 'CASH'])
  })

  it('200 for a staff role without secret access (INSTRUCTOR) — payment-secret gating unchanged by this PR', async () => {
    asStaff('INSTRUCTOR')
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.school.id).toBe('school-1')
    expect(body.school.stripeSecretKeyConfigured).toBeUndefined()
    expect(body.school.stripeSecretKeyMasked).toBeUndefined()
    expect(body.school.stripeSecretKey).toBeUndefined()
  })

  it.each(STAFF_ROLES)('200 for staff role %s', async (role) => {
    asStaff(role)
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(200)
  })

  it('200 for SUPERADMIN with no SchoolMember needed, and can see secret flags', async () => {
    asSuperadmin()
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.school.stripeSecretKeyConfigured).toBe(true)
  })

  it('401 with no authenticated user', async () => {
    asLoggedOut()
    const res = await schoolRoute.GET(getRequest('/api/dashboard/school'))
    expect(res.status).toBe(401)
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
