/**
 * Single passes (bonos) and trials never renew: when they end, staff assign
 * a new plan. The daily cash-renewal sweep must not pick them up, and the
 * manual "Payment" action must refuse them. Plan-less (V1-imported)
 * memberships and subscriptions keep renewing as before.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

let membershipRow: Record<string, unknown>
const transactionCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'txn-1', ...args.data }))
const membershipFindMany = vi.fn(async (_args: unknown) => [{ id: 'm1', schoolId: 'school-1' }])

const tx = {
  $queryRaw: vi.fn(async () => [{ deletedAt: null }]),
  accountMerge: { findFirst: vi.fn(async () => null) },
  transaction: { findFirst: vi.fn(async () => null), create: transactionCreate },
}

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(async () => ({ ...membershipRow })),
      findMany: (args: unknown) => membershipFindMany(args),
    },
    transaction: { findFirst: vi.fn(async () => null) },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  },
}))

const { createRenewalPayment, generateDueRenewalPayments, isOneOffPlanType } = await import('@/lib/services/membership')

function row(plan: { planType: string; billingCycle: string | null; validityDays: number | null } | null) {
  return {
    id: 'm1', userId: 'u1', schoolId: 'school-1', status: 'ACTIVE', paymentMethod: 'CASH', cancelledAt: null,
    price: 50, currency: 'EUR', planName: 'Pase 1 Semana', planId: plan ? 'p1' : null, plan,
    startDate: new Date('2026-10-21'), endDate: new Date('2026-11-20'),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('one-off plans never get a renewal payment', () => {
  it('isOneOffPlanType', () => {
    expect(isOneOffPlanType('SINGLE_PASS')).toBe(true)
    expect(isOneOffPlanType('TRIAL')).toBe(true)
    expect(isOneOffPlanType('SUBSCRIPTION')).toBe(false)
    expect(isOneOffPlanType(null)).toBe(false)
  })

  it('manual Payment on a single pass is refused, nothing created', async () => {
    membershipRow = row({ planType: 'SINGLE_PASS', billingCycle: null, validityDays: 30 })
    await expect(createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })).rejects.toThrow(/do not renew/)
    expect(transactionCreate).not.toHaveBeenCalled()
  })

  it('manual Payment on a trial is refused', async () => {
    membershipRow = row({ planType: 'TRIAL', billingCycle: null, validityDays: 7 })
    await expect(createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })).rejects.toThrow(/do not renew/)
  })

  it('subscriptions and plan-less (imported) memberships still renew', async () => {
    membershipRow = row({ planType: 'SUBSCRIPTION', billingCycle: 'MONTHLY', validityDays: null })
    await createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })
    membershipRow = row(null)
    await createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })
    expect(transactionCreate).toHaveBeenCalledTimes(2)
  })

  it('the daily sweep only looks at renewable memberships', async () => {
    membershipRow = row({ planType: 'SUBSCRIPTION', billingCycle: 'MONTHLY', validityDays: null })
    await generateDueRenewalPayments()
    const where = (membershipFindMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where
    expect(where.OR).toEqual([{ planId: null }, { plan: { planType: { notIn: ['SINGLE_PASS', 'TRIAL'] } } }])
  })
})
