/**
 * Tests for recordFlaggedPayment (lib/services/transactions.ts) — the
 * persistent, admin-visible "requires manual review" record created when a
 * Stripe/Revolut payment succeeds for a user whose SchoolMember is ARCHIVED
 * (see the ARCHIVED guard in apps/web/app/api/webhooks/stripe/route.ts and
 * .../revolut/route.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()

const { Prisma } = await import('@/lib/prisma-client/client')
const { recordFlaggedPayment } = await import('@/lib/services/transactions')
const { PaymentMethod } = await import('@/lib/prisma-client/enums')

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: 'test',
})

function fakeTx() {
  return { transaction: { findFirst: mockFindFirst, create: mockCreate } } as unknown as Parameters<typeof recordFlaggedPayment>[0]
}

const baseInput = {
  schoolId: 'school-1',
  userId: 'user-1',
  amount: 50,
  currency: 'EUR',
  paymentMethod: PaymentMethod.STRIPE,
  reason: 'SchoolMember is ARCHIVED — payment captured but membership not activated',
  planId: 'plan-1',
  planName: 'Monthly BJJ',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindFirst.mockResolvedValue(null)
  mockCreate.mockResolvedValue({ id: 'tx-1', status: 'FLAGGED' })
})

describe('recordFlaggedPayment', () => {
  it('creates a FLAGGED transaction with the reason and planId recorded, and no membershipId', async () => {
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })

    expect(mockCreate).toHaveBeenCalledTimes(1)
    const data = mockCreate.mock.calls[0]![0].data
    expect(data.status).toBe('FLAGGED')
    expect(data.type).toBe('INCOME')
    expect(data.schoolId).toBe('school-1')
    expect(data.userId).toBe('user-1')
    expect(data.amount).toBe(50)
    expect(data.stripePaymentIntentId).toBe('pi_123')
    expect(data.notes).toContain('ARCHIVED')
    expect(data.notes).toContain('planId=plan-1')
    expect(data.description).toContain('Monthly BJJ')
    expect(data).not.toHaveProperty('membershipId')
  })

  it('does NOT create a duplicate when a transaction already exists for the same stripePaymentIntentId', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-tx' })
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('does NOT create a duplicate when a transaction already exists for the same revolutOrderId', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-tx' })
    await recordFlaggedPayment(fakeTx(), { ...baseInput, revolutOrderId: 'ord_123' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('swallows a P2002 from the DB unique constraint (race the pre-check missed) instead of throwing', async () => {
    mockCreate.mockRejectedValue(p2002)
    await expect(recordFlaggedPayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })).resolves.toBeNull()
  })

  it('rethrows non-P2002 errors', async () => {
    mockCreate.mockRejectedValue(new Error('connection lost'))
    await expect(recordFlaggedPayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })).rejects.toThrow('connection lost')
  })

  it('is not skipped for amount<=0 — flagging visibility matters regardless (unlike recordOnlinePayment)', async () => {
    await recordFlaggedPayment(fakeTx(), { ...baseInput, amount: 0, stripePaymentIntentId: 'pi_123' })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })
})
