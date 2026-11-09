/**
 * Audit Lote 1 (2026-11-09) — financial tenant isolation.
 *  - SEC-02: POST /api/dashboard/transactions only links a movement to a
 *    member of the acting school, and never echoes another school's user.
 *  - SEC-03: the student profile page only lists this school's movements
 *    for a student who belongs to several schools.
 * (SEC-01, the Stripe webhook, lives in stripeWebhookLifecycleSync.test.ts.)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import React from 'react'

// The page is compiled with the classic JSX runtime under Vitest.
vi.stubGlobal('React', React)

const mockGetAuthUser = vi.fn()
const mockGetCurrentSchoolId = vi.fn()
const mockRequireSchoolAccess = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: mockGetCurrentSchoolId,
}))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess: mockRequireSchoolAccess }))
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND') },
}))
vi.mock('@/app/dashboard/users/[id]/StudentProfileClient', () => ({ default: () => null }))
vi.mock('@/lib/grading/readinessData', () => ({
  getReadinessForSchool: vi.fn().mockResolvedValue([]),
  ATTENDED_WHERE: {},
}))

// Two schools, one shared student.
type Tx = { id: string; schoolId: string; userId: string | null; deletedAt: Date | null; amount: number; currency: string; status: string; date: Date; paymentMethod: string | null; description: string | null; category: string; membershipId: null; periodStart: null; periodEnd: null }
const schoolMembers = [
  { id: 'sm-a', schoolId: 'school-A', userId: 'shared-user' },
  { id: 'sm-b', schoolId: 'school-B', userId: 'shared-user' },
  { id: 'sm-b-only', schoolId: 'school-B', userId: 'user-only-B' },
]
let transactions: Tx[]

function tx(id: string, schoolId: string, userId: string): Tx {
  return { id, schoolId, userId, deletedAt: null, amount: 10, currency: 'EUR', status: 'PAID', date: new Date('2026-11-01T00:00:00Z'), paymentMethod: 'CASH', description: id, category: 'MEMBERSHIP', membershipId: null, periodStart: null, periodEnd: null }
}

function matches(row: Record<string, unknown>, where: Record<string, unknown>) {
  return Object.entries(where).every(([k, v]) => row[k] === v)
}

const mockTransactionCreate = vi.fn((args: { data: Record<string, unknown> }) =>
  Promise.resolve({ id: 'tx-new', ...args.data, user: null }))

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: {
      findFirst: vi.fn((args: { where: Record<string, unknown> }) => {
        const where = args.where
        const row = schoolMembers.find(m => matches(m, where))
        if (!row) return Promise.resolve(null)
        return Promise.resolve({
          ...row, belt: null, beltRankId: null, beltDegree: 0, beltDate: null, status: 'ACTIVE', role: 'STUDENT',
          joinedAt: null, emergencyContact: null, medicalNotes: null,
          user: { id: row.userId, name: 'Shared', email: 's@example.invalid', phone: null, avatarUrl: null, dateOfBirth: null, createdAt: new Date() },
          school: { id: row.schoolId, name: row.schoolId, modules: {} },
        })
      }),
    },
    transaction: {
      create: mockTransactionCreate,
      findMany: vi.fn((args: { where: Record<string, unknown> }) =>
        Promise.resolve(transactions.filter(t => matches(t, args.where)))),
    },
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    membership: { findMany: vi.fn().mockResolvedValue([]) },
    membershipPlan: { findMany: vi.fn().mockResolvedValue([]) },
    gradingSystem: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
  },
}))

const { POST } = await import('@/app/api/dashboard/transactions/route')
const { default: StudentProfilePage } = await import('@/app/dashboard/users/[id]/page')

function actAs(schoolId: string) {
  mockGetAuthUser.mockResolvedValue({ id: 'owner-1', role: 'SCHOOL_OWNER' })
  mockGetCurrentSchoolId.mockResolvedValue(schoolId)
  mockRequireSchoolAccess.mockResolvedValue({ role: 'OWNER', status: 'ACTIVE' })
}

function post(body: Record<string, unknown>) {
  return POST(new NextRequest('http://localhost/api/dashboard/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: 1, date: '2026-11-09', type: 'INCOME', ...body }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  transactions = []
  actAs('school-A')
})

describe('SEC-02 — POST /api/dashboard/transactions', () => {
  it('rejects a userId that only belongs to another school, writes nothing and leaks no PII', async () => {
    const res = await post({ userId: 'user-only-B' })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(JSON.stringify(body)).not.toMatch(/user-only-B|example\.invalid/)
    expect(mockTransactionCreate).not.toHaveBeenCalled()
  })

  it('rejects a non-string userId', async () => {
    const res = await post({ userId: { not: null } })
    expect(res.status).toBe(400)
    expect(mockTransactionCreate).not.toHaveBeenCalled()
  })

  it('links a movement to a member of this school', async () => {
    const res = await post({ userId: 'shared-user' })
    expect(res.status).toBe(201)
    expect(mockTransactionCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ schoolId: 'school-A', userId: 'shared-user' }),
    }))
  })

  it('still allows anonymous movements (no userId, null or empty)', async () => {
    for (const userId of [undefined, null, '']) {
      mockTransactionCreate.mockClear()
      const res = await post(userId === undefined ? {} : { userId })
      expect(res.status).toBe(201)
      expect(mockTransactionCreate.mock.calls[0]![0].data.userId).toBeNull()
    }
  })
})

describe('SEC-03 — student profile page', () => {
  it('only serializes movements of the school the profile is opened from', async () => {
    transactions = [tx('tx-A', 'school-A', 'shared-user'), tx('tx-B-private', 'school-B', 'shared-user')]

    const element = await StudentProfilePage({ params: Promise.resolve({ id: 'sm-a' }) }) as { props: { profile: { transactions: { id: string }[] } } }

    expect(element.props.profile.transactions.map(t => t.id)).toEqual(['tx-A'])
  })

  it('the other school sees only its own movement for the same student', async () => {
    actAs('school-B')
    transactions = [tx('tx-A', 'school-A', 'shared-user'), tx('tx-B-private', 'school-B', 'shared-user')]

    const element = await StudentProfilePage({ params: Promise.resolve({ id: 'sm-b' }) }) as { props: { profile: { transactions: { id: string }[] } } }

    expect(element.props.profile.transactions.map(t => t.id)).toEqual(['tx-B-private'])
  })
})
