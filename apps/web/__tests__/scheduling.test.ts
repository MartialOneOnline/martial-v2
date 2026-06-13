/**
 * Tests for lib/scheduling.ts
 * Covers: nextOccurrence, nextScheduledAt, isValidScheduledAt
 */
import { describe, it, expect } from 'vitest'
import { nextOccurrence, nextScheduledAt, isValidScheduledAt, type ScheduleSlot } from '../lib/scheduling'

// Reference anchor: 2025-01-06T09:00:00Z — Monday
const MONDAY_0900 = new Date('2025-01-06T09:00:00Z')

describe('nextOccurrence()', () => {
  it('returns same day when the class time is still ahead today', () => {
    // Monday 09:00 UTC, class is Monday 18:00 UTC
    const result = nextOccurrence(MONDAY_0900, 1, '18:00')
    expect(result.getUTCDay()).toBe(1)          // Monday
    expect(result.getUTCHours()).toBe(18)
    expect(result > MONDAY_0900).toBe(true)
  })

  it('returns next week when same day but time already passed', () => {
    // Monday 09:00 UTC, class is Monday 08:00 UTC — should jump to next Monday
    const from = new Date('2025-01-06T09:00:00Z')
    const result = nextOccurrence(from, 1, '08:00')
    expect(result.getUTCDate()).toBe(13)         // 2025-01-13
    expect(result.getUTCDay()).toBe(1)
  })

  it('returns correct day when target is later in the week', () => {
    // Monday 09:00, class is Thursday
    const result = nextOccurrence(MONDAY_0900, 4, '19:00')
    expect(result.getUTCDay()).toBe(4)           // Thursday
  })

  it('wraps to next week when target day is earlier in the week', () => {
    // Friday 09:00, class is Monday — should be next Monday
    const friday = new Date('2025-01-10T09:00:00Z')
    const result = nextOccurrence(friday, 1, '10:00')
    expect(result.getUTCDay()).toBe(1)
    expect(result > friday).toBe(true)
  })

  it('handles Sunday → Monday correctly', () => {
    const sunday = new Date('2025-01-12T10:00:00Z') // Sunday
    const result = nextOccurrence(sunday, 1, '09:00') // Monday 09:00
    expect(result.getUTCDay()).toBe(1)
    expect(result > sunday).toBe(true)
    // Should be Monday the 13th
    expect(result.getUTCDate()).toBe(13)
  })

  it('result is always in the future relative to from', () => {
    const now = new Date()
    for (let day = 0; day <= 6; day++) {
      const result = nextOccurrence(now, day, '10:00')
      expect(result > now).toBe(true)
    }
  })

  it('handles midnight correctly', () => {
    const result = nextOccurrence(MONDAY_0900, 1, '00:00')
    // Monday 09:00, class midnight Monday — same day 00:00 already passed, so next Monday
    expect(result.getUTCDay()).toBe(1)
    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCDate()).toBe(13) // next Monday
  })
})

describe('nextScheduledAt()', () => {
  it('returns null for empty schedule', () => {
    expect(nextScheduledAt([], MONDAY_0900)).toBeNull()
  })

  it('returns next occurrence for a single slot', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:30' }]
    const result = nextScheduledAt(schedule, MONDAY_0900)
    expect(result).not.toBeNull()
    expect(result!.getUTCDay()).toBe(1)
    expect(result!.getUTCHours()).toBe(18)
  })

  it('returns earliest occurrence when multiple slots exist', () => {
    const schedule: ScheduleSlot[] = [
      { dayOfWeek: 5, startTime: '10:00', endTime: '11:30' }, // Friday
      { dayOfWeek: 2, startTime: '19:00', endTime: '20:30' }, // Tuesday — closer
    ]
    const result = nextScheduledAt(schedule, MONDAY_0900)
    expect(result).not.toBeNull()
    // Tuesday is 1 day away, Friday is 4 days away
    expect(result!.getUTCDay()).toBe(2)
  })
})

describe('isValidScheduledAt()', () => {
  it('returns true when empty schedule (no constraint)', () => {
    expect(isValidScheduledAt(MONDAY_0900, [])).toBe(true)
  })

  it('returns true when day + time match exactly', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }]
    expect(isValidScheduledAt(MONDAY_0900, schedule)).toBe(true)
  })

  it('returns false when day matches but time does not', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 1, startTime: '18:00', endTime: '19:30' }]
    expect(isValidScheduledAt(MONDAY_0900, schedule)).toBe(false)
  })

  it('returns false when day does not match', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 3, startTime: '09:00', endTime: '10:30' }] // Wednesday
    expect(isValidScheduledAt(MONDAY_0900, schedule)).toBe(false)
  })

  it('tolerates ±1 minute drift', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }]
    // 09:01 — 1 minute late
    const dt = new Date('2025-01-06T09:01:00Z')
    expect(isValidScheduledAt(dt, schedule)).toBe(true)
  })

  it('rejects spoofed scheduledAt 2 minutes off', () => {
    const schedule: ScheduleSlot[] = [{ dayOfWeek: 1, startTime: '09:00', endTime: '10:30' }]
    const dt = new Date('2025-01-06T09:02:00Z')
    expect(isValidScheduledAt(dt, schedule)).toBe(false)
  })
})
