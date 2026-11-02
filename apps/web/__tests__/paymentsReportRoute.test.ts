/** GET /api/dashboard/reports/payments — to collect, training unpaid, old pending, month figures. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireDashboardAccess: vi.fn(),
  requireSchoolAccess: vi.fn(), staffRole: vi.fn(),
  school: vi.fn(), members: vi.fn(), memberships: vi.fn(), bookingGroupBy: vi.fn(), txGroupBy: vi.fn(), txFindMany: vi.fn(), users: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId, requireDashboardAccess: m.requireDashboardAccess }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: m.requireSchoolAccess }))
vi.mock('@/lib/db', () => ({
  prisma: {
    staffRole: { findUnique: m.staffRole },
    school: { findUnique: m.school },
    schoolMember: { findMany: m.members },
    membership: { findMany: m.memberships },
    booking: { groupBy: m.bookingGroupBy },
    transaction: { groupBy: m.txGroupBy, findMany: m.txFindMany },
    user: { findMany: m.users },
  },
}))

const { GET } = await import('@/app/api/dashboard/reports/payments/route')
const call = () => GET(new NextRequest('http://localhost/api/dashboard/reports/payments'))
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
const u = (name: string, phone: string | null = null) => ({ name, email: `${name}@x.com`, phone })

beforeEach(() => {
  vi.clearAllMocks()
  m.getAuthUser.mockResolvedValue({ id: 'staff' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireDashboardAccess.mockResolvedValue({ member: { role: 'OWNER' } })
  m.school.mockResolvedValue({ country: 'ES' })
  m.members
    .mockResolvedValueOnce([{ userId: 'coach' }]) // staff
    .mockResolvedValueOnce([{ id: 'm1', userId: 'u1' }, { id: 'm2', userId: 'u2' }, { id: 'm3', userId: 'u3' }, { id: 'mc', userId: 'coach' }])
  m.memberships
    // overdue paid plans (one belongs to staff)
    .mockResolvedValueOnce([
      { id: 'ms1', userId: 'u1', endDate: daysAgo(10), price: 65, currency: 'EUR', paymentMethod: 'CASH', planName: 'Mensual', user: u('Ana', '600111222'), transactions: [] },
      { id: 'msc', userId: 'coach', endDate: daysAgo(10), price: 65, currency: 'EUR', paymentMethod: 'CASH', planName: 'Mensual', user: u('Coach'), transactions: [] },
    ])
    // memberships of people who trained recently
    .mockResolvedValueOnce([
      { userId: 'u2', status: 'EXPIRED', price: 0, endDate: daysAgo(5), planId: 'p', planName: 'Prueba', plan: { planType: 'TRIAL', validityDays: 7 } },
      { userId: 'u3', status: 'ACTIVE', price: 65, endDate: daysAgo(-20), planId: 'p2', planName: 'Mensual', plan: { planType: 'SUBSCRIPTION', validityDays: null } },
    ])
    .mockResolvedValueOnce([]) // past due (Stripe)
    // active subscriptions for "expected"
    .mockResolvedValueOnce([
      { userId: 'u1', price: 65, currency: 'EUR', plan: { planType: 'SUBSCRIPTION', billingCycle: 'monthly' } },
      { userId: 'u3', price: 180, currency: 'EUR', plan: { planType: 'SUBSCRIPTION', billingCycle: 'quarterly' } },
      { userId: 'coach', price: 65, currency: 'EUR', plan: { planType: 'SUBSCRIPTION', billingCycle: 'monthly' } },
    ])
  m.bookingGroupBy
    .mockResolvedValueOnce([{ userId: 'u1', _max: { scheduledAt: daysAgo(2) } }]) // last classes of the overdue
    .mockResolvedValueOnce([ // trained in 30 days
      { userId: 'u2', _count: { _all: 6 }, _max: { scheduledAt: daysAgo(1) } },
      { userId: 'u3', _count: { _all: 8 }, _max: { scheduledAt: daysAgo(1) } },
      { userId: 'coach', _count: { _all: 20 }, _max: { scheduledAt: daysAgo(1) } },
    ])
  m.txGroupBy.mockResolvedValue([{ userId: 'u1', _max: { date: daysAgo(40) } }])
  m.users.mockResolvedValue([{ id: 'u2', ...u('Rafa') }, { id: 'u3', ...u('Paga') }])
  m.txFindMany
    .mockResolvedValueOnce([]) // paid around the overdue dates (none: real debt)
    .mockResolvedValueOnce([]) // failed
    .mockResolvedValueOnce([{ id: 't-old', userId: 'u1', amount: 65, currency: 'EUR', description: 'Cuota', date: daysAgo(90), user: u('Ana'), membership: { status: 'ACTIVE' } }]) // old pending
    .mockResolvedValueOnce([{ amount: 65, currency: 'EUR' }, { amount: 40, currency: 'GBP' }]) // paid this month
    .mockResolvedValueOnce([]) // pending this month
    .mockResolvedValueOnce([{ amount: 65, currency: 'EUR', date: daysAgo(1), paymentMethod: 'CASH' }]) // paid 12 months
})

describe('GET payments report', () => {
  it('lists who owes money and who trains without paying, never staff', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.toCollect.map((x: { name: string }) => x.name)).toEqual(['Ana'])
    expect(d.toCollect[0]).toMatchObject({ memberId: 'm1', amount: 65, training: true, daysOverdue: 10, whatsapp: '34600111222' })
    expect(d.unpaidTraining.map((x: { name: string }) => x.name)).toEqual(['Rafa'])
    expect(d.unpaidTraining[0]).toMatchObject({ state: 'TRIAL_OVER', classes: 6 })
    expect(d.oldPending[0]).toMatchObject({ id: 't-old', daysPending: 90 })
  })

  it('expected = recurring plans per month (staff excluded), currencies never mixed', async () => {
    const d = await (await call()).json()
    expect(d.month.expected).toEqual({ EUR: 125 }) // 65 + 180/3
    expect(d.month.collected).toEqual({ EUR: 65, GBP: 40 })
    expect(d.currency).toBe('EUR')
    expect(d.byMethod).toEqual([{ method: 'CASH', amount: 65 }])
  })

  it('P1: an instructor without analytics permission gets 403; SUPERADMIN (no member row) passes', async () => {
    m.requireDashboardAccess.mockResolvedValueOnce({ member: { role: 'INSTRUCTOR', customRoleId: null } })
    expect((await call()).status).toBe(403)
    m.requireDashboardAccess.mockResolvedValueOnce({ member: null })
    expect((await call()).status).toBe(200)
  })

  it('P2: staff money is excluded from every transaction query, anonymous payments kept', async () => {
    await call()
    // [0] is the overdue reconciliation, already limited to non-staff students by userId
    expect(m.txFindMany.mock.calls[0]![0].where.userId).toEqual({ in: ['u1'] })
    for (const [args] of m.txFindMany.mock.calls.slice(1)) {
      expect(args.where.OR).toEqual([{ userId: null }, { userId: { notIn: ['coach'] } }])
    }
  })

  it('403 for a student', async () => {
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('Forbidden'))
    expect((await call()).status).toBe(403)
  })
})

describe('P2: an overdue plan with a recent payment is "to review", not a debt', () => {
  it('flags it, keeps it out of the total and lists it after the real debts', async () => {
    m.txFindMany.mockReset()
    m.txFindMany
      .mockResolvedValueOnce([{ userId: 'u1', membershipId: 'ms1', date: daysAgo(8), periodEnd: null }]) // paid 2 days before due (10 days ago)
      .mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([])
    const d = await (await call()).json()
    expect(d.toCollect[0]).toMatchObject({ name: 'Ana', toReview: true })
    expect(d.toCollectTotal).toEqual({})
  })
})

describe('re-audit fixes', () => {
  const sixEmpty = () => { for (let i = 0; i < 5; i++) m.txFindMany.mockResolvedValueOnce([]) }

  it('P2: a payment linked to ANOTHER plan never hides this debt', async () => {
    m.txFindMany.mockReset()
    m.txFindMany.mockResolvedValueOnce([{ userId: 'u1', membershipId: 'other-plan', date: daysAgo(2), periodEnd: null }])
    sixEmpty()
    const d = await (await call()).json()
    expect(d.toCollect[0]).toMatchObject({ name: 'Ana', toReview: false })
    expect(d.toCollectTotal).toEqual({ EUR: 65 })
  })

  it('P2: an early payment of this plan whose period covers the due date → to review', async () => {
    m.txFindMany.mockReset()
    m.txFindMany.mockResolvedValueOnce([{ userId: 'u1', membershipId: 'ms1', date: daysAgo(30), periodEnd: daysAgo(-20) }])
    sixEmpty()
    const d = await (await call()).json()
    expect(d.toCollect[0]).toMatchObject({ toReview: true })
    const where = m.txFindMany.mock.calls[0]![0].where
    expect(where.OR[1]).toEqual({ periodEnd: { gt: expect.any(Date) } })
  })

  it('P2: a CUSTOM staff role with analytics permission gets in; without it, 403', async () => {
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'CUSTOM', customRoleId: 'r1', status: 'ACTIVE' })
    m.staffRole.mockResolvedValueOnce({ permissions: ['school.analytics.view'] })
    expect((await call()).status).toBe(200)
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'CUSTOM', customRoleId: 'r2', status: 'ACTIVE' })
    m.staffRole.mockResolvedValueOnce({ permissions: ['school.classes.view'] })
    expect((await call()).status).toBe(403)
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('FORBIDDEN'))
    m.requireSchoolAccess.mockResolvedValueOnce({ role: 'STUDENT', customRoleId: null, status: 'ACTIVE' })
    expect((await call()).status).toBe(403)
  })
})
