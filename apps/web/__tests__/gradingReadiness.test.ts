import { describe, it, expect } from 'vitest'
import { computeReadiness, pickBeltSince, pickStepSince, type RankRules, type AttendedClass, type GradingRecord } from '../lib/grading/readiness'

const NOW = new Date('2026-10-26T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function rank(p: Partial<RankRules> & { id: string; order: number }): RankRules {
  return {
    name: p.id, color: '#fff', maxDegrees: 4, minAge: null, minMonthsAtPrevious: null,
    totalClassesRequired: null, classesByDegree: [], classesPerPeriod: null, periodType: null, classTypeIds: [],
    requireExam: false, requireCompetition: false, ...p,
  }
}

// Mirrors Roger Gracie Málaga's V1 configuration: Blanco needs 8 → 16 → 24 → 24 → 24 (to Azul).
const RGM = [
  rank({ id: 'blanco', order: 0, totalClassesRequired: 8, classesByDegree: [8, 16, 24, 24, 24], classesPerPeriod: 2, periodType: 'WEEK' }),
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
    expect(r.next).toMatchObject({ kind: 'DEGREE', degree: 2, classes: 4, required: 16 })
    expect(r.percent).toBe(25)
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
    expect(r.next).toMatchObject({ degree: 2, classes: 1, required: 16 })
  })

  it('accumulates several stripes, each with its own class count', () => {
    // 8 + 16 + 24 = 48 → 3 stripes, 2 classes into the 4th (needs 24)
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(50, 1) })
    expect(r.due).toMatchObject({ kind: 'DEGREE', rankName: 'blanco', degree: 3, count: 3 })
    expect(r.steps.map(s => [s.required, s.classes, s.earned])).toEqual([
      [8, 8, true], [16, 16, true], [24, 24, true], [24, 2, false], [24, 0, false],
    ])
    expect(r.classesForFirstStep).toBe(8)
  })

  it('uses the stripe the student is on: Blanco 3 needs 24 for the 4th', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 3, attended: classes(23, 1) })
    expect(r.next).toMatchObject({ degree: 4, classes: 23, required: 24 })
    expect(r.status).toBe('ALMOST_READY')
  })

  it('falls back to totalClassesRequired for missing per-stripe entries', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, totalClassesRequired: 10, classesByDegree: [5] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: [] })
    expect(r.steps.map(s => s.required)).toEqual([5, 10, 10])
  })

  it('reaches the next belt after the last stripe, and never goes past it', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 2, attended: classes(200, 1) })
    expect(r.due).toMatchObject({ kind: 'BELT', rankName: 'azul', degree: 0, count: 3 })
    expect(r.next).toBeNull()
    expect(r.steps).toHaveLength(3)
  })

  it('a belt blocked by age still leaves the earned stripes due', () => {
    const r = computeReadiness({
      ...base, currentRankId: 'blanco', currentDegree: 3, attended: classes(50, 1), dateOfBirth: new Date('2011-01-01'),
    })
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 4, count: 1 })
    expect(r.next).toMatchObject({ kind: 'BELT', earned: false, blockedBy: ['AGE'] })
    expect(r.requirements.find(q => q.kind === 'AGE')).toMatchObject({ current: 15, required: 16, met: false })
  })

  it('skips the age rule when the birth date is unknown', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 4, attended: classes(25, 1) })
    expect(r.requirements.some(q => q.kind === 'AGE')).toBe(false)
    expect(r.due).toMatchObject({ kind: 'BELT', rankName: 'azul' })
  })

  it('only counts classes since the last grading (the grading day itself counts)', () => {
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, countSince: new Date(NOW.getTime() - 10 * DAY), attended: classes(10) })
    expect(r.classesSince).toBe(4)
  })

  it('training below the minimum frequency blocks the grading (2026-11-01)', () => {
    // 9 classes, one every 10 days = 0.7/week, Blanco needs 2/week
    const r = computeReadiness({ ...base, currentRankId: 'blanco', currentDegree: 0, attended: classes(9, 10) })
    expect(r.requirements.find(q => q.kind === 'FREQUENCY')?.met).toBe(false)
    expect(r.due).toBeNull()
    expect(r.next).toMatchObject({ degree: 1, classes: 8, required: 8, earned: false, blockedBy: ['FREQUENCY'] })
    expect(r.status).toBe('NOT_READY')
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

  // ── Project Audit PR #33 regressions ────────────────────────────────────

  it('top rank keeps the real attendance count', () => {
    const r = computeReadiness({ ...base, currentRankId: 'negro', currentDegree: 4, attended: classes(7) })
    expect(r.status).toBe('TOP_RANK')
    expect(r.classesSince).toBe(7)
  })

  it('a leading gap without fallback stops the walk — the belt is never offered', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, classesByDegree: [0, 16, 24] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: classes(24, 1) })
    expect(r.steps).toEqual([])
    expect(r.due).toBeNull()
    expect(r.status).toBe('NO_RULES')
    expect(r.incompleteRules).toEqual({ kind: 'DEGREE', degree: 1, rankName: 'a' })
  })

  it('an intermediate gap keeps earned stripes but evaluates nothing past it', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, classesByDegree: [8, 0, 24] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: classes(100, 1) })
    expect(r.steps.map(s => s.degree)).toEqual([1])
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 1, count: 1 })
    expect(r.incompleteRules).toMatchObject({ kind: 'DEGREE', degree: 2 })
  })

  it('a missing belt count without fallback never offers the belt', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, classesByDegree: [8, 16] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 2, attended: classes(100, 1) })
    expect(r.steps).toEqual([])
    expect(r.incompleteRules).toMatchObject({ kind: 'BELT', rankName: 'b' })
  })

  it('unknown belt date blocks a months rule instead of passing it', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 0, totalClassesRequired: 2 }), rank({ id: 'b', order: 1, minMonthsAtPrevious: 6 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, beltSince: null, attended: classes(5) })
    expect(r.requirements.find(q => q.kind === 'MONTHS')).toMatchObject({ met: false, unknown: true })
    expect(r.due).toBeNull()
    expect(r.next).toMatchObject({ kind: 'BELT', blockedBy: ['MONTHS'] })
  })
})

