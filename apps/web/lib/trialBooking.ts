import { nextOccurrence, type ScheduleSlot } from '@/lib/scheduling'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface BookableClass {
  id: string
  name: string
  schedule: ScheduleSlot[] | null
  level: string | null
}

export interface BookingSession {
  classId: string
  className: string
  level: string
  startTime: string
  endTime: string
  dayLabel: string
  dayOfWeek: number
  schedule: ScheduleSlot[]
}

export function selectCtaClasses<T>(hasFreeTrialCls: boolean, trialClasses: T[], allClasses: T[]): T[] {
  return hasFreeTrialCls ? trialClasses : allClasses
}

// A class only has something to book if it has at least one real weekly
// schedule slot. Classes like "Graduación" or "Open Mat" (schedule: null
// or []) are real and worth listing, but there's no specific session to
// construct a booking for — callers must use this to render/gate them as
// non-interactive instead of wiring a click handler that silently does
// nothing when buildBookingSession() returns null.
export function hasBookableSchedule(cls: Pick<BookableClass, 'schedule'>): boolean {
  return (cls.schedule?.length ?? 0) > 0
}

export function buildBookingSession(cls: BookableClass, from = new Date()): BookingSession | null {
  const schedule = cls.schedule ?? []
  const slot = schedule[0]
  if (!slot) return null

  const nextDate = nextOccurrence(from, slot.dayOfWeek, slot.startTime)
  return {
    classId: cls.id,
    className: cls.name,
    level: cls.level ?? '',
    startTime: slot.startTime,
    endTime: slot.endTime,
    dayLabel: DAY_NAMES[nextDate.getUTCDay()] ?? '',
    dayOfWeek: slot.dayOfWeek,
    schedule,
  }
}

// Pure decision behind clicking a row in the CTA's class chooser: resolve a
// booking session by id from a list that may contain non-bookable classes.
// Returns null both when the id isn't found and when the matched class has
// no bookable schedule — same signal, so callers never need to special-case
// "not found" vs "found but nothing to book".
export function selectBookingSession(classes: BookableClass[], classId: string, from = new Date()): BookingSession | null {
  const cls = classes.find(c => c.id === classId)
  if (!cls) return null
  return buildBookingSession(cls, from)
}
