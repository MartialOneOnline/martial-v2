/**
 * Tests for the two staff-facing routes that create Booking rows directly
 * (front-desk booking and QR check-in walk-ins) — P1 follow-up: neither takes
 * the advisory locks POST /api/bookings does (out of scope for this PR), but
 * both must still turn a real unique-constraint violation from the new
 * partial index (prisma/migrations/20260709090000_bookings_active_slot_unique_index)
 * into a clean 409 instead of an unhandled 500.
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

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: mockClassFindFirst },
    user: { findFirst: mockUserFindFirst },
    booking: {
      findFirst: mockBookingFindFirst,
      create: mockBookingCreate,
      update: mockBookingUpdate,
    },
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
})

describe('POST /api/dashboard/classes/[id]/bookings — constraint backstop', () => {
  it('returns 409 (not 500) when the DB rejects a concurrent duplicate booking', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' })
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

describe('POST /api/dashboard/checkin — constraint backstop', () => {
  it('returns 409 (not 500) when the walk-in create hits the DB constraint', async () => {
    mockClassFindFirst.mockResolvedValue({ id: 'class-1', name: 'BJJ' })
    mockUserFindFirst.mockResolvedValue({ id: 'student-1', name: 'Student', email: 's@test.com' })
    mockBookingFindFirst.mockResolvedValue(null) // no existing booking found for today
    mockBookingCreate.mockRejectedValue(p2002)

    const res = await checkinRoute.POST(
      jsonRequest('/api/dashboard/checkin', { classId: 'class-1', userId: 'student-1', date: '2026-02-01' }),
    )

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already booked/i)
  })
})
