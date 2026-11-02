import { describe, it, expect } from 'vitest'
import { aggregateNoShows, bucketFor, buildAbsenceLists, daysBetween, usualPerWeek, type StudentInput } from '@/lib/absences/stopped'

const TZ = 'Europe/Madrid'
const at = (iso: string) => new Date(iso)
const student = (id: string, over: Partial<StudentInput> = {}): StudentInput => ({
  memberId: `m-${id}`, userId: id, name: id, email: `${id}@x.com`, phone: null, avatarUrl: null, joinedAt: at('2026-01-10T10:00:00Z'), ...over,
})

describe('buckets and days', () => {
  it('7–13 warning, 14–29 at risk, 30+ nearly lost, under 7 nothing', () => {
    expect(bucketFor(6)).toBeNull()
    expect(bucketFor(7)).toBe('WARNING')
    expect(bucketFor(13)).toBe('WARNING')
    expect(bucketFor(14)).toBe('AT_RISK')
    expect(bucketFor(29)).toBe('AT_RISK')
    expect(bucketFor(30)).toBe('LOST')
  })
  it('counts calendar days in the school timezone (a 23:30 Madrid class is that day, across DST)', () => {
    // 25 Oct 23:30 Madrid = 25 Oct 21:30Z; DST ends on the 26th
    expect(daysBetween(at('2026-10-25T21:30:00Z'), at('2026-11-01T09:00:00Z'), TZ)).toBe(7)
  })
  it('usual frequency = classes in the 8 weeks up to the last class', () => {
    const last = at('2026-10-01T18:00:00Z')
    const dates = Array.from({ length: 16 }, (_, i) => new Date(last.getTime() - i * 3.5 * 86_400_000)) // 2/week
    expect(usualPerWeek(dates, last)).toBe(2)
  })
})

describe('buildAbsenceLists', () => {
  const now = at('2026-11-02T10:00:00Z')
  const lists = buildAbsenceLists({
    students: [
      student('recent'), student('warn'), student('risk-free'), student('risk-paying'), student('lost'),
      student('never'), student('new', { joinedAt: at('2026-10-30T10:00:00Z') }), student('old-only'),
    ],
    classes: new Map([
      ['recent', [at('2026-10-30T18:00:00Z')]],
      ['warn', [at('2026-10-24T18:00:00Z')]],
      ['risk-free', [at('2026-10-10T18:00:00Z')]],
      ['risk-paying', [at('2026-10-15T18:00:00Z'), at('2026-10-13T18:00:00Z')]],
      ['lost', [at('2026-09-01T18:00:00Z')]],
    ]),
    lastEver: new Map([['old-only', at('2025-06-01T18:00:00Z')]]),
    plans: new Map([
      ['risk-paying', { name: 'Mensual', paying: true, trial: false }],
      ['risk-free', { name: 'Access', paying: false, trial: true }],
    ]),
    now, timeZone: TZ,
  })

  it('puts each active student in the right list', () => {
    expect(lists.WARNING.map(r => r.userId)).toEqual(['warn'])
    expect(lists.AT_RISK.map(r => r.userId)).toEqual(['risk-paying', 'risk-free']) // paying first, despite the shorter gap
    expect(lists.LOST.map(r => r.userId).sort()).toEqual(['lost', 'old-only'])
    expect(lists.NEVER.map(r => r.userId)).toEqual(['never']) // joined 3 days ago isn't "never came" yet
  })
  it('a last class older than the loaded history still counts (lastEver)', () => {
    const old = lists.LOST.find(r => r.userId === 'old-only')!
    expect(old.lastClassAt).toEqual(at('2025-06-01T18:00:00Z'))
    expect(old.daysSince).toBeGreaterThan(500)
  })
  it('rows carry the gap, the usual frequency and the plan', () => {
    const r = lists.AT_RISK[0]!
    expect(r).toMatchObject({ daysSince: 18, usualPerWeek: 0.3, plan: { paying: true } })
  })
})

