/**
 * Tests for POST /api/webhooks/stripe — membership lifecycle sync (P1/P2
 * hardening). Covers:
 *  - invoice.payment_succeeded / customer.subscription.deleted projecting
 *    Membership.status onto SchoolMember.status, and never touching ARCHIVED.
 *  - invoice.payment_failed / subscription past_due leaving access alone (Stripe's
 *    retry window is the grace period) and only moving Membership.paymentStatus;
 *    'unpaid' being where access is actually cut, and stale events being ignored.
 *  - school resolution when an event carries no schoolId metadata.
 *  - customer.subscription.updated with cancel_at_period_end=true no longer cutting
 *    access immediately (the pre-fix bug forced Membership.CANCELLED here).
 *  - a payment success for an ARCHIVED SchoolMember not reactivating them or
 *    granting a new Membership.
 *
 * Mocks hold real in-memory shared state (memberships / schoolMembers keyed
 * tables) so the route's actual conditional queries (updateMany WHERE
 * clauses, composite-key lookups) are exercised rather than stubbed away.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: (rawBody: string, _sig: string, secret: string) => {
        if (invalidSecrets.has(secret)) throw new Error('No signatures found matching the expected signature')
        return JSON.parse(rawBody)
      },
    },
    refunds: { create: vi.fn().mockResolvedValue({}) },
  }),
}))
vi.mock('@/lib/email/sendEmails', () => ({
  sendMembershipReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketRefundedEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/notifications/create', () => ({ notifyPaymentReceived: vi.fn() }))
// recordOnlinePayment is mocked away (not the focus of these tests), but
// recordFlaggedPayment is left as the REAL implementation — its own
// idempotency guard (pre-check + unique-constraint catch against the fake
// tx.transaction table below) is exactly what the ARCHIVED-member tests
// need to exercise, not a stand-in.
vi.mock('@/lib/services/transactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/transactions')>()
  return { ...actual, recordOnlinePayment: vi.fn().mockResolvedValue(undefined) }
})
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: vi.fn().mockResolvedValue({ ok: true }) }))

type Membership = {
  id: string; userId: string; schoolId: string; status: string; planId?: string | null
  stripeSubId?: string | null; stripeInvoiceId?: string | null; cancelledAt?: Date | null; endDate?: Date | null
  planName?: string; currency?: string; [k: string]: unknown
}
type SchoolMember = { userId: string; schoolId: string; status: string }

type TransactionRow = {
  id: string; schoolId: string; userId: string; status: string; amount: number
  stripePaymentIntentId?: string | null; revolutOrderId?: string | null
  notes?: string | null; description?: string | null; [k: string]: unknown
}

let invalidSecrets: Set<string>
let webhookEvents: Record<string, { status: string; updatedAt: number }>
let memberships: Record<string, Membership>
let schoolMembers: Record<string, SchoolMember>
let transactions: Record<string, TransactionRow>
let membershipSeq: number
let transactionSeq: number

function resetState() {
  invalidSecrets = new Set()
  webhookEvents = {}
  memberships = {}
  schoolMembers = {}
  transactions = {}
  membershipSeq = 0
  transactionSeq = 0
}
function smKey(schoolId: string, userId: string) { return `${schoolId}:${userId}` }
function seedMembership(m: Partial<Membership> & { id: string }) {
  memberships[m.id] = { userId: 'user-1', schoolId: 'school-1', status: 'ACTIVE', paymentStatus: 'ACTIVE', paymentStatusAt: null, planName: 'Monthly', currency: 'EUR', ...m }
}
function seedSchoolMember(schoolId: string, userId: string, status: string) {
  schoolMembers[smKey(schoolId, userId)] = { userId, schoolId, status }
}

function matchesMembershipWhere(m: Membership, where: Record<string, unknown>): boolean {
  for (const [key, cond] of Object.entries(where)) {
    if (key === 'OR') {
      const or = cond as Record<string, unknown>[]
      if (!or.some(sub => matchesMembershipWhere(m, sub))) return false
      continue
    }
    const val = (m as Record<string, unknown>)[key] ?? null
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as { not?: unknown; in?: unknown[]; lte?: Date }
      if ('not' in c && val === c.not) return false
      if ('in' in c && c.in && !c.in.includes(val)) return false
      if ('lte' in c && c.lte && !(val instanceof Date && val.getTime() <= c.lte.getTime())) return false
    } else if (val !== cond) {
      return false
    }
  }
  return true
}

const mockSchoolFindUnique = vi.fn().mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })
const mockSchoolFindMany = vi.fn().mockResolvedValue([])

const mockStripeWebhookEventCreate = vi.fn((args: { data: { eventId: string; type: string; status: string } }) => {
  const { eventId, type, status } = args.data
  if (webhookEvents[eventId]) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  webhookEvents[eventId] = { status, updatedAt: Date.now() }
  return Promise.resolve({ id: `we_${eventId}`, eventId, type, status })
})
const mockStripeWebhookEventUpdateMany = vi.fn(() => Promise.resolve({ count: 0 }))
const mockStripeWebhookEventUpdate = vi.fn((args: { where: { eventId: string }; data: { status: string } }) => {
  const row = webhookEvents[args.where.eventId]
  if (row) row.status = args.data.status
  return Promise.resolve({})
})

const mockMembershipFindFirst = vi.fn((args: { where: Record<string, unknown> }) => {
  const found = Object.values(memberships).find(m => matchesMembershipWhere(m, args.where))
  return Promise.resolve(found ? { ...found } : null)
})
const mockMembershipFindUnique = vi.fn((args: { where: { id: string } }) => {
  const m = memberships[args.where.id]
  if (!m) return Promise.resolve(null)
  return Promise.resolve({
    planName: m.planName, price: 50, currency: m.currency, startDate: new Date(), endDate: m.endDate ?? null,
    user: { email: 'user@test.com', name: 'Test User' },
    school: { name: 'Academy', city: 'City', language: 'en' },
  })
})
const mockMembershipCreate = vi.fn((args: { data: Record<string, unknown> }) => {
  const id = `membership-${++membershipSeq}`
  const m = { id, ...args.data } as Membership
  memberships[id] = m
  return Promise.resolve(m)
})
const mockMembershipUpdateMany = vi.fn((args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
  const matches = Object.values(memberships).filter(m => matchesMembershipWhere(m, args.where))
  matches.forEach(m => Object.assign(m, args.data))
  return Promise.resolve({ count: matches.length })
})

const mockSchoolMemberFindUnique = vi.fn((args: { where: { schoolId_userId: { schoolId: string; userId: string } } }) => {
  const sm = schoolMembers[smKey(args.where.schoolId_userId.schoolId, args.where.schoolId_userId.userId)]
  return Promise.resolve(sm ? { ...sm } : null)
})
const mockSchoolMemberUpdateMany = vi.fn((args: { where: { userId?: string; schoolId?: string; status?: { not?: string } }; data: { status: string } }) => {
  let count = 0
  for (const sm of Object.values(schoolMembers)) {
    if (args.where.userId && sm.userId !== args.where.userId) continue
    if (args.where.schoolId && sm.schoolId !== args.where.schoolId) continue
    if (args.where.status?.not && sm.status === args.where.status.not) continue
    sm.status = args.data.status
    count++
  }
  return Promise.resolve({ count })
})
const mockSchoolMemberCreate = vi.fn((args: { data: { schoolId: string; userId: string; status: string } }) => {
  const key = smKey(args.data.schoolId, args.data.userId)
  if (schoolMembers[key]) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  schoolMembers[key] = { userId: args.data.userId, schoolId: args.data.schoolId, status: args.data.status }
  return Promise.resolve(schoolMembers[key])
})

// Mirrors the real Postgres unique constraint on
// Transaction.stripePaymentIntentId/revolutOrderId (see recordFlaggedPayment's
// pre-check + P2002 catch) so the idempotent-replay tests below exercise the
// actual guard, not a mock that just always succeeds.
const mockTransactionFindFirst = vi.fn((args: { where: { stripePaymentIntentId?: string; revolutOrderId?: string } }) => {
  const found = Object.values(transactions).find(t =>
    (args.where.stripePaymentIntentId && t.stripePaymentIntentId === args.where.stripePaymentIntentId) ||
    (args.where.revolutOrderId && t.revolutOrderId === args.where.revolutOrderId),
  )
  return Promise.resolve(found ? { id: found.id } : null)
})
const mockTransactionCreate = vi.fn((args: { data: Record<string, unknown> }) => {
  const dupe = Object.values(transactions).some(t =>
    (args.data.stripePaymentIntentId && t.stripePaymentIntentId === args.data.stripePaymentIntentId) ||
    (args.data.revolutOrderId && t.revolutOrderId === args.data.revolutOrderId),
  )
  if (dupe) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  const id = `tx-${++transactionSeq}`
  const row = { id, ...args.data } as TransactionRow
  transactions[id] = row
  return Promise.resolve(row)
})

const mockTransaction = vi.fn((fn: (tx: unknown) => unknown) => {
  const tx = {
    membership: { findFirst: mockMembershipFindFirst, create: mockMembershipCreate, updateMany: mockMembershipUpdateMany },
    schoolMember: { findUnique: mockSchoolMemberFindUnique, updateMany: mockSchoolMemberUpdateMany, create: mockSchoolMemberCreate },
    transaction: { findFirst: mockTransactionFindFirst, create: mockTransactionCreate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockSchoolFindUnique, findMany: mockSchoolFindMany },
    stripeWebhookEvent: { create: mockStripeWebhookEventCreate, updateMany: mockStripeWebhookEventUpdateMany, update: mockStripeWebhookEventUpdate },
    membership: { findFirst: mockMembershipFindFirst, findUnique: mockMembershipFindUnique, create: mockMembershipCreate, updateMany: mockMembershipUpdateMany },
    $transaction: mockTransaction,
  },
}))

const { POST } = await import('@/app/api/webhooks/stripe/route')

function makeRequest(event: unknown) {
  return new NextRequest('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': 'sig_test' },
    body: JSON.stringify(event),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  mockSchoolFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })
  mockSchoolFindMany.mockResolvedValue([])
})

describe('invoice.payment_failed', () => {
  const failed = (id: string, extra: Record<string, unknown> = {}) =>
    makeRequest({ id, type: 'invoice.payment_failed', ...extra, data: { object: { subscription: 'sub_1', metadata: { schoolId: 'school-1' } } } })

  it('marks paymentStatus PAST_DUE but leaves Membership and SchoolMember untouched — Stripe retrying is the grace period', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(failed('evt_1'))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.paymentStatus).toBe('PAST_DUE')
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
  })

  it('does not touch an ARCHIVED SchoolMember or the membership access status', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    await POST(failed('evt_2'))

    expect(memberships['membership-1']!.paymentStatus).toBe('PAST_DUE')
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED')
  })

  it('never downgrades a state that is already UNPAID or CANCELED', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'PAUSED', paymentStatus: 'UNPAID' })
    seedMembership({ id: 'membership-2', stripeSubId: 'sub_2', status: 'CANCELLED', paymentStatus: 'CANCELED' })

    await POST(failed('evt_3'))
    await POST(makeRequest({ id: 'evt_3b', type: 'invoice.payment_failed', data: { object: { subscription: 'sub_2', metadata: { schoolId: 'school-1' } } } }))

    expect(memberships['membership-1']!.paymentStatus).toBe('UNPAID')
    expect(memberships['membership-2']!.paymentStatus).toBe('CANCELED')
  })

  it('does not affect a membership on a different subscription', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_other', status: 'ACTIVE' })

    await POST(failed('evt_4'))

    expect(memberships['membership-1']!.paymentStatus).toBe('ACTIVE')
  })
})

describe('invoice.payment_succeeded (renewal)', () => {
  it('sets Membership ACTIVE and SchoolMember ACTIVE', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'PAUSED', stripeInvoiceId: null })
    seedSchoolMember('school-1', 'user-1', 'FROZEN')

    const res = await POST(makeRequest({
      id: 'evt_3', type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_1', id: 'in_1', billing_reason: 'subscription_cycle', amount_paid: 5000, metadata: { schoolId: 'school-1' } } },
    }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
  })

  it('a successful renewal after past_due resets paymentStatus to ACTIVE', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', paymentStatus: 'PAST_DUE', paymentStatusAt: new Date(1_000_000 * 1000), stripeInvoiceId: null })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    await POST(makeRequest({
      id: 'evt_rec', type: 'invoice.payment_succeeded', created: 2_000_000,
      data: { object: { subscription: 'sub_1', id: 'in_rec', billing_reason: 'subscription_cycle', amount_paid: 6500, metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.paymentStatus).toBe('ACTIVE')
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
  })

  it('reactivates an ARCHIVED SchoolMember on renewal — a paid subscription is itself a reactivation signal', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'PAUSED', stripeInvoiceId: null })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    await POST(makeRequest({
      id: 'evt_4', type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_1', id: 'in_2', billing_reason: 'subscription_cycle', amount_paid: 5000, metadata: { schoolId: 'school-1' } } },
    }))

    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
  })
})

describe('customer.subscription.deleted', () => {
  it('sets Membership CANCELLED and SchoolMember INACTIVE when there is no other ACTIVE membership', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(makeRequest({ id: 'evt_5', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', metadata: { schoolId: 'school-1' } } } }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('CANCELLED')
    expect(memberships['membership-1']!.paymentStatus).toBe('CANCELED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('INACTIVE')
  })

  it('does NOT set SchoolMember INACTIVE when another ACTIVE membership covers the same user+school', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedMembership({ id: 'membership-2', stripeSubId: 'sub_2', status: 'ACTIVE' }) // e.g. a separate bono/pass
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    await POST(makeRequest({ id: 'evt_6', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', metadata: { schoolId: 'school-1' } } } }))

    expect(memberships['membership-1']!.status).toBe('CANCELLED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE') // untouched — membership-2 still covers them
  })
})

describe('customer.subscription.updated', () => {
  it('cancel_at_period_end=true does NOT cut access immediately (stays ACTIVE, cancelledAt set)', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', cancelledAt: null })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(makeRequest({
      id: 'evt_7', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', cancel_at_period_end: true, metadata: { schoolId: 'school-1' } } },
    }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE') // NOT CANCELLED — the pre-fix bug
    expect(memberships['membership-1']!.cancelledAt).toBeTruthy() // intent recorded
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE') // access continues
  })

  it('status=canceled sets Membership CANCELLED and SchoolMember INACTIVE', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    await POST(makeRequest({
      id: 'evt_8', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'canceled', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.status).toBe('CANCELLED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('INACTIVE')
  })

  it('status=past_due sets paymentStatus PAST_DUE and leaves access untouched', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(makeRequest({
      id: 'evt_pd', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'past_due', metadata: { schoolId: 'school-1' } } },
    }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.paymentStatus).toBe('PAST_DUE')
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
  })

  it('status=unpaid (Stripe gave up retrying) sets UNPAID and cuts access: Membership PAUSED, SchoolMember FROZEN', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', paymentStatus: 'PAST_DUE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    await POST(makeRequest({
      id: 'evt_unpaid', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'unpaid', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.paymentStatus).toBe('UNPAID')
    expect(memberships['membership-1']!.status).toBe('PAUSED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('FROZEN')
  })

  it('a stale unpaid delivered after a newer recovery is ignored — does not freeze someone who already paid', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', paymentStatus: 'ACTIVE', paymentStatusAt: new Date(2_000_000 * 1000) })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    await POST(makeRequest({
      id: 'evt_stale', type: 'customer.subscription.updated', created: 1_000_000,
      data: { object: { id: 'sub_1', status: 'unpaid', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.paymentStatus).toBe('ACTIVE')
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
  })

  it('a stale past_due delivered after a newer recovery does not overwrite paymentStatus', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', paymentStatus: 'ACTIVE', paymentStatusAt: new Date(2_000_000 * 1000) })

    await POST(makeRequest({
      id: 'evt_stale2', type: 'customer.subscription.updated', created: 1_000_000,
      data: { object: { id: 'sub_1', status: 'past_due', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.paymentStatus).toBe('ACTIVE')
  })

  it('unpaid does not resurrect a CANCELLED membership into PAUSED', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'CANCELLED', paymentStatus: 'CANCELED' })
    seedSchoolMember('school-1', 'user-1', 'INACTIVE')

    await POST(makeRequest({
      id: 'evt_unpaid_c', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'unpaid', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.status).toBe('CANCELLED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('INACTIVE')
  })

  it('status=active after past_due restores paymentStatus ACTIVE', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', paymentStatus: 'PAST_DUE', paymentStatusAt: new Date(1_000_000 * 1000) })

    await POST(makeRequest({
      id: 'evt_back', type: 'customer.subscription.updated', created: 2_000_000,
      data: { object: { id: 'sub_1', status: 'active', metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.paymentStatus).toBe('ACTIVE')
  })

  it('uses current_period_end to update endDate when present', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    const periodEndUnix = Math.floor(Date.now() / 1000) + 30 * 86_400

    await POST(makeRequest({
      id: 'evt_9', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', current_period_end: periodEndUnix, metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.endDate).toEqual(new Date(periodEndUnix * 1000))
  })

  it('does not regress endDate when current_period_end is older than the stored value (out-of-order delivery)', async () => {
    const staleEndUnix = Math.floor(Date.now() / 1000) + 5 * 86_400
    const advancedEndDate = new Date((staleEndUnix + 25 * 86_400) * 1000)
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE', endDate: advancedEndDate })

    await POST(makeRequest({
      id: 'evt_9b', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', current_period_end: staleEndUnix, metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.endDate).toEqual(advancedEndDate)
    expect(memberships['membership-1']!.status).toBe('ACTIVE') // status still synced even though endDate was rejected
  })
})

describe('checkout.session.completed — ARCHIVED member payment success', () => {
  it('does not create a Membership or reactivate the ARCHIVED SchoolMember, and flags the payment for manual review', async () => {
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    const res = await POST(makeRequest({
      id: 'evt_10', type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'paid', payment_intent: 'pi_1',
          metadata: { schoolId: 'school-1', userId: 'user-1', planId: 'plan-1', planName: 'Monthly', price: '50', currency: 'EUR' },
        },
      },
    }))

    expect(res.status).toBe(200)
    expect(Object.keys(memberships)).toHaveLength(0) // no Membership created
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED') // untouched

    const flagged = Object.values(transactions)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toMatchObject({
      status: 'FLAGGED', schoolId: 'school-1', userId: 'user-1',
      amount: 50, currency: 'EUR', stripePaymentIntentId: 'pi_1',
    })
    expect(flagged[0]!.notes).toContain('planId=plan-1')
  })

  it('replaying the same webhook event does not create a second flagged transaction', async () => {
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')
    const event = {
      id: 'evt_10b', type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'paid', payment_intent: 'pi_1b',
          metadata: { schoolId: 'school-1', userId: 'user-1', planId: 'plan-1', planName: 'Monthly', price: '50', currency: 'EUR' },
        },
      },
    }

    const first = await POST(makeRequest(event))
    expect(first.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1)

    // Stripe redelivers the identical event (e.g. our ack timed out).
    const second = await POST(makeRequest(event))
    expect(second.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1) // still just one
  })

  it('still creates Membership + SchoolMember ACTIVE for a brand-new user (no prior SchoolMember row)', async () => {
    const res = await POST(makeRequest({
      id: 'evt_11', type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'paid', payment_intent: 'pi_2',
          metadata: { schoolId: 'school-1', userId: 'user-1', planId: 'plan-1', planName: 'Monthly', price: '50', currency: 'EUR' },
        },
      },
    }))

    expect(res.status).toBe(200)
    expect(Object.values(memberships)).toHaveLength(1)
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
    expect(Object.values(transactions)).toHaveLength(0) // nothing to review
  })

  it('a non-ARCHIVED existing SchoolMember (e.g. LEAD) follows the normal activation flow, not the review path', async () => {
    seedSchoolMember('school-1', 'user-1', 'LEAD')

    const res = await POST(makeRequest({
      id: 'evt_12', type: 'checkout.session.completed',
      data: {
        object: {
          payment_status: 'paid', payment_intent: 'pi_3',
          metadata: { schoolId: 'school-1', userId: 'user-1', planId: 'plan-1', planName: 'Monthly', price: '50', currency: 'EUR' },
        },
      },
    }))

    expect(res.status).toBe(200)
    expect(Object.values(memberships)).toHaveLength(1)
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
    expect(Object.values(transactions)).toHaveLength(0) // no review case
  })
})


describe('school resolution when the event carries no schoolId metadata', () => {
  const noMeta = (id: string) => makeRequest({
    id, type: 'invoice.payment_failed',
    data: { object: { subscription: 'sub_1' } },
  })

  it('falls back to the school whose webhook secret verifies the signature', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: null, status: 'ACTIVE' })
    invalidSecrets.add('whsec_wrong')
    mockSchoolFindMany.mockResolvedValue([
      { id: 'school-x', stripeSecretKey: 'sk_x', stripeWebhookSecret: 'whsec_wrong' },
      { id: 'school-1', stripeSecretKey: 'sk_1', stripeWebhookSecret: 'whsec_right' },
    ])
    seedMembership({ id: 'membership-2', stripeSubId: 'sub_1', status: 'ACTIVE' })
    // membership-2 is found by subId only if resolution gets past the school step;
    // make the subId lookup itself miss so the fallback path is what resolves it.
    mockMembershipFindFirst.mockImplementationOnce(() => Promise.resolve(null))

    const res = await POST(noMeta('evt_fb'))

    expect(res.status).toBe(200)
    expect(mockSchoolFindMany).toHaveBeenCalled()
    expect(webhookEvents['evt_fb']?.status).toBe('PROCESSED')
    expect(memberships['membership-2']!.paymentStatus).toBe('PAST_DUE')
  })

  it('returns 400 and does not claim the event when no connected school verifies the signature', async () => {
    invalidSecrets.add('whsec_wrong')
    mockMembershipFindFirst.mockImplementationOnce(() => Promise.resolve(null))
    mockSchoolFindMany.mockResolvedValue([{ id: 'school-x', stripeSecretKey: 'sk_x', stripeWebhookSecret: 'whsec_wrong' }])
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(noMeta('evt_none'))

    expect(res.status).toBe(400)
    expect(webhookEvents['evt_none']).toBeUndefined()
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('unable to resolve school'))
    errSpy.mockRestore()
  })

  it('rejects a forged event whose metadata names a real school but whose signature does not verify', async () => {
    invalidSecrets.add('whsec_test')
    mockSchoolFindMany.mockResolvedValue([])
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest({
      id: 'evt_forged', type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_1', metadata: { schoolId: 'school-1' } } },
    }))

    expect(res.status).toBe(400)
    expect(webhookEvents['evt_forged']).toBeUndefined()
    errSpy.mockRestore()
  })
})
