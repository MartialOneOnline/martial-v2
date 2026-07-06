/**
 * Tests for POST /api/webhooks/revolut — the multi-tenant secret resolution
 * guard. This endpoint is shared by every school (they all register the same
 * URL), so it must never resolve the wrong school's webhookSecret or fall
 * back to an ambiguous/global one.
 *
 * The specific risk closed here: Prisma treats `where: { revolutOrderId: undefined }`
 * as "no filter on this field" — a webhook payload with a missing/blank order_id
 * would otherwise make `findFirst` match an arbitrary PENDING membership (any
 * school's abandoned Revolut checkout sits with revolutOrderId=null until
 * completed), verified against whichever unrelated school that row belongs to.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockFindFirstMembership = vi.fn()
const mockFindFirstEventBooking = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findFirst: mockFindFirstMembership, findUnique: vi.fn() },
    eventBooking: { findFirst: mockFindFirstEventBooking },
  },
}))
vi.mock('@/lib/revolut', () => ({
  getRevolutOrder: vi.fn(),
  refundRevolutOrder: vi.fn(),
  verifyRevolutWebhook: vi.fn(),
}))
vi.mock('@/lib/email/sendEmails', () => ({
  sendMembershipReceiptEmail: vi.fn(),
  sendEventTicketConfirmationEmail: vi.fn(),
  sendEventTicketRefundedEmail: vi.fn(),
}))
vi.mock('@/lib/services/eventCapacity', () => ({ checkEventCapacity: vi.fn() }))
vi.mock('@/lib/services/transactions', () => ({ recordOnlinePayment: vi.fn() }))
vi.mock('@/lib/notifications/create', () => ({ notifyPaymentReceived: vi.fn() }))

const { POST } = await import('@/app/api/webhooks/revolut/route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/webhooks/revolut', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/revolut — order_id validation (multi-tenant secret resolution)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a payload with no order_id before ever looking up a membership', async () => {
    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/order_id/i)
    expect(mockFindFirstMembership).not.toHaveBeenCalled()
  })

  it('rejects a payload with order_id: null before ever looking up a membership', async () => {
    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: null }))
    expect(res.status).toBe(400)
    expect(mockFindFirstMembership).not.toHaveBeenCalled()
  })

  it('rejects a payload with an empty-string order_id', async () => {
    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: '   ' }))
    expect(res.status).toBe(400)
    expect(mockFindFirstMembership).not.toHaveBeenCalled()
  })

  it('rejects a non-string order_id (e.g. a number)', async () => {
    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 12345 }))
    expect(res.status).toBe(400)
    expect(mockFindFirstMembership).not.toHaveBeenCalled()
  })

  it('proceeds to the membership lookup for a well-formed order_id', async () => {
    mockFindFirstMembership.mockResolvedValue(null)
    mockFindFirstEventBooking.mockResolvedValue(null)

    const res = await POST(makeRequest({ event: 'ORDER_COMPLETED', order_id: 'ord_real_123' }))

    expect(mockFindFirstMembership).toHaveBeenCalledWith(
      expect.objectContaining({ where: { revolutOrderId: 'ord_real_123' } })
    )
    expect(res.status).toBe(404) // no membership or eventBooking matched — order not found
  })

  it('ignores unhandled event types without ever touching the DB', async () => {
    const res = await POST(makeRequest({ event: 'SOME_OTHER_EVENT', order_id: 'ord_1' }))
    expect(res.status).toBe(200)
    expect(mockFindFirstMembership).not.toHaveBeenCalled()
  })
})
