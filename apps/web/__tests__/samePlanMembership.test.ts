/**
 * A student must not end up with two ACTIVE copies of the same plan: each
 * copy generates its own monthly renewal, so the school bills twice. Real
 * case (RGM, 2026-11): a V1-imported "Jiu Jitsu Mensual" (planId null) plus
 * the same plan requested from /my and activated by staff. The planId-only
 * check missed it because the imported row had no planId.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { isSamePlan, findSamePlanMembership } from '@/lib/samePlan'

describe('isSamePlan', () => {
  it('compares planIds when both sides have one', () => {
    expect(isSamePlan({ planId: 'p1', planName: 'A' }, { planId: 'p1', planName: 'B' })).toBe(true)
    expect(isSamePlan({ planId: 'p1', planName: 'Mensual' }, { planId: 'p2', planName: 'Mensual' })).toBe(false)
  })

  it('falls back to the name when one side is a V1 import with no planId', () => {
    expect(isSamePlan({ planId: null, planName: 'Jiu Jitsu Mensual' }, { planId: 'rgm-mensual', planName: ' jiu jitsu mensual ' })).toBe(true)
    expect(isSamePlan({ planId: null, planName: 'Jiu Jitsu Mensual' }, { planId: 'rgm-trim', planName: 'Jiu Jitsu Trimestral' })).toBe(false)
  })
})

describe('findSamePlanMembership', () => {
  it('scopes the query to the student, school and statuses, excluding the row itself', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { id: 'other', planId: 'p2', planName: 'Access', status: 'ACTIVE', paymentMethod: 'CASH' },
      { id: 'v1', planId: null, planName: 'Jiu Jitsu Mensual', status: 'ACTIVE', paymentMethod: 'CASH' },
    ])
    const db = { membership: { findMany } } as unknown as Parameters<typeof findSamePlanMembership>[0]

    const found = await findSamePlanMembership(db, {
      userId: 'u1', schoolId: 's1', excludeId: 'self', planId: 'rgm-mensual', planName: 'Jiu Jitsu Mensual',
    }, ['ACTIVE', 'PAUSED'])

    expect(found?.id).toBe('v1')
    expect(findMany.mock.calls[0][0].where).toEqual({
      userId: 'u1', schoolId: 's1', status: { in: ['ACTIVE', 'PAUSED'] }, id: { not: 'self' },
    })
  })
})

// ── Dashboard activate: PENDING → ACTIVE ──────────────────────────────────────
const mockMembershipFindFirst = vi.fn()
const mockMembershipFindMany = vi.fn()
const mockPlanFindFirst = vi.fn()
const mockTxMembershipUpdate = vi.fn().mockResolvedValue({})
vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findFirst: mockMembershipFindFirst, findMany: mockMembershipFindMany },
    membershipPlan: { findFirst: mockPlanFindFirst },
    $transaction: (fn: (tx: unknown) => unknown) => fn({
      membership: { update: mockTxMembershipUpdate },
      transaction: { create: vi.fn().mockResolvedValue({}) },
      schoolMember: { updateMany: vi.fn().mockResolvedValue({}) },
    }),
  },
}))
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: 'staff', role: 'SUPERADMIN' }),
  getCurrentSchoolId: vi.fn().mockResolvedValue('s1'),
}))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: vi.fn() }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission: vi.fn().mockResolvedValue(true) }))
vi.mock('@/lib/services/membership', () => ({
  cancelMembership: vi.fn(),
  computeEndDate: vi.fn().mockReturnValue(new Date('2026-12-08')),
  syncSchoolMemberStatusForMembership: vi.fn(),
}))
vi.mock('@/lib/leads', () => ({ convertLeadAfterPaidActivation: vi.fn().mockResolvedValue(undefined) }))

const { PATCH } = await import('@/app/api/dashboard/memberships/[id]/route')

function activate() {
  return PATCH(
    new NextRequest('http://localhost/api/dashboard/memberships/new', { method: 'PATCH', body: JSON.stringify({ action: 'activate' }) }),
    { params: Promise.resolve({ id: 'new' }) },
  )
}

describe('PATCH /api/dashboard/memberships/[id] — activate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMembershipFindFirst.mockResolvedValue({
      id: 'new', userId: 'u1', schoolId: 's1', status: 'PENDING', planId: 'rgm-mensual', planName: 'Jiu Jitsu Mensual',
      paymentMethod: 'CASH', notes: null, price: 65, currency: 'EUR', startDate: new Date(), endDate: null,
    })
    mockPlanFindFirst.mockResolvedValue({ planType: 'SUBSCRIPTION', billingCycle: 'monthly', validityDays: 30 })
  })

  it('refuses when the student already has the same plan active (V1 import, no planId)', async () => {
    mockMembershipFindMany.mockResolvedValue([
      { id: 'v1', planId: null, planName: 'Jiu Jitsu Mensual', status: 'ACTIVE', paymentMethod: 'CASH' },
    ])

    const res = await activate()

    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('DUPLICATE_ACTIVE_PLAN')
    expect(mockTxMembershipUpdate).not.toHaveBeenCalled()
  })

  it('still activates a different plan alongside an active one (e.g. a pass on top of a subscription)', async () => {
    mockMembershipFindMany.mockResolvedValue([
      { id: 'sub', planId: 'rgm-trim', planName: 'Jiu Jitsu Trimestral', status: 'ACTIVE', paymentMethod: 'STRIPE' },
    ])

    const res = await activate()

    expect(res.status).toBe(200)
    expect(mockTxMembershipUpdate).toHaveBeenCalled()
  })
})