describe('pickBeltSince()', () => {
  const g = (p: Partial<Omit<GradingRecord, 'gradedAt'>> & { gradedAt: string }): GradingRecord =>
    ({ fromBelt: null, toBelt: 'Azul', toBeltRankId: null, toDegree: 0, ...p, gradedAt: new Date(p.gradedAt) })

  it('audit case: no gradings, joined 2020, belt awarded 2026-10-01 → belt date, still blocked at 6 months', () => {
    const beltSince = pickBeltSince({ gradings: [], rankId: 'b', beltNames: ['b'], beltDate: new Date('2026-10-01T00:00:00Z') })
    expect(beltSince?.toISOString().slice(0, 10)).toBe('2026-10-01')
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 0, totalClassesRequired: 2 }), rank({ id: 'b', order: 1 }), rank({ id: 'c', order: 2, minMonthsAtPrevious: 6 })]
    const r = computeReadiness({
      ...base, ranks, currentRankId: 'b', currentDegree: 4, beltSince,
      now: new Date('2026-10-27T12:00:00Z'), attended: [],
    })
    expect(r.requirements.find(q => q.kind === 'MONTHS')).toMatchObject({ current: 0, met: false })
    expect(r.due).toBeNull()
  })

  it('uses the latest belt change into the current belt, not a later stripe', () => {
    const d = pickBeltSince({
      gradings: [
        g({ gradedAt: '2025-01-10', fromBelt: 'Blanco', toBelt: 'Azul', toDegree: 0 }),
        g({ gradedAt: '2025-09-01', fromBelt: 'Azul', toBelt: 'Azul', toDegree: 1 }),
      ],
      rankId: 'azul-id', beltNames: ['Azul'], beltDate: new Date('2025-09-01'),
    })
    expect(d?.toISOString().slice(0, 10)).toBe('2025-01-10')
  })

  it('with only stripe gradings at the current belt, uses the earliest as a lower bound', () => {
    const d = pickBeltSince({
      gradings: [
        g({ gradedAt: '2025-09-01', fromBelt: 'Azul', toBelt: 'Azul', toDegree: 2 }),
        g({ gradedAt: '2025-03-01', fromBelt: 'Azul', toBelt: 'Azul', toDegree: 1 }),
      ],
      rankId: null, beltNames: ['azul'], beltDate: new Date('2025-09-01'),
    })
    expect(d?.toISOString().slice(0, 10)).toBe('2025-03-01')
  })

  it('ignores gradings to other belts and matches by rank id', () => {
    const d = pickBeltSince({
      gradings: [
        g({ gradedAt: '2024-01-01', fromBelt: null, toBelt: 'Blanco', toDegree: 0 }),
        g({ gradedAt: '2025-05-05', fromBelt: 'Blanco', toBelt: 'Blue', toBeltRankId: 'azul-id', toDegree: 0 }),
      ],
      rankId: 'azul-id', beltNames: ['Azul'], beltDate: null,
    })
    expect(d?.toISOString().slice(0, 10)).toBe('2025-05-05')
  })

  it('audit r2: a same-named belt from another system never matches when the FK points elsewhere', () => {
    const beltSince = pickBeltSince({
      gradings: [g({ gradedAt: '2020-01-01', fromBelt: null, toBelt: 'White', toBeltRankId: 'system-A-white', toDegree: 0 })],
      rankId: 'system-B-white', beltNames: ['White'], beltDate: new Date('2026-10-01T00:00:00Z'),
    })
    expect(beltSince?.toISOString().slice(0, 10)).toBe('2026-10-01')
    const ranks = [
      rank({ id: 'system-B-white', order: 0, maxDegrees: 0, totalClassesRequired: 1 }),
      rank({ id: 'system-B-blue', order: 1, minMonthsAtPrevious: 6 }),
    ]
    const r = computeReadiness({
      ...base, ranks, currentRankId: 'system-B-white', currentDegree: 0, beltSince,
      now: new Date('2026-10-27T12:00:00Z'), attended: [{ scheduledAt: new Date('2026-10-20T10:00:00Z'), classId: 'c', disciplineId: null }],
    })
    expect(r.requirements.find(q => q.kind === 'MONTHS')).toMatchObject({ current: 0, met: false })
    expect(r.status).not.toBe('READY')
  })

  it('still matches legacy records without a rank id by name', () => {
    const d = pickBeltSince({
      gradings: [g({ gradedAt: '2024-02-02', fromBelt: 'Blanco', toBelt: 'azul ', toBeltRankId: null, toDegree: 0 })],
      rankId: 'azul-id', beltNames: ['Azul'], beltDate: null,
    })
    expect(d?.toISOString().slice(0, 10)).toBe('2024-02-02')
  })

  it('audit r2: stripes with an unknown origin belt are not belt changes → earliest is the lower bound', () => {
    const d = pickBeltSince({
      gradings: [
        g({ gradedAt: '2025-01-15', fromBelt: null, toBelt: 'Azul', toBeltRankId: 'azul-id', toDegree: 1 }),
        g({ gradedAt: '2026-10-15', fromBelt: null, toBelt: 'Azul', toBeltRankId: 'azul-id', toDegree: 2 }),
      ],
      rankId: 'azul-id', beltNames: ['Azul'], beltDate: null,
    })
    expect(d?.toISOString().slice(0, 10)).toBe('2025-01-15')
  })

  it('returns null when nothing is known (never the join date)', () => {
    expect(pickBeltSince({ gradings: [], rankId: 'x', beltNames: ['Azul'], beltDate: null })).toBeNull()
  })
})

