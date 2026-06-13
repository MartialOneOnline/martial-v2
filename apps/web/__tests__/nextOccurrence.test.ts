/**
 * Tests for nextOccurrence() — imported from lib/scheduling.ts (UTC implementation).
 * These tests are preserved for regression coverage; new tests are in scheduling.test.ts.
 *
 * NOTE: The implementation uses UTC (setUTCHours). All dates below are UTC anchors.
 */
import { describe, it, expect } from 'vitest'
import { nextOccurrence } from '../lib/scheduling'

// Reference anchor: 2025-01-06T09:00:00Z — Monday
const mondayMorning = new Date('2025-01-06T09:00:00Z')

describe('nextOccurrence() — regression suite', () => {
  it('returns same day when the class time is still ahead today (UTC)', () => {
    // Monday 09:00 UTC, class Monday 18:00 UTC
    const result = nextOccurrence(mondayMorning, 1, '18:00')
    expect(result.getUTCDay()).toBe(1)
    expect(result.getUTCHours()).toBe(18)
    expect(result >= mondayMorning).toBe(true)
  })

  it('returns next week when same day but time already passed (UTC)', () => {
    const monday0800 = new Date('2025-01-06T08:00:00Z')
    const result = nextOccurrence(monday0800, 1, '08:00')
    expect(result.getUTCDate()).toBe(13)
    expect(result.getUTCDay()).toBe(1)
  })

  it('returns correct day when target is later in the week', () => {
    const result = nextOccurrence(mondayMorning, 4, '19:00')
    expect(result.getUTCDay()).toBe(4)
  })

  it('returns correct day when target day is earlier in the week (wraps)', () => {
    const friday = new Date('2025-01-10T09:00:00Z')
    const result = nextOccurrence(friday, 1, '10:00')
    expect(result.getUTCDay()).toBe(1)
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
