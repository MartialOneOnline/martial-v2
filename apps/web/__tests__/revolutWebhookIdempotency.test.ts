/**
 * Tests for POST /api/webhooks/revolut — payment idempotency (P1 hardening).
 *
 * Revolut webhook payloads carry no per-delivery event id to dedupe on up
 * front (unlike Stripe's event.id), so the retry/concurrency guard here is a
 * conditional claim done as an `updateMany(... WHERE status = 'PENDING')`
 * inside the transaction — the status check before the transaction is only
 * a fast-path optimization and cannot by itself prevent a race, since it
 * reads outside the transaction and can't see a concurrent racer's write.
 *
 * The membership/eventBooking mocks below hold real in-memory shared state
 * and mutate it synchronously (no internal await before the check-and-set),
 * mirroring how a real Postgres `UPDATE ... WHERE status = 'PENDING'`
 * serializes concurrent updates to the same row — so the "simulated race"
 * tests are meaningful rather than trivially passing.
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
vi.mock('@/lib/services/transactions', () => ({ recordOnlinePayment: (...args: unknown[]) => mockRecordOnlinePayment(...args) }))

const mockCheckEventCapacity = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: (...args: unknown[]) => mockCheckEventCapacity(...args) }))

// ── In-memory "DB" shared across mocks, reset per test ──────────────────────
let memberships: Record<string, Record<string, unknown>>
let eventBookings: Record<string, Record<string, unknown>>

function resetState() {
  memberships = {}
  eventBookings = {}
}

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
const mockSchoolMemberCreate = vi.fn().mockResolvedValue({})
const mockSchoolMemberUpdateMany = vi.fn().mockResolvedValue({ count: 0 })

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

const mockTransaction = vi.fn((fn: (tx: unknown) => unknown) => {
  const tx = {
    membership: { updateMany: mockMembershipUpdateMany },
    schoolMember: { create: mockSchoolMemberCreate, updateMany: mockSchoolMemberUpdateMany },
    eventBooking: { updateMany: mockEventBookingUpdateMany, update: mockEventBookingUpdate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findFirst: mockMembershipFindFirst, findUnique: mockMembershipFindUnique },
    eventBooking: { findFirst: mockEventBookingFindFirst },
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

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  mockGetRevolutOrder.mockResolvedValue({ state: 'COMPLETED' })
  mockVerifyRevolutWebhook.mockResolvedValue(true)
  mockCheckEventCapacity.mockResolvedValue({ ok: true })
})

describe('POST /api/webhooks/revolut — membership ORDER_COMPLETED idempotency', () => {
  beforeEach(() => {
    memberships['membership-1'] = {
      id: 'membership-1', userId: 'user-1', schoolId: 'school-1', status: 'PENDING',
      planName: 'Monthly', price: 50, currency: 'EUR', revolutOrderId: 'ord_1',
      plan: { validityDays: null },
      school: { revolutSecretKey: 'sk_test', revolutWebhookSecret: 'whsec_test', name: 'Academy', city: 'City', language: 'en' },
    }
  })

  it('retry: a second ORDER_COMPLETED delivery after activation is a 200 no-op — a single Transaction', async () => {
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_1' }

    const first = await POST(makeRequest(body))
    expect(first.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)

    const second = await POST(makeRequest(body))
    expect(second.status).toBe(200)
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1) // still just one
  })

  it('race: two concurrent ORDER_COMPLETED deliveries activate exactly once', async () => {
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_1' }

    const [first, second] = await Promise.all([POST(makeRequest(body)), POST(makeRequest(body))])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(mockMembershipUpdateMany).toHaveBeenCalledTimes(2) // both attempted the claim, only one matched a row
  })
})

describe('POST /api/webhooks/revolut — event ticket ORDER_COMPLETED idempotency', () => {
  beforeEach(() => {
    eventBookings['booking-1'] = {
      id: 'booking-1', status: 'PENDING', quantity: 1, ticketId: 'ticket-1', eventId: 'event-1', ticketName: 'General',
      amountPaid: 30, currency: 'EUR', userId: 'user-1', qrToken: 'qr-1', revolutOrderId: 'ord_eb_1',
      event: { title: 'Open Mat', startAt: new Date(), location: 'Gym', capacity: null, schoolId: 'school-1', school: { revolutSecretKey: 'sk_test', revolutWebhookSecret: 'whsec_test', name: 'Academy', city: 'City', language: 'en' } },
      ticket: { capacity: null },
      user: { email: 'user@test.com', name: 'Test User' },
    }
  })

  it('retry: a second ORDER_COMPLETED delivery confirms the booking exactly once', async () => {
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_eb_1' }

    const first = await POST(makeRequest(body))
    expect(first.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)

    const second = await POST(makeRequest(body))
    expect(second.status).toBe(200)
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
  })

  it('race: two concurrent ORDER_COMPLETED deliveries confirm the booking exactly once', async () => {
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_eb_1' }

    const [first, second] = await Promise.all([POST(makeRequest(body)), POST(makeRequest(body))])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(mockRefundRevolutOrder).not.toHaveBeenCalled() // the second delivery must not be mistaken for an oversell
  })
})
