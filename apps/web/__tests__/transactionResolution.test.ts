/**
 * Manual-review resolution for Transaction.FLAGGED — admins can mark a
 * flagged transaction "resolved" (audited who/when/why) without deleting it
 * or changing its status. See PATCH /api/dashboard/transactions/[id]
 * (action: "resolve"), the GET list route's `resolved` param, and the
 * DELETE guard, which stays unconditional for FLAGGED regardless of
 * resolution state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))

vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
}))

const mockFindFirst = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockGroupBy = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    transaction: {
      findFirst: mockFindFirst,
      update: mockUpdate,
      delete: mockDelete,
      findMany: mockFindMany,
      count: mockCount,
      groupBy: mockGroupBy,
    },
  },
}))

const byIdRoute = await import('@/app/api/dashboard/transactions/[id]/route')
const listRoute = await import('@/app/api/dashboard/transactions/route')

function setActingRole(role: SchoolMemberRole) {
  mockGetAuthUser.mockResolvedValue({ id: 'admin-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue('school-1')
  mockRequireSchoolAccess.mockResolvedValue({ role, status: 'ACTIVE' })
}

function patchRequest(body: unknown) {
  return new NextRequest('http://localhost/api/dashboard/transactions/tx-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest() {
  return new NextRequest('http://localhost/api/dashboard/transactions/tx-1', { method: 'DELETE' })
}

function getRequest(qs = '') {
  return new NextRequest(`http://localhost/api/dashboard/transactions${qs}`)
}

function idParams(id = 'tx-1') {
  return { params: Promise.resolve({ id }) }
}

const flaggedTx = {
  id: 'tx-1', schoolId: 'school-1', status: 'FLAGGED', resolvedAt: null,
  resolvedBy: null, resolutionNote: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  setActingRole('OWNER')
  mockGroupBy.mockResolvedValue([])
  mockCount.mockResolvedValue(0)
  mockFindMany.mockResolvedValue([])
})

describe('PATCH .../transactions/[id] — resolve action', () => {
  it('an admin (OWNER) can resolve a FLAGGED transaction', async () => {
    mockFindFirst.mockResolvedValue({ ...flaggedTx })
    mockUpdate.mockResolvedValue({
      id: 'tx-1', status: 'FLAGGED', resolvedAt: new Date('2026-07-10T12:00:00Z'),
      resolvedBy: 'admin-1', resolutionNote: 'Refunded manually', resolvedByUser: { name: 'Admin One', email: 'admin@x.com' },
    })

    const res = await byIdRoute.PATCH(patchRequest({ action: 'resolve', note: 'Refunded manually' }), idParams())

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('FLAGGED')
    expect(data.resolvedBy).toBe('admin-1')
    expect(data.resolvedByName).toBe('Admin One')
    expect(data.resolutionNote).toBe('Refunded manually')
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tx-1' },
      data: expect.objectContaining({ resolvedBy: 'admin-1', resolutionNote: 'Refunded manually' }),
    }))
  })

  it('a non-admin (STUDENT) cannot resolve a FLAGGED transaction', async () => {
    setActingRole('STUDENT')
    mockFindFirst.mockResolvedValue({ ...flaggedTx })

    const res = await byIdRoute.PATCH(patchRequest({ action: 'resolve' }), idParams())

    expect(res.status).toBe(403)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects resolving a transaction that is not FLAGGED', async () => {
    mockFindFirst.mockResolvedValue({ ...flaggedTx, status: 'PAID' })

    const res = await byIdRoute.PATCH(patchRequest({ action: 'resolve' }), idParams())

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/flagged/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects resolving a transaction that is already resolved', async () => {
    mockFindFirst.mockResolvedValue({ ...flaggedTx, resolvedAt: new Date('2026-07-01T00:00:00Z') })

    const res = await byIdRoute.PATCH(patchRequest({ action: 'resolve' }), idParams())

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/already resolved/i)
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('404s when the transaction does not exist (or belongs to another school)', async () => {
    mockFindFirst.mockResolvedValue(null)

    const res = await byIdRoute.PATCH(patchRequest({ action: 'resolve' }), idParams())

    expect(res.status).toBe(404)
  })
})

describe('DELETE .../transactions/[id] — FLAGGED guard', () => {
  it('blocks deleting an unresolved FLAGGED transaction', async () => {
    mockFindFirst.mockResolvedValue({ ...flaggedTx })

    const res = await byIdRoute.DELETE(deleteRequest(), idParams())

    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('still blocks deleting a FLAGGED transaction once resolved — resolving never changes status', async () => {
    mockFindFirst.mockResolvedValue({ ...flaggedTx, resolvedAt: new Date('2026-07-01T00:00:00Z'), resolvedBy: 'admin-1' })

    const res = await byIdRoute.DELETE(deleteRequest(), idParams())

    expect(res.status).toBe(403)
    expect(mockDelete).not.toHaveBeenCalled()
  })
})

describe('GET .../transactions — resolved vs pending split', () => {
  it('defaults status=FLAGGED to unresolved-only (resolvedAt: null) in the where clause', async () => {
    await listRoute.GET(getRequest('?status=FLAGGED'))

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'FLAGGED', resolvedAt: null }),
    }))
  })

  it('resolved=all returns both resolved and unresolved FLAGGED rows (no resolvedAt filter)', async () => {
    await listRoute.GET(getRequest('?status=FLAGGED&resolved=all'))

    const where = mockFindMany.mock.calls[0]![0].where
    expect(where.status).toBe('FLAGGED')
    expect(where).not.toHaveProperty('resolvedAt')
  })

  it('the FLAGGED tab count (countByStatus.FLAGGED) reflects only unresolved rows, not the raw status count', async () => {
    // groupBy would report 5 FLAGGED total, but 2 have already been resolved
    mockGroupBy.mockResolvedValue([{ status: 'FLAGGED', _count: { id: 5 }, _sum: { amount: 500 } }])
    mockCount.mockResolvedValue(3) // dedicated unresolvedFlaggedCount query

    const res = await listRoute.GET(getRequest('?status=ALL'))
    const data = await res.json()

    expect(data.countByStatus.FLAGGED).toBe(3)
  })
})
