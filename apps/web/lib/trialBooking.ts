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
