import { describe, it, expect } from 'vitest'
import { computeReadiness, type RankRules, type AttendedClass } from '../lib/grading/readiness'

const NOW = new Date('2026-10-26T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function rank(p: Partial<RankRules> & { id: string; order: number }): RankRules {
  return {
    name: p.id, color: '#fff', maxDegrees: 4, minAge: null, minMonthsAtPrevious: null,
    totalClassesRequired: null, classesPerPeriod: null, periodType: null, classTypeIds: [],
    requireExam: false, requireCompetition: false, ...p,
  }
}

// Mirrors Roger Gracie Málaga's real configuration.
const RGM = [
  rank({ id: 'blanco', order: 0, totalClassesRequired: 8, classesPerPeriod: 2, periodType: 'WEEK' }),
  rank({ id: 'azul', order: 1, totalClassesRequired: 30, classesPerPeriod: 2, periodType: 'WEEK', minAge: 16 }),
  rank({ id: 'negro', order: 2, totalClassesRequired: 120, minAge: 19 }),
]

/** n classes, one every `everyDays` days, ending yesterday */
function classes(n: number, everyDays = 3, extra: Partial<AttendedClass> = {}): AttendedClass[] {
  return Array.from({ length: n }, (_, i) => ({
    scheduledAt: new Date(NOW.getTime() - (1 + i * everyDays) * DAY), classId: 'c1', disciplineId: null, ...extra,
  }))
}

const base = { ranks: RGM, now: NOW, dateOfBirth: null, beltSince: null, countSince: null }

describe('computeReadiness()', () => {
  it('nothing due yet: progress toward the next stripe', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 1, attended: classes(4) })
    expect(r.due).toBeNull()
    expect(r.next).toMatchObject({ kind: 'DEGREE', degree: 2, classes: 4, required: 8 })
    expect(r.percent).toBe(50)
    expect(r.status).toBe('NOT_READY')
  })

  it('is ALMOST_READY at 75%+ of the next step', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(6) })
    expect(r.percent).toBe(75)
    expect(r.status).toBe('ALMOST_READY')
  })

  it('one stripe due', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(9) })
    expect(r.status).toBe('READY')
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 1, count: 1 })
    expect(r.next).toMatchObject({ degree: 2, classes: 1, required: 8 })
  })

  it('accumulates several stripes when the student hasn\'t been graded in a while', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(30, 2) })
    expect(r.due).toMatchObject({ kind: 'DEGREE', rankName: 'blanco', degree: 3, count: 3 })
    expect(r.steps.map(s => s.earned)).toEqual([true, true, true, false, false])
    expect(r.steps[3]).toMatchObject({ degree: 4, classes: 6, required: 8 })
  })

  it('reaches the next belt after the last stripe, and never goes past it', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 2, attended: classes(200, 1) })
    expect(r.due).toMatchObject({ kind: 'BELT', rankName: 'azul', degree: 0, count: 3 })
    expect(r.next).toBeNull()
    expect(r.steps).toHaveLength(3)
  })

  it('a belt blocked by age still leaves the earned stripes due', () => {
    const r = computeReadiness({
      ...base, currentRankId: 'blanco', currentDegree: 3, attended: classes(20, 2), dateOfBirth: new Date('2011-01-01'),
    })
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 4, count: 1 })
    expect(r.next).toMatchObject({ kind: 'BELT', earned: false, blockedBy: ['AGE'] })
    expect(r.requirements.find(q => q.kind === 'AGE')).toMatchObject({ current: 15, required: 16, met: false })
  })

  it('skips the age rule when the birth date is unknown', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 4, attended: classes(9) })
    expect(r.requirements.some(q => q.kind === 'AGE')).toBe(false)
    expect(r.due).toMatchObject({ kind: 'BELT', rankName: 'azul' })
  })

  it('only counts classes since the last grading (the grading day itself counts)', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, countSince: new Date(NOW.getTime() - 10 * DAY), attended: classes(10) })
    expect(r.classesSince).toBe(4)
  })

  it('frequency is shown but does not block', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(9, 10) })
    expect(r.requirements.find(q => q.kind === 'FREQUENCY')?.met).toBe(false)
    expect(r.status).toBe('READY')
  })

  it('months at belt gate the belt step only', () => {
    const ranks = [rank({ id: 'a', order: 0, totalClassesRequired: 2, maxDegrees: 1 }), rank({ id: 'b', order: 1, minMonthsAtPrevious: 12 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, beltSince: new Date('2026-04-26T00:00:00Z'), attended: classes(10) })
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 1 })
    expect(r.next).toMatchObject({ kind: 'BELT', blockedBy: ['MONTHS'] })
  })

  it('a time-only system (no classes rule) evaluates just the belt', () => {
    const ranks = [rank({ id: 'a', order: 0 }), rank({ id: 'b', order: 1, minMonthsAtPrevious: 6 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, beltSince: new Date('2026-07-26T00:00:00Z'), attended: [] })
    expect(r.steps).toHaveLength(1)
    expect(r.percent).toBe(50)
  })

  it('returns TOP_RANK at the last rank with all degrees', () => {
    expect(computeReadiness({ ...base, currentRankId: 'negro', currentDegree: 4, attended: [] }).status).toBe('TOP_RANK')
  })

  it('returns NO_RULES when the member has no rank or the ranks have no rules', () => {
    expect(computeReadiness({ ...base, currentRankId: null, currentDegree: 0, attended: [] }).status).toBe('NO_RULES')
    const ranks = [rank({ id: 'x', order: 0 }), rank({ id: 'y', order: 1 })]
    expect(computeReadiness({ ...base, ranks, currentRankId: 'x', currentDegree: 0, attended: classes(5) }).status).toBe('NO_RULES')
  })

  it('ignores future bookings and filters by class type when configured', () => {
    const ranks = [rank({ id: 'a', order: 0, totalClassesRequired: 3, classTypeIds: ['bjj'] }), rank({ id: 'b', order: 1 })]
    const attended: AttendedClass[] = [
      ...classes(2, 3, { disciplineId: 'bjj' }),
      ...classes(2, 3, { disciplineId: 'mma' }),
      { scheduledAt: new Date(NOW.getTime() + DAY), classId: 'c1', disciplineId: 'bjj' },
    ]
    expect(computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended }).classesSince).toBe(2)
  })

  it('lists exam / competition for the next belt as manual checks', () => {
    const ranks = [rank({ id: 'a', order: 0, totalClassesRequired: 1 }), rank({ id: 'b', order: 1, requireExam: true })]
    expect(computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 4, attended: classes(1) }).manualChecks).toEqual(['EXAM'])
  })
})