// ── Per-step rules set by each school (2026-11-01) ───────────────────────────
describe('computeReadiness() — time, age and frequency per grading', () => {
  // IBJJF-style black belt: degrees by time only (3 years each for 1st–3rd)
  const BLACK = [
    rank({ id: 'negro', order: 0, maxDegrees: 6, monthsByDegree: [36, 36, 36, 60, 60, 60] }),
    rank({ id: 'coral', order: 1, maxDegrees: 0, minMonthsAtPrevious: 84, minAge: 50 }),
  ]

  it('time-only degrees: due once the months since the last grading are met', () => {
    const r = computeReadiness({
      ...base, ranks: BLACK, currentRankId: 'negro', currentDegree: 0,
      stepSince: new Date('2023-10-01T00:00:00Z'), attended: [],
    })
    expect(r.due).toMatchObject({ kind: 'DEGREE', degree: 1, count: 1 })
    expect(r.next).toMatchObject({ degree: 2, classes: null, required: null, earned: false, blockedBy: ['GRADING_MONTHS'] })
    expect(r.next!.gates[0]).toMatchObject({ kind: 'GRADING_MONTHS', current: 36, required: 72, met: false })
  })

  it('time-only degrees: not due before the time, with progress as percent', () => {
    const r = computeReadiness({
      ...base, ranks: BLACK, currentRankId: 'negro', currentDegree: 3,
      stepSince: new Date('2025-10-26T00:00:00Z'), attended: [],
    })
    expect(r.due).toBeNull()
    expect(r.next!.gates[0]).toMatchObject({ kind: 'GRADING_MONTHS', current: 12, required: 60 })
    expect(r.percent).toBe(20)
    expect(r.status).toBe('NOT_READY')
  })

  it('unknown last grading date: the time rule is not met', () => {
    const r = computeReadiness({ ...base, ranks: BLACK, currentRankId: 'negro', currentDegree: 0, stepSince: null, attended: [] })
    expect(r.due).toBeNull()
    expect(r.next!.gates[0]).toMatchObject({ kind: 'GRADING_MONTHS', unknown: true, met: false })
  })

  it('classes AND time: both must be met', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, classesByDegree: [8, 8], monthsByDegree: [2] }), rank({ id: 'b', order: 1 })]
    const since = new Date('2026-09-10T00:00:00Z') // 1 month ago
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, countSince: since, stepSince: since, attended: classes(12, 2) })
    expect(r.due).toBeNull()
    expect(r.next).toMatchObject({ degree: 1, classes: 8, required: 8, earned: false, blockedBy: ['GRADING_MONTHS'] })
  })

  it('time-only belt with a gap in the months: rules incomplete, nothing past it', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, monthsByDegree: [6] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, stepSince: new Date('2020-01-01'), attended: [] })
    expect(r.steps).toHaveLength(1)
    expect(r.incompleteRules).toMatchObject({ kind: 'DEGREE', degree: 2 })
  })

  it('minimum age for a stripe blocks only that stripe onward', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 2, totalClassesRequired: 4, minAgeByDegree: [0, 14] }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({
      ...base, ranks, currentRankId: 'a', currentDegree: 0, dateOfBirth: new Date('2013-01-01'), attended: classes(20, 1),
    })
    expect(r.due).toMatchObject({ degree: 1, count: 1 })
    expect(r.next).toMatchObject({ degree: 2, blockedBy: ['AGE'] })
  })

  it('minimum frequency also blocks the belt step', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 0, totalClassesRequired: 5, classesPerPeriod: 3, periodType: 'WEEK' }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: classes(6, 4) })
    expect(r.due).toBeNull()
    expect(r.next).toMatchObject({ kind: 'BELT', blockedBy: ['FREQUENCY'] })
  })

  it('max per week: extra classes in the same week do not count', () => {
    // Mon 19 Oct – Sun 25 Oct 2026: 5 classes, cap 3 → 3 count
    const week = [19, 20, 21, 22, 23].map(d => ({ scheduledAt: new Date(Date.UTC(2026, 9, d, 19)), classId: 'c1', disciplineId: null }))
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 4, maxClassesPerPeriod: 3, periodType: 'WEEK' }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: week })
    expect(r).toMatchObject({ classesSince: 3, classesAttended: 5, classesOverCap: 2, classCap: { max: 3, periodType: 'WEEK' } })
    expect(r.due).toBeNull()
  })

  it('max per week: weeks start on Monday', () => {
    // Sun 18 Oct + Mon 19 Oct are different weeks → both count with cap 1
    const two = [18, 19].map(d => ({ scheduledAt: new Date(Date.UTC(2026, 9, d, 19)), classId: 'c1', disciplineId: null }))
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 2, maxClassesPerPeriod: 1, periodType: 'WEEK' }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: two })
    expect(r.classesSince).toBe(2)
    expect(r.due).toMatchObject({ degree: 1 })
  })

  it('max per month caps by calendar month', () => {
    const days = [new Date(Date.UTC(2026, 8, 29)), new Date(Date.UTC(2026, 8, 30)), new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 9, 2))]
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 10, maxClassesPerPeriod: 1, periodType: 'MONTH' }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: days.map(d => ({ scheduledAt: d, classId: 'c1', disciplineId: null })) })
    expect(r.classesSince).toBe(2)
  })

  it('no cap without a period, and blank rules change nothing', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 4, maxClassesPerPeriod: 1 }), rank({ id: 'b', order: 1 })]
    const r = computeReadiness({ ...base, ranks, currentRankId: 'a', currentDegree: 0, attended: classes(5, 1) })
    expect(r).toMatchObject({ classesSince: 5, classesOverCap: 0, classCap: null })
    expect(r.due).toMatchObject({ degree: 1 })
  })
})

