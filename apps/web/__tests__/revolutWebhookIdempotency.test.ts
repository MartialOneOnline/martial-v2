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
let schoolMembers: Record<string, { id: string; userId: string; schoolId: string; status: string }>

function resetState() {
  memberships = {}
  eventBookings = {}
  schoolMembers = {}
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
// Real in-memory behaviour (not a trivial always-succeed stub): a create()
// for a (schoolId, userId) pair that's already seeded rejects with the same
// P2002 shape Postgres/Prisma raise on the real unique constraint, so tests
// below can exercise the actual check-then-write path instead of assuming it.
const mockSchoolMemberCreate = vi.fn((args: { data: { schoolId: string; userId: string; status: string } }) => {
  const key = smKey(args.data.schoolId, args.data.userId)
  if (schoolMembers[key]) return Promise.reject(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
  schoolMembers[key] = { id: key, userId: args.data.userId, schoolId: args.data.schoolId, status: args.data.status }
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
const mockSchoolMemberUpdate = vi.fn((args: { where: { id: string }; data: { status: string } }) => {
  const sm = Object.values(schoolMembers).find(s => s.id === args.where.id)
  if (!sm) return Promise.reject(new Error('Record to update not found'))
  Object.assign(sm, args.data)
  return Promise.resolve({ ...sm })
})
const mockSchoolMemberFindUnique = vi.fn((args: { where: { schoolId_userId: { schoolId: string; userId: string } } }) => {
  const sm = schoolMembers[smKey(args.where.schoolId_userId.schoolId, args.where.schoolId_userId.userId)]
  return Promise.resolve(sm ? { ...sm } : null)
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

// Reproduces real Postgres semantics for an explicit multi-statement
// transaction: once ANY statement errors, the whole transaction is aborted
// and every later statement fails too, even if the original error was caught
// in JS — see stripeWebhookLifecycleSync.test.ts for the real incident this
// exists to catch (create-then-catch-P2002 on schoolMember silently rolling
// back a membership + payment already written earlier in the same tx).
const mockTransaction = vi.fn((fn: (tx: unknown) => unknown) => {
  let aborted = false
  const guard = <A extends unknown[], R>(impl: (...args: A) => Promise<R>) => async (...args: A): Promise<R> => {
    if (aborted) throw Object.assign(new Error('current transaction is aborted, commands ignored until end of transaction block'), { code: '25P02' })
    try {
      return await impl(...args)
    } catch (err) {
      aborted = true
      throw err
    }
  }
  const tx = {
    membership: { updateMany: guard(mockMembershipUpdateMany) },
    schoolMember: { create: guard(mockSchoolMemberCreate), updateMany: guard(mockSchoolMemberUpdateMany), update: guard(mockSchoolMemberUpdate), findUnique: guard(mockSchoolMemberFindUnique) },
    eventBooking: { updateMany: guard(mockEventBookingUpdateMany), update: guard(mockEventBookingUpdate) },
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

  it('a PENDING SchoolMember from an earlier trial does not abort the transaction (same real incident class as the Stripe webhook, 2026-09-17/25)', async () => {
    schoolMembers[smKey('school-1', 'user-1')] = { id: smKey('school-1', 'user-1'), userId: 'user-1', schoolId: 'school-1', status: 'PENDING' }
    const body = { event: 'ORDER_COMPLETED', order_id: 'ord_1' }

    const res = await POST(makeRequest(body))

    expect(res.status).toBe(200)
    expect(memberships['membership-1']!.status).toBe('ACTIVE')
    expect(schoolMembers[smKey('school-1', 'user-1')]!.status).toBe('ACTIVE')
    expect(mockRecordOnlinePayment).toHaveBeenCalledTimes(1)
    expect(mockSchoolMemberCreate).not.toHaveBeenCalled()
    expect(mockSchoolMemberUpdate).toHaveBeenCalledWith({ where: { id: smKey('school-1', 'user-1') }, data: { status: 'ACTIVE' } })
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
