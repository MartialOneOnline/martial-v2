/**
 * undoCancelMembership() (lib/services/membership.ts): takes back a
 * scheduled end-of-period cancellation. Stripe first, awaited; the local
 * write is conditional on the membership still being ACTIVE and cancelling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindFirst = vi.fn()
const mockUpdateMany = vi.fn()
const mockFindUnique = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: { membership: { findFirst: mockFindFirst, updateMany: mockUpdateMany, findUnique: mockFindUnique } },
}))
const mockSubUpdate = vi.fn()
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ subscriptions: { update: (...a: unknown[]) => mockSubUpdate(...a), cancel: vi.fn() } }),
}))
vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipReceiptEmail: vi.fn() }))

const { undoCancelMembership } = await import('@/lib/services/membership')

const scheduled = (o: Record<string, unknown> = {}) => ({
  id: 'm1', schoolId: 's1', status: 'ACTIVE', cancelledAt: new Date('2026-11-14'), stripeSubId: null, notes: null,
  school: { stripeSecretKey: null }, ...o,
})
const input = { membershipId: 'm1', schoolId: 's1' }

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateMany.mockResolvedValue({ count: 1 })
  mockFindUnique.mockResolvedValue({ id: 'm1', status: 'ACTIVE', cancelledAt: null })
  mockSubUpdate.mockResolvedValue({})
})

describe('undoCancelMembership', () => {
  it('clears cancelledAt on an ACTIVE membership set to cancel, conditionally', async () => {
    mockFindFirst.mockResolvedValue(scheduled())
    const m = await undoCancelMembership(input)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'm1', schoolId: 's1', status: 'ACTIVE', cancelledAt: { not: null } },
      data: { cancelledAt: null, notes: 'Cancellation undone' },
    })
    expect(mockSubUpdate).not.toHaveBeenCalled()
    expect(m).toMatchObject({ cancelledAt: null })
  })

  it('keeps existing notes', async () => {
    mockFindFirst.mockResolvedValue(scheduled({ notes: 'Cancelled: moving' }))
    await undoCancelMembership(input)
    expect(mockUpdateMany.mock.calls[0]![0].data.notes).toBe('Cancelled: moving | Cancellation undone')
  })

  it('with Stripe: clears cancel_at_period_end first; a Stripe error changes nothing locally', async () => {
    mockFindFirst.mockResolvedValue(scheduled({ stripeSubId: 'sub_1', school: { stripeSecretKey: 'sk_test' } }))
    await undoCancelMembership(input)
    expect(mockSubUpdate).toHaveBeenCalledWith('sub_1', { cancel_at_period_end: false })
    expect(mockSubUpdate.mock.invocationCallOrder[0]!).toBeLessThan(mockUpdateMany.mock.invocationCallOrder[0]!)

    vi.clearAllMocks()
    mockSubUpdate.mockRejectedValue(new Error('No such subscription'))
    await expect(undoCancelMembership(input)).rejects.toThrow(/Stripe subscription update failed/)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('refuses a membership that already ended, or another school’s', async () => {
    mockFindFirst.mockResolvedValue(scheduled({ status: 'CANCELLED' }))
    await expect(undoCancelMembership(input)).rejects.toThrow(/assign a plan/)
    mockFindFirst.mockResolvedValue(null)
    await expect(undoCancelMembership(input)).rejects.toThrow(/not found/)
    expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm1', schoolId: 's1' } }))
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('if it ended meanwhile (conditional write matched nothing), says so instead of reviving it', async () => {
    mockFindFirst.mockResolvedValue(scheduled())
    mockUpdateMany.mockResolvedValue({ count: 0 })
    await expect(undoCancelMembership(input)).rejects.toThrow(/changed meanwhile/)
  })
  it('Stripe subscription but no school key: clear error, nothing written locally (Project Audit P2)', async () => {
    mockFindFirst.mockResolvedValue(scheduled({ stripeSubId: 'sub_1', school: { stripeSecretKey: null } }))
    await expect(undoCancelMembership(input)).rejects.toThrow(/no Stripe key/)
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockSubUpdate).not.toHaveBeenCalled()
  })

  it('a retry after the cancellation was already undone succeeds without writing or calling Stripe', async () => {
    mockFindFirst.mockResolvedValue(scheduled({ cancelledAt: null, stripeSubId: 'sub_1', school: { stripeSecretKey: 'sk_test' } }))
    const r = await undoCancelMembership(input)
    expect(r).toEqual({ id: 'm1', status: 'ACTIVE', cancelledAt: null }) // re-read, no school/secret
    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'm1' } })
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockSubUpdate).not.toHaveBeenCalled()
  })
})
