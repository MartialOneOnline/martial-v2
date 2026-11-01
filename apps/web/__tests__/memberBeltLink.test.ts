/**
 * PATCH /api/dashboard/members/[id] keeps beltRankId in line with the belt
 * text (PR #41 audit): clearing the belt clears the link, and a link that
 * names another belt can't be stored next to the text.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const memberFindFirst = vi.fn()
const memberUpdate = vi.fn()
const rankFindFirst = vi.fn()
const systemFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { findFirst: (...a: unknown[]) => memberFindFirst(...a), update: (...a: unknown[]) => memberUpdate(...a) },
    beltRank: { findFirst: (...a: unknown[]) => rankFindFirst(...a) },
    gradingSystem: { findMany: (...a: unknown[]) => systemFindMany(...a) },
  },
}))
vi.mock('@/lib/auth/server', () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: 'admin', role: 'SUPERADMIN' }),
  getCurrentSchoolId: vi.fn().mockResolvedValue('school-1'),
}))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: vi.fn() }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

import { PATCH } from '../app/api/dashboard/members/[id]/route'

const rank = (id: string, name: string, order: number) => ({ id, name, color: '#000', order, maxDegrees: 4 })
const SYSTEMS = [{ id: 'sys', name: 'BJJ', isDefault: true, ranks: [rank('white', 'Blanco', 0), rank('blue', 'Azul', 1), rank('purple', 'Morado', 2)] }]

async function patch(body: Record<string, unknown>) {
  const req = new NextRequest('http://localhost/api/dashboard/members/m1', { method: 'PATCH', body: JSON.stringify(body) })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'm1' }) })
  return { res, data: memberUpdate.mock.calls.at(-1)?.[0]?.data }
}

beforeEach(() => {
  vi.clearAllMocks()
  memberFindFirst.mockResolvedValue({ id: 'm1', schoolId: 'school-1', belt: 'Azul', beltRankId: 'blue' })
  memberUpdate.mockResolvedValue({ id: 'm1' })
  systemFindMany.mockResolvedValue(SYSTEMS)
  rankFindFirst.mockImplementation(({ where }: { where: { id: string } }) =>
    Promise.resolve(SYSTEMS[0]!.ranks.find(r => r.id === where.id) ?? null))
})

describe('PATCH member belt → beltRankId', () => {
  it.each([[null], ['']])('clearing the belt (%j) without a link unlinks the rank', async belt => {
    const { res, data } = await patch({ belt })
    expect(res.status).toBe(200)
    expect(data).toMatchObject({ belt, beltRankId: null })
  })

  it('a text-only belt change re-links by name ("Marrón"-style variants included)', async () => {
    const { data } = await patch({ belt: 'morado' })
    expect(data).toMatchObject({ beltRankId: 'purple' })
  })

  it('a belt outside the catalog unlinks the rank', async () => {
    const { data } = await patch({ belt: 'Coral' })
    expect(data).toMatchObject({ beltRankId: null })
  })

  it('a link naming another belt is replaced by the rank the text names', async () => {
    const { res, data } = await patch({ belt: 'Morado', beltRankId: 'blue' })
    expect(res.status).toBe(200)
    expect(data).toMatchObject({ belt: 'Morado', beltRankId: 'purple' })
  })

  it('a matching explicit link is kept, and a foreign one is still rejected', async () => {
    expect((await patch({ belt: 'Azul', beltRankId: 'blue' })).data).toMatchObject({ beltRankId: 'blue' })
    const { res } = await patch({ belt: 'Azul', beltRankId: 'other-school-rank' })
    expect(res.status).toBe(400)
  })

  it('leaves the link alone when the belt is not part of the update', async () => {
    const { data } = await patch({ status: 'ACTIVE' })
    expect(data).not.toHaveProperty('beltRankId')
  })
})