// ── Project Audit PR #38 regressions ─────────────────────────────────────────
describe('Project Audit PR #38', () => {
  const at = (iso: string) => ({ scheduledAt: new Date(iso), classId: 'c1', disciplineId: null })

  it('P2: 3-month frequency window does not overflow on days 29–31', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 3, classesPerPeriod: 1, periodType: 'MONTH' }), rank({ id: 'b', order: 1 })]
    const attended = ['2026-03-01T12:00:00Z', '2026-04-01T12:00:00Z', '2026-05-01T12:00:00Z'].map(at)
    for (const day of [28, 29, 30, 31]) {
      const r = computeReadiness({
        ...base, ranks, currentRankId: 'a', currentDegree: 0, countSince: new Date('2026-01-01T00:00:00Z'),
        attended, now: new Date(`2026-05-${day}T12:00:00Z`),
      })
      expect(r.requirements.find(q => q.kind === 'FREQUENCY'), `day ${day}`).toMatchObject({ current: 1, met: true })
      expect(r.due, `day ${day}`).toMatchObject({ degree: 1 })
    }
  })

  it('P2: the 3-month window from 31 Aug starts on 31 May, from 30 Nov on 30 Aug', () => {
    const ranks = [rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 1, classesPerPeriod: 1, periodType: 'MONTH' }), rank({ id: 'b', order: 1 })]
    // One class on 31 May: inside the window on 31 Aug (1 class / 3 months = 0.3)
    const r = computeReadiness({
      ...base, ranks, currentRankId: 'a', currentDegree: 0, countSince: new Date('2026-01-01T00:00:00Z'),
      attended: [at('2026-05-31T13:00:00Z')], now: new Date('2026-08-31T12:00:00Z'),
    })
    expect(r.requirements.find(q => q.kind === 'FREQUENCY')).toMatchObject({ current: 0.3 })
  })

  const capRanks = (periodType: 'WEEK' | 'MONTH') => [
    rank({ id: 'a', order: 0, maxDegrees: 1, totalClassesRequired: 2, maxClassesPerPeriod: 1, periodType }),
    rank({ id: 'b', order: 1 }),
  ]
  const capped = (periodType: 'WEEK' | 'MONTH', timeZone: string, isos: string[]) => computeReadiness({
    ...base, ranks: capRanks(periodType), currentRankId: 'a', currentDegree: 0, timeZone, attended: isos.map(at),
    now: new Date('2026-11-20T12:00:00Z'),
  })

  it('P2: weekly cap uses the school week — east of UTC (Madrid)', () => {
    // Mon 2 Nov 00:15 and Tue 3 Nov 00:15 in Madrid = Sun/Mon in UTC
    const r = capped('WEEK', 'Europe/Madrid', ['2026-11-01T23:15:00Z', '2026-11-02T23:15:00Z'])
    expect(r).toMatchObject({ classesSince: 1, classesOverCap: 1 })
    expect(r.due).toBeNull()
    // Same instants on a UTC calendar are two different weeks
    expect(capped('WEEK', 'UTC', ['2026-11-01T23:15:00Z', '2026-11-02T23:15:00Z']).classesSince).toBe(2)
  })

  it('P2: weekly cap uses the school week — west of UTC (New York)', () => {
    // Both Sunday 1 Nov in New York; the second is Monday 2 Nov in UTC
    const r = capped('WEEK', 'America/New_York', ['2026-11-01T15:00:00Z', '2026-11-02T03:00:00Z'])
    expect(r.classesSince).toBe(1)
  })

  it('P2: monthly cap uses the school month — east and west of UTC', () => {
    // Madrid: 31 Oct 23:30 UTC is already 1 Nov → same month as 5 Nov
    expect(capped('MONTH', 'Europe/Madrid', ['2026-10-31T23:30:00Z', '2026-11-05T12:00:00Z']).classesSince).toBe(1)
    // New York: 1 Nov 02:00 UTC is still 31 Oct → same month as 15 Oct
    expect(capped('MONTH', 'America/New_York', ['2026-10-15T12:00:00Z', '2026-11-01T02:00:00Z']).classesSince).toBe(1)
  })
})

