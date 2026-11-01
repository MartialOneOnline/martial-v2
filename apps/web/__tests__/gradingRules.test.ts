import { describe, it, expect } from 'vitest'
import { parseFrequency, parseMinAgeByDegree, parseMonthsByDegree } from '../lib/grading/rules'

describe('grading rule parsers', () => {
  it('frequency: blanks and 0 are no rule', () => {
    expect(parseFrequency({ classesPerPeriod: '', maxClassesPerPeriod: 0, periodType: null }))
      .toEqual({ ok: true, value: { classesPerPeriod: null, maxClassesPerPeriod: null, periodType: null } })
  })
  it('frequency: min and max with a period', () => {
    expect(parseFrequency({ classesPerPeriod: 2, maxClassesPerPeriod: 3, periodType: 'WEEK' }))
      .toEqual({ ok: true, value: { classesPerPeriod: 2, maxClassesPerPeriod: 3, periodType: 'WEEK' } })
  })
  it('frequency: a min or max needs a period', () => {
    expect(parseFrequency({ maxClassesPerPeriod: 3 }).ok).toBe(false)
    expect(parseFrequency({ classesPerPeriod: 2, periodType: 'YEAR' }).ok).toBe(false)
  })
  it('frequency: max below min is rejected', () => {
    expect(parseFrequency({ classesPerPeriod: 4, maxClassesPerPeriod: 3, periodType: 'MONTH' }).ok).toBe(false)
  })
  it('months and ages per degree are clamped whole numbers', () => {
    expect(parseMonthsByDegree([36, 36.4, -1, 'x', 5000])).toEqual([36, 36, 0, 0, 1200])
    expect(parseMinAgeByDegree(Array(12).fill(200))).toHaveLength(10)
    expect(parseMinAgeByDegree([14.6])).toEqual([15])
    expect(parseMonthsByDegree('nope')).toEqual([])
  })
})
