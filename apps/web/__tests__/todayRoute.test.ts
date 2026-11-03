/** GET /api/dashboard/today — blocks come from the report endpoints, each with its own permission. */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireDashboardAccess: vi.fn(),
  schoolFindUnique: vi.fn(), classFindMany: vi.fn(), bookingFindMany: vi.fn(), cancelFindMany: vi.fn(),
  payments: vi.fn(), leads: vi.fn(), absents: vi.fn(), bookings: vi.fn(), readiness: vi.fn(), memberships: vi.fn(),
  gradingOn: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId, requireDashboardAccess: m.requireDashboardAccess }))
vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: m.schoolFindUnique },
    class: { findMany: m.classFindMany },
    booking: { findMany: m.bookingFindMany },
    classCancellation: { findMany: m.cancelFindMany },
  },
}))
vi.mock('@/lib/grading/moduleServer', () => ({ getGradingEnabledForSchool: m.gradingOn }))
vi.mock('@/app/api/dashboard/reports/payments/route', () => ({ GET: m.payments }))
vi.mock('@/app/api/dashboard/reports/leads/route', () => ({ GET: m.leads }))
vi.mock('@/app/api/dashboard/reports/absents/route', () => ({ GET: m.absents }))
vi.mock('@/app/api/dashboard/reports/bookings/route', () => ({ GET: m.bookings }))
vi.mock('@/app/api/dashboard/reports/grading-readiness/route', () => ({ GET: m.readiness }))
vi.mock('@/app/api/dashboard/memberships/route', () => ({ GET: m.memberships }))

const { GET } = await import('@/app/api/dashboard/today/route')
const call = () => GET(new NextRequest('http://localhost/api/dashboard/today'))
const ok = (body: unknown) => async () => NextResponse.json(body)
const status = (s: number) => async () => NextResponse.json({ error: 'x' }, { status: s })
const who = (name: string) => ({ name, email: `${name}@x.com`, phone: '600000000', whatsapp: '34600000000', memberId: `m-${name}` })

