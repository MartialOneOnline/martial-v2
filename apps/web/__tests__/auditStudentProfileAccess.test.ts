/**
 * Audit Lote 2 (2026-11-09) — who can open a student's profile (SEC-04) and
 * the Users list (ROLE-01).
 * Policy: the profile (contact, emergency contact, medical notes) needs
 * school.members.view, the same as the Users menu entry and its API; the
 * payment history also needs school.payments.view. CUSTOM roles are judged by
 * their own StaffRole permissions (real lib/auth/customRoles.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

// The pages are compiled with the classic JSX runtime under Vitest.
vi.stubGlobal('React', React)

const mockGetAuthUser = vi.fn()
const mockRequireSchoolAccess = vi.fn()
const mockStaffRoleFindUnique = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockGetStudentsForSchool = vi.fn()

vi.mock('@/lib/auth/server', () => ({
  getAuthUser: mockGetAuthUser,
  getCurrentSchoolId: vi.fn().mockResolvedValue('school-1'),
}))
vi.mock('@/lib/auth/contexts', () => ({
  requireSchoolAccess: mockRequireSchoolAccess,
  getSchoolMembership: vi.fn(),
}))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND') } }))
vi.mock('@/app/dashboard/users/[id]/StudentProfileClient', () => ({ default: () => null }))
vi.mock('@/app/dashboard/users/UsersSplitShell', () => ({ default: () => null }))
vi.mock('@/app/dashboard/users/data', () => ({ getStudentsForSchool: mockGetStudentsForSchool }))
vi.mock('@/lib/grading/readinessData', () => ({ getReadinessForSchool: vi.fn().mockResolvedValue([]), ATTENDED_WHERE: {} }))

vi.mock('@/lib/db', () => ({
  prisma: {
    staffRole: { findUnique: mockStaffRoleFindUnique },
    schoolMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'sm-1', schoolId: 'school-1', userId: 'student-1', belt: null, beltRankId: null, beltDegree: 0, beltDate: null,
        status: 'ACTIVE', role: 'STUDENT', joinedAt: null, emergencyContact: 'Mum 600', medicalNotes: 'Asthma',
        user: { id: 'student-1', name: 'S', email: 's@example.invalid', phone: null, avatarUrl: null, dateOfBirth: null, createdAt: new Date() },
        school: { id: 'school-1', name: 'School', modules: {} },
      }),
    },
    transaction: { findMany: mockTransactionFindMany },
    booking: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), groupBy: vi.fn().mockResolvedValue([]) },
    membership: { findMany: vi.fn().mockResolvedValue([]) },
    membershipPlan: { findMany: vi.fn().mockResolvedValue([]) },
    gradingSystem: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
  },
}))

const { default: StudentProfilePage } = await import('@/app/dashboard/users/[id]/page')
const { default: UsersLayout } = await import('@/app/dashboard/users/layout')

type Rendered = { props: { profile: { transactions: { id: string }[]; medicalNotes: string | null }; canViewPayments: boolean } }
const openProfile = async () => (await StudentProfilePage({ params: Promise.resolve({ id: 'sm-1' }) })) as unknown as Rendered

function viewerIs(role: SchoolMemberRole, customPermissions?: string[]) {
  mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
  mockRequireSchoolAccess.mockResolvedValue({ role, status: 'ACTIVE', customRoleId: customPermissions ? 'role-1' : null })
  if (customPermissions) mockStaffRoleFindUnique.mockResolvedValue({ permissions: customPermissions })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockTransactionFindMany.mockResolvedValue([{ id: 'tx-1', amount: 10, currency: 'EUR', paymentMethod: 'CASH', status: 'PAID', date: new Date(), description: 'x', category: 'MEMBERSHIP', membershipId: null, periodStart: null, periodEnd: null }])
  mockGetStudentsForSchool.mockResolvedValue([])
})

describe('SEC-04 — student profile page', () => {
  it.each(['INSTRUCTOR', 'ASSISTANT_INSTRUCTOR'] as SchoolMemberRole[])('%s (no school.members.view) gets a 404, nothing is loaded', async (role) => {
    viewerIs(role)
    await expect(openProfile()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockTransactionFindMany).not.toHaveBeenCalled()
  })

  it('a viewer without an ACTIVE membership in this school gets a 404', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
    mockRequireSchoolAccess.mockRejectedValue(new Error('FORBIDDEN'))
    await expect(openProfile()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('RECEPTIONIST sees the profile and payments (members.view + payments.view)', async () => {
    viewerIs('RECEPTIONIST')
    const el = await openProfile()
    expect(el.props.canViewPayments).toBe(true)
    expect(el.props.profile.transactions.map(t => t.id)).toEqual(['tx-1'])
  })

  it('OWNER sees everything', async () => {
    viewerIs('OWNER')
    const el = await openProfile()
    expect(el.props.profile.medicalNotes).toBe('Asthma')
    expect(el.props.profile.transactions).toHaveLength(1)
  })

  it('CUSTOM with members.view but not payments.view: profile yes, payment history not sent', async () => {
    viewerIs('CUSTOM', ['school.members.view'])
    const el = await openProfile()
    expect(el.props.canViewPayments).toBe(false)
    expect(el.props.profile.transactions).toEqual([])
    expect(mockTransactionFindMany).not.toHaveBeenCalled()
  })

  it('CUSTOM with both permissions sees the payment history', async () => {
    viewerIs('CUSTOM', ['school.members.view', 'school.payments.view'])
    const el = await openProfile()
    expect(el.props.canViewPayments).toBe(true)
    expect(el.props.profile.transactions).toHaveLength(1)
  })

  it('CUSTOM without members.view gets a 404', async () => {
    viewerIs('CUSTOM', ['school.classes.view'])
    await expect(openProfile()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('SUPERADMIN sees everything without a SchoolMember row', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'admin', role: 'SUPERADMIN' })
    const el = await openProfile()
    expect(el.props.canViewPayments).toBe(true)
    expect(mockRequireSchoolAccess).not.toHaveBeenCalled()
  })
})

describe('ROLE-01 — Users list (split view) uses effective permissions', () => {
  const renderList = async () => {
    const el = (await UsersLayout({ children: null })) as unknown as { props: { listStudents: unknown } }
    return el.props.listStudents
  }

  it('CUSTOM with members.view gets the list', async () => {
    viewerIs('CUSTOM', ['school.members.view'])
    expect(await renderList()).toEqual([])
    expect(mockGetStudentsForSchool).toHaveBeenCalledWith('school-1')
  })

  it('CUSTOM without members.view does not', async () => {
    viewerIs('CUSTOM', ['school.analytics.view'])
    expect(await renderList()).toBeNull()
    expect(mockGetStudentsForSchool).not.toHaveBeenCalled()
  })

  it('INSTRUCTOR does not get the list', async () => {
    viewerIs('INSTRUCTOR')
    expect(await renderList()).toBeNull()
  })

  it('an inactive membership does not get the list', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'staff-1', role: 'SCHOOL_OWNER' })
    mockRequireSchoolAccess.mockRejectedValue(new Error('FORBIDDEN'))
    expect(await renderList()).toBeNull()
  })
})
