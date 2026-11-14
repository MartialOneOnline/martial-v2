/**
 * Cron writers vs. an account merge (Project Audit, Lote U).
 * The daily cron reads a membership (owner S), an admin merges S → K
 * meanwhile, then the cron writes. createRenewalPayment and the expiry path
 * lock the owner inside their transaction (lockSurvivingUser), so the debt /
 * status sync lands on K, never on the retired account.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Merged ids → kept ids, rows deleted by a merge, and a hook fired when the
// writer takes its user lock (to commit a merge "while it waits").
let merges: Record<string, string>
let deleted: Set<string>
let onUserLock: (() => void) | null
const transactionCreate = vi.fn(async (args: { data: Record<string, unknown> }) => ({ id: 'txn-1', ...args.data }))
const schoolMemberUpdateMany = vi.fn(async (args: unknown) => args && ({ count: 1 }))
const membershipUpdate = vi.fn(async () => ({}))

const membershipRow = {
  id: 'm1', userId: 'S', schoolId: 'school-1', status: 'ACTIVE', paymentMethod: 'CASH', cancelledAt: null,
  price: 65, currency: 'EUR', planName: 'Mensual', planId: null, plan: null,
  startDate: new Date('2026-10-01'), endDate: new Date('2026-09-01'), createdAt: new Date('2026-01-01'),
  assignedAt: null, endDateManual: false,
}

const tx = {
  $queryRaw: vi.fn(async (_s: TemplateStringsArray, id: string) => {
    const hook = onUserLock
    onUserLock = null
    hook?.()
    return deleted.has(id) ? [] : [{ deletedAt: null }]
  }),
  accountMerge: { findFirst: vi.fn(async ({ where }: { where: { mergedUserId: string } }) => (merges[where.mergedUserId] ? { keptUserId: merges[where.mergedUserId] } : null)) },
  transaction: { findFirst: vi.fn(async () => null), create: transactionCreate },
  membership: { update: membershipUpdate, findMany: vi.fn(async () => []), findFirst: vi.fn(async () => null), count: vi.fn(async () => 0) },
  schoolMember: { updateMany: schoolMemberUpdateMany, findFirst: vi.fn(async () => null), findUnique: vi.fn(async () => null) },
}

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: {
      findFirst: vi.fn(async () => ({ ...membershipRow })),
      findUnique: vi.fn(async () => ({ ...membershipRow })),
      findMany: vi.fn(async () => [{ id: 'm1', schoolId: 'school-1' }]),
    },
    transaction: { findFirst: vi.fn(async () => null) },
    $transaction: (fn: (t: unknown) => unknown) => fn(tx),
  },
}))

const { createRenewalPayment, generateDueRenewalPayments, checkAndExpireMembership } = await import('@/lib/services/membership')

function mergeWhileWaiting(chain = false) {
  onUserLock = () => {
    merges = chain ? { S: 'MID', MID: 'K' } : { S: 'K' }
    deleted = new Set(chain ? ['S', 'MID'] : ['S'])
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  merges = {}
  deleted = new Set()
  onUserLock = null
})

describe('cash renewal (createRenewalPayment / generateDueRenewalPayments)', () => {
  it('a merge committing while the cron waits: the pending renewal goes to the surviving account', async () => {
    mergeWhileWaiting()
    await createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })
    expect(transactionCreate.mock.calls[0]![0].data).toMatchObject({ userId: 'K', status: 'PENDING', membershipId: 'm1' })
  })

  it('the daily sweep does the same, also through a chain of merges', async () => {
    mergeWhileWaiting(true)
    expect(await generateDueRenewalPayments()).toEqual({ createdCount: 1 })
    expect(transactionCreate.mock.calls[0]![0].data).toMatchObject({ userId: 'K' })
  })

  it('without a merge nothing changes', async () => {
    await createRenewalPayment({ membershipId: 'm1', schoolId: 'school-1' })
    expect(transactionCreate.mock.calls[0]![0].data).toMatchObject({ userId: 'S' })
  })
})

describe('expiry (checkAndExpireMembership → expireOneMembership)', () => {
  it('a merge committing meanwhile: the member status sync targets the surviving account', async () => {
    mergeWhileWaiting()
    expect(await checkAndExpireMembership('m1')).toBe(true)
    expect(membershipUpdate).toHaveBeenCalled()
    const where = JSON.stringify(schoolMemberUpdateMany.mock.calls.map(c => c[0]))
    expect(where).toContain('"K"')
    expect(where).not.toContain('"S"')
  })
})
