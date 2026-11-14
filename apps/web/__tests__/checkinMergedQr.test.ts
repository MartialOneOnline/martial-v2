/**
 * A check-in QR saved before an account merge carries the retired user id
 * (martial:checkin:<old id>). POST /api/dashboard/checkin follows it to the
 * surviving account; the school-membership check still applies to that
 * account, so it can't reach a student of another school.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: async () => ({ id: 'staff', role: 'SUPERADMIN' }),
  getCurrentSchoolId: async () => 'school-1',
}))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: vi.fn() }))
vi.mock('@/lib/services/trial', () => ({ syncTrials: vi.fn(async () => {}), trialExpiredFor: vi.fn(async () => false) }))

// Who belongs to which school, and AccountMerge rows (merged → kept)
let members: Record<string, string>
let merges: Record<string, string>
const bookingCreate = vi.fn(async (args: unknown) => args && ({}))
const userFindFirst = vi.fn(async ({ where }: { where: { id: string; schoolMembers: { some: { schoolId: string } } } }) =>
  members[where.id] === where.schoolMembers.some.schoolId ? { id: where.id, name: 'Student', email: 's@x.com' } : null)

vi.mock('@/lib/db', () => ({
  prisma: {
    class: { findFirst: async () => ({ id: 'class-1', name: 'BJJ', capacity: null }) },
    user: { findFirst: userFindFirst },
    accountMerge: { findFirst: async ({ where }: { where: { mergedUserId: string } }) => (merges[where.mergedUserId] ? { keptUserId: merges[where.mergedUserId] } : null) },
    $transaction: (fn: (tx: unknown) => unknown) => fn({
      $executeRaw: async () => 1,
      booking: { findFirst: async () => null, create: bookingCreate, update: vi.fn(), count: async () => 0 },
    }),
  },
}))

const { POST } = await import('@/app/api/dashboard/checkin/route')
const scan = (userId: string) => POST(new NextRequest('http://localhost/api/dashboard/checkin', {
  method: 'POST', body: JSON.stringify({ classId: 'class-1', userId, date: '2026-11-10' }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  members = { K: 'school-1', OTHER: 'school-2' }
  merges = {}
})

describe('POST /api/dashboard/checkin — QR of a merged account', () => {
  it('checks in the surviving account when the QR carries the retired id', async () => {
    merges = { S: 'K' }
    const res = await scan('S')
    expect(res.status).toBe(200)
    expect(bookingCreate.mock.calls[0]![0]).toMatchObject({ data: { userId: 'K', status: 'COMPLETED' } })
  })

  it('follows a chain of merges', async () => {
    merges = { A: 'S', S: 'K' }
    expect((await scan('A')).status).toBe(200)
    expect(bookingCreate.mock.calls[0]![0]).toMatchObject({ data: { userId: 'K' } })
  })

  it('still refuses when the surviving account belongs to another school', async () => {
    merges = { S: 'OTHER' }
    const res = await scan('S')
    expect(res.status).toBe(404)
    expect(bookingCreate).not.toHaveBeenCalled()
  })

  it('a normal QR is unchanged', async () => {
    expect((await scan('K')).status).toBe(200)
    expect(bookingCreate.mock.calls[0]![0]).toMatchObject({ data: { userId: 'K' } })
  })
})
