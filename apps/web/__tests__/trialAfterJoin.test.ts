/**
 * Tests for POST /api/memberships/trial — P1 fix: a user who already joined
 * the school (SchoolMember status LEAD, created by
 * api/schools/[slug]/join/route.ts) must be able to activate a trial without
 * hitting the (schoolId, userId) unique constraint on SchoolMember and being
 * misreported as "trial already used". Conservative follow-up: only LEAD/
 * PENDING rows are auto-upgraded — ACTIVE is left untouched, and
 * INACTIVE/FROZEN/ARCHIVED are rejected rather than silently reactivated.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('next/headers', () => ({
  cookies: () => ({ getAll: () => [] }),
}))

const mockSchoolFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()
const mockUserCreate = vi.fn()
const mockMembershipFindFirst = vi.fn()
const mockSchoolMemberFindUnique = vi.fn()
const mockSchoolMemberCreate = vi.fn()
const mockSchoolMemberUpdate = vi.fn()
const mockMembershipCreate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    school: { findUnique: mockSchoolFindUnique },
    user: { findUnique: mockUserFindUnique, create: mockUserCreate },
    membership: { findFirst: mockMembershipFindFirst },
    $transaction: mockTransaction,
  },
}))

vi.mock('@/lib/notifications/create', () => ({
  notifyNewLead: vi.fn(),
}))

const { POST } = await import('@/app/api/memberships/trial/route')

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/memberships/trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeTx() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    membership: { findFirst: mockMembershipFindFirst, create: mockMembershipCreate },
    schoolMember: {
      findUnique: mockSchoolMemberFindUnique,
      create: mockSchoolMemberCreate,
      update: mockSchoolMemberUpdate,
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1', email: 'a@test.com' } } })
  mockSchoolFindUnique.mockResolvedValue({ id: 'school-1', hasFreeTrialCls: true, status: 'VERIFIED' })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'a@test.com', phone: null })
  mockMembershipCreate.mockResolvedValue({ id: 'membership-1' })
  mockSchoolMemberCreate.mockResolvedValue({ id: 'sm-1', status: 'ACTIVE' })
  mockSchoolMemberUpdate.mockResolvedValue({ id: 'sm-1', status: 'ACTIVE' })
})

describe('POST /api/memberships/trial', () => {
  it('creates a fresh SchoolMember when none exists yet', async () => {
    mockMembershipFindFirst.mockResolvedValue(null)
    mockSchoolMemberFindUnique.mockResolvedValue(null)
    const tx = makeTx()
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(200)
    expect(tx.schoolMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'STUDENT', status: 'ACTIVE' }) })
    )
    expect(tx.schoolMember.update).not.toHaveBeenCalled()
  })

  it('upgrades an existing LEAD SchoolMember to ACTIVE instead of creating a duplicate', async () => {
    mockMembershipFindFirst.mockResolvedValue(null)
    mockSchoolMemberFindUnique.mockResolvedValue({ id: 'sm-lead', status: 'LEAD' })
    const tx = makeTx()
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(200)
    expect(tx.schoolMember.update).toHaveBeenCalledWith({
      where: { id: 'sm-lead' },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    })
    // Must never touch role — the update payload has no role key at all.
    const updateCall = tx.schoolMember.update.mock.calls[0]?.[0] as { data: Record<string, unknown> } | undefined
    expect(updateCall?.data).not.toHaveProperty('role')
    expect(tx.schoolMember.create).not.toHaveBeenCalled()
  })

  it('upgrades an existing PENDING SchoolMember to ACTIVE', async () => {
    mockMembershipFindFirst.mockResolvedValue(null)
    mockSchoolMemberFindUnique.mockResolvedValue({ id: 'sm-pending', status: 'PENDING' })
    const tx = makeTx()
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(200)
    expect(tx.schoolMember.update).toHaveBeenCalledWith({
      where: { id: 'sm-pending' },
      data: expect.objectContaining({ status: 'ACTIVE' }),
    })
  })

  it('leaves an already-ACTIVE SchoolMember untouched and still grants the trial Membership', async () => {
    mockMembershipFindFirst.mockResolvedValue(null)
    mockSchoolMemberFindUnique.mockResolvedValue({ id: 'sm-active', status: 'ACTIVE' })
    const tx = makeTx()
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(200)
    expect(tx.schoolMember.update).not.toHaveBeenCalled()
    expect(tx.schoolMember.create).not.toHaveBeenCalled()
    expect(tx.membership.create).toHaveBeenCalled()
  })

  it.each(['INACTIVE', 'FROZEN', 'ARCHIVED'])(
    'rejects with 409 instead of reactivating a %s SchoolMember',
    async (status) => {
      mockMembershipFindFirst.mockResolvedValue(null)
      mockSchoolMemberFindUnique.mockResolvedValue({ id: 'sm-x', status })
      const tx = makeTx()
      mockTransaction.mockImplementation((fn) => fn(tx))

      const res = await POST(makeRequest({ schoolId: 'school-1' }))

      expect(res.status).toBe(409)
      expect(tx.schoolMember.update).not.toHaveBeenCalled()
      expect(tx.schoolMember.create).not.toHaveBeenCalled()
      expect(tx.membership.create).not.toHaveBeenCalled()
    }
  )

  it('still rejects when a previous Membership already exists at this school', async () => {
    mockMembershipFindFirst.mockResolvedValue({ id: 'old-membership' })

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already used a trial/i)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects a concurrent duplicate trial race caught inside the transaction', async () => {
    mockMembershipFindFirst.mockResolvedValueOnce(null) // outer pre-check passes
    const tx = makeTx()
    mockMembershipFindFirst.mockResolvedValueOnce({ id: 'raced-in-membership' }) // inner race check
    mockTransaction.mockImplementation((fn) => fn(tx))

    const res = await POST(makeRequest({ schoolId: 'school-1' }))

    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).toMatch(/already used a trial/i)
    expect(tx.schoolMember.findUnique).not.toHaveBeenCalled()
  })
})
