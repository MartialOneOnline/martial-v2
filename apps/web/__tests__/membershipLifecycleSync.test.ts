/**
 * Unit tests for the small, composable lifecycle-sync helpers in
 * lib/services/membership.ts — the building blocks used by the Stripe
 * webhook's subscription lifecycle handlers and by the admin/self-service
 * pause/resume/cancel routes to keep SchoolMember.status projecting the
 * right thing from Membership.status.
 */
import { describe, it, expect, vi } from 'vitest'
import { hasOtherActiveMembership, isSchoolMemberArchived, syncSchoolMemberStatusForMembership } from '@/lib/services/membership'
import { MembershipStatus } from '@/lib/prisma-client/enums'
import type { Prisma } from '@/lib/prisma-client/client'

function fakeTx(overrides: {
  membershipFindFirst?: ReturnType<typeof vi.fn>
  schoolMemberFindUnique?: ReturnType<typeof vi.fn>
  schoolMemberUpdateMany?: ReturnType<typeof vi.fn>
} = {}) {
  return {
    membership: { findFirst: overrides.membershipFindFirst ?? vi.fn().mockResolvedValue(null) },
    schoolMember: {
      findUnique: overrides.schoolMemberFindUnique ?? vi.fn().mockResolvedValue(null),
      updateMany: overrides.schoolMemberUpdateMany ?? vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as Prisma.TransactionClient
}

describe('hasOtherActiveMembership', () => {
  it('returns true when another ACTIVE membership exists, excluding the given id', async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: 'm-2' })
    const tx = fakeTx({ membershipFindFirst: findFirst })

    const result = await hasOtherActiveMembership(tx, { userId: 'u1', schoolId: 's1', excludeMembershipId: 'm-1' })

    expect(result).toBe(true)
    expect(findFirst).toHaveBeenCalledWith({
      where: { userId: 'u1', schoolId: 's1', status: MembershipStatus.ACTIVE, id: { not: 'm-1' } },
      select: { id: true },
    })
  })

  it('returns false when no other ACTIVE membership exists', async () => {
    const tx = fakeTx({ membershipFindFirst: vi.fn().mockResolvedValue(null) })
    expect(await hasOtherActiveMembership(tx, { userId: 'u1', schoolId: 's1' })).toBe(false)
  })
})

describe('isSchoolMemberArchived', () => {
  it('returns true for an ARCHIVED SchoolMember row', async () => {
    const tx = fakeTx({ schoolMemberFindUnique: vi.fn().mockResolvedValue({ status: 'ARCHIVED' }) })
    expect(await isSchoolMemberArchived(tx, { userId: 'u1', schoolId: 's1' })).toBe(true)
  })

  it('returns false when no SchoolMember row exists yet', async () => {
    const tx = fakeTx({ schoolMemberFindUnique: vi.fn().mockResolvedValue(null) })
    expect(await isSchoolMemberArchived(tx, { userId: 'u1', schoolId: 's1' })).toBe(false)
  })

  it('returns false for a non-archived status', async () => {
    const tx = fakeTx({ schoolMemberFindUnique: vi.fn().mockResolvedValue({ status: 'ACTIVE' }) })
    expect(await isSchoolMemberArchived(tx, { userId: 'u1', schoolId: 's1' })).toBe(false)
  })
})

describe('syncSchoolMemberStatusForMembership', () => {
  it('ACTIVE -> SchoolMember ACTIVE, filtered to exclude ARCHIVED', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const tx = fakeTx({ schoolMemberUpdateMany: updateMany })

    await syncSchoolMemberStatusForMembership(tx, { userId: 'u1', schoolId: 's1', membershipStatus: MembershipStatus.ACTIVE })

    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', schoolId: 's1', status: { not: 'ARCHIVED' } },
      data: { status: 'ACTIVE' },
    })
  })

  it('PAUSED -> SchoolMember FROZEN', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const tx = fakeTx({ schoolMemberUpdateMany: updateMany })

    await syncSchoolMemberStatusForMembership(tx, { userId: 'u1', schoolId: 's1', membershipStatus: MembershipStatus.PAUSED })

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'FROZEN' } }))
  })

  it('CANCELLED -> SchoolMember INACTIVE when no other ACTIVE membership exists', async () => {
    const membershipFindFirst = vi.fn().mockResolvedValue(null)
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const tx = fakeTx({ membershipFindFirst, schoolMemberUpdateMany: updateMany })

    await syncSchoolMemberStatusForMembership(tx, {
      userId: 'u1', schoolId: 's1', membershipStatus: MembershipStatus.CANCELLED, excludeMembershipId: 'm-1',
    })

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'INACTIVE' } }))
  })

  it('CANCELLED does NOT set INACTIVE when another ACTIVE membership covers the same user+school', async () => {
    const membershipFindFirst = vi.fn().mockResolvedValue({ id: 'm-2' })
    const updateMany = vi.fn()
    const tx = fakeTx({ membershipFindFirst, schoolMemberUpdateMany: updateMany })

    await syncSchoolMemberStatusForMembership(tx, {
      userId: 'u1', schoolId: 's1', membershipStatus: MembershipStatus.CANCELLED, excludeMembershipId: 'm-1',
    })

    expect(updateMany).not.toHaveBeenCalled()
  })

  it('no-ops for statuses with no defined SchoolMember projection (e.g. PENDING)', async () => {
    const updateMany = vi.fn()
    const tx = fakeTx({ schoolMemberUpdateMany: updateMany })

    await syncSchoolMemberStatusForMembership(tx, { userId: 'u1', schoolId: 's1', membershipStatus: MembershipStatus.PENDING })

    expect(updateMany).not.toHaveBeenCalled()
  })
})
