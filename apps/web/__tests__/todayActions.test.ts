import { describe, it, expect } from 'vitest'
import { justAtRisk, recentUnmarked, todaySessions, topActions, trialDay, type AwayRow } from '@/lib/today/actions'

// Wall time: bookings keep the timetable's local time in UTC fields
const w = (iso: string) => new Date(iso + 'Z')
const NOW_WALL = w('2026-11-03T11:00:00') // Tuesday

describe('today sessions', () => {
  const classes = [
    { id: 'nogi', name: 'NOGI', capacity: 30, duration: 90, isActive: true, schedule: [{ dayOfWeek: 2, startTime: '10:00', endTime: '11:30' }, { dayOfWeek: 2, startTime: '20:00', endTime: '21:30' }, { dayOfWeek: 4, startTime: '10:00', endTime: '11:30' }] },
    { id: 'late', name: 'Late', capacity: null, duration: 60, isActive: true, schedule: [{ dayOfWeek: 2, startTime: '23:30', endTime: '00:30' }] },
    { id: 'off', name: 'Old', capacity: 20, duration: 60, isActive: false, schedule: [{ dayOfWeek: 2, startTime: '09:00', endTime: '10:00' }] },
    { id: 'event', name: 'Grading', capacity: 50, duration: null, isActive: true, schedule: null },
  ]
  const bookings = [
    { classId: 'nogi', scheduledAt: w('2026-11-03T10:00:00') },
    { classId: 'nogi', scheduledAt: w('2026-11-03T10:00:00') },
    { classId: 'nogi', scheduledAt: w('2026-11-03T20:00:00') },
    { classId: 'nogi', scheduledAt: w('2026-11-04T10:00:00') }, // tomorrow
  ]

  it('lists today’s slots with their bookings, by time; skips inactive and unscheduled classes', () => {
    const s = todaySessions({ classes, bookings, cancelledClassIds: new Set(['late']), nowWall: NOW_WALL })
    expect(s.map(x => [x.className, x.time, x.endTime, x.booked, x.capacity, x.cancelled])).toEqual([
      ['NOGI', '10:00', '11:30', 2, 30, false],
      ['NOGI', '20:00', '21:30', 1, 30, false],
      ['Late', '23:30', '00:30', 0, null, true],
    ])
  })
})

describe('today helpers', () => {
  it('keeps unmarked classes of the last 7 days', () => {
    const list = [
      { classId: 'a', className: 'A', date: '2026-10-27', time: '10:00', unmarked: 1 },
      { classId: 'a', className: 'A', date: '2026-10-26', time: '10:00', unmarked: 2 },
    ]
    expect(recentUnmarked(list, NOW_WALL)).toEqual([list[0]])
  })

  it('trial today or tomorrow, by wall date', () => {
    expect(trialDay('2026-11-03T19:00:00.000Z', NOW_WALL)).toBe('TODAY')
    expect(trialDay('2026-11-04T10:00:00.000Z', NOW_WALL)).toBe('TOMORROW')
    expect(trialDay('2026-11-05T10:00:00.000Z', NOW_WALL)).toBeNull()
    expect(trialDay(null, NOW_WALL)).toBeNull()
  })

  it('retain: paying students in their first week past 14 days, fewest days first', () => {
    const row = (name: string, daysSince: number | null, paying: boolean): AwayRow =>
      ({ name, email: null, phone: null, whatsapp: null, memberId: name, daysSince, plan: { name: 'Mensual', paying, trial: false } })
    const out = justAtRisk([row('a', 20, true), row('b', 14, true), row('c', 25, true), row('d', 15, false), row('e', null, true)])
    expect(out.map(r => r.name)).toEqual(['b', 'a'])
  })

  it('top actions: money of people training first, at most three, only non-zero', () => {
    expect(topActions({ GRADING: 4, RETAIN: 2, COLLECT: 5, NOT_CONTACTED: 0, TRIAL_TODAY: 1 })).toEqual([
      { kind: 'COLLECT', count: 5, href: '/dashboard/reports/payments?tab=COLLECT' },
      { kind: 'TRIAL_TODAY', count: 1, href: '/dashboard/reports/leads?tab=UPCOMING_TRIAL' },
      { kind: 'RETAIN', count: 2, href: '/dashboard/reports/absents?tab=AT_RISK' },
    ])
    expect(topActions({})).toEqual([])
  })
})
