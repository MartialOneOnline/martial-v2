/**
 * Regression tests for the P2 found in review: UsersClient.tsx's
 * handleStatusChange() only caught thrown fetch errors, never checked
 * res.ok — so a rejected PATCH (403 racing a permission change, 500, a
 * member deleted mid-request) still counted as success. Concretely: the
 * membership-drift banner's "Reactivate" button optimistically flips a
 * member to ACTIVE, and on a failed request the banner would silently drop
 * that member from the list even though nothing was actually fixed.
 *
 * lib/memberStatus.ts extracts the pure request + state-transition pieces
 * so this can be tested without rendering UsersClient.tsx (this repo has no
 * @testing-library/react or DOM test environment — vitest.config.ts runs
 * `environment: 'node'`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitMemberStatusChange, applyOptimisticStatus, type MemberLike } from '@/lib/memberStatus'

describe('submitMemberStatusChange()', () => {
  const originalFetch = global.fetch
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { global.fetch = originalFetch })

  it('resolves true on a 2xx response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await expect(submitMemberStatusChange('sm-1', 'ACTIVE')).resolves.toBe(true)
  })

  it('resolves false on a non-2xx response (e.g. 403 or 500) — this is the bug that was fixed', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 403 }))
    await expect(submitMemberStatusChange('sm-1', 'ACTIVE')).resolves.toBe(false)
  })

  it('resolves false, never throws, when fetch itself rejects', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError('network error'))
    await expect(submitMemberStatusChange('sm-1', 'ACTIVE')).resolves.toBe(false)
  })

  it('PATCHes the member endpoint with the new status', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await submitMemberStatusChange('sm-1', 'ACTIVE')
    expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/members/sm-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACTIVE' }),
    })
  })
})

describe('applyOptimisticStatus()', () => {
  it('updates only the targeted member, leaves others untouched', () => {
    const members: MemberLike[] = [{ id: 'sm-1', status: 'INACTIVE' }, { id: 'sm-2', status: 'ACTIVE' }]
    const result = applyOptimisticStatus(members, 'sm-1', 'ACTIVE')
    expect(result).toEqual([{ id: 'sm-1', status: 'ACTIVE' }, { id: 'sm-2', status: 'ACTIVE' }])
    expect(members[0]!.status).toBe('INACTIVE') // original array untouched
  })
})

describe('drift banner survives a failed Reactivate (integration of the two pieces above)', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  // Mirrors UsersClient.handleStatusChange() exactly: optimistic apply,
  // then revert the whole list to its pre-change snapshot if the PATCH
  // did not actually succeed.
  async function handleStatusChange(students: MemberLike[], initialStudents: MemberLike[], memberId: string, newStatus: string) {
    let next = applyOptimisticStatus(students, memberId, newStatus)
    const ok = await submitMemberStatusChange(memberId, newStatus)
    if (!ok) next = initialStudents
    return next
  }

  function visibleDrift(driftedMembers: MemberLike[], students: MemberLike[]) {
    return driftedMembers.filter(d => students.find(s => s.id === d.id)?.status !== 'ACTIVE')
  }

  it('failed PATCH: member stays in the drift list (banner does not lie about being fixed)', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    const initialStudents: MemberLike[] = [{ id: 'sm-1', status: 'INACTIVE' }]
    const driftedMembers: MemberLike[] = [{ id: 'sm-1', status: 'INACTIVE' }]

    const students = await handleStatusChange(initialStudents, initialStudents, 'sm-1', 'ACTIVE')

    expect(students[0]!.status).toBe('INACTIVE') // reverted, not left at the optimistic ACTIVE
    expect(visibleDrift(driftedMembers, students)).toHaveLength(1)
  })

  it('successful PATCH: member is removed from the drift list', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    const initialStudents: MemberLike[] = [{ id: 'sm-1', status: 'INACTIVE' }]
    const driftedMembers: MemberLike[] = [{ id: 'sm-1', status: 'INACTIVE' }]

    const students = await handleStatusChange(initialStudents, initialStudents, 'sm-1', 'ACTIVE')

    expect(students[0]!.status).toBe('ACTIVE')
    expect(visibleDrift(driftedMembers, students)).toHaveLength(0)
  })
})
