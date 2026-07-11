/**
 * Tests for POST /api/dashboard/classes/[id]/cancel-occurrence — cancels
 * every active booking for a class on a given day. NotificationType
 * .CLASS_CANCELLED existed in the schema and was fully wired in the
 * dashboard notifications UI (icon/color/label) but nothing ever created
 * one — this route now does, one per affected student, school-wide
 * (recipientUserId unset — see lib/notifications/create.ts for why: the
 * Notification model has no delivery path to students today).
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

const mockBookingFindMany = vi.fn()
const mockBookingUpdateMany = vi.fn()
const mockClassFindFirst = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    booking: { findMany: mockBookingFindMany, updateMany: mockBookingUpdateMany },
    class: { findFirst: mockClassFindFirst },
  },
}))

const mockNotifyClassCancelled = vi.fn()

vi.mock('@/lib/notifications/create', () => ({
  notifyClassCancelled: mockNotifyClassCancelled,
}))

const { POST } = await import('@/app/api/dashboard/classes/[id]/cancel-occurrence/route')

function cancelRequest(classId: string, date?: string) {
  return POST(
    new NextRequest(`http://localhost/api/dashboard/classes/${classId}/cancel-occurrence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(date ? { date } : {}),
    }),
    { params: Promise.resolve({ id: classId }) },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
  mockClassFindFirst.mockResolvedValue({ name: 'BJJ Fundamentals' })
  mockBookingUpdateMany.mockResolvedValue({ count: 0 })
})

describe('POST .../cancel-occurrence — notifications', () => {
  it('creates a CLASS_CANCELLED notification for each affected student', async () => {
    mockBookingFindMany.mockResolvedValue([
      { id: 'b1', user: { name: 'Alice', email: 'alice@test.com' } },
      { id: 'b2', user: { name: 'Bob', email: 'bob@test.com' } },
    ])

    const res = await cancelRequest('class-1', '2026-07-15')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.cancelled).toBe(2)
    expect(mockNotifyClassCancelled).toHaveBeenCalledTimes(2)
    expect(mockNotifyClassCancelled).toHaveBeenCalledWith('school-1', 'Alice', 'BJJ Fundamentals', expect.any(String), 'class-1')
    expect(mockNotifyClassCancelled).toHaveBeenCalledWith('school-1', 'Bob', 'BJJ Fundamentals', expect.any(String), 'class-1')
  })

  it('still cancels the bookings via updateMany, scoped to exactly the affected ids', async () => {
    mockBookingFindMany.mockResolvedValue([
      { id: 'b1', user: { name: 'Alice', email: 'alice@test.com' } },
      { id: 'b2', user: { name: 'Bob', email: 'bob@test.com' } },
    ])

    await cancelRequest('class-1', '2026-07-15')

    expect(mockBookingUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['b1', 'b2'] } },
      data: { status: 'CANCELLED' },
    })
  })

  it('does not notify when there are no active bookings for that class/date', async () => {
    mockBookingFindMany.mockResolvedValue([])

    const res = await cancelRequest('class-1', '2026-07-15')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.cancelled).toBe(0)
    expect(mockNotifyClassCancelled).not.toHaveBeenCalled()
    expect(mockBookingUpdateMany).not.toHaveBeenCalled()
  })

  it('a repeated call for the same class/date does not duplicate notifications', async () => {
    // First call: two active bookings get cancelled and notified.
    mockBookingFindMany.mockResolvedValueOnce([
      { id: 'b1', user: { name: 'Alice', email: 'alice@test.com' } },
      { id: 'b2', user: { name: 'Bob', email: 'bob@test.com' } },
    ])
    const first = await cancelRequest('class-1', '2026-07-15')
    expect((await first.json()).cancelled).toBe(2)
    expect(mockNotifyClassCancelled).toHaveBeenCalledTimes(2)

    // Second call: the where clause excludes CANCELLED, so a real DB would
    // return nothing here — model that directly.
    mockNotifyClassCancelled.mockClear()
    mockBookingFindMany.mockResolvedValueOnce([])
    const second = await cancelRequest('class-1', '2026-07-15')

    expect((await second.json()).cancelled).toBe(0)
    expect(mockNotifyClassCancelled).not.toHaveBeenCalled()
  })

  it('scopes the affected-bookings query to this class, school and exact date range', async () => {
    mockBookingFindMany.mockResolvedValue([])

    await cancelRequest('class-1', '2026-07-15')

    const args = mockBookingFindMany.mock.calls[0]![0]
    expect(args.where.classId).toBe('class-1')
    expect(args.where.class).toEqual({ schoolId: 'school-1' })
    expect(args.where.status).toEqual({ notIn: ['CANCELLED'] })
    expect(args.where.scheduledAt.gte).toBeInstanceOf(Date)
    expect(args.where.scheduledAt.lt).toBeInstanceOf(Date)
    // A booking from another school, another class, or another date would
    // never match this where clause, so it's implicitly excluded — the
    // query itself is the isolation boundary, nothing extra to assert on
    // the (mocked) return value.
  })

  it('falls back to a generic class label if the class lookup comes back empty', async () => {
    mockClassFindFirst.mockResolvedValue(null)
    mockBookingFindMany.mockResolvedValue([{ id: 'b1', user: { name: 'Alice', email: 'alice@test.com' } }])

    await cancelRequest('class-1', '2026-07-15')

    expect(mockNotifyClassCancelled).toHaveBeenCalledWith('school-1', 'Alice', 'la clase', expect.any(String), 'class-1')
  })

  it('falls back to the user email when name is missing', async () => {
    mockBookingFindMany.mockResolvedValue([{ id: 'b1', user: { name: null, email: 'noname@test.com' } }])

    await cancelRequest('class-1', '2026-07-15')

    expect(mockNotifyClassCancelled).toHaveBeenCalledWith('school-1', 'noname@test.com', 'BJJ Fundamentals', expect.any(String), 'class-1')
  })
})

describe('POST .../cancel-occurrence — permissions unchanged', () => {
  it('OWNER/ADMIN/MANAGER can cancel', async () => {
    mockBookingFindMany.mockResolvedValue([])
    for (const role of ['OWNER', 'ADMIN', 'MANAGER']) {
      mockRequireSchoolAccess.mockResolvedValue({ role, status: 'ACTIVE' })
      const res = await cancelRequest('class-1', '2026-07-15')
      expect(res.status).toBe(200)
    }
  })

  it('INSTRUCTOR is forbidden, same as before', async () => {
    mockRequireSchoolAccess.mockResolvedValue({ role: 'INSTRUCTOR', status: 'ACTIVE' })

    const res = await cancelRequest('class-1', '2026-07-15')

    expect(res.status).toBe(403)
    expect(mockBookingFindMany).not.toHaveBeenCalled()
  })

  it('401s without a session', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await cancelRequest('class-1', '2026-07-15')

    expect(res.status).toBe(401)
  })
})
