/**
 * Focused coverage for the Getting Started checklist logic embedded in
 * GET /api/dashboard/stats (apps/web/app/api/dashboard/stats/route.ts) — the
 * 5 real conditions, and the CLAIMED -> UNDER_REVIEW auto-promotion. Does
 * not re-test the route's other stat fields or its auth guard (already
 * covered by dashboardReportAuthGuards.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireDashboardAccess = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
  requireDashboardAccess: mockRequireDashboardAccess,
}))

function makeModel() {
  return {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    findFirst: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }),
    updateMany: vi.fn().mockResolvedValue({ count: 0 }),
  }
}

const mockPrisma = {
  schoolMember: makeModel(),
  class: makeModel(),
  booking: makeModel(),
  membership: makeModel(),
  lead: makeModel(),
  grading: makeModel(),
  transaction: makeModel(),
  school: makeModel(),
  membershipPlan: makeModel(),
}

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))

const { GET } = await import('@/app/api/dashboard/stats/route')

function req(schoolId = 'school-1') {
  return new NextRequest(`http://localhost/api/dashboard/stats?schoolId=${schoolId}`)
}

// A school with all 5 real Getting Started conditions satisfied.
const COMPLETE_SCHOOL = {
  status: 'CLAIMED', city: 'Málaga', country: 'ES',
  stripePublishableKey: 'pk_live', stripeSecretKey: 'sk_live',
  revolutPublicKey: null, revolutSecretKey: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'user-1', role: 'SCHOOL_OWNER' })
  mockRequireDashboardAccess.mockResolvedValue({ user: { id: 'user-1' }, member: { role: 'OWNER', status: 'ACTIVE' } })
  // Defaults matching "nothing set up yet" — each test overrides only what it needs.
  mockPrisma.school.findUnique.mockResolvedValue({ status: 'CLAIMED', city: null, country: null, stripePublishableKey: null, stripeSecretKey: null, revolutPublicKey: null, revolutSecretKey: null })
  mockPrisma.class.count.mockResolvedValue(0)
  mockPrisma.membershipPlan.count.mockResolvedValue(0)
  mockPrisma.schoolMember.count.mockResolvedValue(0)
})

describe('GET /api/dashboard/stats — gettingStarted conditions', () => {
  it('computes each condition independently from the requested school\'s own data (mixed true/false case)', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({
      status: 'CLAIMED', city: 'Málaga', country: null, // profile: false (missing country)
      stripePublishableKey: null, stripeSecretKey: null,
      revolutPublicKey: 'rk_live', revolutSecretKey: 'rs_live', // payments: true via Revolut only
    })
    mockPrisma.class.count.mockResolvedValue(3) // classes: true
    mockPrisma.membershipPlan.count.mockResolvedValue(0) // memberships: false
    mockPrisma.schoolMember.count.mockResolvedValue(5) // students: true (this call also covers activeMembers/totalMembers, all default 0 elsewhere — irrelevant here)

    const res = await GET(req('school-1'))
    const json = await res.json()

    expect(json.gettingStarted.profile).toBe(false)
    expect(json.gettingStarted.classes).toBe(true)
    expect(json.gettingStarted.memberships).toBe(false)
    expect(json.gettingStarted.payments).toBe(true)
    expect(json.gettingStarted.students).toBe(true)
    // Confirms the school lookup itself was scoped to the requested school.
    expect(mockPrisma.school.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'school-1' } }))
  })

  it('promotes a CLAIMED school to UNDER_REVIEW once all 5 real conditions are true', async () => {
    mockPrisma.school.findUnique.mockResolvedValue(COMPLETE_SCHOOL)
    mockPrisma.class.count.mockResolvedValue(2)
    mockPrisma.membershipPlan.count.mockResolvedValue(1)
    mockPrisma.schoolMember.count.mockResolvedValue(4)

    const res = await GET(req('school-1'))
    const json = await res.json()

    expect(json.gettingStarted.doneCount).toBe(6) // 5 real + the settings step, which mirrors them
    expect(json.gettingStarted.settings).toBe(true)
    expect(mockPrisma.school.updateMany).toHaveBeenCalledWith({
      where: { id: 'school-1', status: 'CLAIMED' },
      data: { status: 'UNDER_REVIEW' },
    })
  })

  it('does not promote an incomplete school (missing conditions leave it CLAIMED)', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({ ...COMPLETE_SCHOOL, city: null }) // profile now false
    mockPrisma.class.count.mockResolvedValue(2)
    mockPrisma.membershipPlan.count.mockResolvedValue(1)
    mockPrisma.schoolMember.count.mockResolvedValue(4)

    const res = await GET(req('school-1'))
    const json = await res.json()

    expect(json.gettingStarted.profile).toBe(false)
    expect(json.gettingStarted.settings).toBe(false)
    expect(mockPrisma.school.updateMany).not.toHaveBeenCalled()
  })

  it('never overwrites a school status other than CLAIMED, even with all 5 conditions true', async () => {
    mockPrisma.school.findUnique.mockResolvedValue({ ...COMPLETE_SCHOOL, status: 'VERIFIED' })
    mockPrisma.class.count.mockResolvedValue(2)
    mockPrisma.membershipPlan.count.mockResolvedValue(1)
    mockPrisma.schoolMember.count.mockResolvedValue(4)

    await GET(req('school-1'))

    expect(mockPrisma.school.updateMany).not.toHaveBeenCalled()
  })

  it('scopes each condition\'s own Prisma call to the requested schoolId — not a shared/global count', async () => {
    mockPrisma.school.findUnique.mockResolvedValue(COMPLETE_SCHOOL)
    mockPrisma.class.count.mockResolvedValue(2)
    mockPrisma.membershipPlan.count.mockResolvedValue(1)
    mockPrisma.schoolMember.count.mockResolvedValue(4)

    await GET(req('school-xyz'))

    // school.findUnique — the single lookup gettingStarted.profile/payments read from.
    expect(mockPrisma.school.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'school-xyz' } }),
    )

    // membershipPlan.count — single call, the only source of `memberships`.
    expect(mockPrisma.membershipPlan.count).toHaveBeenCalledWith({ where: { schoolId: 'school-xyz' } })

    // class.count is called twice in this route (activeClasses feeds
    // `classes`; classesToday is an unrelated stat with an extra `schedule`
    // filter) — isolate the one `classes` actually reads by its shape.
    const classCountCalls = mockPrisma.class.count.mock.calls as Array<[{ where: Record<string, unknown> }]>
    const classesCondition = classCountCalls.find(([{ where }]) => !('schedule' in where))
    expect(classesCondition).toBeDefined()
    expect(classesCondition![0].where).toEqual({ schoolId: 'school-xyz', isActive: true })

    // schoolMember.count is called 4 times for different stats — `students`
    // is the one call with exactly {schoolId, role}, no status/joinedAt filter.
    const schoolMemberCountCalls = mockPrisma.schoolMember.count.mock.calls as Array<[{ where: Record<string, unknown> }]>
    const studentsCondition = schoolMemberCountCalls.find(
      ([{ where }]) => !('status' in where) && !('joinedAt' in where),
    )
    expect(studentsCondition).toBeDefined()
    expect(studentsCondition![0].where).toEqual({ schoolId: 'school-xyz', role: 'STUDENT' })
  })
})
