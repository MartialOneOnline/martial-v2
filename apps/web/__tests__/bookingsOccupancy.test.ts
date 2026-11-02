import { describe, it, expect } from 'vitest'
import {
  buildOccupancy, occupancyWindows, parseSchedule, wallClock,
  type OccBooking, type OccClass,
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
  return buildOccupancy({
    classes: [beginners, allLevels, grading],
    bookings,
    cancellations: [{ classId: 'all', date: '2026-10-15' }],
    period: '30d',
    nowWall: NOW_WALL,
    firstBookingAt: w('2026-01-01T00:00:00'),
  })
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
    expect(t.prevAvgPerSession).toBe(3) // All levels had 4 empty sessions then
  })

  it('does not invent empty sessions before the school started taking bookings', () => {
    const r = buildOccupancy({
      classes: [beginners], bookings: [], cancellations: [], period: '30d', nowWall: NOW_WALL, firstBookingAt: null,
    })
    expect(r.slots).toEqual([])
    expect(r.totals.sessions).toBe(0)
    expect(r.totals.avgPerSession).toBeNull()
  })

  it('a session still running is not counted yet', () => {
    const now = w('2026-10-29T19:30:00')
    const r = buildOccupancy({
      classes: [beginners], bookings: [book('beg', '2026-10-29T19:00:00')], cancellations: [], period: '30d', nowWall: now, firstBookingAt: w('2026-10-29T19:00:00'),
    })
    expect(r.slots).toEqual([])
  })
})

describe('wall time and windows', () => {
  it('reads the school clock on both sides of a DST change', () => {
    expect(wallClock(new Date('2026-10-25T00:30:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-10-25T02:30:00.000Z')
    expect(wallClock(new Date('2026-10-25T01:30:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-10-25T02:30:00.000Z')
    expect(wallClock(new Date('2026-11-02T11:00:00Z'), 'Europe/Madrid').toISOString()).toBe('2026-11-02T12:00:00.000Z')
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
