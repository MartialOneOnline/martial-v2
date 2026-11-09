/** GET /api/dashboard/reports/absents — lists from attendance, staff excluded, period sections. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireDashboardAccess: vi.fn(),
  schoolFindUnique: vi.fn(), memberFindMany: vi.fn(), bookingFindMany: vi.fn(), bookingGroupBy: vi.fn(), membershipFindMany: vi.fn(),
}))
// requireDashboardPermission() = requireDashboardAccess() + the member's real
// effective permission (lib/auth/customRoles.ts, CUSTOM roles included).
vi.mock('@/lib/auth/server', async () => {
  const { memberHasPermission } = await import('@/lib/auth/customRoles')
  return {
    getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId, requireDashboardAccess: m.requireDashboardAccess,
    requireDashboardPermission: async (permission: Parameters<typeof memberHasPermission>[1], schoolId?: string) => {
      const access = await m.requireDashboardAccess(schoolId)
      if (access.member && !(await memberHasPermission(access.member, permission))) throw new Error('FORBIDDEN')
      return access
    },
  }
})
vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: m.schoolFindUnique },
    schoolMember: { findMany: m.memberFindMany },
    booking: { findMany: m.bookingFindMany, groupBy: m.bookingGroupBy },
    membership: { findMany: m.membershipFindMany },
  },
}))

const { GET } = await import('@/app/api/dashboard/reports/absents/route')
const call = () => GET(new NextRequest('http://localhost/api/dashboard/reports/absents?period=30d'))
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)

beforeEach(() => {
  vi.clearAllMocks()
  m.getAuthUser.mockResolvedValue({ id: 'staff' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireDashboardAccess.mockResolvedValue({ member: { role: 'OWNER' } })
  m.schoolFindUnique.mockResolvedValue({ country: 'ES' })
  m.memberFindMany
    .mockResolvedValueOnce([ // active students
      { id: 'm1', userId: 'u1', joinedAt: daysAgo(200), createdAt: daysAgo(200), user: { name: 'Paying Away', email: 'p@x.com', phone: '600111222', avatarUrl: null } },
      { id: 'm2', userId: 'u2', joinedAt: daysAgo(200), createdAt: daysAgo(200), user: { name: 'Coach Also Student', email: 'c@x.com', phone: null, avatarUrl: null } },
      { id: 'm3', userId: 'u3', joinedAt: null, createdAt: daysAgo(30), user: { name: 'Never Came', email: 'n@x.com', phone: 'NULL', avatarUrl: null } },
    ])
    .mockResolvedValueOnce([{ userId: 'u2' }]) // u2 is staff too
  m.bookingFindMany
    .mockResolvedValueOnce([{ userId: 'u1', scheduledAt: daysAgo(20) }, { userId: 'u2', scheduledAt: daysAgo(40) }]) // attended history
    .mockResolvedValueOnce([ // missed in period
      { userId: 'u1', scheduledAt: daysAgo(25), status: 'NO_SHOW', class: { name: 'Gi', duration: 90 }, user: { name: 'Paying Away', email: 'p@x.com', phone: '600111222', avatarUrl: null } },
      // CONFIRMED, started 4 h ago, 90 min: ended 2.5 h ago — not "not marked" yet
      { userId: 'u1', scheduledAt: new Date(Date.now() - 4 * 3600_000), status: 'CONFIRMED', class: { name: 'Gi', duration: 90 }, user: { name: 'Paying Away', email: 'p@x.com', phone: '600111222', avatarUrl: null } },
    ])
    .mockResolvedValueOnce([{ scheduledAt: daysAgo(3) }]) // cancelled
  m.bookingGroupBy.mockResolvedValue([])
  m.membershipFindMany.mockResolvedValue([{ userId: 'u1', planId: 'p', planName: 'Mensual', price: 65, plan: { planType: 'SUBSCRIPTION', validityDays: null } }])
})

describe('GET absents report', () => {
  it('lists who stopped coming from attendance, excluding staff, paying flagged', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.lists.AT_RISK.map((r: { name: string }) => r.name)).toEqual(['Paying Away'])
    expect(d.lists.AT_RISK[0]).toMatchObject({ memberId: 'm1', plan: { paying: true }, whatsapp: '34600111222' })
    expect(d.lists.LOST).toEqual([]) // the staff member isn't listed
    expect(d.lists.NEVER.map((r: { name: string }) => r.name)).toEqual(['Never Came'])
    expect(d.summary).toMatchObject({ active: 2, atRisk: 1, never: 1, payingAway: 1 })
    expect(d.noShows[0]).toMatchObject({ memberId: 'm1', noShows: 1, unmarked: 0, topClass: 'Gi' })
    expect(d.period).toMatchObject({ key: '30d', cancelled: 1, noShows: 1, unmarked: 0 })
    // joinedAt null falls back to when the member row was created; a "NULL" phone is no phone
    expect(d.lists.NEVER[0]).toMatchObject({ daysSince: 30, phone: null, whatsapp: null })
  })

  it('no-shows and cancellations only for the same roster as the lists (no staff, no FROZEN)', async () => {
    await call()
    const missedQuery = m.bookingFindMany.mock.calls[1]![0].where
    const cancelledQuery = m.bookingFindMany.mock.calls[2]![0].where
    expect(missedQuery.userId).toEqual({ in: ['u1', 'u3'] })
    expect(cancelledQuery.userId).toEqual({ in: ['u1', 'u3'] })
    // FROZEN never reaches the roster: only ACTIVE students are loaded
    expect(m.memberFindMany.mock.calls[0]![0].where).toMatchObject({ role: 'STUDENT', status: 'ACTIVE' })
  })

  it('403 for a student', async () => {
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('Forbidden'))
    expect((await call()).status).toBe(403)
  })
})
