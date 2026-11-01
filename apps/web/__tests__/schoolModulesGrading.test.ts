/**
 * Belts & gradings as a school module (2026-11-01): a boxing gym has no belts,
 * and a BJJ school may not want to use them.
 */
import { describe, it, expect } from 'vitest'
import { getSchoolModules, mergeSchoolModules, isGradingEnabled } from '../lib/school-modules'

describe('grading module default', () => {
  it('a school that never set it keeps grading on when it already has a belt system', () => {
    expect(getSchoolModules({ store: true }, { activeGradingSystems: 1 }).grading).toBe(true)
    expect(isGradingEnabled(null, 2)).toBe(true)
  })

  it('a school without a belt system starts with grading off', () => {
    expect(getSchoolModules({}, { activeGradingSystems: 0 }).grading).toBe(false)
    expect(getSchoolModules(null).grading).toBe(false)
  })

  it('an explicit choice wins over the default, both ways', () => {
    expect(isGradingEnabled({ grading: false }, 3)).toBe(false)
    expect(isGradingEnabled({ grading: true }, 0)).toBe(true)
  })

  it('other modules are unchanged and invalid values fall back', () => {
    expect(getSchoolModules({ store: true, news: 'yes', grading: 'on' }, { activeGradingSystems: 1 }))
      .toEqual({ store: true, curriculum: false, news: false, music: false, timer: false, grading: true })
  })
})

describe('mergeSchoolModules() — saving settings', () => {
  it('a save that does not send grading keeps the current value (no switch-off by omission)', () => {
    const stored = { store: false }
    expect(mergeSchoolModules(stored, { store: true }, { activeGradingSystems: 1 }))
      .toMatchObject({ store: true, grading: true })
    expect(mergeSchoolModules({ grading: false }, { news: true }, { activeGradingSystems: 1 }))
      .toMatchObject({ news: true, grading: false })
  })

  it('turning grading off or on is stored explicitly', () => {
    expect(mergeSchoolModules({}, { grading: false }, { activeGradingSystems: 2 }).grading).toBe(false)
    expect(mergeSchoolModules({ grading: false }, { grading: true }, { activeGradingSystems: 0 }).grading).toBe(true)
  })

  it('ignores junk in the request', () => {
    expect(mergeSchoolModules({ store: true }, { store: 'nope', evil: true }, {}))
      .toEqual({ store: true, curriculum: false, news: false, music: false, timer: false, grading: false })
  })
})
