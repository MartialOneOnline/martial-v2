/**
 * Tests for the membership expiry sweep (lib/services/membership.ts).
 *
 * Before this fix, an ACTIVE membership whose endDate had passed stayed
 * ACTIVE forever unless a student had explicitly requested cancellation
 * (cancelledAt set) — the EXPIRED status existed in the schema but nothing
 * ever wrote it, silently inflating "active members" counts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMembershipFindUnique = vi.fn()
const mockMembershipFindMany = vi.fn()
const mockMembershipUpdate = vi.fn()
const mockTransaction = vi.fn()
const mockSchoolMemberUpdateMany = vi.fn().mockResolvedValue({ count: 1 })
// Used by hasOtherActiveMembership() inside the tx — null means "no other ACTIVE membership".
const mockOtherActiveMembershipFindFirst = vi.fn().mockResolvedValue(null)

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: {
      findUnique: mockMembershipFindUnique,
      findMany: mockMembershipFindMany,
      update: mockMembershipUpdate,
    },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipReceiptEmail: vi.fn() }))

const { checkAndExpireMembership, expireLapsedMemberships } = await import('@/lib/services/membership')

function fakeMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1', userId: 'user-1', schoolId: 'school-1', status: 'ACTIVE',
    cancelledAt: null, endDate: new Date(Date.now() - 86_400_000), // yesterday
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockOtherActiveMembershipFindFirst.mockResolvedValue(null)
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({
      membership: { update: mockMembershipUpdate, findFirst: mockOtherActiveMembershipFindFirst },
      schoolMember: { updateMany: mockSchoolMemberUpdateMany },
    }),
  )
})

describe('checkAndExpireMembership', () => {
  it('a lapsed membership that was never cancelled -> EXPIRED, SchoolMember INACTIVE', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership())

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(true)
    expect(mockMembershipUpdate).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: 'EXPIRED' },
    })
    expect(mockSchoolMemberUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'INACTIVE' } }))
  })

  it('a lapsed membership with cancelledAt set (Netflix-model cancel) -> CANCELLED', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ cancelledAt: new Date() }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(true)
    expect(mockMembershipUpdate).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: 'CANCELLED' },
    })
  })

  it('endDate in the future -> no-op, still has access', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ endDate: new Date(Date.now() + 86_400_000) }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(false)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('PENDING membership -> left alone, not expired', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ status: 'PENDING' }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(false)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('already EXPIRED -> reports no access without writing again', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ status: 'EXPIRED' }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(true)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('missing membership -> treated as no access, no writes', async () => {
    mockMembershipFindUnique.mockResolvedValue(null)

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(true)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })
})

describe('expireLapsedMemberships', () => {
  it('sweeps every ACTIVE membership past its endDate, splitting EXPIRED vs CANCELLED counts', async () => {
    mockMembershipFindMany.mockResolvedValue([
      fakeMembership({ id: 'm-1' }),                                   // lapsed, never cancelled -> EXPIRED
      fakeMembership({ id: 'm-2', cancelledAt: new Date() }),          // Netflix-cancelled -> CANCELLED
      fakeMembership({ id: 'm-3' }),                                   // lapsed, never cancelled -> EXPIRED
    ])

    const result = await expireLapsedMemberships()

    expect(mockMembershipFindMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', endDate: { lt: expect.any(Date) } },
      select: { id: true, userId: true, schoolId: true, cancelledAt: true },
    })
    expect(result).toEqual({ expiredCount: 2, cancelledCount: 1 })
    expect(mockMembershipUpdate).toHaveBeenCalledTimes(3)
  })

  it('nothing lapsed -> zero counts, no writes', async () => {
    mockMembershipFindMany.mockResolvedValue([])

    const result = await expireLapsedMemberships()

    expect(result).toEqual({ expiredCount: 0, cancelledCount: 0 })
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })
})
