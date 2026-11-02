// Bookings report: how full each class of the weekly timetable is
// (2026-11-02, agreed with the school owner).
//
// Times: Booking.scheduledAt stores the timetable's wall-clock time in UTC
// fields (a 10:00 class is saved as 10:00Z — see scheduledAtForDate in
// lib/scheduling.ts). So everything here works in "wall time": the booking's
// UTC fields are the school's local time, and `now` is converted the same way
// with wallClock(). Pure — the API route loads the rows.

export type OccPeriod = '30d' | '90d' | '12m'
export const OCC_PERIODS: OccPeriod[] = ['30d', '90d', '12m']
export const isOccPeriod = (p: string | null): p is OccPeriod => p === '30d' || p === '90d' || p === '12m'
const PERIOD_DAYS: Record<OccPeriod, number> = { '30d': 30, '90d': 90, '12m': 365 }

/** An unbooked occurrence counts only between booked sessions of its slot this close on each side */
export const EVIDENCE_DAYS = 28 // see slotsFor
/** Fewer people than this on average, over at least LOW_MIN_SESSIONS sessions */
export const LOW_AVG = 5
export const LOW_MIN_SESSIONS = 3
/** Bookings (or attendance) at this share of capacity or more */
export const FULL_SHARE = 0.85
/** A past class with bookings still unmarked this long after it ended */
export const UNMARKED_AFTER_MIN = 180
/** When neither the slot nor the class says how long it lasts */
export const DEFAULT_MINUTES = 60

const DAY = 86_400_000

export interface ScheduleSlotIn { dayOfWeek: number; startTime: string; endTime?: string | null }

export interface OccClass {
  id: string
  name: string
  capacity: number | null
  duration: number | null
  isActive: boolean
  schedule: ScheduleSlotIn[]
  createdAt: Date
}

export interface OccBooking {
  classId: string
  userId: string
  scheduledAt: Date
  status: string
  attended: boolean
  bookedByRole: string
}

export interface Cancellation { classId: string; date: string }

export interface Window { from: Date; to: Date }

// Building an Intl formatter is slow; one per timezone is enough
const formatters = new Map<string, Intl.DateTimeFormat>()
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
    formatters.set(timeZone, f)
  }
  return f
}

/** The school's civil time now, in UTC fields (same convention as scheduledAt) */
export function wallClock(now: Date, timeZone: string): Date {
  const parts = formatterFor(timeZone).formatToParts(now)
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? 0)
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')))
}

const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
export const dateKey = (d: Date) => d.toISOString().slice(0, 10)
export const hhmm = (d: Date) => d.toISOString().slice(11, 16)
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return (h ?? 0) * 60 + (m ?? 0) }
const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

/**
 * The real instant of a wall-clock time in the school's timezone (inverse of
 * wallClock). Tries the offsets in force a day before and a day after (at most
 * one DST change sits in between):
 * - one matches → that instant;
 * - both match (the repeated hour when clocks go back) → the earlier one;
 * - neither (a time skipped when clocks go forward, e.g. 00:30 on a day that
 *   jumps from 00:00 to 01:00) → read with the offset from before the jump,
 *   which lands just after it (00:30 → 01:30), never before.
 */
export function wallToInstant(wall: Date, timeZone: string): Date {
  const w = wall.getTime()
  const offsetAt = (t: number) => wallClock(new Date(t), timeZone).getTime() - Math.floor(t / 1000) * 1000
  const before = w - offsetAt(w - DAY)
  const after = w - offsetAt(w + DAY)
  const fits = (t: number) => wallClock(new Date(t), timeZone).getTime() === Math.floor(w / 1000) * 1000
  const okBefore = fits(before), okAfter = fits(after)
  if (okBefore && okAfter) return new Date(Math.min(before, after))
  if (okAfter) return new Date(after)
  return new Date(before)
}

/** First day of bookings buildOccupancy needs: the previous window minus the evidence margin */
export const evidenceFrom = (previous: Window) => new Date(previous.from.getTime() - EVIDENCE_DAYS * DAY)

/** The last N days up to now (today included), and the same length right before it */
export function occupancyWindows(period: OccPeriod, nowWall: Date): { current: Window; previous: Window } {
  const days = PERIOD_DAYS[period]
  const from = new Date(startOfDay(nowWall).getTime() - (days - 1) * DAY)
  return {
    current: { from, to: nowWall },
    previous: { from: new Date(from.getTime() - days * DAY), to: new Date(from.getTime() - 1) },
  }
}

