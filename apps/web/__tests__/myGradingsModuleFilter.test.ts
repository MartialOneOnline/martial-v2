/**
 * GET /api/my — the student's grading history must not include gradings from
 * a school that turned the Belts & gradings module off (or has no active
 * grading system), while gradings from schools that use it stay.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockUserFindUnique } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUserFindUnique: vi.fn(),
}))
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mockUserFindUnique } } }))
vi.mock('@/lib/auth/contexts', () => ({ hasDashboardAccess: vi.fn(), hasStudentAccess: vi.fn() }))
vi.mock('@/lib/auth/activeContextCookie', () => ({ getActiveStudentContext: vi.fn().mockResolvedValue({ kind: 'none' }) }))

const { GET } = await import('@/app/api/my/route')

const school = (name: string, modules: unknown, systems: number) => ({ name, modules, _count: { gradingSystems: systems } })
const grading = (id: string, s: ReturnType<typeof school>, gradedAt: string) => ({
  id, fromBelt: null, toBelt: 'Azul', toDegree: 0, gradedAt, notes: null, school: s, promotedBy: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
})

describe('GET /api/my gradings', () => {
  it('drops gradings from schools with the module off or no grading system', async () => {
    const on = school('BJJ On', null, 1)
    const off = school('BJJ Off', { grading: false }, 1)
    const none = school('Boxing', null, 0)
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', deletedAt: null, memberships: [], bookings: [],
      schoolMembers: [{ id: 'm1', belt: 'Azul', school: { id: 's1', name: 'BJJ On', modules: null, _count: { gradingSystems: 1 } } }],
      gradings: [grading('g1', on, '2026-10-01'), grading('g2', off, '2026-09-01'), grading('g3', none, '2026-08-01')],
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user.gradings.map((g: { id: string }) => g.id)).toEqual(['g1'])
    // Internal fields used for the decision aren't sent to the browser
    expect(body.user.gradings[0].school).toEqual({ name: 'BJJ On' })
  })

  it('keeps at most 10 after filtering', async () => {
    const on = school('BJJ On', null, 1)
    const off = school('BJJ Off', { grading: false }, 1)
    const list = [
      ...Array.from({ length: 5 }, (_, i) => grading(`off${i}`, off, `2026-10-0${i + 1}`)),
      ...Array.from({ length: 12 }, (_, i) => grading(`on${i}`, on, `2026-09-${String(i + 1).padStart(2, '0')}`)),
    ]
    mockUserFindUnique.mockResolvedValue({
      id: 'u1', deletedAt: null, memberships: [], bookings: [],
      schoolMembers: [{ id: 'm1', belt: 'Azul', school: { id: 's1', name: 'BJJ On', modules: null, _count: { gradingSystems: 1 } } }],
      gradings: list,
    })

    const body = await (await GET()).json()

    expect(body.user.gradings).toHaveLength(10)
    expect(body.user.gradings.every((g: { id: string }) => g.id.startsWith('on'))).toBe(true)
  })
})
