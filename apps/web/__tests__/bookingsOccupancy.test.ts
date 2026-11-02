import { describe, it, expect } from 'vitest'
import {
  buildOccupancy, occupancyWindows, parseSchedule, slotKey, slotMinutes, wallClock, wallToInstant,
  type OccBooking, type OccClass, type OccPeriod,
} from '@/lib/bookings/occupancy'

// Wall time: scheduledAt keeps the timetable's local time in UTC fields
const w = (iso: string) => new Date(iso + 'Z')
// Monday 2 Nov 2026, 12:00 in Madrid
const NOW_WALL = w('2026-11-02T12:00:00')

const cls = (over: Partial<OccClass> & { id: string }): OccClass => ({
  name: over.id, capacity: 30, duration: 60, isActive: true, schedule: [], createdAt: w('2026-01-01T00:00:00'), ...over,
})
let n = 0
const book = (classId: string, at: string, over: Partial<OccBooking> = {}): OccBooking => ({
  classId, userId: `u${n++}`, scheduledAt: w(at), status: 'COMPLETED', attended: true, bookedByRole: 'STUDENT', ...over,
})
// First booking ever on each slot, as the API computes it
const firstSeen = (bookings: OccBooking[]) => {
  const out: Record<string, Date> = {}
  for (const b of bookings) {
    if (b.status === 'CANCELLED') continue
    const k = slotKey(b.classId, b.scheduledAt.getUTCDay(), b.scheduledAt.toISOString().slice(11, 16))
    if (!out[k] || b.scheduledAt < out[k]!) out[k] = b.scheduledAt
  }
  return out
}
// Wall clock = UTC unless a test needs a real timezone
const run = (classes: OccClass[], bookings: OccBooking[], opts: { now?: Date; timeZone?: string; period?: OccPeriod; cancellations?: { classId: string; date: string }[] } = {}) =>
  buildOccupancy({
    classes, bookings, cancellations: opts.cancellations ?? [], period: opts.period ?? '30d',
    now: opts.now ?? NOW_WALL, timeZone: opts.timeZone ?? 'UTC', slotFirstSeen: firstSeen(bookings),
  })
const times = (k: number, classId: string, at: string, over: Partial<OccBooking> = {}) => Array.from({ length: k }, () => book(classId, at, over))

const beginners = cls({ id: 'beg', name: 'Beginners', schedule: [{ dayOfWeek: 4, startTime: '19:00', endTime: '20:00' }] })
const allLevels = cls({ id: 'all', name: 'All levels', schedule: [{ dayOfWeek: 4, startTime: '19:00', endTime: '20:30' }] })
const grading = cls({ id: 'grad', name: 'Grading', schedule: [] })

function scenario() {
  n = 0
  const bookings: OccBooking[] = [
    // Current 30 days (from 4 Oct): Thursdays 8, 15, 22, 29 Oct
    ...['08', '15', '22'].flatMap(d => times(2, 'beg', `2026-10-${d}T19:00:00`)),
    book('beg', '2026-10-29T19:00:00', { status: 'CONFIRMED', attended: false }), // unmarked
    ...['08', '22', '29'].flatMap(d => times(26, 'all', `2026-10-${d}T19:00:00`)),
    book('beg', '2026-10-22T08:00:00'), // not in the timetable
    ...times(12, 'grad', '2026-10-17T11:00:00', { bookedByRole: 'STAFF' }),
    book('beg', '2026-10-29T19:00:00', { status: 'CANCELLED', attended: false }),
    book('beg', '2026-11-05T19:00:00', { status: 'CONFIRMED', attended: false }), // future
    // Previous 30 days (4 Sep – 3 Oct): Thursdays 10, 17, 24 Sep and 1 Oct, 6 each
    ...['09-10', '09-17', '09-24', '10-01'].flatMap(d => times(6, 'beg', `2026-${d}T19:00:00`)),
  ]
  return run([beginners, allLevels, grading], bookings, { cancellations: [{ classId: 'all', date: '2026-10-15' }] })
}

