/**
 * Tests for cancelMembership() (lib/services/membership.ts) — the safe
 * Stripe cancel-policy flow (P1/P2 hardening).
 *
 * Stripe is called *awaited* before any local state is written, so a
 * failed Stripe API call can never leave the local record saying
 * "cancelled" while Stripe silently keeps billing the customer.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMembershipFindFirst = vi.fn()
const mockMembershipUpdate = vi.fn()
const mockMembershipFindUnique = vi.fn()
const mockTransaction = vi.fn()
const mockSchoolMemberUpdateMany = vi.fn().mockResolvedValue({ count: 1 })

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findFirst: mockMembershipFindFirst, update: mockMembershipUpdate, findUnique: mockMembershipFindUnique },
    $transaction: mockTransaction,
  },
}))

const mockSubCancel = vi.fn()
const mockSubUpdate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    subscriptions: {
      cancel: (...args: unknown[]) => mockSubCancel(...args),
      update: (...args: unknown[]) => mockSubUpdate(...args),
    },
  }),
}))

vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipReceiptEmail: vi.fn() }))

const { cancelMembership } = await import('@/lib/services/membership')

function fakeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1', userId: 'user-1', schoolId: 'school-1', status: 'ACTIVE',
    endDate: new Date(Date.now() + 30 * 86_400_000), stripeSubId: null, notes: null,
    plan: { planType: 'SUBSCRIPTION' },
    school: { cancelPolicy: 'IMMEDIATE', stripeSecretKey: null },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({
      membership: { update: mockMembershipUpdate, findFirst: vi.fn().mockResolvedValue(null) },
      schoolMember: { updateMany: mockSchoolMemberUpdateMany },
    }),
  )
  mockMembershipFindUnique.mockResolvedValue({ id: 'membership-1', status: 'CANCELLED' })
  mockSubCancel.mockResolvedValue({})
  mockSubUpdate.mockResolvedValue({})
})

describe('cancelMembership — IMMEDIATE policy', () => {
  it('with a Stripe subscription: cancels Stripe first, then local CANCELLED + SchoolMember INACTIVE', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({
      stripeSubId: 'sub_1',
      school: { cancelPolicy: 'IMMEDIATE', stripeSecretKey: 'sk_test' },
    }))

    await cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })

    expect(mockSubCancel).toHaveBeenCalledWith('sub_1')
    expect(mockSubUpdate).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'membership-1' },
      data: expect.objectContaining({ status: 'CANCELLED' }),
    }))
    expect(mockSchoolMemberUpdateMany).toHaveBeenCalled()
  })

  it('without a stripeSubId: no Stripe call, keeps the existing local-only cancel behavior', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({ stripeSubId: null }))

    await cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })

    expect(mockSubCancel).not.toHaveBeenCalled()
    expect(mockSubUpdate).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'CANCELLED' }),
    }))
  })

  it('a Stripe failure does not change local state at all', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({
      stripeSubId: 'sub_1',
      school: { cancelPolicy: 'IMMEDIATE', stripeSecretKey: 'sk_test' },
    }))
    mockSubCancel.mockRejectedValue(new Error('Stripe API down'))

    await expect(cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })).rejects.toThrow(/Stripe subscription cancel failed/)

    expect(mockMembershipUpdate).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockSchoolMemberUpdateMany).not.toHaveBeenCalled()
  })

  it('already cancelled: throws without touching Stripe or the DB', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({ status: 'CANCELLED' }))

    await expect(cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })).rejects.toThrow(/Already cancelled/)
    expect(mockSubCancel).not.toHaveBeenCalled()
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })
})

describe('cancelMembership — UNTIL_END_OF_PERIOD policy', () => {
  it('uses cancel_at_period_end on Stripe, keeps Membership ACTIVE with cancelledAt set, and does not touch SchoolMember', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({
      stripeSubId: 'sub_1',
      school: { cancelPolicy: 'UNTIL_END_OF_PERIOD', stripeSecretKey: 'sk_test' },
    }))

    await cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })

    expect(mockSubUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: true })
    expect(mockSubCancel).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled() // access continues — SchoolMember is not touched
    expect(mockMembershipUpdate).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: expect.objectContaining({ cancelledAt: expect.any(Date) }),
    })
    expect(mockMembershipUpdate.mock.calls[0]?.[0].data.status).toBeUndefined() // status field untouched
  })

  it('a Stripe failure does not mark cancelledAt locally', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({
      stripeSubId: 'sub_1',
      school: { cancelPolicy: 'UNTIL_END_OF_PERIOD', stripeSecretKey: 'sk_test' },
    }))
    mockSubUpdate.mockRejectedValue(new Error('Stripe API down'))

    await expect(cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })).rejects.toThrow(/Stripe subscription cancel failed/)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('TRIAL plans always cancel immediately regardless of school policy', async () => {
    mockMembershipFindFirst.mockResolvedValue(fakeMembership({
      plan: { planType: 'TRIAL' },
      school: { cancelPolicy: 'UNTIL_END_OF_PERIOD', stripeSecretKey: null },
    }))

    await cancelMembership({ membershipId: 'membership-1', schoolId: 'school-1' })

    expect(mockMembershipUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'CANCELLED' }),
    }))
    expect(mockSchoolMemberUpdateMany).toHaveBeenCalled()
  })
})
