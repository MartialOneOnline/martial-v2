/**
 * Tests for POST /api/webhooks/stripe — event/ticket booking payment success
 * for an ARCHIVED SchoolMember (P1/P2 hardening, extends the membership
 * ARCHIVED guard to event bookings).
 *
 * When checkout.session.completed carries an eventBookingId and the payer's
 * SchoolMember at that event's school is ARCHIVED: the booking must not be
 * confirmed (no active ticket), the SchoolMember must not be reactivated,
 * and — since Stripe already captured the money — the payment is persisted
 * as a FLAGGED Transaction (recordFlaggedPayment) instead of just a log
 * line. No automatic refund: unlike the genuine-oversell path in this same
 * handler, the ARCHIVED case must never reach the refund/refund-email branch.
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
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: vi.fn().mockResolvedValue({ ok: true }) }))

const mockRecordOnlinePayment = vi.fn().mockResolvedValue(undefined)
// recordFlaggedPayment stays REAL — its idempotency guard (pre-check +
// unique-constraint catch against the fake tx.transaction table below) is
// exactly what these tests need to exercise.
vi.mock('@/lib/services/transactions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/transactions')>()
  return { ...actual, recordOnlinePayment: (...args: unknown[]) => mockRecordOnlinePayment(...args) }
})

// eventCapacity.checkEventCapacity is used inside the route module too — but
// its own mock above already covers that import path.

type EventBooking = {
  id: string; status: string; quantity: number; ticketId: string; eventId: string; ticketName: string
  amountPaid: number; currency: string; userId: string; qrToken: string
  event: { title: string; startAt: Date; location: string; capacity: number | null; schoolId: string; school: { name: string; city: string; language: string } }
  ticket: { capacity: number | null }
  user: { email: string; name: string }
}
type TransactionRow = {
  id: string; schoolId: string; userId: string; status: string; amount: number; bookingId?: string | null
  stripePaymentIntentId?: string | null; revolutOrderId?: string | null; notes?: string | null
}

let webhookEvents: Record<string, { status: string; updatedAt: number }>
let eventBookings: Record<string, EventBooking>
let schoolMembers: Record<string, { userId: string; schoolId: string; status: string }>
let transactions: Record<string, TransactionRow>
let transactionSeq: number

function resetState() {
  webhookEvents = {}
  eventBookings = {}
  schoolMembers = {}
  transactions = {}
  transactionSeq = 0
}
function smKey(schoolId: string, userId: string) { return `${schoolId}:${userId}` }
function seedEventBooking(overrides: Partial<EventBooking> & { id: string }) {
  eventBookings[overrides.id] = {
    status: 'PENDING', quantity: 1, ticketId: 'ticket-1', eventId: 'event-1', ticketName: 'General',
    amountPaid: 30, currency: 'EUR', userId: 'user-1', qrToken: 'qr-1',
    event: { title: 'Open Mat', startAt: new Date(), location: 'Gym', capacity: null, schoolId: 'school-1', school: { name: 'Academy', city: 'City', language: 'en' } },
    ticket: { capacity: null },
    user: { email: 'user@test.com', name: 'Test User' },
    ...overrides,
  }
}
function seedSchoolMember(schoolId: string, userId: string, status: string) {
  schoolMembers[smKey(schoolId, userId)] = { userId, schoolId, status }
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

const mockSchoolMemberFindUnique = vi.fn((args: { where: { schoolId_userId: { schoolId: string; userId: string } } }) => {
  const sm = schoolMembers[smKey(args.where.schoolId_userId.schoolId, args.where.schoolId_userId.userId)]
  return Promise.resolve(sm ? { ...sm } : null)
})

// Mirrors the real unique constraint on Transaction.stripePaymentIntentId —
// see recordFlaggedPayment's pre-check + P2002 catch.
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
    eventBooking: { findUnique: mockEventBookingFindUnique, updateMany: mockEventBookingUpdateMany, update: mockEventBookingUpdate },
    schoolMember: { findUnique: mockSchoolMemberFindUnique },
    transaction: { findFirst: mockTransactionFindFirst, create: mockTransactionCreate },
  }
  return fn(tx)
})

vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockSchoolFindUnique },
    stripeWebhookEvent: { create: mockStripeWebhookEventCreate, updateMany: mockStripeWebhookEventUpdateMany, update: mockStripeWebhookEventUpdate },
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
function eventBookingCheckoutEvent(eventId: string, bookingId: string, paymentIntent: string) {
  return {
    id: eventId,
    type: 'checkout.session.completed',
    data: {
      object: {
        payment_status: 'paid', payment_intent: paymentIntent,
        metadata: { schoolId: 'school-1', userId: 'user-1', eventBookingId: bookingId },
      },
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetState()
  mockSchoolFindUnique.mockResolvedValue({ stripeSecretKey: 'sk_test', stripeWebhookSecret: 'whsec_test' })
})

describe('POST /api/webhooks/stripe — event booking payment for an ARCHIVED member', () => {
  it('cancels the booking instead of confirming it, and flags the payment for manual review', async () => {
    seedEventBooking({ id: 'booking-1' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    const res = await POST(makeRequest(eventBookingCheckoutEvent('evt_1', 'booking-1', 'pi_1')))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-1']!.status).toBe('CANCELLED') // not CONFIRMED
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ARCHIVED') // untouched
    expect(mockRecordOnlinePayment).not.toHaveBeenCalled()

    const flagged = Object.values(transactions)
    expect(flagged).toHaveLength(1)
    expect(flagged[0]).toMatchObject({
      status: 'FLAGGED', schoolId: 'school-1', userId: 'user-1',
      amount: 30, currency: 'EUR', bookingId: 'booking-1', stripePaymentIntentId: 'pi_1',
    })
    expect(flagged[0]!.notes).toContain('eventId=event-1')
  })

  it('does not attempt an automatic refund (unlike the genuine-oversell path)', async () => {
    seedEventBooking({ id: 'booking-2' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')

    await POST(makeRequest(eventBookingCheckoutEvent('evt_2', 'booking-2', 'pi_2')))

    // refunds.create is on the mocked getStripe() instance — assert via the
    // mock factory reference instead of re-importing to keep this self-contained.
    const stripeMod = await import('@/lib/stripe')
    const stripeInstance = stripeMod.getStripe('sk_test')
    expect(stripeInstance.refunds.create).not.toHaveBeenCalled()
  })

  it('replaying the same webhook event does not create a second flagged transaction', async () => {
    seedEventBooking({ id: 'booking-3' })
    seedSchoolMember('school-1', 'user-1', 'ARCHIVED')
    const event = eventBookingCheckoutEvent('evt_3', 'booking-3', 'pi_3')

    const first = await POST(makeRequest(event))
    expect(first.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1)

    const second = await POST(makeRequest(event))
    expect(second.status).toBe(200)
    expect(Object.values(transactions)).toHaveLength(1) // still just one
  })

  it('a brand-new user with no prior SchoolMember row still confirms the booking normally', async () => {
    seedEventBooking({ id: 'booking-4' })
    // no seedSchoolMember call

    const res = await POST(makeRequest(eventBookingCheckoutEvent('evt_4', 'booking-4', 'pi_4')))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-4']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(Object.values(transactions)).toHaveLength(0)
  })

  it('a non-ARCHIVED SchoolMember (e.g. FROZEN) still confirms the booking normally', async () => {
    seedEventBooking({ id: 'booking-5' })
    seedSchoolMember('school-1', 'user-1', 'FROZEN')

    const res = await POST(makeRequest(eventBookingCheckoutEvent('evt_5', 'booking-5', 'pi_5')))

    expect(res.status).toBe(200)
    expect(eventBookings['booking-5']!.status).toBe('CONFIRMED')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(Object.values(transactions)).toHaveLength(0)
  })
})