describe('aggregateNoShows', () => {
  it('counts no-shows and unmarked per student, most first, with the class missed most', () => {
    const out = aggregateNoShows([
      { userId: 'a', scheduledAt: at('2026-10-01T18:00:00Z'), status: 'NO_SHOW', className: 'Gi' },
      { userId: 'a', scheduledAt: at('2026-10-08T18:00:00Z'), status: 'CONFIRMED', className: 'Gi' },
      { userId: 'a', scheduledAt: at('2026-10-09T18:00:00Z'), status: 'NO_SHOW', className: 'NoGi' },
      { userId: 'b', scheduledAt: at('2026-10-20T18:00:00Z'), status: 'NO_SHOW', className: 'Kids' },
    ])
    expect(out.map(x => x.userId)).toEqual(['a', 'b'])
    expect(out[0]).toMatchObject({ noShows: 2, unmarked: 1, topClass: 'Gi', lastAt: at('2026-10-09T18:00:00Z') })
  })
})

describe('audit fixes (PR #48)', () => {
  it('P2: "not marked" only 3 hours after the class ENDS; unknown length = 2 h', async () => {
    const { isUnmarked } = await import('@/lib/absences/stopped')
    const start = at('2026-11-02T10:00:00Z')
    // 90-minute class started 4 h ago: ended 2.5 h ago → not yet
    expect(isUnmarked(start, 90, at('2026-11-02T14:00:00Z'))).toBe(false)
    expect(isUnmarked(start, 90, at('2026-11-02T14:30:00Z'))).toBe(true)
    expect(isUnmarked(start, null, at('2026-11-02T14:59:00Z'))).toBe(false)
    expect(isUnmarked(start, null, at('2026-11-02T15:00:00Z'))).toBe(true)
  })

  it('P2: without a join date a student is not listed as "never came"', () => {
    const lists = buildAbsenceLists({
      students: [student('unknown', { joinedAt: null })], classes: new Map(), lastEver: new Map(), plans: new Map(),
      now: at('2026-11-02T10:00:00Z'), timeZone: TZ,
    })
    expect(lists.NEVER).toEqual([])
  })

  it('P2: period limits in the school timezone — 1 Sep 00:30 Madrid is inside 90 days on 2 Nov', async () => {
    const { absencePeriod } = await import('@/lib/absences/periods')
    const p = absencePeriod('90d', TZ, at('2026-11-02T10:00:00Z'))
    const event = at('2026-08-31T22:30:00Z') // 1 Sep 00:30 in Madrid
    expect(p.from.toISOString()).toBe('2026-08-31T22:00:00.000Z')
    expect(event >= p.from).toBe(true)
    expect(p.points.map(x => x.key)).toEqual(['2026-09', '2026-10', '2026-11'])
    expect(p.points[0]!.to.getTime() + 1).toBe(p.points[1]!.from.getTime()) // buckets touch, no gaps
  })

  it('30 days = ten 3-day buckets in local days, across the DST change', async () => {
    const { absencePeriod } = await import('@/lib/absences/periods')
    const p = absencePeriod('30d', TZ, at('2026-11-02T10:00:00Z'))
    expect(p.points).toHaveLength(10)
    expect(p.points[0]!.key).toBe('2026-10-04')
    for (let i = 1; i < p.points.length; i++) expect(p.points[i - 1]!.to.getTime() + 1).toBe(p.points[i]!.from.getTime())
  })
})

describe('zonedStartOfDay (P3: a day without a midnight)', () => {
  it('São Paulo 2018-11-04 starts at 01:00 local (03:00Z), not in the previous day', async () => {
    const { zonedStartOfDay } = await import('@/lib/absences/periods')
    expect(zonedStartOfDay(2018, 11, 4, 'America/Sao_Paulo').toISOString()).toBe('2018-11-04T03:00:00.000Z')
    expect(zonedStartOfDay(2026, 10, 25, 'Europe/Madrid').toISOString()).toBe('2026-10-24T22:00:00.000Z')
    expect(zonedStartOfDay(2026, 11, 0, 'Europe/Madrid').toISOString()).toBe('2026-10-30T23:00:00.000Z') // day 0 = 31 Oct
  })
})
