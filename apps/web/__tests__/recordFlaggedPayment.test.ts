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

const mockExecuteRaw = vi.fn().mockResolvedValue(1)
function fakeTx() {
  return { $executeRaw: mockExecuteRaw, transaction: { findFirst: mockFindFirst, create: mockCreate } } as unknown as Parameters<typeof recordFlaggedPayment>[0]
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

  it('subscription case: stores stripeInvoiceId and pre-checks FLAGGED rows by it', async () => {
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripeInvoiceId: 'in_1' })
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { stripeInvoiceId: 'in_1', status: 'FLAGGED' }, select: { id: true } })
    expect(mockCreate.mock.calls[0]![0].data).toMatchObject({ stripeInvoiceId: 'in_1', stripePaymentIntentId: null })

    vi.clearAllMocks()
    mockFindFirst.mockResolvedValue({ id: 'existing-tx' })
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripeInvoiceId: 'in_1' })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('subscription case: takes the per-invoice advisory lock BEFORE the pre-check; payment_intent case takes none', async () => {
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripeInvoiceId: 'in_1' })
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1)
    const [strings, key] = mockExecuteRaw.mock.calls[0]! as [TemplateStringsArray, string]
    expect(strings.join('?')).toContain('pg_advisory_xact_lock')
    expect(key).toBe('flagged-invoice:in_1')
    expect(mockExecuteRaw.mock.invocationCallOrder[0]!).toBeLessThan(mockFindFirst.mock.invocationCallOrder[0]!)

    vi.clearAllMocks()
    await recordFlaggedPayment(fakeTx(), { ...baseInput, stripePaymentIntentId: 'pi_9' })
    expect(mockExecuteRaw).not.toHaveBeenCalled() // unique column + P2002 backstop already covers it
  })

  describe('two CONCURRENT deliveries for the same subscription invoice', () => {
    // In-memory store + a lock that behaves like pg_advisory_xact_lock: held
    // until the owning transaction finishes. create() yields to the event loop
    // so, without the lock, both pre-checks run before either insert.
    function harness(lockWorks: boolean) {
      const rows: { id: string; stripeInvoiceId: string | null; status: string }[] = []
      const held = new Map<string, Promise<void>>()
      async function runTx(fn: (tx: Parameters<typeof recordFlaggedPayment>[0]) => Promise<unknown>) {
        let release = () => {}
        const tx = {
          $executeRaw: async (_s: TemplateStringsArray, key: string) => {
            if (!lockWorks) return 1
            while (held.has(key)) await held.get(key)
            held.set(key, new Promise<void>(r => { release = () => { held.delete(key); r() } }))
            return 1
          },
          transaction: {
            findFirst: async ({ where }: { where: { stripeInvoiceId?: string; status?: string } }) =>
              rows.find(r => r.stripeInvoiceId === where.stripeInvoiceId && (!where.status || r.status === where.status)) ?? null,
            create: async ({ data }: { data: { stripeInvoiceId: string | null; status: string } }) => {
              await new Promise(r => setTimeout(r, 5))
              const row = { id: `tx-${rows.length + 1}`, ...data }
              rows.push(row)
              return row
            },
          },
        } as unknown as Parameters<typeof recordFlaggedPayment>[0]
        try { return await fn(tx) } finally { release() } // commit releases the xact lock
      }
      return { rows, runTx }
    }

    it('with the advisory lock → exactly one FLAGGED row', async () => {
      const { rows, runTx } = harness(true)
      await Promise.all([
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_1' })),
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_1' })),
      ])
      expect(rows).toHaveLength(1)
    })

    it('control: the same race WITHOUT the lock duplicates (proves the harness detects it)', async () => {
      const { rows, runTx } = harness(false)
      await Promise.all([
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_1' })),
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_1' })),
      ])
      expect(rows).toHaveLength(2)
    })

    it('different invoices do not block each other', async () => {
      const { rows, runTx } = harness(true)
      await Promise.all([
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_1' })),
        runTx(tx => recordFlaggedPayment(tx, { ...baseInput, stripeInvoiceId: 'in_2' })),
      ])
      expect(rows).toHaveLength(2)
    })
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
