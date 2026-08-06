/**
 * Regression tests for the SchoolMember status promotion inside assignPlan()
 * (lib/services/membership.ts).
 *
 * Root cause fixed here: assignPlan() used to only promote PENDING/LEAD to
 * ACTIVE. A member whose SchoolMember.status had drifted to INACTIVE (e.g.
 * their previous membership was cancelled) or FROZEN (paused) kept that
 * status even after staff assigned them a brand new ACTIVE membership — so
 * they had a paying, active membership but no access (blocked from /my,
 * invisible in class rosters). See Juanjo Rios / Roger Gracie Malaga.
 *
 * Fix: reactivate on any non-ARCHIVED, non-ACTIVE status. ARCHIVED is a
 * staff moderation decision and must never be silently overwritten by a
 * subscription lifecycle event (mirrors syncSchoolMemberStatusForMembership).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

let schoolMember: { id: string; userId: string; status: string }

const schoolMemberFindFirst = vi.fn(async () => ({
  id: schoolMember.id, userId: schoolMember.userId, status: schoolMember.status,
}))
const schoolMemberUpdate = vi.fn(async ({ data }: any) => {
  schoolMember = { ...schoolMember, status: data.status }
  return schoolMember
})
const membershipUpdateMany = vi.fn(async () => ({ count: 0 }))
const membershipCreate = vi.fn(async ({ data }: any) => ({ id: 'mem-1', ...data }))
const transactionCreate = vi.fn(async () => ({}))

const FREE_PLAN = {
  id: 'plan-1', schoolId: 'school-1', isActive: true, name: 'Free Trial',
  price: 0, currency: 'EUR', planType: 'TRIAL', billingCycle: 'one-off', validityDays: 7,
}

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { findFirst: schoolMemberFindFirst },
    membershipPlan: { findFirst: vi.fn(async () => FREE_PLAN) },
    user: { findUnique: vi.fn(async () => null) },
    school: { findUnique: vi.fn(async () => null) },
    $transaction: vi.fn(async (cb: any) => cb({
      membership: { updateMany: membershipUpdateMany, create: membershipCreate },
      transaction: { create: transactionCreate },
      schoolMember: { update: schoolMemberUpdate },
    })),
  },
}))
vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipReceiptEmail: vi.fn() }))
vi.mock('@/lib/stripe', () => ({ getStripe: vi.fn() }))

const { assignPlan } = await import('@/lib/services/membership')

function baseInput() {
  return { schoolMemberId: 'sm-1', schoolId: 'school-1', planId: 'plan-1' }
}

describe('assignPlan() — SchoolMember status promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each(['INACTIVE', 'PENDING', 'LEAD', 'FROZEN'])('%s -> ACTIVE', async (status) => {
    schoolMember = { id: 'sm-1', userId: 'user-1', status }
    await assignPlan(baseInput())
    expect(schoolMemberUpdate).toHaveBeenCalledTimes(1)
    expect(schoolMemberUpdate).toHaveBeenCalledWith({ where: { id: 'sm-1' }, data: { status: 'ACTIVE' } })
    expect(schoolMember.status).toBe('ACTIVE')
  })

  it('ACTIVE: does not trigger a redundant SchoolMember update', async () => {
    schoolMember = { id: 'sm-1', userId: 'user-1', status: 'ACTIVE' }
    await assignPlan(baseInput())
    expect(schoolMemberUpdate).not.toHaveBeenCalled()
  })

  it('ARCHIVED: left untouched — never silently reactivated', async () => {
    schoolMember = { id: 'sm-1', userId: 'user-1', status: 'ARCHIVED' }
    await assignPlan(baseInput())
    expect(schoolMemberUpdate).not.toHaveBeenCalled()
    expect(schoolMember.status).toBe('ARCHIVED')
  })
})
