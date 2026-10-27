/**
 * getReadinessForSchool() — loader-level regression for Project Audit PR #33
 * P1: months at belt must come from the current belt's own date, never from
 * the school join date.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const gradingSystemFindMany = vi.fn()
const schoolMemberFindMany = vi.fn()
const gradingFindMany = vi.fn()
const bookingFindMany = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    gradingSystem: { findMany: (...a: unknown[]) => gradingSystemFindMany(...a) },
    schoolMember: { findMany: (...a: unknown[]) => schoolMemberFindMany(...a) },
    grading: { findMany: (...a: unknown[]) => gradingFindMany(...a) },
    booking: { findMany: (...a: unknown[]) => bookingFindMany(...a) },
  },
}))

import { getReadinessForSchool } from '../lib/grading/readinessData'

const rank = (p: Record<string, unknown>) => ({
  color: '#fff', maxDegrees: 0, minAge: null, minMonthsAtPrevious: null, totalClassesRequired: null,
  classesByDegree: [], classesPerPeriod: null, periodType: null, classTypeIds: [],
  requireExam: false, requireCompetition: false, systemId: 'sys', ...p,
})

describe('getReadinessForSchool()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
    gradingSystemFindMany.mockResolvedValue([{
      id: 'sys', isDefault: true, createdAt: new Date(),
      ranks: [
        rank({ id: 'a', name: 'A', order: 0, totalClassesRequired: 1 }),
        rank({ id: 'b', name: 'B', order: 1, minMonthsAtPrevious: 6 }),
      ],
    }])
    schoolMemberFindMany.mockResolvedValue([{
      id: 'm1', userId: 'u1', status: 'ACTIVE', belt: 'A', beltRankId: 'a', beltDegree: 0,
      beltDate: new Date('2026-10-01T00:00:00Z'), joinedAt: new Date('2020-01-01T00:00:00Z'),
      user: { name: 'Student', email: 's@x.test', avatarUrl: null, dateOfBirth: null },
    }])
    gradingFindMany.mockResolvedValue([])
    bookingFindMany.mockResolvedValue([
      { userId: 'u1', scheduledAt: new Date('2026-10-20T10:00:00Z'), classId: 'c', class: { disciplineId: null } },
    ])
  })
  afterEach(() => { vi.useRealTimers() })

  it('audit repro: no grading history, joined 2020, belt 2026-10-01 → months = 0 and the belt is not offered', async () => {
    const [row] = await getReadinessForSchool('school-1')
    const months = row!.readiness.requirements.find(q => q.kind === 'MONTHS')
    expect(months).toMatchObject({ current: 0, required: 6, met: false })
    expect(row!.readiness.due).toBeNull()
    expect(row!.readiness.status).not.toBe('READY')
  })

  it('only queries this school\'s classes for attendance', async () => {
    await getReadinessForSchool('school-1')
    expect(bookingFindMany.mock.calls[0]![0].where.class).toEqual({ schoolId: 'school-1' })
  })
})
