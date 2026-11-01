import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getAuthUser, getCurrentSchoolId, requireDashboardAccess, getReadinessForSchool } = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireDashboardAccess: vi.fn(), getReadinessForSchool: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser, getCurrentSchoolId, requireDashboardAccess }))
vi.mock('@/lib/grading/readinessData', () => ({ getReadinessForSchool }))

import { GET } from '../app/api/dashboard/reports/grading-readiness/route'

const s = (name: string, status: string, isNew: boolean, daysOverdue: number | null) => ({
  name, isNew, daysOverdue, readiness: { status, due: status === 'READY' ? { count: 1 } : null, percent: status === 'READY' ? 100 : 40 },
})

beforeEach(() => {
  vi.clearAllMocks()
  getAuthUser.mockResolvedValue({ id: 'u1' })
  getCurrentSchoolId.mockResolvedValue('school1')
  requireDashboardAccess.mockResolvedValue(undefined)
})

describe('GET /api/dashboard/reports/grading-readiness', () => {
  it('counts overdue and new students due, and puts new students first', async () => {
    getReadinessForSchool.mockResolvedValue([
      s('old-30d', 'READY', false, 30), s('almost', 'ALMOST_READY', true, null),
      s('new-2d', 'READY', true, 2), s('old-3d', 'READY', false, 3),
    ])
    const data = await (await GET()).json()
    expect(data).toMatchObject({ overdue: 1, newDue: 1, overdueDays: 14, counts: { READY: 3, ALMOST_READY: 1 } })
    expect(data.students.map((x: { name: string }) => x.name)).toEqual(['new-2d', 'old-30d', 'old-3d', 'almost'])
  })

  it('staff only', async () => {
    requireDashboardAccess.mockRejectedValue(new Error('no'))
    expect((await GET()).status).toBe(403)
    expect(getReadinessForSchool).not.toHaveBeenCalled()
  })
})
