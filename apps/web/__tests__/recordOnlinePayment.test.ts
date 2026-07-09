/**
 * Tests for recordOnlinePayment's own duplicate guard (lib/services/transactions.ts) —
 * a second line of defense behind the webhook handlers' idempotency claims
 * (StripeWebhookEvent claim for Stripe, conditional PENDING->ACTIVE update for
 * Revolut) and the DB-level unique index on Transaction.stripePaymentIntentId /
 * revolutOrderId (prisma/migrations/20260709210000_transaction_provider_ref_unique).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindFirst = vi.fn()
const mockCreate = vi.fn()

const { Prisma } = await import('@/lib/prisma-client/client')
const { recordOnlinePayment } = await import('@/lib/services/transactions')
const { PaymentMethod, TransactionCategory } = await import('@/lib/prisma-client/enums')

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: 'test',
})

function fakeTx() {
  return { transaction: { findFirst: mockFindFirst, create: mockCreate } } as unknown as Parameters<typeof recordOnlinePayment>[0]
}

const baseInput = {
  schoolId: 'school-1',
  userId: 'user-1',
  amount: 50,
  currency: 'EUR',
  paymentMethod: PaymentMethod.STRIPE,
  category: TransactionCategory.MEMBERSHIP,
  description: 'Monthly plan',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindFirst.mockResolvedValue(null)
  mockCreate.mockResolvedValue({ id: 'tx-1' })
})

describe('recordOnlinePayment', () => {
  it('creates a transaction when no provider reference is given', async () => {
    await recordOnlinePayment(fakeTx(), { ...baseInput })
    expect(mockCreate).toHaveBeenCalledTimes(1)
  })

  it('is a no-op for zero/negative amounts (free plans/tickets)', async () => {
    await recordOnlinePayment(fakeTx(), { ...baseInput, amount: 0 })
    expect(mockFindFirst).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('skips creation when a transaction already exists for the same stripePaymentIntentId', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-tx' })
    await recordOnlinePayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('skips creation when a transaction already exists for the same revolutOrderId', async () => {
    mockFindFirst.mockResolvedValue({ id: 'existing-tx' })
    await recordOnlinePayment(fakeTx(), { ...baseInput, revolutOrderId: 'ord_123' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('swallows a P2002 from the DB unique constraint (race the pre-check missed) instead of throwing', async () => {
    mockCreate.mockRejectedValue(p2002)
    await expect(recordOnlinePayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })).resolves.toBeUndefined()
  })

  it('rethrows non-P2002 errors', async () => {
    mockCreate.mockRejectedValue(new Error('connection lost'))
    await expect(recordOnlinePayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_123' })).rejects.toThrow('connection lost')
  })
})
