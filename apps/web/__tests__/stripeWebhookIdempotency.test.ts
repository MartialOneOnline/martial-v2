/**
 * Tests for POST /api/webhooks/stripe — payment idempotency (P1 hardening).
 *
 * Every handled event is claimed by its Stripe-assigned eventId via the
 * StripeWebhookEvent table (see claimStripeEvent in the route) before any
 * business logic runs. That's what makes a retried delivery of an already
 * -processed event a no-op, and what makes two concurrent deliveries of the
 * same event resolve to exactly one activation.
 *
 * `prisma.stripeWebhookEvent.create` is modeled with real in-memory shared
 * state (not a plain mockResolvedValue): a real Postgres unique index lets
 * only one concurrent INSERT for a given eventId succeed, and this mock
 * reproduces that synchronously so "simulated race" tests are meaningful.
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

const mockRecordOnlinePayment = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/transactions', () => ({ recordOnlinePayment: (...args: unknown[]) => mockRecordOnlinePayment(...args) }))

const mockCheckEventCapacity = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: (...args: unknown[]) => mockCheckEventCapacity(...args) }))

// ── In-memory "DB" shared across mocks, reset per test ──────────────────────
let webhookEvents: Record<string, { status: string; updatedAt: number }>
let memberships: Record<string, Record<string, unknown>>
let eventBookings: Record<string, Record<string, unknown>>
let membershipSeq: number

function resetState() {
  webhookEvents = {}
  memberships = {}
  eventBookings = {}
  membershipSeq = 0
}

const mockSchoolFindUnique = vi.fn().mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })

const mockStripeWebhookEventCreate = vi.fn((args: { data: { eventId: string; type: string; status: string } }) => {
  const { eventId, type, status } = args.data
  if (webhookEvents[eventId]) {
    return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  }
  webhookEvents[eventId] = { status, updatedAt: Date.now() }
  return Promise.resolve({ id: `we_${eventId}`, eventId, type, status })
})
const mockStripeWebhookEventUpdateMany = vi.fn((args: { where: { eventId: string } }) => {
  const row = webhookEvents[args.where.eventId]
  if (!row) return Promise.resolve({ count: 0 })
  // Only FAILED or a PROCESSING row stuck well past any realistic handler
  // duration is reclaimable — in these fast tests neither condition holds
  // for a row left PROCESSING by a "concurrent" delivery, so this mirrors
  // the route's own staleness guard without needing to fake clock skew.
  if (row.status === 'FAILED') {
    webhookEvents[args.where.eventId] = { status: 'PROCESSING', updatedAt: Date.now() }
    return Promise.resolve({ count: 1 })
  }
  return Promise.resolve({ count: 0 })
})
const mockStripeWebhookEventUpdate = vi.fn((args: { where: { eventId: string }; data: { status: string } }) => {
  const row = webhookEvents[args.where.eventId]
  if (row) row.status = args.data.status
  return Promise.resolve({})
})

const mockMembershipFindFirst = vi.fn((args: { where: { userId: string; planId: string; status: string } }) => {
  const found = Object.values(memberships).find(
    m => m.userId === args.where.userId && m.planId === args.where.planId && m.status === args.where.status,
  )
  return Promise.resolve(found ?? null)
})
const mockMembershipCreate = vi.fn((args: { data: Record<string, unknown> }) => {
  const id = `membership-${++membershipSeq}`
  const m = { id, ...args.data }
  memberships[id] = m
  return Promise.resolve(m)
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
const mockSchoolMemberFindUnique = vi.fn().mockResolvedValue(null) // no existing row -> never ARCHIVED

const mockEventBookingFindUnique = vi.fn((args: { where: { id: string } }) => {
  const b = eventBookings[args.where.id]
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
    membership: { findFirst: mockMembershipFindFirst, create: mockMembershipCreate },
    schoolMember: { create: mockSchoolMemberCreate, updateMany: mockSchoolMemberUpdateMany, findUnique: mockSchoolMemberFindUnique },
    eventBooking: { findUnique: mockEventBookingFindUnique, updateMany: mockEventBookingUpdateMany, update: mockEventBookingUpdate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockSchoolFindUnique },
    stripeWebhookEvent: {
      create: mockStripeWebhookEventCreate,
      updateMany: mockStripeWebhookEventUpdateMany,
      update: mockStripeWebhookEventUpdate,
    },
    membership: { findFirst: mockMembershipFindFirst, create: mockMembershipCreate, findUnique: mockMembershipFindUnique },
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

function checkoutSessionEvent(eventId: string, overrides: Record<string, unknown> = {}) {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        payment_status: 'paid',
        payment_intent: `pi_${eventId}`,
        metadata: { schoolId: 'school-1', userId: 'user-1', planId: 'plan-1', planName: 'Monthly', price: '50', currency: 'EUR' },
        ...overrides,
      },
    },
  }
}

function eventBookingCheckoutEvent(eventId: string, bookingId: string) {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        payment_status: 'paid',
        payment_intent: `pi_${eventId}`,
        metadata: { schoolId: 'school-1', userId: 'user-1', eventBookingId: bookingId },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  mockSchoolFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })
  mockCheckEventCapacity.mockResolvedValue({ ok: true })
})

describe('POST /api/webhooks/stripe — membership checkout.session.completed idempotency', () => {
  it('retry: redelivering the same successful event is a 200 no-op — a single Membership and Transaction', async () => {
    const event = checkoutSessionEvent('evt_1')

    const first = await POST(makeRequest(event))
    expect(first.status).toBe(200)
    expect(mockMembershipCreate).toHaveBeenCalledTimes(1)
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(webhookEvents['evt_1']!.status).toBe('PROCESSED')

    // Stripe redelivers the identical event (e.g. our ack timed out).
    const second = await POST(makeRequest(event))
    expect(second.status).toBe(200)
    expect(mockMembershipCreate).toHaveBeenCalledTimes(1) // still just one
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
  })

  it('race: two concurrent deliveries of the same event resolve to exactly one activation', async () => {
    const event = checkoutSessionEvent('evt_race')

    const [first, second] = await Promise.all([POST(makeRequest(event)), POST(makeRequest(event))])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(mockMembershipCreate).toHaveBeenCalledTimes(1)
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(mockStripeWebhookEventCreate).toHaveBeenCalledTimes(2) // both attempted, only one succeeded
  })

  it('a FAILED event (crashed handler) is reclaimed and reprocessed on the next delivery', async () => {
    // Simulate a first delivery that fails partway through business logic.
    mockMembershipCreate.mockImplementationOnce(() => Promise.reject(new Error('transient DB error')))
    const event = checkoutSessionEvent('evt_fail')

    await expect(POST(makeRequest(event))).rejects.toThrow('transient DB error')
    expect(webhookEvents['evt_fail']!.status).toBe('FAILED')

    // Stripe retries — should reclaim and succeed this time.
    const retry = await POST(makeRequest(event))
    expect(retry.status).toBe(200)
    expect(mockMembershipCreate).toHaveBeenCalledTimes(2) // one failed attempt + one success
    expect(webhookEvents['evt_fail']!.status).toBe('PROCESSED')
  })
})

describe('POST /api/webhooks/stripe — event ticket checkout.session.completed idempotency', () => {
  beforeEach(() => {
    eventBookings['booking-1'] = {
      status: 'PENDING', quantity: 1, ticketId: 'ticket-1', eventId: 'event-1', ticketName: 'General',
      amountPaid: 30, currency: 'EUR', userId: 'user-1', qrToken: 'qr-1',
      event: { title: 'Open Mat', startAt: new Date(), location: 'Gym', capacity: null, schoolId: 'school-1', school: { name: 'Academy', city: 'City', language: 'en' } },
      ticket: { capacity: null },
      user: { email: 'user@test.com', name: 'Test User' },
    }
  })

  it('retry: redelivering the same successful event confirms the booking exactly once', async () => {
    const event = eventBookingCheckoutEvent('evt_eb_1', 'booking-1')

    const first = await POST(makeRequest(event))
    expect(first.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)

    const second = await POST(makeRequest(event))
    expect(second.status).toBe(200)
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1) // still just one Transaction
    expect(mockEventBookingUpdateMany).toHaveBeenCalledTimes(1) // second delivery never reached the claim (short-circuited earlier)
  })

  it('race: two concurrent deliveries confirm the booking exactly once', async () => {
    const event = eventBookingCheckoutEvent('evt_eb_race', 'booking-1')

    const [first, second] = await Promise.all([POST(makeRequest(event)), POST(makeRequest(event))])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
  })
})
