/**
 * Tests for POST /api/auth/activate-member.
 *
 * Audit finding (2026-07-06): the route had no way to know *which* school's
 * invite was being accepted, so it bulk-flipped every PENDING SchoolMember
 * row for the user and picked the redirect target by oldest membership.
 *
 * Fix: the caller can pass { schoolId }, threaded end-to-end from
 * members/invite -> accept-invite -> set-password. It's never trusted
 * blindly — it must correspond to a real membership of the authenticated
 * user (any status) or the request is rejected (404), full stop. No
 * fallback to a permissive "activate everything" behavior in any case.
 *
 * schoolId provided:
 *   - PENDING -> activate it, redirect from it.
 *   - already LEAD/ACTIVE/etc (idempotent repeat-visit) -> no mutation, 200,
 *     redirect from it.
 *   - no membership at all for that school -> 404, nothing touched.
 *
 * Legacy callers (no schoolId) are disambiguated from the user's own
 * memberships instead:
 *   - exactly 1 PENDING -> activate it, unambiguous.
 *   - 2+ PENDING -> ambiguous, refuse to guess: 409, activates nothing.
 *   - 0 PENDING, 0 memberships at all -> genuinely broken state, 404.
 *   - 0 PENDING, exactly 1 other membership -> not ambiguous (only
 *     candidate) -> redirect from it, no mutation.
 *   - 0 PENDING, 2+ other memberships -> does NOT silently pick one; flat,
 *     documented, tested default redirect ('/my'), no mutation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ getAll: () => [] }),
}))

type FakeMember = {
  id: string
  userId: string
  schoolId: string
  role: string
  status: string
  createdAt: Date
  school: { name: string; city: string; language: string }
}
let members: FakeMember[] = []

function matchesWhere(m: FakeMember, where: any) {
  if (where.userId && m.userId !== where.userId) return false
  if ('schoolId' in where && m.schoolId !== where.schoolId) return false
  if ('status' in where && m.status !== where.status) return false
  return true
}

const mockUserUpdate = vi.fn(async (_args: any) => ({}))
// Serves both callers that now go through prisma.user.findUnique: getAuthUser()
// (queries by supabaseAuthId, needs id/role/email/name/deletedAt) and the
// route's own welcome-email lookup (queries by id, needs name/email only).
const mockUserFindUnique = vi.fn(async ({ where }: any) => {
  if (where.supabaseAuthId === 'auth-1') {
    return { id: 'user-1', role: 'STUDENT', email: 'alice@example.com', name: 'Alice', deletedAt: null as Date | null }
  }
  if (where.id === 'user-1') return { name: 'Alice', email: 'alice@example.com' }
  return null
})
const mockSendWelcome = vi.fn(async (_args: any) => ({}))

vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: mockUserUpdate,
      findUnique: mockUserFindUnique,
    },
    schoolMember: {
      updateMany: vi.fn(async ({ where, data }: any) => {
        let count = 0
        members = members.map(m => {
          const matches = matchesWhere(m, where)
          if (matches) count++
          return matches ? { ...m, ...data } : m
        })
        return { count }
      }),
      findFirst: vi.fn(async ({ where, orderBy }: any) => {
        let candidates = members.filter(m => matchesWhere(m, where))
        if (orderBy?.createdAt === 'asc') {
          candidates = [...candidates].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        }
        return candidates[0] ?? null
      }),
      findMany: vi.fn(async ({ where }: any) => members.filter(m => matchesWhere(m, where))),
    },
  },
}))

vi.mock('@/lib/email/sendEmails', () => ({
  sendWelcomeStudentEmail: mockSendWelcome,
}))

const { POST } = await import('@/app/api/auth/activate-member/route')

function makeReq(body: Record<string, unknown> | null) {
  return {
    json: async () => {
      if (body === null) throw new Error('no body')
      return body
    },
  } as any
}

function seedTwoSchools() {
  members = [
    {
      id: 'm-b', userId: 'user-1', schoolId: 'school-b', role: 'STUDENT', status: 'PENDING',
      createdAt: new Date('2026-01-01'), school: { name: 'School B', city: 'Lisboa', language: 'pt' },
    },
    {
      id: 'm-a', userId: 'user-1', schoolId: 'school-a', role: 'OWNER', status: 'PENDING',
      createdAt: new Date('2026-06-01'), school: { name: 'School A', city: 'Malaga', language: 'es' },
    },
  ]
}

describe('POST /api/auth/activate-member', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserUpdate.mockResolvedValue({})
    mockSendWelcome.mockResolvedValue({})
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'alice@example.com' } } })
  })

  it('401s a self-deleted (anonymized) account even with a live Supabase session', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: 'user-1', role: 'STUDENT', email: 'alice@example.com', name: 'Alice', deletedAt: new Date() })
    seedTwoSchools()
    const res = await POST(makeReq({ schoolId: 'school-a' }))
    expect(res.status).toBe(401)
    expect(members.find(m => m.schoolId === 'school-a')!.status).toBe('PENDING')
  })

  describe('schoolId provided', () => {
    beforeEach(seedTwoSchools)

    it('valid + PENDING: activates only that school, redirect reflects it', async () => {
      const res = await POST(makeReq({ schoolId: 'school-a' }))
      const json = await res.json()
      expect(members.find(m => m.schoolId === 'school-a')!.status).toBe('LEAD')
      expect(members.find(m => m.schoolId === 'school-b')!.status).toBe('PENDING')
      expect(json.redirect).toBe('/dashboard')
    })

    it('idempotent: membership already LEAD/ACTIVE (link reopened) — no mutation, 200, redirect still correct', async () => {
      members = [{
        id: 'm-a', userId: 'user-1', schoolId: 'school-a', role: 'OWNER', status: 'ACTIVE',
        createdAt: new Date('2026-06-01'), school: { name: 'School A', city: 'Malaga', language: 'es' },
      }]
      const res = await POST(makeReq({ schoolId: 'school-a' }))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.ok).toBe(true)
      expect(json.redirect).toBe('/dashboard')
      expect(members[0]!.status).toBe('ACTIVE') // untouched — no accidental downgrade/mutation
    })

    it('manipulated: no SchoolMember at all for (user, schoolId) — rejected outright, nothing activated, no legacy fallback', async () => {
      const res = await POST(makeReq({ schoolId: 'school-c-user-has-no-membership-in' }))
      const json = await res.json()
      expect(res.status).toBe(404)
      expect(json.code).toBe('INVITATION_NOT_FOUND')
      // Neither of the user's real memberships was touched — confirms this
      // never silently falls back to activating everything.
      expect(members.find(m => m.schoolId === 'school-a')!.status).toBe('PENDING')
      expect(members.find(m => m.schoolId === 'school-b')!.status).toBe('PENDING')
    })
  })

  describe('legacy caller (no schoolId)', () => {
    it('exactly one PENDING membership: activates it unambiguously', async () => {
      members = [{
        id: 'm-a', userId: 'user-1', schoolId: 'school-a', role: 'STUDENT', status: 'PENDING',
        createdAt: new Date('2026-06-01'), school: { name: 'School A', city: 'Malaga', language: 'es' },
      }]
      const res = await POST(makeReq(null))
      const json = await res.json()
      expect(members[0]!.status).toBe('LEAD')
      expect(json.redirect).toBe('/my')
    })

    it('two or more PENDING: 409 ambiguous_invitation, activates nothing', async () => {
      seedTwoSchools()
      const res = await POST(makeReq(null))
      const json = await res.json()
      expect(res.status).toBe(409)
      expect(json.code).toBe('AMBIGUOUS_INVITATION')
      expect(members.find(m => m.schoolId === 'school-a')!.status).toBe('PENDING')
      expect(members.find(m => m.schoolId === 'school-b')!.status).toBe('PENDING')
    })

    it('zero PENDING, exactly one existing membership: not ambiguous (only one candidate) — resolves redirect, activates nothing', async () => {
      members = [{
        id: 'm-a', userId: 'user-1', schoolId: 'school-a', role: 'OWNER', status: 'ACTIVE',
        createdAt: new Date('2026-06-01'), school: { name: 'School A', city: 'Malaga', language: 'es' },
      }]
      const res = await POST(makeReq(null))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.redirect).toBe('/dashboard')
      expect(members[0]!.status).toBe('ACTIVE') // untouched
    })

    it('zero PENDING, two or more existing memberships: does not silently pick one — flat documented default (/my), activates nothing', async () => {
      members = [
        {
          id: 'm-a', userId: 'user-1', schoolId: 'school-a', role: 'OWNER', status: 'ACTIVE',
          createdAt: new Date('2026-01-01'), school: { name: 'School A', city: 'Malaga', language: 'es' },
        },
        {
          id: 'm-b', userId: 'user-1', schoolId: 'school-b', role: 'STUDENT', status: 'ACTIVE',
          createdAt: new Date('2026-06-01'), school: { name: 'School B', city: 'Lisboa', language: 'pt' },
        },
      ]
      const res = await POST(makeReq(null))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.redirect).toBe('/my')
      expect(members.find(m => m.schoolId === 'school-a')!.status).toBe('ACTIVE') // untouched
      expect(members.find(m => m.schoolId === 'school-b')!.status).toBe('ACTIVE') // untouched
    })

    it('zero memberships at all: genuinely broken state, 404', async () => {
      members = []
      const res = await POST(makeReq(null))
      const json = await res.json()
      expect(res.status).toBe(404)
      expect(json.code).toBe('NO_MEMBERSHIP')
    })
  })
})
