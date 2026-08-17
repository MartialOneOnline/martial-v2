/**
 * Regression tests for findMembershipStatusDrift() (lib/services/membership.ts)
 * — the monitoring query behind the "Needs attention" alerts on the school
 * dashboard and the superadmin panel. A false positive here would point
 * staff at a member who is actually fine; a false negative would hide a
 * real access bug. Both failure modes are covered below.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const schoolMemberFindMany = vi.fn()
const membershipFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { findMany: schoolMemberFindMany },
    membership: { findMany: membershipFindMany },
  },
}))

const { findMembershipStatusDrift } = await import('@/lib/services/membership')

function candidate(overrides: Partial<{ id: string; status: string; userId: string; schoolId: string }> = {}) {
  return {
    id: 'sm-1', status: 'INACTIVE', userId: 'user-1', schoolId: 'school-1',
    user: { name: 'Juanjo Rios', email: 'juanjo@example.com' },
    school: { name: 'Roger Gracie Malaga' },
    ...overrides,
  }
}

describe('findMembershipStatusDrift()', () => {
  beforeEach(() => {
    schoolMemberFindMany.mockReset()
    membershipFindMany.mockReset()
  })

  it('candidate query considers INACTIVE/PENDING/LEAD/FROZEN/ARCHIVED — never ACTIVE', async () => {
    schoolMemberFindMany.mockResolvedValue([])
    await findMembershipStatusDrift()
    const where = schoolMemberFindMany.mock.calls[0]![0].where
    expect(where.status.in).toEqual(expect.arrayContaining(['INACTIVE', 'PENDING', 'LEAD', 'FROZEN', 'ARCHIVED']))
    expect(where.status.in).not.toContain('ACTIVE')
  })

  it('no candidates: returns empty without querying memberships at all', async () => {
    schoolMemberFindMany.mockResolvedValue([])
    const result = await findMembershipStatusDrift()
    expect(result).toEqual([])
    expect(membershipFindMany).not.toHaveBeenCalled()
  })

  it('flags a candidate whose own (userId, schoolId) has an ACTIVE membership', async () => {
    schoolMemberFindMany.mockResolvedValue([candidate()])
    membershipFindMany.mockResolvedValue([{ userId: 'user-1', schoolId: 'school-1' }])
    const result = await findMembershipStatusDrift()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'sm-1', userId: 'user-1', schoolId: 'school-1', status: 'INACTIVE' })
  })

  it('exact match required: same user’s ACTIVE membership at a DIFFERENT school does not count', async () => {
    schoolMemberFindMany.mockResolvedValue([candidate({ userId: 'user-1', schoolId: 'school-1' })])
    membershipFindMany.mockResolvedValue([{ userId: 'user-1', schoolId: 'school-OTHER' }])
    const result = await findMembershipStatusDrift()
    expect(result).toEqual([])
  })

  it('exact match required: a DIFFERENT user’s ACTIVE membership at the same school does not count', async () => {
    schoolMemberFindMany.mockResolvedValue([candidate({ userId: 'user-1', schoolId: 'school-1' })])
    membershipFindMany.mockResolvedValue([{ userId: 'user-OTHER', schoolId: 'school-1' }])
    const result = await findMembershipStatusDrift()
    expect(result).toEqual([])
  })

  it('no ACTIVE membership anywhere for the candidate: not flagged (e.g. a genuinely lapsed member)', async () => {
    schoolMemberFindMany.mockResolvedValue([candidate()])
    membershipFindMany.mockResolvedValue([])
    const result = await findMembershipStatusDrift()
    expect(result).toEqual([])
  })

  it('scopes the candidate query to schoolId when provided (per-school dashboard use)', async () => {
    schoolMemberFindMany.mockResolvedValue([])
    await findMembershipStatusDrift('school-1')
    expect(schoolMemberFindMany.mock.calls[0]![0].where.schoolId).toBe('school-1')
  })

  it('omits schoolId from the where clause for a platform-wide scan (superadmin use)', async () => {
    schoolMemberFindMany.mockResolvedValue([])
    await findMembershipStatusDrift()
    expect(schoolMemberFindMany.mock.calls[0]![0].where.schoolId).toBeUndefined()
  })
})
