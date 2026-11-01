import { describe, it, expect } from 'vitest'
import {
  buildSavePayload, commonRules, estimateBelt, estimateMonths, hasOwnFrequency, stepCount, toDraft, type DraftRank,
} from '@/lib/grading/settingsDraft'

function rank(over: Partial<DraftRank>): DraftRank {
  return {
    id: 'r', order: 0, name: 'Belt', color: '#9CA3AF', maxDegrees: 4,
    minAge: null, minMonthsAtPrevious: null, totalClassesRequired: null,
    classesByDegree: [], monthsByDegree: [], minAgeByDegree: [],
    classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null,
    classTypeIds: [], requireExam: false, requireCompetition: false,
    ...over,
  }
}

// RGM today: only Blanco has a frequency (2–2 per week)
const rgm = () => [
  rank({ id: 'blanco', order: 0, name: 'Blanco', totalClassesRequired: 8, classesByDegree: [8, 16, 24, 24, 24], classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK' }),
  rank({ id: 'azul', order: 1, name: 'Azul', totalClassesRequired: 30, minAge: 16 }),
  rank({ id: 'morado', order: 2, name: 'Morado', totalClassesRequired: 40, minAge: 16 }),
  rank({ id: 'negro', order: 3, name: 'Negro', maxDegrees: 6, minAge: 19 }),
]

describe('commonRules / hasOwnFrequency', () => {
  it('takes the frequency most belts share; the odd one out has its own', () => {
    const d = toDraft(rgm())
    const c = commonRules(d)
    expect(c.classesPerPeriod).toBeNull()
    expect(hasOwnFrequency(d[0]!, c)).toBe(true)
    expect(d.slice(1).every(r => !hasOwnFrequency(r, c))).toBe(true)
  })

  it('a period without min or max is no rule at all', () => {
    const c = commonRules([rank({ id: 'a', periodType: 'WEEK' }), rank({ id: 'b', order: 1 })])
    expect(c).toMatchObject({ classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null })
  })

  it('ties go to the earliest belt', () => {
    const c = commonRules([
      rank({ id: 'a', order: 0, classesPerPeriod: 3, periodType: 'WEEK', classTypeIds: ['gi'] }),
      rank({ id: 'b', order: 1, classesPerPeriod: 1, periodType: 'MONTH' }),
    ])
    expect(c).toMatchObject({ classesPerPeriod: 3, periodType: 'WEEK', classTypeIds: ['gi'] })
  })
})

describe('toDraft / stepCount', () => {
  it('makes each step explicit from the old per-belt fallback', () => {
    const d = toDraft(rgm())
    expect(d[0]!.classesByDegree).toEqual([8, 16, 24, 24, 24])
    expect(d[1]!.classesByDegree).toEqual([30, 30, 30, 30, 30])
    // Last belt: one step per degree, no "next belt" step
    expect(stepCount(d[3]!, false)).toBe(6)
    expect(d[3]!.classesByDegree).toEqual([0, 0, 0, 0, 0, 0])
  })
})

describe('estimates', () => {
  it('Blanco → Azul at 2 a week is about 11 months (96 classes = 48 weeks)', () => {
    const d = toDraft(rgm())
    const e = estimateBelt(d[0]!, d[1]!, { classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK' })
    expect(e.totalClasses).toBe(96)
    expect(e.months).toBe(11)
  })

  it('a minimum time longer than the classes wins', () => {
    const d = toDraft(rgm())
    d[1]!.minMonthsAtPrevious = 18
    expect(estimateBelt(d[0]!, d[1]!, { classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK' }).months).toBe(18)
  })

  it('no frequency → no class estimate; per month counts months', () => {
    expect(estimateMonths(96, { classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null })).toBeNull()
    expect(estimateMonths(24, { classesPerPeriod: 8, maxClassesPerPeriod: null, periodType: 'MONTH' })).toBe(3)
  })
})

describe('buildSavePayload', () => {
  it('writes the shared frequency and classes to every belt without its own', () => {
    const d = toDraft(rgm())
    const common = { classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK' as const, classTypeIds: ['gi'] }
    const out = buildSavePayload(d, common, { blanco: false })
    for (const r of out) {
      expect(r).toMatchObject({ classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK', classTypeIds: ['gi'], totalClassesRequired: null })
    }
    expect(out[1]!.classesByDegree).toEqual([30, 30, 30, 30, 30])
    expect(out[3]!.classesByDegree).toEqual([]) // time-only belt stays without classes
  })

  it('keeps a belt’s own frequency and trims lists to its steps', () => {
    const d = toDraft(rgm())
    d[1]!.classesPerPeriod = 3; d[1]!.periodType = 'MONTH'
    d[1]!.maxDegrees = 2
    d[1]!.minAgeByDegree = [10, 11, 12, 13]
    const out = buildSavePayload(d, { classesPerPeriod: null, maxClassesPerPeriod: null, periodType: 'WEEK', classTypeIds: [] }, { azul: true })
    expect(out[1]).toMatchObject({ classesPerPeriod: 3, maxClassesPerPeriod: null, periodType: 'MONTH' })
    expect(out[1]!.classesByDegree).toEqual([30, 30, 30])
    expect(out[1]!.minAgeByDegree).toEqual([10, 11])
    // No shared rule: nothing written to the others, and the stray period is dropped
    expect(out[2]).toMatchObject({ classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null })
  })

  it('is stable: reloading what was saved gives the same payload (no phantom "unsaved changes")', () => {
    const d = toDraft(rgm())
    const common = { classesPerPeriod: 2, maxClassesPerPeriod: 2, periodType: 'WEEK' as const, classTypeIds: ['gi'] }
    const first = buildSavePayload(d, common, {})
    const reloaded = toDraft(first.map((p, i) => ({ ...p, order: i })) as DraftRank[])
    const c2 = commonRules(reloaded)
    const own = Object.fromEntries(reloaded.map(r => [r.id, hasOwnFrequency(r, c2)]))
    expect(buildSavePayload(reloaded, c2, own)).toEqual(first)
  })
})
