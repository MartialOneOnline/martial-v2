import { describe, it, expect } from 'vitest'
import { beltRanksFromTemplate, parseTemplateRanks, readTemplateRanks, MAX_TEMPLATE_RANKS } from '../lib/grading/templates'
import { parseTemplateMeta } from '../lib/grading/templateMeta'

const ok = (v: unknown) => {
  const r = parseTemplateRanks(v)
  if (!r.ok) throw new Error(r.error)
  return r.ranks
}

describe('parseTemplateRanks()', () => {
  it('keeps the rules of each rank, in order', () => {
    const [blue, black] = ok([
      { name: ' Blue ', color: '#2563EB', maxDegrees: 4, minAge: 16, classesByDegree: [30, 30], classesPerPeriod: 2, maxClassesPerPeriod: 4, periodType: 'WEEK' },
      { name: 'Black', color: '#111827', maxDegrees: 6, minAge: 19, minMonthsAtPrevious: 12, monthsByDegree: [36, 36, 36, 60, 60, 60], requireExam: true },
    ])
    expect(blue).toMatchObject({ name: 'Blue', minAge: 16, classesByDegree: [30, 30], classesPerPeriod: 2, maxClassesPerPeriod: 4, periodType: 'WEEK' })
    expect(black).toMatchObject({ minMonthsAtPrevious: 12, monthsByDegree: [36, 36, 36, 60, 60, 60], requireExam: true, requireCompetition: false })
  })

  it('trims per-grading lists to the number of stripes (ages per stripe only)', () => {
    const [r] = ok([{ name: 'A', maxDegrees: 1, classesByDegree: [5, 6, 7], monthsByDegree: [1, 2, 3], minAgeByDegree: [10, 11] }])
    expect(r).toMatchObject({ classesByDegree: [5, 6], monthsByDegree: [1, 2], minAgeByDegree: [10] })
  })

  it('cleans bad values: colour fallback, blanks as no rule, stripes capped at 10', () => {
    const [r] = ok([{ name: 'A', color: 'red', maxDegrees: 99, minAge: '', totalClassesRequired: 0, classesByDegree: [0, 0] }])
    expect(r).toMatchObject({ color: '#9CA3AF', maxDegrees: 10, minAge: null, totalClassesRequired: null, classesByDegree: [] })
  })

  it('rejects a missing or duplicate name, naming the rank', () => {
    expect(parseTemplateRanks([{ name: 'A' }, { name: '' }])).toEqual({ ok: false, error: 'Rank 2: name is required' })
    expect(parseTemplateRanks([{ name: 'Blue' }, { name: 'blue' }])).toMatchObject({ ok: false, error: expect.stringContaining('duplicate') })
  })

  it('rejects an invalid frequency, like the rank API', () => {
    expect(parseTemplateRanks([{ name: 'A', maxClassesPerPeriod: 3 }])).toMatchObject({ ok: false, error: expect.stringContaining('Rank 1') })
    expect(parseTemplateRanks([{ name: 'A', classesPerPeriod: 4, maxClassesPerPeriod: 3, periodType: 'WEEK' }]).ok).toBe(false)
  })

  it('rejects non-lists and too many ranks', () => {
    expect(parseTemplateRanks('x').ok).toBe(false)
    expect(parseTemplateRanks(Array.from({ length: MAX_TEMPLATE_RANKS + 1 }, (_, i) => ({ name: `R${i}` }))).ok).toBe(false)
  })

  it('readTemplateRanks() returns [] for malformed stored JSON', () => {
    expect(readTemplateRanks({ nope: true })).toEqual([])
    expect(readTemplateRanks([{ name: 'A' }])).toHaveLength(1)
  })
})

describe('beltRanksFromTemplate()', () => {
  it('numbers ranks in order and never copies class filters', () => {
    const rows = beltRanksFromTemplate(ok([{ name: 'White' }, { name: 'Blue' }]), 'sys1')
    expect(rows.map(r => [r.name, r.order, r.systemId, r.classTypeIds])).toEqual([
      ['White', 0, 'sys1', []], ['Blue', 1, 'sys1', []],
    ])
  })
})

describe('parseTemplateMeta()', () => {
  it('requires a name on create, only validates sent fields on edit', () => {
    expect(parseTemplateMeta({}, { requireName: true }).ok).toBe(false)
    expect(parseTemplateMeta({ isPublished: true }, { requireName: false })).toEqual({ ok: true, value: { isPublished: true } })
  })
  it('blank optional text becomes null; published must be a boolean', () => {
    expect(parseTemplateMeta({ name: 'IBJJF', activity: '  ', description: '' }, { requireName: true }))
      .toEqual({ ok: true, value: { name: 'IBJJF', activity: null, description: null } })
    expect(parseTemplateMeta({ isPublished: 'yes' }, { requireName: false }).ok).toBe(false)
  })
})
