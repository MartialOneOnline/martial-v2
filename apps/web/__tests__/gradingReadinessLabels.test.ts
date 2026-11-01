/**
 * Project Audit PR #38 P2: the report must explain the same blocks as the
 * profile card. Both use blockReasons() / overCapLabel().
 */
import { describe, it, expect } from 'vitest'
import { blockReasons, overCapLabel } from '../components/GradingReadiness'
import { computeReadiness, type RankRules } from '../lib/grading/readiness'
import { translations } from '../lib/i18n/translations'

const NOW = new Date('2026-10-26T12:00:00Z')
const rank = (p: Partial<RankRules> & { id: string; order: number }): RankRules => ({
  name: p.id, color: '#fff', maxDegrees: 1, minAge: null, minMonthsAtPrevious: null, totalClassesRequired: null,
  classesByDegree: [], classesPerPeriod: null, periodType: null, classTypeIds: [], requireExam: false, requireCompetition: false, ...p,
})

// Since 1 Sep only three classes, all in one week (0.4/week), cap 1/week, min 2/week, 6 months since last grading, min age 16 for the stripe
const r = computeReadiness({
  ranks: [
    rank({ id: 'a', order: 0, totalClassesRequired: 1, monthsByDegree: [6, 6], minAgeByDegree: [16], classesPerPeriod: 2, maxClassesPerPeriod: 1, periodType: 'WEEK' }),
    rank({ id: 'b', order: 1 }),
  ],
  currentRankId: 'a', currentDegree: 0, countSince: new Date('2026-09-01T00:00:00Z'), beltSince: null,
  stepSince: new Date('2026-08-01T00:00:00Z'), dateOfBirth: new Date('2012-01-01'), now: NOW,
  attended: ['2026-10-19T19:00:00Z', '2026-10-20T19:00:00Z', '2026-10-21T19:00:00Z']
    .map(iso => ({ scheduledAt: new Date(iso), classId: 'c', disciplineId: null })),
})

describe('blockReasons() / overCapLabel()', () => {
  it('lists every unmet rule of the held-back step, in each language', () => {
    for (const lang of ['en', 'es', 'pt', 'fr'] as const) {
      const lines = blockReasons(r, translations[lang].readiness)
      expect(lines, lang).toHaveLength(3) // time, age, frequency
      expect(lines.join(' '), lang).not.toMatch(/\{\w+\}/)
    }
    expect(blockReasons(r, translations.es.readiness)).toEqual([
      'Falta tiempo desde la última graduación (2/6 meses)',
      expect.stringContaining('(14/16)'),
      'Entrena poco: 0.4/semana (mín. 2/semana)',
    ])
  })

  it('explains an unknown last grading date', () => {
    const unknown = computeReadiness({
      ranks: [rank({ id: 'a', order: 0, monthsByDegree: [6, 6] }), rank({ id: 'b', order: 1 })],
      currentRankId: 'a', currentDegree: 0, countSince: null, beltSince: null, stepSince: null,
      dateOfBirth: null, attended: [], now: NOW,
    })
    expect(blockReasons(unknown, translations.en.readiness)).toEqual([translations.en.readiness.gradingDateUnknown])
  })

  it('reports classes left out by the cap', () => {
    expect(overCapLabel(r, translations.en.readiness)).toBe('2 classes don’t count (max 1/week)')
    expect(overCapLabel(r, translations.es.readiness)).toBe('2 clases no cuentan (máx. 1/semana)')
  })
})
