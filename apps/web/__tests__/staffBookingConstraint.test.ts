/**
 * Tests for the two staff-facing routes that create Booking rows directly
 * (front-desk booking and QR check-in walk-ins).
 *
 * classes/[id]/bookings (staff "add booking", status CONFIRMED) is covered
 * by the app-level duplicate check plus the partial unique index
 * (prisma/migrations/20260709090000_bookings_active_slot_unique_index) as a
 * DB-level backstop — a real race there surfaces as P2002, which the route
 * must turn into a clean 409 instead of an unhandled 500.
 *
 * checkin (walk-in, status COMPLETED) is NOT covered by that partial index —
 * it only guards PENDING/CONFIRMED — so the route instead serializes the
 * whole find→create/update per (classId, userId, date) with a Postgres
 * advisory lock inside a transaction (P2 hardening, see
 * app/api/dashboard/checkin/route.ts). $transaction is mocked to directly
 * invoke the callback with a fake `tx` so these tests exercise the route's
 * real control flow without a live Postgres instance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))
vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))

const mockClassFindFirst = vi.fn()
const mockUserFindFirst = vi.fn()
const mockBookingFindFirst = vi.fn()
const mockBookingCreate = vi.fn()
const mockBookingUpdate = vi.fn()
const mockExecuteRaw = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: mockClassFindFirst },
    user: { findFirst: mockUserFindFirst },
    // Used directly by classes/[id]/bookings (no transaction there).
    booking: {
      findFirst: mockBookingFindFirst,
      create: mockBookingCreate,
      update: mockBookingUpdate,
    },
    // Used by checkin, wrapping the same booking mocks via a fake tx.
    $transaction: mockTransaction,
  },
}))

const { Prisma } = await import('@/lib/prisma-client/client')
const classBookingsRoute = await import('@/app/api/dashboard/classes/[id]/bookings/route')
const checkinRoute = await import('@/app/api/dashboard/checkin/route')

function jsonRequest(url: string, body: unknown) {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
  code: 'P2002',
  clientVersion: 'test',
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
  mockExecuteRaw.mockResolvedValue(undefined)

  // A real pg_advisory_xact_lock blocks a second transaction on the same key
  // until the first commits. Model that here with a queue so concurrent
  // $transaction calls run their callback one at a time, in call order —
  // otherwise the mock would let both callbacks interleave freely and the
  // race test below couldn't tell serialized code from a real race.
  let lockQueue: Promise<unknown> = Promise.resolve()
  const tx = {
    $executeRaw: mockExecuteRaw,
    booking: {
      findFirst: mockBookingFindFirst,
      create: mockBookingCreate,
      update: mockBookingUpdate,
    },
  }
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) => {
    const run = lockQueue.then(() => fn(tx))
    lockQueue = run.catch(() => {})
    return run
  })

  mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1' })
  mockUserFindFirst.mockResolvedValue({ id: 'student-1', name: 'Student', email: 's@test.com' })
})

describe('POST /api/dashboard/classes/[id]/bookings — constraint backstop', () => {
  it('returns 409 (not 500) when the DB rejects a concurrent duplicate booking', async () => {
    mockBookingFindFirst.mockResolvedValue(null) // app-level check sees no existing booking
    mockBookingCreate.mockRejectedValue(p2002) // but the DB constraint catches a real race

    const res = await classBookingsRoute.POST(
      jsonRequest('/api/dashboard/classes/class-1/bookings', { userId: 'student-1' }),
      { params: Promise.resolve({ id: 'class-1' }) },
    )

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
  })
})

describe('POST /api/dashboard/checkin', () => {
  const body = { classId: 'class-1', userId: 'student-1', date: '2026-02-01' }

  it('marks an existing CONFIRMED booking as COMPLETED', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED', attendedAt: null })

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyCheckedIn).toBe(false)
    expect(mockBookingUpdate).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    })
    expect(mockBookingCreate).not.toHaveBeenCalled()
    // Serialized via the advisory lock, not the DB constraint.
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1)
  })

  it('is idempotent when the booking is already COMPLETED', async () => {
    mockBookingFindFirst.mockResolvedValue({ id: 'booking-1', status: 'COMPLETED', attendedAt: new Date() })

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyCheckedIn).toBe(true)
    expect(mockBookingUpdate).not.toHaveBeenCalled()
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it('creates a COMPLETED walk-in booking when none exists for the day', async () => {
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingCreate.mockResolvedValue({ id: 'booking-2', status: 'COMPLETED', attendedAt: new Date() })

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyCheckedIn).toBe(false)
    expect(mockBookingCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        classId: 'class-1',
        userId: 'student-1',
        status: 'COMPLETED',
      }),
    })
  })

  it('returns 409 (not 500) if a walk-in create still hits a DB constraint', async () => {
    mockBookingFindFirst.mockResolvedValue(null) // no existing booking found for today
    mockBookingCreate.mockRejectedValue(p2002)

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
  })

  it('simulated race: two concurrent walk-ins serialize through the lock and the second is idempotent', async () => {
    // The advisory lock means the transaction callback effectively runs
    // once at a time per (classId, userId, date); model that by having the
    // second invocation observe the row the first one just created.
    let created = false
    mockBookingFindFirst.mockImplementation(() =>
      created ? Promise.resolve({ id: 'booking-1', status: 'COMPLETED', attendedAt: new Date() }) : Promise.resolve(null),
    )
    mockBookingCreate.mockImplementation(() => {
      created = true
      return Promise.resolve({ id: 'booking-1', status: 'COMPLETED', attendedAt: new Date() })
    })

    const [first, second] = await Promise.all([
      checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body)),
      checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body)),
    ])

    const results = await Promise.all([first.json(), second.json()])
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(results.filter(r => r.alreadyCheckedIn === false)).toHaveLength(1)
    expect(results.filter(r => r.alreadyCheckedIn === true)).toHaveLength(1)
    expect(mockBookingCreate).toHaveBeenCalledTimes(1)
  })
})