const attendedOf = (b: OccBooking) => b.attended || b.status === 'COMPLETED'
const isBooked = (b: OccBooking) => b.status !== 'CANCELLED'

const classMinutes = (cls: OccClass) => (cls.duration && cls.duration > 0 ? cls.duration : DEFAULT_MINUTES)

/** Slot length; an end time at or before the start means it runs past midnight */
export function slotMinutes(cls: OccClass, slot: ScheduleSlotIn): number {
  if (!slot.endTime || !/^\d{2}:\d{2}$/.test(slot.endTime) || slot.endTime === slot.startTime) return classMinutes(cls)
  const len = toMin(slot.endTime) - toMin(slot.startTime)
  return len > 0 ? len : len + 24 * 60
}

/** Key of a timetable slot */
export const slotKey = (classId: string, dayOfWeek: number, time: string) => `${classId}|${dayOfWeek}|${time}`

interface Clock { now: Date; timeZone: string; nowWall: Date; starts: Map<number, number> }
const makeClock = (now: Date, timeZone: string): Clock => ({ now, timeZone, nowWall: wallClock(now, timeZone), starts: new Map() })
/**
 * Has a session ended (plus a margin), in real elapsed time? The real end is
 * the real start plus its length, so it never falls before the start on a DST
 * night. Start instants are cached: every student of a session shares one.
 */
function endedBy(clock: Clock, wallStart: Date, minutes: number, marginMin = 0): boolean {
  const key = wallStart.getTime()
  let start = clock.starts.get(key)
  if (start === undefined) {
    start = wallToInstant(wallStart, clock.timeZone).getTime()
    clock.starts.set(key, start)
  }
  return start + (minutes + marginMin) * 60_000 <= clock.now.getTime()
}

export interface SlotStat {
  key: string
  classId: string
  className: string
  dayOfWeek: number
  time: string
  endTime: string
  capacity: number | null
  sessions: number
  attended: number
  booked: number
  avgAttended: number
  avgBooked: number
  /** Average attendance / capacity, 0–1; null without capacity */
  fill: number | null
  prevAvgAttended: number | null
  trend: 'UP' | 'DOWN' | null
  low: boolean
  full: boolean
  /** Other classes on at the same time, busiest first */
  overlaps: Array<{ className: string; time: string; avgAttended: number }>
}

export interface OffSession {
  classId: string
  className: string
  date: string
  time: string
  booked: number
  attended: number
  /** The class has no fixed timetable (an event, an open mat) or the time isn't in it */
  reason: 'NO_SCHEDULE' | 'NOT_IN_SCHEDULE'
}

export interface UnmarkedSession { classId: string; className: string; date: string; time: string; unmarked: number }

interface SessionAgg { booked: number; attended: number }
type InternalSlot = Omit<SlotStat, 'prevAvgAttended' | 'trend' | 'low' | 'full' | 'overlaps'> & { minutes: number }

const round1 = (n: number) => Math.round(n * 10) / 10
const dayNumber = (d: Date) => Math.floor(d.getTime() / DAY)

/**
 * Where the evidence is that a slot really ran: the days each timetable slot
 * had a booked session, and the days a class had a session at a time that is
 * not in its current timetable (it ran elsewhere that day).
 */
interface Evidence { bookedDays: Map<string, number[]>; ranElsewhere: Set<string> }
function gatherEvidence(classes: OccClass[], bookings: OccBooking[]): Evidence {
  const scheduled = new Set(classes.flatMap(c => c.schedule.map(s => slotKey(c.id, s.dayOfWeek, s.startTime))))
  const bookedDays = new Map<string, number[]>()
  const ranElsewhere = new Set<string>()
  for (const b of bookings) {
    if (!isBooked(b)) continue
    const key = slotKey(b.classId, b.scheduledAt.getUTCDay(), hhmm(b.scheduledAt))
    if (scheduled.has(key)) {
      const days = bookedDays.get(key) ?? []
      days.push(dayNumber(b.scheduledAt))
      bookedDays.set(key, days)
    } else {
      ranElsewhere.add(`${b.classId}|${dateKey(b.scheduledAt)}`)
    }
  }
  for (const days of bookedDays.values()) days.sort((a, b) => a - b)
  return { bookedDays, ranElsewhere }
}

