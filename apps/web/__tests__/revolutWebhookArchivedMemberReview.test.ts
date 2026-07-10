/**
 * Tests for POST /api/webhooks/revolut — ARCHIVED-member payment review
 * (P1/P2 hardening). When ORDER_COMPLETED arrives for a user whose
 * SchoolMember is ARCHIVED, the membership must NOT activate and the
 * SchoolMember must NOT be reactivated — but the payment Revolut already
 * captured needs to be auditable, not just logged. This persists it as a
 * FLAGGED Transaction (see recordFlaggedPayment in lib/services/transactions.ts).
 *
 * Revolut carries no per-delivery event id to dedupe on (unlike Stripe), so
 * every redelivery of ORDER_COMPLETED re-runs the ARCHIVED check from
 * scratch — recordFlaggedPayment's own idempotency guard (pre-check +
 * unique-constraint catch, exercised for real here via a stateful fake
 * tx.transaction) is what prevents a duplicate flagged row, not an outer
 * claim. That's the specific thing "replay doesn't duplicate" tests here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetRevolutOrder = vi.fn().mockResolvedValue({ state: 'COMPLETED' })
const mockRefundRevolutOrder = vi.fn().mockResolvedValue({})
const mockVerifyRevolutWebhook = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/revolut', () => ({
  getRevolutOrder: (...args: unknown[]) => mockGetRevolutOrder(...args),
  refundRevolutOrder: (...args: unknown[]) => mockRefundRevolutOrder(...args),
  verifyRevolutWebhook: (...args: unknown[]) => mockVerifyRevolutWebhook(...args),
}))
vi.mock('@/lib/email/sendEmails', () => ({
  sendMembershipReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendEventTicketRefundedEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/notifications/create', () => ({ notifyPaymentReceived: vi.fn() }))

const mockRecordOnlinePayment = vi.fn().mockResolvedValue(undefined)
// recordFlaggedPayment stays REAL (see file header) — recordOnlinePayment is
// mocked away since normal activation isn't what this file is testing.
vi.mock('@/lib/services/transactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/transactions')>()
  return { ...actual, recordOnlinePayment: (...args: unknown[]) => mockRecordOnlinePayment(...args) }
})

const mockCheckEventCapacity = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: (...args: unknown[]) => mockCheckEventCapacity(...args) }))

// ── In-memory "DB" shared across mocks, reset per test ──────────────────────
type Membership = Record<string, unknown> & { id: string; userId: string; schoolId: string; status: string }
type EventBooking = {
  id: string; status: string; quantity: number; ticketId: string; eventId: string; ticketName: string
  amountPaid: number; currency: string; userId: string; qrToken: string; revolutOrderId: string
  event: { title: string; startAt: Date; location: string; capacity: number | null; schoolId: string; school: { revolutSecretKey: string; revolutWebhookSecret: string; name: string; city: string; language: string } }
  ticket: { capacity: number | null }
  user: { email: string; name: string }
}
type TransactionRow = {
  id: string; schoolId: string; userId: string; status: string; amount: number; bookingId?: string | null
  revolutOrderId?: string | null; stripePaymentIntentId?: string | null; notes?: string | null
}

let memberships: Record<string, Membership>
let eventBookings: Record<string, EventBooking>
let schoolMembers: Record<string, { userId: string; schoolId: string; status: string }>
let transactions: Record<string, TransactionRow>
let transactionSeq: number

function resetState() {
  memberships = {}
  eventBookings = {}
  schoolMembers = {}
  transactions = {}
  transactionSeq = 0
}
function smKey(schoolId: string, userId: string) { return `${schoolId}:${userId}` }

const mockMembershipFindFirst = vi.fn((args: { where: { revolutOrderId: string } }) => {
  const m = Object.values(memberships).find(x => x.revolutOrderId === args.where.revolutOrderId)
  return Promise.resolve(m ? { ...m } : null)
})
const mockMembershipUpdateMany = vi.fn((args: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
  const m = memberships[args.where.id]
  if (!m || m.status !== args.where.status) return Promise.resolve({ count: 0 })
  Object.assign(m, args.data)
  return Promise.resolve({ count: 1 })
})
const mockMembershipFindUnique = vi.fn((args: { where: { id: string } }) => {
  const m = memberships[args.where.id]
  if (!m) return Promise.resolve(null)
  return Promise.resolve({
    planName: m.planName, price: m.price, currency: m.currency, startDate: m.startDate, endDate: m.endDate ?? null,
    user: { email: 'user@test.com', name: 'Test User' },
    school: { name: 'Academy', city: 'City', language: 'en' },
  })
})

const mockSchoolMemberFindUnique = vi.fn((args: { where: { schoolId_userId: { schoolId: string; userId: string } } }) => {
  const sm = schoolMembers[smKey(args.where.schoolId_userId.schoolId, args.where.schoolId_userId.userId)]
  return Promise.resolve(sm ? { ...sm } : null)
})
const mockSchoolMemberCreate = vi.fn((args: { data: { schoolId: string; userId: string; status: string } }) => {
  const key = smKey(args.data.schoolId, args.data.userId)
  if (schoolMembers[key]) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  schoolMembers[key] = { userId: args.data.userId, schoolId: args.data.schoolId, status: args.data.status }
  return Promise.resolve(schoolMembers[key])
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

const mockEventBookingFindFirst = vi.fn((args: { where: { revolutOrderId: string } }) => {
  const b = Object.values(eventBookings).find(x => x.revolutOrderId === args.where.revolutOrderId)
  return Promise.resolve(b ? { ...b } : null)
})
const mockEventBookingUpdateMany = vi.fn((args: { where: { id: string; status: string }; data: Record<string, unknown> }) => {
  const b = eventBookings[args.where.id]
  if (!b || b.status !== args.where.status) return Promise.resolve({ count: 0 })
  Object.assign(b, args.data)
  return Promise.resolve({ count: 1 })
})
const mockEventBookingUpdate = vi.fn((args: { where: { id: string }; data: Record<string, unknown> }) => {
  const b = eventBookings[args.where.id]
  if (b) Object.assign(b, args.data)
  return Promise.resolve(b)
})

// Mirrors the real unique constraint on Transaction.revolutOrderId /
// stripePaymentIntentId — see recordFlaggedPayment's pre-check + P2002 catch.
const mockTransactionFindFirst = vi.fn((args: { where: { stripePaymentIntentId?: string; revolutOrderId?: string } }) => {
  const found = Object.values(transactions).find(t =>
    (args.where.stripePaymentIntentId && t.stripePaymentIntentId === args.where.stripePaymentIntentId) ||
    (args.where.revolutOrderId && t.revolutOrderId === args.where.revolutOrderId),
  )
  return Promise.resolve(found ? { id: found.id } : null)
})
const mockTransactionCreate = vi.fn((args: { data: Record<string, unknown> }) => {
  const dupe = Object.values(transactions).some(t =>
    (args.data.revolutOrderId && t.revolutOrderId === args.data.revolutOrderId) ||
    (args.data.stripePaymentIntentId && t.stripePaymentIntentId === args.data.stripePaymentIntentId),
  )
  if (dupe) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  const id = `tx-${++transactionSeq}`
  const row = { id, ...args.data } as TransactionRow
  transactions[id] = row
  return Promise.resolve(row)
})

const mockTransaction = vi.fn((fn: (tx: unknown) => unknown) => {
  const tx = {
    membership: { updateMany: mockMembershipUpdateMany },
    schoolMember: { create: mockSchoolMemberCreate, updateMany: mockSchoolMemberUpdateMany, findUnique: mockSchoolMemberFindUnique },
    eventBooking: { updateMany: mockEventBookingUpdateMany, update: mockEventBookingUpdate },
    transaction: { findFirst: mockTransactionFindFirst, create: mockTransactionCreate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findFirst: mockMembershipFindFirst, findUnique: mockMembershipFindUnique },
    eventBooking: { findFirst: (...args: unknown[]) => mockEventBookingFindFirst(...(args as [{ where: { revolutOrderId: string } }])) },
    $transaction: mockTransaction,
  },
}))

const { POST } = await import('@/app/api/webhooks/revolut/route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/revolut', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function seedMembership(overrides: Partial<Membership> & { id: string; revolutOrderId: string }) {
  memberships[overrides.id] = {
    userId: 'user-1', schoolId: 'school-1', status: 'PENDING', planId: 'plan-1', planName: 'Monthly', price: 50, currency: 'EUR',
    plan: { validityDays: null },
    school: { revolutSecretKey: 'sk_test', revolutWebhookSecret: 'whsec_test', name: 'Academy', city: 'City', language: 'en' },
    ...overrides,
  }
}
function seedSchoolMember(schoolId: string, userId: string, status: string) {
  schoolMembers[smKey(schoolId, userId)] = { userId, schoolId, status }
}
function seedEventBooking(overrides: Partial<EventBooking> & { id: string; revolutOrderId: string }) {
  eventBookings[overrides.id] = {
    status: 'PENDING', quantity: 1, ticketId: 'ticket-1', eventId: 'event-1', ticketName: 'General',
    amountPaid: 30, currency: 'EUR', userId: 'user-1', qrToken: 'qr-1',
    event: { title: 'Open Mat', startAt: new Date(), location: 'Gym', capacity: null, schoolId: 'school-1', school: { revolutSecretKey: 'sk_test', revolutWebhookSecret: 'whsec_test', name: 'Academy', city: 'City', language: 'en' } },
    ticket: { capacity: null },
    user: { email: 'user@test.com', name: 'Test User' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  mockGetRevolutOrder.mockResolvedValue({ state: 'COMPLETED' })
  mockVerifyRevolutWebhook.mockResolvedValue(true)
})

describe('POST /api/webhooks/revolut — ORDER_COMPLETED for an ARCHIVED member', () => {
  it('does not activate the Membership or reactivate the ARCHIVED SchoolMember, and flags the payment', async () => {
    seedMembership({ id: 'membership-1', revolutOrderId: 'ord_1' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_1' }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('PENDING') // never claimed
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED') // untouched
    expect(mockRecordOnlinePayment).not.toHaveBeenCalled()

    const flagged = Object.values(transactions)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toMatchObject({
      status: 'FLAGGED', schoolId: 'school-1', userId: 'user-1', amount: 50, revolutOrderId: 'ord_1',
    })
    expect(flagged[0]!.notes).toContain('planId=plan-1')
  })

  it('replaying the same ORDER_COMPLETED delivery does not create a second flagged transaction', async () => {
    seedMembership({ id: 'membership-1', revolutOrderId: 'ord_2' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_2' }

    const first = await POST(makeRequest(body))
    expect(first.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1)

    // No per-delivery event id on Revolut payloads — every redelivery re-runs
    // the ARCHIVED check from scratch, unlike Stripe's outer event claim.
    const second = await POST(makeRequest(body))
    expect(second.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1) // still just one
    expect(memberships['membership-1']!.status).toBe('PENDING')
  })

  it('a non-ARCHIVED SchoolMember follows the normal activation flow, not the review path', async () => {
    seedMembership({ id: 'membership-1', revolutOrderId: 'ord_3' })
    seedSchoolMember('school-1', 'user-1', 'FROZEN')

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_3' }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(Object.values(transactions)).toHaveLength(0)
  })

  it('a brand-new user with no prior SchoolMember row still activates normally', async () => {
    seedMembership({ id: 'membership-1', revolutOrderId: 'ord_4' })
    // no seedSchoolMember call — no prior row

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_4' }))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
    expect(Object.values(transactions)).toHaveLength(0)
  })
})

describe('POST /api/webhooks/revolut — event booking ORDER_COMPLETED for an ARCHIVED member', () => {
  it('cancels the booking instead of confirming it, and flags the payment for manual review', async () => {
    seedEventBooking({ id: 'booking-1', revolutOrderId: 'ord_eb_1' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_eb_1' }))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CANCELLED') // not CONFIRMED
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED') // untouched
    expect(mockRecordOnlinePayment).not.toHaveBeenCalled()
    expect(mockRefundRevolutOrder).not.toHaveBeenCalled() // no automatic refund

    const flagged = Object.values(transactions)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toMatchObject({
      status: 'FLAGGED', schoolId: 'school-1', userId: 'user-1',
      amount: 30, currency: 'EUR', bookingId: 'booking-1', revolutOrderId: 'ord_eb_1',
    })
    expect(flagged[0]!.notes).toContain('eventId=event-1')
  })

  it('replaying the same ORDER_COMPLETED delivery does not create a second flagged transaction', async () => {
    seedEventBooking({ id: 'booking-2', revolutOrderId: 'ord_eb_2' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_eb_2' }

    const first = await POST(makeRequest(body))
    expect(first.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1)

    const second = await POST(makeRequest(body))
    expect(second.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1) // still just one
  })

  it('a non-ARCHIVED SchoolMember confirms the booking normally', async () => {
    seedEventBooking({ id: 'booking-3', revolutOrderId: 'ord_eb_3' })
    seedSchoolMember('school-1', 'user-1', 'FROZEN')

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_eb_3' }))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-3']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(Object.values(transactions)).toHaveLength(0)
  })

  it('a brand-new user with no prior SchoolMember row still confirms the booking normally', async () => {
    seedEventBooking({ id: 'booking-4', revolutOrderId: 'ord_eb_4' })
    // no seedSchoolMember call — no prior row

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_eb_4' }))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-4']!.status).toBe('CONFIRMED')
    expect(Object.values(transactions)).toHaveLength(0)
  })
})