beforeEach(() => {
  vi.clearAllMocks()
  // Tuesday 3 Nov 2026, 10:00 UTC = 11:00 in Madrid
  vi.useFakeTimers({ now: new Date('2026-11-03T10:00:00Z'), toFake: ['Date'] })
  m.getAuthUser.mockResolvedValue({ id: 'staff' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireDashboardAccess.mockResolvedValue({})
  m.schoolFindUnique.mockResolvedValue({ country: 'ES' })
  m.classFindMany.mockResolvedValue([{ id: 'c1', name: 'NOGI', capacity: 30, duration: 90, isActive: true, schedule: [{ dayOfWeek: 2, startTime: '20:00', endTime: '21:30' }] }])
  m.bookingFindMany.mockResolvedValue([{ classId: 'c1', scheduledAt: new Date('2026-11-03T20:00:00Z') }])
  m.cancelFindMany.mockResolvedValue([])
  m.gradingOn.mockResolvedValue(true)
  m.payments.mockImplementation(ok({
    toCollect: [
      { ...who('training'), training: true, toReview: false, daysOverdue: 12, amount: 65, currency: 'EUR', planName: 'Mensual' },
      { ...who('reviewing'), training: true, toReview: true, daysOverdue: 3, amount: 65, currency: 'EUR', planName: 'Mensual' },
      { ...who('gone'), training: false, toReview: false, daysOverdue: 40, amount: 65, currency: 'EUR', planName: 'Mensual' },
    ],
    failed: [{ ...who('card'), amount: 50, currency: 'EUR', kind: 'FAILED', label: 'Stripe' }],
  }))
  m.leads.mockImplementation(ok({ followUps: {
    NOT_CONTACTED: [{ id: 'l1', ...who('new'), followUpDays: 3, upcomingAt: null }],
    UPCOMING_TRIAL: [
      { id: 'l2', ...who('today'), followUpDays: null, upcomingAt: '2026-11-03T19:00:00.000Z' },
      { id: 'l3', ...who('later'), followUpDays: null, upcomingAt: '2026-11-10T19:00:00.000Z' },
    ],
    NO_SHOW: [], TRIED_NOT_JOINED: [],
  } }))
  m.absents.mockImplementation(ok({ lists: { AT_RISK: [
    { ...who('away'), daysSince: 15, plan: { name: 'Mensual', paying: true, trial: false } },
    { ...who('free'), daysSince: 15, plan: { name: 'Prueba', paying: false, trial: true } },
  ] } }))
  m.bookings.mockImplementation(ok({ unmarked: [{ classId: 'c1', className: 'NOGI', date: '2026-11-02', time: '10:00', unmarked: 2 }] }))
  m.readiness.mockImplementation(ok({ students: [{ name: 'Ready', memberId: 'm9', phone: '600 11 22 33', rankName: 'Azul', daysOverdue: 20, readiness: { status: 'READY' } }, { name: 'Not', readiness: { status: 'NOT_READY' } }] }))
  m.memberships.mockImplementation(ok({ memberships: [{ id: 'ms1', userName: 'Applicant', userEmail: 'a@x.com', schoolMemberId: 'm5', planName: 'Mensual' }], total: 1 }))
})
afterEach(() => { vi.useRealTimers() })

describe('GET /api/dashboard/today', () => {
  it('builds every block from its report and ranks the top three', async () => {
    const res = await call()
    expect(res.status).toBe(200)
    const d = await res.json()
    expect(d.date).toBe('2026-11-03')
    expect(d.classes.sessions).toEqual([{ classId: 'c1', className: 'NOGI', time: '20:00', endTime: '21:30', booked: 1, capacity: 30, cancelled: false }])
    expect(d.classes.unmarkedCount).toBe(1)
    // Only overdue students still training and not already paid ("to review")
    expect(d.collect.items.map((x: { name: string }) => x.name)).toEqual(['training'])
    expect(d.collect.failedCount).toBe(1)
    expect(d.leads.trials.map((x: { name: string; day: string }) => [x.name, x.day])).toEqual([['today', 'TODAY']])
    expect(d.retain.items.map((x: { name: string }) => x.name)).toEqual(['away'])
    expect(d.approvals).toMatchObject({ state: 'ok', count: 1 })
    expect(d.grading.items).toEqual([{ name: 'Ready', email: null, phone: '600 11 22 33', whatsapp: '34600112233', memberId: 'm9', rankName: 'Azul', daysOverdue: 20 }])
    expect(d.top.map((a: { kind: string }) => a.kind)).toEqual(['COLLECT', 'TRIAL_TODAY', 'NOT_CONTACTED'])
  })

  it('a block the person may not see is hidden, a failing one says so, the rest still load', async () => {
    m.payments.mockImplementation(status(403))
    m.leads.mockImplementation(status(500))
    m.memberships.mockImplementation(async () => { throw new Error('boom') })
    const d = await (await call()).json()
    expect(d.collect.state).toBe('forbidden')
    expect(d.leads.state).toBe('error')
    expect(d.approvals.state).toBe('error')
    expect(d.retain.state).toBe('ok')
    expect(d.top.map((a: { kind: string }) => a.kind)).toEqual(['RETAIN', 'UNMARKED', 'GRADING'])
  })

  it('grading module off: no grading block and the readiness endpoint is not called', async () => {
    m.gradingOn.mockResolvedValue(false)
    const d = await (await call()).json()
    expect(d.grading).toEqual({ state: 'off' })
    expect(m.readiness).not.toHaveBeenCalled()
  })

  it('needs dashboard access', async () => {
    m.requireDashboardAccess.mockRejectedValue(new Error('no'))
    expect((await call()).status).toBe(403)
    m.getAuthUser.mockResolvedValue(null)
    expect((await call()).status).toBe(401)
  })
})
