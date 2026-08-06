/**
 * Tests for the membership expiry sweep (lib/services/membership.ts).
 *
 * Before this fix, an ACTIVE membership whose endDate had passed stayed
 * ACTIVE forever unless a student had explicitly requested cancellation
 * (cancelledAt set) — the EXPIRED status existed in the schema but nothing
 * ever wrote it, silently inflating "active members" counts.
 *
 * A 30-day grace period (EXPIRY_GRACE_PERIOD_DAYS, matching V1's default)
 * sits in front of the actual expiry — a membership isn't touched until
 * its endDate is more than 30 days in the past, so someone who paid in
 * cash but hasn't been renewed in the system yet doesn't lose access the
 * moment the cron runs. Fixtures below default to 40 days lapsed (past
 * the grace window) unless a test is specifically exercising the grace
 * window itself.
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
    cancelledAt: null, endDate: new Date(Date.now() - 40 * 86_400_000), // 40 days ago — past the 30-day grace window
    planName: 'Jiu Jitsu Mensual',
    user: { name: 'Test Student', email: 'student@example.com' },
    school: { name: 'Test School' },
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

  it('endDate passed but still within the 30-day grace period -> no-op, keeps access', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ endDate: new Date(Date.now() - 10 * 86_400_000) }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(false)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('endDate exactly at the edge of the grace period (31 days ago) -> expires', async () => {
    mockMembershipFindUnique.mockResolvedValue(fakeMembership({ endDate: new Date(Date.now() - 31 * 86_400_000) }))

    const result = await checkAndExpireMembership('membership-1')

    expect(result).toBe(true)
    expect(mockMembershipUpdate).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: 'EXPIRED' },
    })
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
      select: {
        id: true, userId: true, schoolId: true, cancelledAt: true, endDate: true, planName: true,
        user: { select: { name: true, email: true } },
        school: { select: { name: true } },
      },
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

  it('dryRun: true -> returns a preview with no writes at all', async () => {
    mockMembershipFindMany.mockResolvedValue([
      fakeMembership({ id: 'm-1' }),
      fakeMembership({ id: 'm-2', cancelledAt: new Date() }),
    ])

    const result = await expireLapsedMemberships({ dryRun: true })

    expect(result.expiredCount).toBe(1)
    expect(result.cancelledCount).toBe(1)
    expect(result.preview).toHaveLength(2)
    expect(result.preview?.[0]).toMatchObject({
      id: 'm-1', schoolName: 'Test School', userName: 'Test Student',
      userEmail: 'student@example.com', planName: 'Jiu Jitsu Mensual', willBecome: 'EXPIRED',
    })
    expect(result.preview?.[1]).toMatchObject({ id: 'm-2', willBecome: 'CANCELLED' })
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