/** Is there a value in [from, to] in the sorted list? */
function hasIn(sorted: number[], from: number, to: number): boolean {
  let lo = 0, hi = sorted.length
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid]! < from) lo = mid + 1; else hi = mid }
  return lo < sorted.length && sorted[lo]! <= to
}
/** A gap between real sessions of the slot: one booked within `range` days before and one after */
const betweenBooked = (sorted: number[], day: number, range: number) =>
  hasIn(sorted, day - range, day) && hasIn(sorted, day, day + range)

/**
 * Per timetable slot: sessions held in the window and how many came.
 * A session is held when it has ended by now (real time). A session nobody
 * booked still counts (as zero) only with evidence the slot was running then:
 * it sits between booked sessions of the same slot (one within EVIDENCE_DAYS
 * before, one within EVIDENCE_DAYS after), and the class had no session at a
 * time outside the timetable that day. Before a slot's first booking, after
 * its last one, or across a long break, nothing is assumed. The timetable as it is
 * today says nothing about the times a class ran before a change (or between
 * two periods at the same time). Cancelled occurrences never count.
 */
function slotsFor(input: {
  classes: OccClass[]; bookings: OccBooking[]; cancellations: Cancellation[]
  window: Window; clock: Clock; evidence: Evidence
}): { slots: Map<string, InternalSlot>; off: OffSession[] } {
  const { classes, bookings, window, clock, evidence } = input
  const cancelled = new Set(input.cancellations.map(c => `${c.classId}|${c.date}`))
  const byClass = new Map(classes.map(c => [c.id, c]))
  const slots = new Map<string, InternalSlot>()
  const sessions = new Map<string, Map<string, SessionAgg>>() // slot key → date → counts
  const off = new Map<string, OffSession>()

  for (const cls of classes) {
    for (const s of cls.schedule) {
      if (!Number.isInteger(s.dayOfWeek) || !/^\d{2}:\d{2}$/.test(s.startTime)) continue
      const key = slotKey(cls.id, s.dayOfWeek, s.startTime)
      const minutes = slotMinutes(cls, s)
      slots.set(key, {
        key, minutes, classId: cls.id, className: cls.name, dayOfWeek: s.dayOfWeek, time: s.startTime,
        endTime: fromMin(toMin(s.startTime) + minutes), capacity: cls.capacity && cls.capacity > 0 ? cls.capacity : null,
        sessions: 0, attended: 0, booked: 0, avgAttended: 0, avgBooked: 0, fill: null,
      })
      const dates = new Map<string, SessionAgg>()
      sessions.set(key, dates)
      const booked = evidence.bookedDays.get(key)
      if (!cls.isActive || !booked) continue
      // Expected occurrences, booked or not, while the slot is known to run
      const first = new Date(Math.max(window.from.getTime(), startOfDay(cls.createdAt).getTime()))
      for (let d = startOfDay(first); d <= window.to; d = new Date(d.getTime() + DAY)) {
        if (d.getUTCDay() !== s.dayOfWeek) continue
        const start = new Date(d.getTime() + toMin(s.startTime) * 60_000)
        if (start < window.from || !endedBy(clock, start, minutes)) continue
        if (cancelled.has(`${cls.id}|${dateKey(d)}`)) continue
        if (!betweenBooked(booked, dayNumber(d), EVIDENCE_DAYS) || evidence.ranElsewhere.has(`${cls.id}|${dateKey(d)}`)) continue
        dates.set(dateKey(d), { booked: 0, attended: 0 })
      }
    }
  }

  for (const b of bookings) {
    if (b.scheduledAt < window.from || b.scheduledAt > window.to) continue
    const cls = byClass.get(b.classId)
    if (!cls || !isBooked(b)) continue
    const time = hhmm(b.scheduledAt)
    const key = slotKey(cls.id, b.scheduledAt.getUTCDay(), time)
    const slot = slots.get(key)
    if (!endedBy(clock, b.scheduledAt, slot ? slot.minutes : classMinutes(cls))) continue // not over yet
    const date = dateKey(b.scheduledAt)
    if (slot) {
      const dates = sessions.get(key)!
      const agg = dates.get(date) ?? { booked: 0, attended: 0 }
      agg.booked++
      if (attendedOf(b)) agg.attended++
      dates.set(date, agg)
    } else {
      const okey = `${cls.id}|${date}|${time}`
      const o = off.get(okey) ?? {
        classId: cls.id, className: cls.name, date, time, booked: 0, attended: 0,
        reason: cls.schedule.length ? 'NOT_IN_SCHEDULE' as const : 'NO_SCHEDULE' as const,
      }
      o.booked++
      if (attendedOf(b)) o.attended++
      off.set(okey, o)
    }
  }

  for (const [key, slot] of slots) {
    const dates = [...sessions.get(key)!.values()]
    slot.sessions = dates.length
    slot.booked = dates.reduce((s, d) => s + d.booked, 0)
    slot.attended = dates.reduce((s, d) => s + d.attended, 0)
    slot.avgAttended = dates.length ? round1(slot.attended / dates.length) : 0
    slot.avgBooked = dates.length ? round1(slot.booked / dates.length) : 0
    slot.fill = slot.capacity && dates.length ? Math.round((slot.attended / dates.length / slot.capacity) * 100) / 100 : null
  }
  return { slots, off: [...off.values()].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)) }
}

