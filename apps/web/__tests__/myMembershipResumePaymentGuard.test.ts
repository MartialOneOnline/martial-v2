/**
 * PATCH /api/my/memberships/[id] — a membership frozen because Stripe could
 * not collect (paymentStatus UNPAID / still PAST_DUE) must not be
 * self-resumable: resume is a local-only status flip with no Stripe call, so
 * without this guard a student could restore their own access without paying.
 * Pause and cancel stay available regardless of payment health.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetAuthUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))

const mockMembershipFindUnique = vi.fn()
const mockMembershipUpdate = vi.fn().mockResolvedValue({})
const mockCancelMembership = vi.fn().mockResolvedValue({ status: 'CANCELLED' })
vi.mock('@/lib/db', () => ({
  prisma: {
    membership: { findUnique: mockMembershipFindUnique },
    $transaction: (fn: (tx: unknown) => unknown) => fn({ membership: { update: mockMembershipUpdate } }),
  },
}))
vi.mock('@/lib/services/membership', () => ({
  cancelMembership: mockCancelMembership,
  syncSchoolMemberStatusForMembership: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/email/sendEmails', () => ({ sendMembershipRequestEmail: vi.fn() }))
vi.mock('@/lib/notifications/create', () => ({ notifyMembershipRequest: vi.fn() }))

const { PATCH } = await import('@/app/api/my/memberships/[id]/route')

function patch(action: string) {
  return PATCH(
    new NextRequest('http://localhost/api/my/memberships/m1', { method: 'PATCH', body: JSON.stringify({ action }) }),
    { params: Promise.resolve({ id: 'm1' }) },
  )
}

function seed(status: string, paymentStatus: string) {
  mockMembershipFindUnique.mockResolvedValue({ id: 'm1', userId: 'user-1', schoolId: 'school-1', status, planId: null, paymentStatus })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAuthUser.mockResolvedValue({ id: 'user-1' })
  mockMembershipUpdate.mockResolvedValue({})
  mockCancelMembership.mockResolvedValue({ status: 'CANCELLED' })
})

describe('PATCH /api/my/memberships/[id] — payment guard on resume', () => {
  it.each(['UNPAID', 'PAST_DUE'])('blocks self-service resume when paymentStatus is %s', async (paymentStatus) => {
    seed('PAUSED', paymentStatus)

    const res = await patch('resume')

    expect(res.status).toBe(409)
    expect(mockMembershipUpdate).not.toHaveBeenCalled()
  })

  it('still allows resume when payment is healthy (a plain voluntary pause)', async () => {
    seed('PAUSED', 'ACTIVE')

    const res = await patch('resume')

    expect(res.status).toBe(200)
    expect(mockMembershipUpdate).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { status: 'ACTIVE' } })
  })

  it('still allows cancel when payment is failing — the student can always leave', async () => {
    seed('PAUSED', 'UNPAID')

    const res = await patch('cancel')

    expect(res.status).toBe(200)
    expect(mockCancelMembership).toHaveBeenCalled()
  })

  it('still allows pause when payment is past due', async () => {
    seed('ACTIVE', 'PAST_DUE')

    const res = await patch('pause')

    expect(res.status).toBe(200)
    expect(mockMembershipUpdate).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { status: 'PAUSED' } })
  })
})
