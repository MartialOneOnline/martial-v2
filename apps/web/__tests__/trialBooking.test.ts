import { describe, expect, it } from 'vitest'
import { buildBookingSession, hasBookableSchedule, selectBookingSession, selectCtaClasses } from '@/lib/trialBooking'

describe('selectCtaClasses()', () => {
  const trials = [{ id: 'trial' }]
  const allClasses = [{ id: 'regular' }, { id: 'trial' }]

  it('uses only trial classes when the school offers free trials', () => {
    expect(selectCtaClasses(true, trials, allClasses)).toBe(trials)
  })

  it('uses all published classes for the generic booking CTA', () => {
    expect(selectCtaClasses(false, trials, allClasses)).toBe(allClasses)
  })
})

describe('hasBookableSchedule()', () => {
  it('is false for schedule: null', () => {
    expect(hasBookableSchedule({ schedule: null })).toBe(false)
  })

  it('is false for schedule: []', () => {
    expect(hasBookableSchedule({ schedule: [] })).toBe(false)
  })

  it('is true when at least one schedule slot exists', () => {
    expect(hasBookableSchedule({ schedule: [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }] })).toBe(true)
  })
})

describe('buildBookingSession()', () => {
  it('returns null instead of throwing when schedule is null', () => {
    expect(buildBookingSession({ id: 'graduacion', name: 'Graduación', level: null, schedule: null })).toBeNull()
  })

  it('returns null instead of throwing when schedule is an empty array', () => {
    expect(buildBookingSession({ id: 'open-mat', name: 'Open Mat', level: null, schedule: [] })).toBeNull()
  })

  it('builds the modal session from the first real schedule slot', () => {
    const session = buildBookingSession(
      {
        id: 'advanced',
        name: 'Jiu Jitsu Avanzado',
        level: 'Advanced',
        schedule: [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }],
      },
      new Date('2026-07-21T12:00:00Z'),
    )

    expect(session).toMatchObject({
      classId: 'advanced',
      className: 'Jiu Jitsu Avanzado',
      level: 'Advanced',
      dayLabel: 'Mon',
      dayOfWeek: 1,
      startTime: '19:00',
      endTime: '20:30',
    })
  })
})

describe('selectBookingSession() — the pure decision behind clicking a chooser row', () => {
  // Mirrors Roger Gracie Malaga's real mixed list: some classes are bookable,
  // "Graduación"/"Open Mat"-style entries are not.
  const mixedList = [
    { id: 'graduacion', name: 'Graduación', level: null, schedule: null },
    { id: 'open-mat', name: 'Open Mat', level: null, schedule: [] },
    { id: 'advanced', name: 'Jiu Jitsu Avanzado', level: 'Advanced', schedule: [{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }] },
  ]
  const from = new Date('2026-07-21T12:00:00Z')

  it('returns null for a single class with schedule: null', () => {
    expect(selectBookingSession([mixedList[0]!], 'graduacion', from)).toBeNull()
  })

  it('returns null for a single class with schedule: []', () => {
    expect(selectBookingSession([mixedList[1]!], 'open-mat', from)).toBeNull()
  })

  it('returns null when the selected class within a mixed list has no bookable schedule', () => {
    expect(selectBookingSession(mixedList, 'graduacion', from)).toBeNull()
    expect(selectBookingSession(mixedList, 'open-mat', from)).toBeNull()
  })

  it('returns the real session when the selected class within a mixed list is bookable', () => {
    expect(selectBookingSession(mixedList, 'advanced', from)).toMatchObject({
      classId: 'advanced',
      className: 'Jiu Jitsu Avanzado',
      dayLabel: 'Mon',
      startTime: '19:00',
      endTime: '20:30',
    })
  })
})