export interface Occupancy {
  slots: SlotStat[]
  offSchedule: OffSession[]
  unmarked: UnmarkedSession[]
  totals: {
    sessions: number
    attended: number
    avgPerSession: number | null
    prevAvgPerSession: number | null
    /** Average share of capacity used, 0–1, over sessions of classes with a capacity */
    fill: number | null
    students: number
    prevStudents: number
    selfBooked: number
    staffBooked: number
  }
  trend: Array<{ key: string; booked: number; attended: number; cancelled: number }>
}

export function buildOccupancy(input: {
  classes: OccClass[]
  bookings: OccBooking[]
  cancellations: Cancellation[]
  period: OccPeriod
  /** Real current instant and the school's timezone */
  now: Date
  timeZone: string
}): Occupancy {
  const clock = makeClock(input.now, input.timeZone)
  const { current, previous } = occupancyWindows(input.period, clock.nowWall)
  // Bookings should reach EVIDENCE_DAYS before the previous window (see evidenceFrom)
  const evidence = gatherEvidence(input.classes, input.bookings)
  const cur = slotsFor({ ...input, clock, evidence, window: current })
  const prev = slotsFor({ ...input, clock, evidence, window: previous })

  const all = [...cur.slots.values()].filter(s => s.sessions > 0)
  const slots: SlotStat[] = all.map(s => {
    const p = prev.slots.get(s.key)
    const prevAvg = p && p.sessions >= LOW_MIN_SESSIONS ? p.avgAttended : null
    let trend: SlotStat['trend'] = null
    if (prevAvg !== null && s.sessions >= LOW_MIN_SESSIONS) {
      const diff = s.avgAttended - prevAvg
      if (Math.abs(diff) >= Math.max(1, prevAvg * 0.15)) trend = diff > 0 ? 'UP' : 'DOWN'
    }
    const start = toMin(s.time), end = start + s.minutes
    const overlaps = all
      .filter(o => o.classId !== s.classId && o.dayOfWeek === s.dayOfWeek && toMin(o.time) < end && start < toMin(o.time) + o.minutes)
      .sort((a, b) => b.avgAttended - a.avgAttended)
      .map(o => ({ className: o.className, time: o.time, avgAttended: o.avgAttended }))
    const peak = Math.max(s.avgAttended, s.avgBooked)
    const { minutes: _minutes, ...pub } = s // eslint-disable-line @typescript-eslint/no-unused-vars
    return {
      ...pub,
      prevAvgAttended: prevAvg,
      trend,
      low: s.sessions >= LOW_MIN_SESSIONS && s.avgAttended < LOW_AVG,
      full: !!s.capacity && s.sessions >= 2 && peak / s.capacity >= FULL_SHARE,
      overlaps,
    }
  }).sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7) || a.time.localeCompare(b.time))

  // Totals over every held session, timetable or not
  const sessionCount = (r: ReturnType<typeof slotsFor>) => {
    const slotsArr = [...r.slots.values()]
    const offDates = new Set(r.off.map(o => `${o.classId}|${o.date}|${o.time}`))
    return {
      sessions: slotsArr.reduce((n, s) => n + s.sessions, 0) + offDates.size,
      attended: slotsArr.reduce((n, s) => n + s.attended, 0) + r.off.reduce((n, o) => n + o.attended, 0),
    }
  }
  const c = sessionCount(cur), p = sessionCount(prev)
  const withCap = slots.filter(s => s.capacity)
  const capSeats = withCap.reduce((n, s) => n + s.sessions * s.capacity!, 0)

  const inWindow = (b: OccBooking, w: Window) => b.scheduledAt >= w.from && b.scheduledAt <= w.to && b.scheduledAt <= clock.nowWall
  const curBookings = input.bookings.filter(b => inWindow(b, current))
  const students = new Set(curBookings.filter(attendedOf).map(b => b.userId)).size
  const prevStudents = new Set(input.bookings.filter(b => inWindow(b, previous) && attendedOf(b)).map(b => b.userId)).size
  const booked = curBookings.filter(isBooked)

  // Unmarked: booked, not cancelled, no attendance and no no-show, well after the class ended
  const byClass = new Map(input.classes.map(cl => [cl.id, cl]))
  const unmarked = new Map<string, UnmarkedSession>()
  for (const b of curBookings) {
    if (b.status !== 'CONFIRMED' && b.status !== 'PENDING') continue
    if (b.attended) continue
    const cls = byClass.get(b.classId)
    if (!cls) continue
    const time = hhmm(b.scheduledAt)
    const slot = cur.slots.get(slotKey(cls.id, b.scheduledAt.getUTCDay(), time))
    // Three real hours after the class ended (not wall hours: DST nights differ)
    if (!endedBy(clock, b.scheduledAt, slot ? slot.minutes : classMinutes(cls), UNMARKED_AFTER_MIN)) continue
    const key = `${cls.id}|${dateKey(b.scheduledAt)}|${time}`
    const u = unmarked.get(key) ?? { classId: cls.id, className: cls.name, date: dateKey(b.scheduledAt), time, unmarked: 0 }
    u.unmarked++
    unmarked.set(key, u)
  }

  // Trend: weeks (Monday start) for 30/90 days, months for 12 months
  const bucket = (d: Date) => {
    if (input.period === '12m') return d.toISOString().slice(0, 7)
    const day = startOfDay(d)
    return dateKey(new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * DAY))
  }
  const trendMap = new Map<string, { key: string; booked: number; attended: number; cancelled: number }>()
  for (let d = current.from; d <= current.to; d = new Date(d.getTime() + DAY)) {
    const k = bucket(d)
    if (!trendMap.has(k)) trendMap.set(k, { key: k, booked: 0, attended: 0, cancelled: 0 })
  }
  for (const b of curBookings) {
    const row = trendMap.get(bucket(b.scheduledAt))
    if (!row) continue
    if (b.status === 'CANCELLED') row.cancelled++
    else row.booked++
    if (attendedOf(b)) row.attended++
  }

  return {
    slots,
    offSchedule: cur.off,
    unmarked: [...unmarked.values()].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    totals: {
      sessions: c.sessions,
      attended: c.attended,
      avgPerSession: c.sessions ? round1(c.attended / c.sessions) : null,
      prevAvgPerSession: p.sessions ? round1(p.attended / p.sessions) : null,
      fill: capSeats ? Math.round((withCap.reduce((n, s) => n + s.attended, 0) / capSeats) * 100) / 100 : null,
      students,
      prevStudents,
      selfBooked: booked.filter(b => b.bookedByRole !== 'STAFF').length,
      staffBooked: booked.filter(b => b.bookedByRole === 'STAFF').length,
    },
    trend: [...trendMap.values()],
  }
}

/** Reads Class.schedule safely (it is free JSON; a few rows hold null or []) */
export function parseSchedule(raw: unknown): ScheduleSlotIn[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(s => {
    if (!s || typeof s !== 'object') return []
    const { dayOfWeek, startTime, endTime } = s as Record<string, unknown>
    if (typeof dayOfWeek !== 'number' || typeof startTime !== 'string') return []
    return [{ dayOfWeek, startTime, endTime: typeof endTime === 'string' ? endTime : null }]
  })
}
