/**
 * Tests for POST /api/bookings — race/duplicate handling and eligibility
 * enforcement inside the transaction (P1 hardening: advisory locks + a
 * partial unique DB index back up the app-level checks, see
 * prisma/migrations/20260709090000_bookings_active_slot_unique_index).
 *
 * $transaction is mocked to directly invoke the callback with a fake `tx` —
 * this exercises the route's real control flow (locks → duplicate check →
 * classAccess → capacity → insert → catch) without a live Postgres instance.
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
const mockClassFindUnique = vi.fn()
const mockMembershipFindFirst = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    class: { findUnique: mockClassFindUnique },
    membership: { findFirst: mockMembershipFindFirst },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/email/sendEmails', () => ({
  sendTrialConfirmedEmail: vi.fn(),
}))

const { Prisma } = await import('@/lib/prisma-client/client')
const { POST } = await import('@/app/api/bookings/route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

function makeTx(overrides: {
  duplicate?: unknown
  bookingCount?: number
  createResult?: unknown
  createError?: unknown
}) {
  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    booking: {
      findFirst: vi.fn().mockResolvedValue(overrides.duplicate ?? null),
      count: vi.fn().mockResolvedValue(overrides.bookingCount ?? 0),
      create: overrides.createError
        ? vi.fn().mockRejectedValue(overrides.createError)
        : vi.fn().mockResolvedValue(overrides.createResult ?? { id: 'booking-1' }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'a@test.com', name: 'A' })
  mockClassFindUnique.mockResolvedValue({
    id: 'class-1', name: 'BJJ', isActive: true, isPublished: true, schoolId: 'school-1',
    capacity: null, schedule: null, bookingSettings: null,
    school: { name: 'Academy', city: 'City', language: 'en' },
  })
  mockMembershipFindFirst.mockResolvedValue({
    id: 'membership-1', startDate: new Date('2026-01-01'), endDate: null,
    price: 50, planName: 'Monthly', plan: { classAccess: null },
  })
})

describe('POST /api/bookings', () => {
  it('succeeds on the happy path', async () => {
    const tx = makeTx({})
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.bookingId).toBe('booking-1')
  })

  it('returns 409 when the app-level duplicate check finds an existing active booking', async () => {
    const tx = makeTx({ duplicate: { id: 'existing-booking' } })
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
    expect(tx.booking.create).not.toHaveBeenCalled()
  })

  it('returns 409 when the DB partial-unique-index constraint rejects a race the app-level check missed', async () => {
    const constraintError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: 'test',
    })
    const tx = makeTx({ duplicate: null, createError: constraintError })
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
  })

  it('returns 409 (not 403) when the class is at capacity — a contested seat is a conflict, not a permission error', async () => {
    mockClassFindUnique.mockResolvedValue({
      id: 'class-1', name: 'BJJ', isActive: true, isPublished: true, schoolId: 'school-1',
      capacity: 5, schedule: null, bookingSettings: null,
      school: { name: 'Academy', city: 'City', language: 'en' },
    })
    const tx = makeTx({ duplicate: null, bookingCount: 5 })
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/full/i)
    expect(tx.booking.create).not.toHaveBeenCalled()
  })

  it('returns 403 when classAccess excludes this class', async () => {
    mockMembershipFindFirst.mockResolvedValue({
      id: 'membership-1', startDate: new Date('2026-01-01'), endDate: null,
      price: 50, planName: 'Monthly',
      plan: { classAccess: { classRules: [{ classId: 'class-1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] } },
    })
    const tx = makeTx({ duplicate: null })
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/not included/i)
  })

  it('returns 403 when the user has no active membership at this school', async () => {
    mockMembershipFindFirst.mockResolvedValue(null)

    const res = await POST(makeRequest({ classId: 'class-1', scheduledAt: futureDate }))
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toMatch(/no active membership/i)
    expect(mockTransaction).not.toHaveBeenCalled()
  })
})