describe('bookings occupancy', () => {
  it('counts every held session, booked or not, and skips cancelled occurrences', () => {
    const r = scenario()
    const beg = r.slots.find(s => s.classId === 'beg')!
    const all = r.slots.find(s => s.classId === 'all')!
    expect(beg.sessions).toBe(4) // 29 Oct only has an unmarked booking: still a session
    expect(beg.avgAttended).toBe(1.5)
    expect(all.sessions).toBe(3) // 15 Oct cancelled
    expect(all.avgAttended).toBe(26)
  })

  it('flags quiet and nearly full classes and what else runs at that time', () => {
    const r = scenario()
    const beg = r.slots.find(s => s.classId === 'beg')!
    const all = r.slots.find(s => s.classId === 'all')!
    expect(beg.low).toBe(true)
    expect(beg.overlaps).toEqual([{ className: 'All levels', time: '19:00', avgAttended: 26 }])
    expect(all.full).toBe(true) // 26 / 30 ≥ 85 %
    expect(all.low).toBe(false)
  })

  it('compares with the previous period', () => {
    const beg = scenario().slots.find(s => s.classId === 'beg')!
    expect(beg.prevAvgAttended).toBe(6)
    expect(beg.trend).toBe('DOWN')
  })

  it('keeps bookings outside the timetable apart, and classes without one', () => {
    const r = scenario()
    expect(r.offSchedule).toEqual([
      { classId: 'beg', className: 'Beginners', date: '2026-10-22', time: '08:00', booked: 1, attended: 1, reason: 'NOT_IN_SCHEDULE' },
      { classId: 'grad', className: 'Grading', date: '2026-10-17', time: '11:00', booked: 12, attended: 12, reason: 'NO_SCHEDULE' },
    ])
  })

  it('lists past classes with bookings nobody marked, not future or cancelled ones', () => {
    expect(scenario().unmarked).toEqual([{ classId: 'beg', className: 'Beginners', date: '2026-10-29', time: '19:00', unmarked: 1 }])
  })

  it('totals: sessions, attendance, students and who booked', () => {
    const t = scenario().totals
    expect(t.sessions).toBe(4 + 3 + 2) // + one off-timetable session + the grading
    expect(t.attended).toBe(6 + 78 + 1 + 12)
    expect(t.students).toBe(97)
    expect(t.staffBooked).toBe(12)
    expect(t.selfBooked).toBe(6 + 1 + 78 + 1)
    expect(t.prevAvgPerSession).toBe(6) // All levels had no bookings yet then: no invented sessions
  })

  it('does not invent empty sessions for a slot nobody ever booked', () => {
    const r = run([beginners], [])
    expect(r.slots).toEqual([])
    expect(r.totals.sessions).toBe(0)
    expect(r.totals.avgPerSession).toBeNull()
  })

  it('a timetable change does not create past sessions at the new time', () => {
    // Ran Mondays 10:00 (5 people, 4 times); the timetable now says 18:00
    n = 0
    const moved = cls({ id: 'mv', name: 'Moved', schedule: [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }] })
    const r = run([moved], ['05', '12', '19', '26'].flatMap(d => times(5, 'mv', `2026-10-${d}T10:00:00`)))
    expect(r.slots).toEqual([]) // no invented 18:00 sessions, no "quiet class"
    expect(r.offSchedule).toHaveLength(4)
    expect(r.offSchedule.every(o => o.reason === 'NOT_IN_SCHEDULE')).toBe(true)
    expect(r.totals.avgPerSession).toBe(5)
  })

  it('a session still running is not counted yet', () => {
    const r = run([beginners], [book('beg', '2026-10-29T19:00:00')], { now: w('2026-10-29T19:30:00') })
    expect(r.slots).toEqual([])
  })

  it('a class past midnight lasts until its end and is unmarked three hours later', () => {
    const late = cls({ id: 'late', name: 'Late', schedule: [{ dayOfWeek: 1, startTime: '23:30', endTime: '01:30' }] })
    expect(slotMinutes(late, late.schedule[0]!)).toBe(120)
    const bookings = [book('late', '2026-10-26T23:30:00', { status: 'CONFIRMED', attended: false })]
    const during = run([late], bookings, { now: w('2026-10-26T23:45:00') })
    expect(during.slots).toEqual([])
    expect(during.unmarked).toEqual([])
    expect(run([late], bookings, { now: w('2026-10-27T04:29:00') }).unmarked).toEqual([])
    expect(run([late], bookings, { now: w('2026-10-27T04:30:00') }).unmarked).toHaveLength(1)
  })

  it('"not marked" waits three real hours across a DST change', () => {
    // Madrid, 29 Mar 2026: clocks jump 02:00 → 03:00. Class 00:30–01:30 local
    const night = cls({ id: 'night', name: 'Night', schedule: [{ dayOfWeek: 0, startTime: '00:30', endTime: '01:30' }] })
    const bookings = [book('night', '2026-03-29T00:30:00', { status: 'CONFIRMED', attended: false })]
    const opts = { timeZone: 'Europe/Madrid' }
    // 04:45 local = 02:45Z: only 2 h 15 min since it ended (00:30Z)
    expect(run([night], bookings, { ...opts, now: new Date('2026-03-29T02:45:00Z') }).unmarked).toEqual([])
    expect(run([night], bookings, { ...opts, now: new Date('2026-03-29T03:30:00Z') }).unmarked).toHaveLength(1)
  })
})

describe('wall time and windows', () => {
  it('reads the school clock on both sides of a DST change', () => {
    expect(wallClock(new Date('2026-10-25T00:30:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-10-25T02:30:00.000Z')
    expect(wallClock(new Date('2026-10-25T01:30:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-10-25T02:30:00.000Z')
    expect(wallClock(new Date('2026-11-02T11:00:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-11-02T12:00:00.000Z')
  })

  it('turns wall time back into the real instant, DST included', () => {
    expect(wallToInstant(w('2026-03-29T01:30:00'), 'Europe/Madrid').toISOString()).toBe('2026-03-29T00:30:00.000Z')
    expect(wallToInstant(w('2026-03-29T05:30:00'), 'Europe/Madrid').toISOString()).toBe('2026-03-29T03:30:00.000Z')
    expect(wallToInstant(w('2026-11-02T12:00:00'), 'Europe/Madrid').toISOString()).toBe('2026-11-02T11:00:00.000Z')
    expect(wallToInstant(w('2026-11-02T12:00:00'), 'America/Sao_Paulo').toISOString()).toBe('2026-11-02T15:00:00.000Z')
  })

  it('last N days including today, and the same length before', () => {
    const { current, previous } = occupancyWindows('30d', NOW_WALL)
    expect(current.from.toISOString()).toBe('2026-10-04T00:00:00.000Z')
    expect(previous.from.toISOString()).toBe('2026-09-04T00:00:00.000Z')
    expect(previous.to.getTime()).toBe(current.from.getTime() - 1)
  })

  it('reads free-form schedules safely', () => {
    expect(parseSchedule(null)).toEqual([])
    expect(parseSchedule('x')).toEqual([])
    expect(parseSchedule([{ dayOfWeek: 1, startTime: '10:00', endTime: '11:30' }, { foo: 1 }, null])).toEqual([{ dayOfWeek: 1, startTime: '10:00', endTime: '11:30' }])
  })
})
