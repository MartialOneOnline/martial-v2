import { describe, expect, it } from 'vitest'
import { buildBookingSession, selectCtaClasses } from '@/lib/trialBooking'

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

describe('buildBookingSession()', () => {
  it('returns null instead of throwing when schedule is null', () => {
    expect(buildBookingSession({ id: 'graduacion', name: 'Graduación', level: null, schedule: null })).toBeNull()
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
