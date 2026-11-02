/**
 * PATCH /api/dashboard/grading-systems/[id]/ranks — Settings → Grading's one
 * Save: all belts at once, validated, in one transaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(), getCurrentSchoolId: vi.fn(), requireSchoolAccess: vi.fn(), memberHasPermission: vi.fn(),
  systemFind: vi.fn(), rankFindMany: vi.fn(), rankUpdate: vi.fn(), classFindMany: vi.fn(), transaction: vi.fn(),
}))
vi.mock('@/lib/auth/server', () => ({ getAuthUser: m.getAuthUser, getCurrentSchoolId: m.getCurrentSchoolId }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: m.requireSchoolAccess }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission: m.memberHasPermission }))
vi.mock('@/lib/db', () => ({
  prisma: {
    gradingSystem: { findFirst: m.systemFind },
    beltRank: { findMany: m.rankFindMany, update: m.rankUpdate },
    class: { findMany: m.classFindMany },
    $transaction: m.transaction,
  },
}))

const { PATCH } = await import('@/app/api/dashboard/grading-systems/[id]/ranks/route')

const call = (body: unknown) => PATCH(
  new NextRequest('http://localhost/api/dashboard/grading-systems/sys1/ranks', { method: 'PATCH', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: 'sys1' }) },
)
const belt = (over: Record<string, unknown> = {}) => ({
  id: 'r1', name: 'Blanco', color: '#FFFFFF', maxDegrees: 4, classesByDegree: [8, 16, 24, 24, 24, 99],
  classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK', classTypeIds: ['gi', 'other-school'], requireExam: true, ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  m.getAuthUser.mockResolvedValue({ id: 'u1', role: 'USER' })
  m.getCurrentSchoolId.mockResolvedValue('s1')
  m.requireSchoolAccess.mockResolvedValue({ role: 'OWNER' })
  m.memberHasPermission.mockResolvedValue(true)
  m.systemFind.mockResolvedValue({ id: 'sys1' })
  m.rankFindMany.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }])
  m.classFindMany.mockResolvedValue([{ id: 'gi' }, { id: 'nogi' }])
  m.rankUpdate.mockImplementation(a => a)
  m.transaction.mockResolvedValue([])
})

describe('PATCH ranks (bulk)', () => {
  it('saves every belt in one transaction, keeping only this school’s classes', async () => {
    const res = await call({ ranks: [belt(), belt({ id: 'r2', name: 'Azul', classTypeIds: ['gi'] })] })
    expect(res.status).toBe(200)
    expect(m.transaction).toHaveBeenCalledTimes(1)
    const first = m.rankUpdate.mock.calls[0]![0]
    expect(first.where).toEqual({ id: 'r1' })
    expect(first.data).toMatchObject({
      name: 'Blanco', maxDegrees: 4, classesByDegree: [8, 16, 24, 24, 24],
      classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK', classTypeIds: ['gi'], requireExam: true, requireCompetition: false,
    })
  })

  it('rejects a belt from another system and writes nothing', async () => {
    const res = await call({ ranks: [belt({ id: 'elsewhere' })] })
    expect(res.status).toBe(400)
    expect(m.transaction).not.toHaveBeenCalled()
  })

  it('rejects a max below the min, naming the belt', async () => {
    const res = await call({ ranks: [belt(), belt({ id: 'r2', classesPerPeriod: 3, maxClassesPerPeriod: 2 })] })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/^Rank 2:/)
    expect(m.transaction).not.toHaveBeenCalled()
  })

  it('rejects an empty name and duplicates', async () => {
    expect((await call({ ranks: [belt({ name: '  ' })] })).status).toBe(400)
    expect((await call({ ranks: [belt(), belt()] })).status).toBe(400)
  })

  it('403 without gradings.manage; 404 for another school’s system', async () => {
    m.memberHasPermission.mockResolvedValueOnce(false)
    expect((await call({ ranks: [belt()] })).status).toBe(403)
    m.systemFind.mockResolvedValueOnce(null)
    expect((await call({ ranks: [belt()] })).status).toBe(404)
  })
})
