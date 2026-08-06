/**
 * Regression tests confirming GET /api/admin/membership-drift and the
 * membershipDrift addition to GET /api/admin/stats both reject non-superadmin
 * callers — these two routes expose cross-school member data (name, email,
 * school) and must never be reachable without guardSuperadmin() passing.
 * guardSuperadmin() itself is unit-tested in guardSuperadmin.test.ts; these
 * tests instead prove each route actually wires the guard in and honors its
 * verdict, rather than re-testing the guard's internals.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockGuardSuperadmin = vi.fn()
vi.mock('@/lib/auth/server', () => ({
  guardSuperadmin: mockGuardSuperadmin,
}))

const schoolMemberFindMany = vi.fn(async () => [])
const membershipFindMany = vi.fn(async () => [])
const genericCount = vi.fn(async () => 0)
const genericFindMany = vi.fn(async () => [])
const genericGroupBy = vi.fn(async () => [])
const genericQueryRaw = vi.fn(async () => [])

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { findMany: schoolMemberFindMany },
    membership: { findMany: membershipFindMany },
    school: { count: genericCount, groupBy: genericGroupBy, findMany: genericFindMany },
    user: { count: genericCount },
    schoolInvitation: { count: genericCount },
    $queryRaw: genericQueryRaw,
  },
}))

const { GET: getMembershipDrift } = await import('@/app/api/admin/membership-drift/route')
const { GET: getStats } = await import('@/app/api/admin/stats/route')

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, { method: 'GET' })
}

const DENY = NextResponse.json({ error: 'Forbidden' }, { status: 403 })

describe('GET /api/admin/membership-drift — superadmin guard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-superadmin caller and never touches the database', async () => {
    mockGuardSuperadmin.mockResolvedValue(DENY)
    const res = await getMembershipDrift(makeRequest('/api/admin/membership-drift'))
    expect(res.status).toBe(403)
    expect(schoolMemberFindMany).not.toHaveBeenCalled()
  })

  it('serves the drift list once guardSuperadmin allows the request', async () => {
    mockGuardSuperadmin.mockResolvedValue(null)
    const res = await getMembershipDrift(makeRequest('/api/admin/membership-drift'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.members).toEqual([])
    expect(schoolMemberFindMany).toHaveBeenCalledTimes(1)
  })
})

describe('GET /api/admin/stats — superadmin guard (membershipDrift field)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a non-superadmin caller and never touches the database', async () => {
    mockGuardSuperadmin.mockResolvedValue(DENY)
    const res = await getStats(makeRequest('/api/admin/stats'))
    expect(res.status).toBe(403)
    expect(genericCount).not.toHaveBeenCalled()
    expect(schoolMemberFindMany).not.toHaveBeenCalled()
  })

  it('includes membershipDrift once guardSuperadmin allows the request', async () => {
    mockGuardSuperadmin.mockResolvedValue(null)
    const res = await getStats(makeRequest('/api/admin/stats'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.membershipDrift).toBe(0)
  })
})
