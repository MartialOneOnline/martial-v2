/**
 * The "who's coming" list in /my shows belts only when the school uses the
 * belts & gradings module (2026-11-01).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { prismaMock, getAuthUser } = vi.hoisted(() => ({
  prismaMock: {
    class: { findUnique: vi.fn() },
    schoolMember: { findFirst: vi.fn() },
    booking: { findMany: vi.fn() },
  },
  getAuthUser: vi.fn(),
}))
vi.mock('@/lib/db', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth/server', () => ({ getAuthUser }))

import { GET } from '../app/api/my/school-classes/[classId]/attendees/route'

const call = () => GET(
  new NextRequest('http://x/api/my/school-classes/c1/attendees?scheduledAt=2026-11-02T18:00:00Z'),
  { params: Promise.resolve({ classId: 'c1' }) },
)
const school = (modules: unknown, systems: number) => ({ modules, _count: { gradingSystems: systems } })

beforeEach(() => {
  vi.clearAllMocks()
  getAuthUser.mockResolvedValue({ id: 'u1' })
  prismaMock.schoolMember.findFirst.mockResolvedValue({ id: 'm1' })
  prismaMock.booking.findMany.mockResolvedValue([
    { id: 'b1', user: { name: 'Ana', avatarUrl: null, schoolMembers: [{ belt: 'Azul', beltDegree: 2 }] } },
  ])
})

describe('GET /api/my/school-classes/[classId]/attendees — belts module', () => {
  it('shows belts for a school with belts', async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: 'c1', schoolId: 's1', school: school(null, 1) })
    const json = await (await call()).json()
    expect(json.attendees[0]).toMatchObject({ name: 'Ana', belt: 'Azul', beltDegree: 2 })
  })

  it('hides belts when the school turned the module off', async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: 'c1', schoolId: 's1', school: school({ grading: false }, 1) })
    const json = await (await call()).json()
    expect(json.attendees[0]).toMatchObject({ name: 'Ana', belt: null, beltDegree: 0 })
  })

  it('hides belts for a school that never had a belt system (e.g. boxing)', async () => {
    prismaMock.class.findUnique.mockResolvedValue({ id: 'c1', schoolId: 's1', school: school(null, 0) })
    const json = await (await call()).json()
    expect(json.attendees[0].belt).toBeNull()
  })
})
