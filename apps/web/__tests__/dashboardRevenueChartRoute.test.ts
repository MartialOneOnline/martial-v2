/** GET /api/dashboard/revenue-chart — the dashboard home "Payments Overview" chart. */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireDashboardAccess: vi.fn(), txFindMany: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId, requireDashboardAccess: m.requireDashboardAccess }))
vi.mock('@/lib/db', () => ({ prisma: { transaction: { findMany: m.txFindMany } } }))

const { GET } = await import('@/app/api/dashboard/revenue-chart/route')
const call = (q = '') => GET(new NextRequest(`http://localhost/api/dashboard/revenue-chart${q}`))
const monthsAgo = (n: number) => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - n, 10, 12) }

beforeEach(() => {
  vi.clearAllMocks()
  m.getAuthUser.mockResolvedValue({ id: 'staff' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireDashboardAccess.mockResolvedValue({ member: { role: 'OWNER' } })
  m.txFindMany.mockResolvedValue([])
})

describe('GET /api/dashboard/revenue-chart', () => {
  it('returns revenueData with 12 monthly points, summing PAID income per month', async () => {
    m.txFindMany.mockResolvedValue([
      { amount: 65, date: monthsAgo(1) },
      { amount: '65.40', date: monthsAgo(1) }, // Prisma Decimal comes as a string-like value
      { amount: 100, date: monthsAgo(11) },
    ])
    const res = await call('?period=12m')
    expect(res.status).toBe(200)
    const { revenueData } = await res.json()
    expect(revenueData).toHaveLength(12)
    expect(revenueData[10].revenue).toBe(130)
    expect(revenueData[0].revenue).toBe(100)
    expect(revenueData[11].revenue).toBe(0)
    expect(revenueData[0]).toHaveProperty('date')
    const where = m.txFindMany.mock.calls[0]![0].where
    expect(where).toMatchObject({ schoolId: 's1', type: 'INCOME', status: 'PAID', deletedAt: null })
  })

  it('uses daily points for 7d and falls back to 12m on unknown periods', async () => {
    expect((await (await call('?period=7d')).json()).revenueData).toHaveLength(7)
    expect((await (await call('?period=bogus')).json()).revenueData).toHaveLength(12)
  })

  it('30d counts income on days between the old single-day points (Audit PR #52)', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-02T12:00:00'))
    try {
      m.txFindMany.mockResolvedValue([{ amount: 100, date: new Date('2026-10-07T18:00:00') }])
      const { revenueData } = await (await call('?period=30d')).json()
      expect(revenueData.reduce((s: number, p: { revenue: number }) => s + p.revenue, 0)).toBe(100)
    } finally { vi.useRealTimers() }
  })

  it('rejects anonymous users and non-staff', async () => {
    m.getAuthUser.mockResolvedValueOnce(null)
    expect((await call()).status).toBe(401)
    m.requireDashboardAccess.mockRejectedValueOnce(new Error('no'))
    expect((await call()).status).toBe(403)
    expect(m.txFindMany).not.toHaveBeenCalled()
  })
})
