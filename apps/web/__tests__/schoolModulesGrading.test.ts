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

describe('resolveGradingEnabled (client: server start value vs live context)', () => {
  it('uses the server value while the context is still loading', async () => {
    const { resolveGradingEnabled } = await import('@/lib/school-modules')
    expect(resolveGradingEnabled(null, true)).toBe(true)
    expect(resolveGradingEnabled(null, false)).toBe(false)
  })

  it('lets a later context update win — turned off in Settings after the page loaded', async () => {
    const { resolveGradingEnabled } = await import('@/lib/school-modules')
    expect(resolveGradingEnabled(false, true)).toBe(false)
  })

  it('and the reverse — turned on after the page loaded', async () => {
    const { resolveGradingEnabled } = await import('@/lib/school-modules')
    expect(resolveGradingEnabled(true, false)).toBe(true)
  })

  it('is unknown only when neither side knows', async () => {
    const { resolveGradingEnabled } = await import('@/lib/school-modules')
    expect(resolveGradingEnabled(null, undefined)).toBeNull()
    expect(resolveGradingEnabled(null, null)).toBeNull()
  })
})

describe('gradingFromSchoolContext (only a resolved school counts)', () => {
  it('is unknown while loading, and after a failed load with no school', async () => {
    const { gradingFromSchoolContext, resolveGradingEnabled } = await import('@/lib/school-modules')
    expect(gradingFromSchoolContext({ loading: true, currentSchool: null })).toBeNull()
    expect(gradingFromSchoolContext({ loading: false, currentSchool: null })).toBeNull()
    expect(gradingFromSchoolContext(undefined)).toBeNull()
    // /api/auth/me failed: the server's "on" survives, nothing gets hidden
    expect(resolveGradingEnabled(gradingFromSchoolContext({ loading: false, currentSchool: null }), true)).toBe(true)
    // ...and with no server value either, it stays unknown (exports blocked)
    expect(resolveGradingEnabled(gradingFromSchoolContext({ loading: false, currentSchool: null }), undefined)).toBeNull()
  })

  it('reports the resolved school either way', async () => {
    const { gradingFromSchoolContext } = await import('@/lib/school-modules')
    expect(gradingFromSchoolContext({ loading: false, currentSchool: { gradingEnabled: true } })).toBe(true)
    expect(gradingFromSchoolContext({ loading: false, currentSchool: { gradingEnabled: false } })).toBe(false)
  })
})

describe('schoolContextFailed (loading vs failed)', () => {
  it('is only true once loading finished without a school because the request failed', async () => {
    const { schoolContextFailed } = await import('@/lib/school-modules')
    expect(schoolContextFailed({ loading: true, failed: false, currentSchool: null })).toBe(false)
    expect(schoolContextFailed({ loading: false, failed: true, currentSchool: null })).toBe(true)
    // A later successful retry brings the school back — no longer failed
    expect(schoolContextFailed({ loading: false, failed: false, currentSchool: { gradingEnabled: true } })).toBe(false)
    // A stale failed flag never wins over a resolved school
    expect(schoolContextFailed({ loading: false, failed: true, currentSchool: { gradingEnabled: true } })).toBe(false)
    expect(schoolContextFailed(null)).toBe(false)
  })
})