describe('pickStepSince()', () => {
  const g = (p: Partial<GradingRecord> & { gradedAt: Date }): GradingRecord =>
    ({ fromBelt: null, toBelt: 'B', toBeltRankId: 'b', toDegree: 1, ...p })
  const input = { rankId: 'b', beltNames: ['B'], degree: 1, beltDate: null, joinedAt: new Date('2019-01-01'), isFirstGrade: false }

  it('uses the latest grading that landed on the current rank and degree', () => {
    const d = pickStepSince({ ...input, gradings: [g({ gradedAt: new Date('2025-01-01') }), g({ gradedAt: new Date('2026-01-01') })] })
    expect(d).toEqual(new Date('2026-01-01'))
  })
  it('P1: a grading in another system or rank never resolves it', () => {
    const other = g({ gradedAt: new Date('2020-01-01'), toBelt: 'A', toBeltRankId: 'other-system-rank' })
    expect(pickStepSince({ ...input, gradings: [other] })).toBeNull()
  })
  it('a grading at the current rank but another degree does not count', () => {
    expect(pickStepSince({ ...input, gradings: [g({ gradedAt: new Date('2020-01-01'), toDegree: 0 })] })).toBeNull()
  })
  it('belt date only at degree 0; join date only at the first grade', () => {
    const beltDate = new Date('2024-05-01')
    expect(pickStepSince({ ...input, gradings: [], beltDate })).toBeNull()
    expect(pickStepSince({ ...input, gradings: [], beltDate, degree: 0 })).toEqual(beltDate)
    expect(pickStepSince({ ...input, gradings: [], degree: 0, isFirstGrade: true })).toEqual(new Date('2019-01-01'))
  })
})
