/**
 * Tests for DELETE /api/dashboard/classes/[id] — Booking.classId is a
 * required FK with no cascade (see prisma/schema.prisma), so Postgres
 * RESTRICTs deleting a Class that still has any Booking row, regardless of
 * status. The route used to call prisma.class.delete() unconditionally and
 * let that surface as an unhandled 500; it now pre-checks for bookings and
 * returns a clean 409, with a P2003 catch around the actual delete as a
 * backstop for a booking created in the race window between the count and
 * the delete.
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
const mockClassDelete = vi.fn()
const mockBookingCount = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: mockClassFindFirst, delete: mockClassDelete },
    booking: { count: mockBookingCount },
  },
}))

const { Prisma } = await import('@/lib/prisma-client/client')
const { DELETE } = await import('@/app/api/dashboard/classes/[id]/route')

function deleteRequest(id: string) {
  return DELETE(
    new NextRequest(`http://localhost/api/dashboard/classes/${id}`, { method: 'DELETE' }),
    { params: Promise.resolve({ id }) },
  )
}

const p2003 = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
  code: 'P2003',
  clientVersion: 'test',
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
  mockClassFindFirst.mockResolvedValue({ id: 'class-1', schoolId: 'school-1' })
  mockBookingCount.mockResolvedValue(0)
  mockClassDelete.mockResolvedValue({ id: 'class-1' })
})

describe('DELETE /api/dashboard/classes/[id]', () => {
  it('deletes a class with no bookings', async () => {
    const res = await deleteRequest('class-1')

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(mockClassDelete).toHaveBeenCalledWith({ where: { id: 'class-1' } })
  })

  it('returns 409 and does not delete when the class has existing bookings', async () => {
    mockBookingCount.mockResolvedValue(3)

    const res = await deleteRequest('class-1')

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/existing bookings/i)
    expect(json.error).toMatch(/deactivate/i)
    expect(mockClassDelete).not.toHaveBeenCalled()
  })

  it('counts bookings regardless of status — a class with only cancelled history is still blocked', async () => {
    // The pre-check must match what actually trips the FK: any row at all,
    // not just active ones, or it would wrongly predict success.
    await deleteRequest('class-1')

    expect(mockBookingCount).toHaveBeenCalledWith({ where: { classId: 'class-1' } })
  })

  it('returns 409 (not 500) when a P2003 hits the actual delete despite the pre-check passing', async () => {
    // Simulates a booking created in the race window between the count
    // check and the delete call (e.g. a concurrent self-booking).
    mockBookingCount.mockResolvedValue(0)
    mockClassDelete.mockRejectedValue(p2003)

    const res = await deleteRequest('class-1')

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/existing bookings/i)
  })

  it('rethrows a non-FK Prisma error instead of masking it as 409', async () => {
    const otherError = new Prisma.PrismaClientKnownRequestError('Something else broke', {
      code: 'P2025',
      clientVersion: 'test',
    })
    mockClassDelete.mockRejectedValue(otherError)

    await expect(deleteRequest('class-1')).rejects.toThrow('Something else broke')
  })

  it('404s when the class does not exist in this school', async () => {
    mockClassFindFirst.mockResolvedValue(null)

    const res = await deleteRequest('missing')

    expect(res.status).toBe(404)
    expect(mockBookingCount).not.toHaveBeenCalled()
    expect(mockClassDelete).not.toHaveBeenCalled()
  })

  it('403s a role without school.classes.delete permission (e.g. MANAGER)', async () => {
    mockRequireSchoolAccess.mockResolvedValue({ role: 'MANAGER', status: 'ACTIVE' })

    const res = await deleteRequest('class-1')

    expect(res.status).toBe(403)
    expect(mockClassDelete).not.toHaveBeenCalled()
  })
})
