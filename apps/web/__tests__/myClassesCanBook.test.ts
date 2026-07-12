/**
 * Tests for GET /api/my/school-classes — canBook must be false once the user
 * already has an active booking for that exact occurrence, even though the
 * eligibility check alone (membership + classAccess + capacity) would allow
 * it. POST /api/bookings remains the final authority; this only drives the
 * "Book" button in the UI.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextOccurrence } from '@/lib/scheduling'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const mockUserFindUnique = vi.fn()
const mockSchoolMemberFindMany = vi.fn()
const mockMembershipFindMany = vi.fn()
const mockClassFindMany = vi.fn()
const mockBookingFindMany = vi.fn()
const mockBookingCount = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    schoolMember: { findMany: mockSchoolMemberFindMany },
    membership: { findMany: mockMembershipFindMany },
    class: { findMany: mockClassFindMany },
    booking: { findMany: mockBookingFindMany, count: mockBookingCount },
  },
}))

const mockHasDashboardAccess = vi.fn()
vi.mock('@/lib/auth/contexts', () => ({
  hasDashboardAccess: mockHasDashboardAccess,
}))

// This suite predates the active-student-context scoping (see
// mySchoolClassesScope.test.ts for that behaviour) — it only cares about the
// canBook computation, so it keeps the pre-scoping fallback path: no
// resolved context ('none'), which makes the route fall back to the exact
// same unscoped prisma.schoolMember.findMany() call this file already mocks.
const mockGetActiveStudentContext = vi.fn()
vi.mock('@/lib/auth/activeContextCookie', () => ({
  getActiveStudentContext: mockGetActiveStudentContext,
}))

const { GET } = await import('@/app/api/my/school-classes/route')

// Tomorrow's weekday/time — avoids same-day edge cases in nextOccurrence()
// between the value computed here and the one computed inside the route.
const now = new Date()
const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
const targetDay = tomorrow.getUTCDay()
const occurrence = nextOccurrence(now, targetDay, '18:00')

const school = { name: 'Academy', slug: 'academy', logoUrl: null, city: 'City' }
const classRow = {
  id: 'class-1', name: 'BJJ', duration: 60, level: null, capacity: null,
  schedule: [{ dayOfWeek: targetDay, startTime: '18:00' }],
  coverUrl: null, schoolId: 'school-1', school, instructor: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1' })
  mockSchoolMemberFindMany.mockResolvedValue([{ schoolId: 'school-1' }])
  mockMembershipFindMany.mockResolvedValue([
    { id: 'm1', schoolId: 'school-1', startDate: new Date('2026-01-01'), endDate: null, plan: { classAccess: null } },
  ])
  mockClassFindMany.mockResolvedValue([classRow])
  mockBookingCount.mockResolvedValue(0)
  mockHasDashboardAccess.mockResolvedValue(false)
  mockGetActiveStudentContext.mockResolvedValue({ kind: 'none' })
})

interface Occurrence {
  scheduledAt: string
  alreadyBooked: boolean
  canBook: boolean
}

function findOccurrence(occurrences: Occurrence[]): Occurrence {
  const found = occurrences.find(o => o.scheduledAt === occurrence.toISOString())
  if (!found) throw new Error('Expected occurrence not found in response')
  return found
}

describe('GET /api/my/school-classes', () => {
  it('canBook is false when the user already has an active booking for this occurrence', async () => {
    mockBookingFindMany
      .mockResolvedValueOnce([{ classId: 'class-1', scheduledAt: occurrence }]) // existingBookings (this user)
      .mockResolvedValueOnce([{ classId: 'class-1', scheduledAt: occurrence }]) // capacityBookings (all users)

    const res = await GET()
    const json = await res.json()
    const found = findOccurrence(json.occurrences)

    expect(found).toBeDefined()
    expect(found.alreadyBooked).toBe(true)
    expect(found.canBook).toBe(false)
  })

  it('canBook is true when eligible and not already booked', async () => {
    mockBookingFindMany
      .mockResolvedValueOnce([]) // existingBookings
      .mockResolvedValueOnce([]) // capacityBookings

    const res = await GET()
    const json = await res.json()
    const found = findOccurrence(json.occurrences)

    expect(found).toBeDefined()
    expect(found.alreadyBooked).toBe(false)
    expect(found.canBook).toBe(true)
  })

  it('canBook is false when not already booked but ineligible (no active membership)', async () => {
    mockMembershipFindMany.mockResolvedValue([])
    mockBookingFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const res = await GET()
    const json = await res.json()
    const found = findOccurrence(json.occurrences)

    expect(found).toBeDefined()
    expect(found.alreadyBooked).toBe(false)
    expect(found.canBook).toBe(false)
  })
})
