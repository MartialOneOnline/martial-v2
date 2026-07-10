/**
 * Tests for POST /api/webhooks/stripe — membership lifecycle sync (P1/P2
 * hardening). Covers:
 *  - invoice.payment_failed / invoice.payment_succeeded / customer.subscription.deleted
 *    projecting Membership.status onto SchoolMember.status, and never touching ARCHIVED.
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
    webhooks: { constructEvent: (rawBody: string) => JSON.parse(rawBody) },
    refunds: { create: vi.fn().mockResolvedValue({}) },
  }),
}))
vi.mock('@/lib/email/sendEmails', () => ({
  sendMembershipReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketRefundedEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/notifications/create', () => ({ notifyPaymentReceived: vi.fn() }))
vi.mock('@/lib/services/transactions', () => ({ recordOnlinePayment: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: vi.fn().mockResolvedValue({ ok: true }) }))

type Membership = {
  id: string; userId: string; schoolId: string; status: string; planId?: string | null
  stripeSubId?: string | null; stripeInvoiceId?: string | null; cancelledAt?: Date | null; endDate?: Date | null
  planName?: string; currency?: string; [k: string]: unknown
}
type SchoolMember = { userId: string; schoolId: string; status: string }

let webhookEvents: Record<string, { status: string; updatedAt: number }>
let memberships: Record<string, Membership>
let schoolMembers: Record<string, SchoolMember>
let membershipSeq: number

function resetState() {
  webhookEvents = {}
  memberships = {}
  schoolMembers = {}
  membershipSeq = 0
}
function smKey(schoolId: string, userId: string) { return `${schoolId}:${userId}` }
function seedMembership(m: Partial<Membership> & { id: string }) {
  memberships[m.id] = { userId: 'user-1', schoolId: 'school-1', status: 'ACTIVE', planName: 'Monthly', currency: 'EUR', ...m }
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
    const val = (m as Record<string, unknown>)[key]
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const c = cond as { not?: unknown; in?: unknown[] }
      if ('not' in c && val === c.not) return false
      if ('in' in c && c.in && !c.in.includes(val)) return false
    } else if (val !== cond) {
      return false
    }
  }
  return true
}

const mockSchoolFindUnique = vi.fn().mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })

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

const mockTransaction = vi.fn((fn: (tx: unknown) => unknown) => {
  const tx = {
    membership: { findFirst: mockMembershipFindFirst, create: mockMembershipCreate, updateMany: mockMembershipUpdateMany },
    schoolMember: { findUnique: mockSchoolMemberFindUnique, updateMany: mockSchoolMemberUpdateMany, create: mockSchoolMemberCreate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockSchoolFindUnique },
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
})

describe('invoice.payment_failed', () => {
  it('sets Membership PAUSED and SchoolMember FROZEN', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(makeRequest({ id: 'evt_1', type: 'invoice.payment_failed', data: { object: { subscription: 'sub_1', metadata: { schoolId: 'school-1' } } } }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('PAUSED')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('FROZEN')
  })

  it('does not touch an ARCHIVED SchoolMember', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    await POST(makeRequest({ id: 'evt_2', type: 'invoice.payment_failed', data: { object: { subscription: 'sub_1', metadata: { schoolId: 'school-1' } } } }))

    expect(memberships['membership-1']!.status).toBe('PAUSED') // membership itself still reflects Stripe truth
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED') // but SchoolMember is untouched
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

  it('does not reactivate an ARCHIVED SchoolMember', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'PAUSED', stripeInvoiceId: null })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    await POST(makeRequest({
      id: 'evt_4', type: 'invoice.payment_succeeded',
      data: { object: { subscription: 'sub_1', id: 'in_2', billing_reason: 'subscription_cycle', amount_paid: 5000, metadata: { schoolId: 'school-1' } } },
    }))

    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED')
  })
})

describe('customer.subscription.deleted', () => {
  it('sets Membership CANCELLED and SchoolMember INACTIVE when there is no other ACTIVE membership', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    seedSchoolMember('school-1', 'user-1', 'ACTIVE')

    const res = await POST(makeRequest({ id: 'evt_5', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1', metadata: { schoolId: 'school-1' } } } }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('CANCELLED')
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

  it('uses current_period_end to update endDate when present', async () => {
    seedMembership({ id: 'membership-1', stripeSubId: 'sub_1', status: 'ACTIVE' })
    const periodEndUnix = Math.floor(Date.now() / 1000) + 30 * 86_400

    await POST(makeRequest({
      id: 'evt_9', type: 'customer.subscription.updated',
      data: { object: { id: 'sub_1', status: 'active', current_period_end: periodEndUnix, metadata: { schoolId: 'school-1' } } },
    }))

    expect(memberships['membership-1']!.endDate).toEqual(new Date(periodEndUnix * 1000))
  })
})

describe('checkout.session.completed — ARCHIVED member payment success', () => {
  it('does not create a Membership or reactivate the ARCHIVED SchoolMember', async () => {
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
  })
})
