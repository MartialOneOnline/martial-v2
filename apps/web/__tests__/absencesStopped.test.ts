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
