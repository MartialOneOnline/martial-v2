/**
 * Tests for the two staff-facing routes that create Booking rows directly
 * (front-desk booking and QR check-in walk-ins).
 *
 * classes/[id]/bookings (staff "add booking", status CONFIRMED) verifies the
 * student is actually a SchoolMember of this school, then runs the duplicate
 * check + capacity check + create inside a $transaction guarded by the same
 * advisory lock namespace (1) that POST /api/bookings uses for self-service
 * bookings on this slot — race-safe against both other staff adds and
 * concurrent self-bookings for the same class+instant. The partial unique
 * index (prisma/migrations/20260709090000_bookings_active_slot_unique_index)
 * remains a DB-level backstop — a real race there surfaces as P2002, which
 * the route must turn into a clean 409 instead of an unhandled 500.
 *
 * checkin (walk-in, status COMPLETED) is NOT covered by that partial index —
 * it only guards PENDING/CONFIRMED — so the route instead serializes the
 * whole find→create/update per (classId, userId, date) with a Postgres
 * advisory lock inside a transaction (P2 hardening, see
 * app/api/dashboard/checkin/route.ts). It never blocks a walk-in on
 * capacity (the student is already physically present) but does report
 * `atCapacity` for a non-blocking UI notice. $transaction is mocked to
 * directly invoke the callback with a fake `tx` so these tests exercise the
 * route's real control flow without a live Postgres instance.
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
const mockSchoolMemberFindFirst = vi.fn()
const mockBookingFindFirst = vi.fn()
const mockBookingCreate = vi.fn()
const mockBookingUpdate = vi.fn()
const mockBookingCount = vi.fn()
const mockExecuteRaw = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: mockClassFindFirst },
    user: { findFirst: mockUserFindFirst },
    // Used directly by classes/[id]/bookings, outside the transaction.
    schoolMember: { findFirst: mockSchoolMemberFindFirst },
    booking: {
      findFirst: mockBookingFindFirst,
      create: mockBookingCreate,
      update: mockBookingUpdate,
      count: mockBookingCount,
    },
    // Used by both routes, wrapping the same booking mocks via a fake tx.
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

function addBooking(classId: string, body: unknown) {
  return classBookingsRoute.POST(
    jsonRequest(`/api/dashboard/classes/${classId}/bookings`, body),
    { params: Promise.resolve({ id: classId }) },
  )
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
  // race tests below couldn't tell serialized code from a real race.
  let lockQueue: Promise<unknown> = Promise.resolve()
  const tx = {
    $executeRaw: mockExecuteRaw,
    booking: {
      findFirst: mockBookingFindFirst,
      create: mockBookingCreate,
      update: mockBookingUpdate,
      count: mockBookingCount,
    },
  }
  mockTransaction.mockImplementation((fn: (tx: unknown) => unknown) => {
    const run = lockQueue.then(() => fn(tx))
    lockQueue = run.catch(() => {})
    return run
  })

  mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: null })
  mockUserFindFirst.mockResolvedValue({ id: 'student-1', name: 'Student', email: 's@test.com' })
  mockSchoolMemberFindFirst.mockResolvedValue({ id: 'member-1' })
  mockBookingCount.mockResolvedValue(0)
})

describe('POST /api/dashboard/classes/[id]/bookings — constraint backstop', () => {
  it('returns 409 (not 500) when the DB rejects a concurrent duplicate booking', async () => {
    mockBookingFindFirst.mockResolvedValue(null) // app-level check sees no existing booking
    mockBookingCreate.mockRejectedValue(p2002) // but the DB constraint catches a real race

    const res = await addBooking('class-1', { userId: 'student-1' })

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
  })
})

describe('POST /api/dashboard/classes/[id]/bookings — membership + capacity guard', () => {
  it('404s when userId has no SchoolMember row for this school', async () => {
    mockSchoolMemberFindFirst.mockResolvedValue(null)

    const res = await addBooking('class-1', { userId: 'not-a-member' })

    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toMatch(/not found in this school/i)
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it('returns 409 and does not create a booking when the class is full', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: 2 })
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingCount.mockResolvedValue(2) // already at capacity

    const res = await addBooking('class-1', { userId: 'student-1' })

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/full/i)
    expect(mockBookingCreate).not.toHaveBeenCalled()
  })

  it('allows booking when capacity is null (unlimited)', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: null })
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingCreate.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED', user: { name: 'Student', avatarUrl: null } })

    const res = await addBooking('class-1', { userId: 'student-1' })

    expect(res.status).toBe(200)
    expect(mockBookingCount).not.toHaveBeenCalled() // no limit, no need to count
    expect(mockBookingCreate).toHaveBeenCalledTimes(1)
  })

  it('allows booking normally when there is free capacity', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: 5 })
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingCount.mockResolvedValue(3) // 3 of 5 taken
    mockBookingCreate.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED', user: { name: 'Student', avatarUrl: null } })

    const res = await addBooking('class-1', { userId: 'student-1' })

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.booking.id).toBe('booking-1')
  })

  it('concurrent add-booking requests for the same slot never exceed capacity', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: 1 })
    mockBookingFindFirst.mockResolvedValue(null) // different students, never a duplicate

    let bookedCount = 0
    mockBookingCount.mockImplementation(() => Promise.resolve(bookedCount))
    mockBookingCreate.mockImplementation(() => {
      bookedCount += 1
      return Promise.resolve({ id: `booking-${bookedCount}`, status: 'CONFIRMED', user: { name: 'Student', avatarUrl: null } })
    })

    const [first, second] = await Promise.all([
      addBooking('class-1', { userId: 'student-A' }),
      addBooking('class-1', { userId: 'student-B' }),
    ])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([200, 409])
    expect(mockBookingCreate).toHaveBeenCalledTimes(1)
    expect(bookedCount).toBe(1)
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

  it('never blocks a walk-in when the class is at capacity, but reports atCapacity: true', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: 1 })
    mockBookingFindFirst.mockResolvedValue(null) // no existing booking for this student today
    mockBookingCreate.mockResolvedValue({ id: 'booking-2', status: 'COMPLETED', attendedAt: new Date() })
    mockBookingCount.mockResolvedValue(1) // already 1 of 1 taken (this walk-in included)

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(200) // never blocked — student is physically present
    const json = await res.json()
    expect(json.atCapacity).toBe(true)
    expect(mockBookingCreate).toHaveBeenCalledTimes(1) // walk-in still created
  })

  it('reports atCapacity: false when the class has free spots', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ', schoolId: 'school-1', capacity: 10 })
    mockBookingFindFirst.mockResolvedValue(null)
    mockBookingCreate.mockResolvedValue({ id: 'booking-2', status: 'COMPLETED', attendedAt: new Date() })
    mockBookingCount.mockResolvedValue(3)

    const res = await checkinRoute.POST(jsonRequest('/api/dashboard/checkin', body))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.atCapacity).toBe(false)
  })
})
