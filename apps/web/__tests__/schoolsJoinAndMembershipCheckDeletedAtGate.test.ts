/**
 * Regression coverage for the deletedAt gate added to POST
 * /api/schools/[slug]/join and GET /api/schools/[slug]/membership-check —
 * both do their own get-or-create / optional-auth lookup instead of using
 * getAuthUser(), so each needed its own inline check.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))

const mockSchoolFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockSchoolMemberFindFirst = vi.fn()
const mockSchoolMemberCreate = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: {
  school: { findUnique: mockSchoolFindUnique },
  user: { findUnique: mockUserFindUnique, create: mockUserCreate },
  schoolMember: { findFirst: mockSchoolMemberFindFirst, create: mockSchoolMemberCreate },
} }))

const mockNotifySelfJoinRequest = vi.fn()
vi.mock('@/lib/notifications/create', () => ({ notifySelfJoinRequest: mockNotifySelfJoinRequest }))

const { POST: joinPOST } = await import('@/app/api/schools/[slug]/join/route')
const { GET: membershipCheckGET } = await import('@/app/api/schools/[slug]/membership-check/route')

function ctx(slug = 'roger-gracie') {
  return { params: Promise.resolve({ slug }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'alice@example.com' } } })
  mockSchoolFindUnique.mockResolvedValue({ id: 'school-1', status: 'VERIFIED', hasFreeTrialCls: true })
  mockSchoolMemberFindFirst.mockResolvedValue(null)
})

describe('POST /api/schools/[slug]/join', () => {
  it('401s a self-deleted (anonymized) account even with a live Supabase session, before it can create a SchoolMember', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() })
    const res = await joinPOST(new NextRequest('http://localhost/api/schools/roger-gracie/join', { method: 'POST' }), ctx())
    expect(res.status).toBe(401)
    expect(mockSchoolMemberCreate).not.toHaveBeenCalled()
    expect(mockUserCreate).not.toHaveBeenCalled()
  })

  it('proceeds normally (get-or-create) for a non-deleted account', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: null, name: 'Alice', email: 'alice@example.com' })
    const res = await joinPOST(new NextRequest('http://localhost/api/schools/roger-gracie/join', { method: 'POST' }), ctx())
    expect(res.status).toBe(200)
    expect(mockSchoolMemberCreate).toHaveBeenCalled()
  })
})

describe('GET /api/schools/[slug]/membership-check', () => {
  it('treats a self-deleted (anonymized) account as if it had no V2 account, without reading its SchoolMember rows', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: new Date() })
    const res = await membershipCheckGET(new NextRequest('http://localhost/api/schools/roger-gracie/membership-check'), ctx())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.hasMembership).toBe(false)
    expect(json.memberStatus).toBeNull()
    expect(mockSchoolMemberFindFirst).not.toHaveBeenCalled()
  })

  it('returns the real membership status for a non-deleted account', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', deletedAt: null })
    mockSchoolMemberFindFirst.mockResolvedValue({ status: 'ACTIVE', role: 'STUDENT' })
    const res = await membershipCheckGET(new NextRequest('http://localhost/api/schools/roger-gracie/membership-check'), ctx())
    const json = await res.json()
    expect(json.hasMembership).toBe(true)
  })
})
