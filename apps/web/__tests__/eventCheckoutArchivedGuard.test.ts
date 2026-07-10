/**
 * Tests for the ARCHIVED-member guard at event/ticket checkout creation time
 * (POST /api/my/events/checkout and POST /api/my/events/reserve) — mirrors
 * the guard already in POST /api/my/checkout for memberships.
 *
 * This closes the gap the webhook-level guard (see
 * apps/web/app/api/webhooks/stripe/route.ts and .../revolut/route.ts) was
 * already compensating for: without this, an ARCHIVED member could still
 * start a checkout, have Stripe/Revolut capture their money, and only then
 * get bounced into a FLAGGED Transaction by the webhook. Blocking here
 * means fewer payments ever need that manual-review path in the first
 * place. The webhook guard stays in place regardless, as defense-in-depth
 * against being archived *between* this check and payment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const mockUserFindUnique = vi.fn()
const mockEventFindUnique = vi.fn()
const mockEventTicketFindFirst = vi.fn()
const mockSchoolMemberFindFirst = vi.fn()
const mockTransaction = vi.fn()
const mockEventBookingUpdate = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    event: { findUnique: mockEventFindUnique },
    eventTicket: { findFirst: mockEventTicketFindFirst },
    schoolMember: { findFirst: mockSchoolMemberFindFirst },
    eventBooking: { update: mockEventBookingUpdate },
    $transaction: mockTransaction,
  },
}))

const mockStripeSessionCreate = vi.fn().mockResolvedValue({ url: 'https://stripe.test/session' })
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({ checkout: { sessions: { create: (...args: unknown[]) => mockStripeSessionCreate(...args) } } }),
}))

const mockCreateRevolutOrder = vi.fn().mockResolvedValue({ id: 'ord_1', checkout_url: 'https://revolut.test/order' })
vi.mock('@/lib/revolut', () => ({
  createRevolutOrder: (...args: unknown[]) => mockCreateRevolutOrder(...args),
}))

const mockCheckEventCapacity = vi.fn().mockResolvedValue({ ok: true })
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: (...args: unknown[]) => mockCheckEventCapacity(...args) }))

const { POST: checkoutPOST } = await import('@/app/api/my/events/checkout/route')
const { POST: reservePOST } = await import('@/app/api/my/events/reserve/route')

function makeRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', name: 'Test User', email: 'user@test.com' })
  mockEventFindUnique.mockResolvedValue({
    id: 'event-1', schoolId: 'school-1', title: 'Open Mat', isPublished: true, isCancelled: false,
    startAt: futureDate, capacity: null, paymentMethods: ['STRIPE', 'REVOLUT', 'CASH'],
    school: { name: 'Academy', stripeSecretKey: 'sk_test', revolutSecretKey: 'rk_test', revolutWebhookSecret: 'whsec_test' },
  })
  mockEventTicketFindFirst.mockResolvedValue({ id: 'ticket-1', name: 'General', price: 30, currency: 'EUR', capacity: null })
  mockSchoolMemberFindFirst.mockResolvedValue(null)
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) =>
    fn({ eventBooking: { create: vi.fn().mockResolvedValue({ id: 'booking-1' }) } }),
  )
})

describe('POST /api/my/events/checkout', () => {
  it('rejects with 403 when the SchoolMember is ARCHIVED, without calling Stripe or Revolut', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm-1' })

    const res = await checkoutPOST(makeRequest('/api/my/events/checkout', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/archived/i)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockStripeSessionCreate).not.toHaveBeenCalled()
    expect(mockCreateRevolutOrder).not.toHaveBeenCalled()
  })

  it('rejects ARCHIVED before creating any EventBooking, even for the Revolut provider', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm-1' })

    const res = await checkoutPOST(makeRequest('/api/my/events/checkout', { eventId: 'event-1', ticketId: 'ticket-1', provider: 'REVOLUT' }))

    expect(res.status).toBe(403)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockCreateRevolutOrder).not.toHaveBeenCalled()
  })

  it('proceeds normally when there is no prior SchoolMember row', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue(null)

    const res = await checkoutPOST(makeRequest('/api/my/events/checkout', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
  })

  it('proceeds normally when the SchoolMember exists but is not ARCHIVED (e.g. FROZEN)', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue(null) // findFirst is scoped to status: 'ARCHIVED' — a FROZEN member never matches it

    const res = await checkoutPOST(makeRequest('/api/my/events/checkout', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(200)
    expect(mockSchoolMemberFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'ARCHIVED' }),
    }))
    expect(mockStripeSessionCreate).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/my/events/reserve (cash, pay at the door)', () => {
  beforeEach(() => {
    mockEventFindUnique.mockResolvedValue({
      id: 'event-1', schoolId: 'school-1', isPublished: true, isCancelled: false,
      startAt: futureDate, capacity: null, paymentMethods: ['CASH'],
    })
  })

  it('rejects with 403 when the SchoolMember is ARCHIVED, without creating a booking', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue({ id: 'sm-1' })

    const res = await reservePOST(makeRequest('/api/my/events/reserve', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/archived/i)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('proceeds normally when there is no prior SchoolMember row', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue(null)

    const res = await reservePOST(makeRequest('/api/my/events/reserve', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('proceeds normally when the SchoolMember exists but is not ARCHIVED', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue(null)

    const res = await reservePOST(makeRequest('/api/my/events/reserve', { eventId: 'event-1', ticketId: 'ticket-1' }))

    expect(res.status).toBe(200)
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
