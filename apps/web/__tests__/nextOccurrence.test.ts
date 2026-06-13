/**
 * Tests for nextOccurrence() — Priority 2 (scheduledAt calculation).
 * nextOccurrence returns the next date (from a given reference) matching a dayOfWeek + time.
 */
import { describe, it, expect } from 'vitest'

/**
 * Returns the next Date at or after `from` whose day-of-week matches `targetDay`,
 * with the time set to `time` (HH:MM in local time).
 * targetDay: 0=Sun, 1=Mon … 6=Sat
 */
function nextOccurrence(from: Date, targetDay: number, time: string): Date {
  const parts = time.split(':').map(Number)
  const hours = parts[0] ?? 0
  const minutes = parts[1] ?? 0
  const result = new Date(from)
  result.setHours(hours, minutes, 0, 0)

  const currentDay = result.getDay()
  let daysAhead = targetDay - currentDay
  if (daysAhead < 0) daysAhead += 7
  // If same day but time has already passed, jump to next week
  if (daysAhead === 0 && result <= from) daysAhead = 7

  result.setDate(result.getDate() + daysAhead)
  return result
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('nextOccurrence()', () => {
  // Reference: 2025-01-06 09:00 UTC — Monday
  const mondayMorning = new Date('2025-01-06T09:00:00Z')

  it('returns same day when the class time is still ahead today', () => {
    // Monday 09:00, class is Monday 18:00
    const result = nextOccurrence(mondayMorning, 1, '18:00')
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getHours()).toBe(18)
    expect(result >= mondayMorning).toBe(true)
  })

  it('returns next week when same day but time already passed', () => {
    // Monday 09:00, class was Monday 08:00 — should be next Monday
    const monday0800 = new Date('2025-01-06T08:00:00Z')
    const result = nextOccurrence(monday0800, 1, '08:00')
    // nextOccurrence with time <= from → adds 7 days → 2025-01-13
    expect(result.getDate()).toBe(13)
    expect(result.getDay()).toBe(1)
  })

  it('returns correct day when target is later in the week', () => {
    // Monday 09:00, class is Thursday
    const result = nextOccurrence(mondayMorning, 4, '19:00')
    expect(result.getDay()).toBe(4) // Thursday
  })

  it('returns correct day when target day is earlier in the week (wraps)', () => {
    // Friday 09:00, class is Monday — should be next Monday
    const friday = new Date('2025-01-10T09:00:00Z')
    const result = nextOccurrence(friday, 1, '10:00')
    expect(result.getDay()).toBe(1)
    expect(result > friday).toBe(true)
  })

  it('result is always in the future relative to from', () => {
    const now = new Date()
    for (let day = 0; day <= 6; day++) {
      const result = nextOccurrence(now, day, '10:00')
      expect(result > now).toBe(true)
    }
  })
})
