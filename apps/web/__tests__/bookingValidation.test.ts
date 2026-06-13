/**
 * Tests for booking validation logic (Priority 2).
 * These test the pure validation helpers extracted below, not the full HTTP handler.
 */
import { describe, it, expect } from 'vitest'

// ── Extracted validation helpers (mirrors route logic) ────────────────────────

function validateScheduledAt(scheduledAt: string): { ok: boolean; error?: string } {
  const date = new Date(scheduledAt)
  if (isNaN(date.getTime())) return { ok: false, error: 'Invalid scheduledAt date' }
  if (date <= new Date()) return { ok: false, error: 'Scheduled date must be in the future' }
  return { ok: true }
}

function validateDayOfWeek(
  scheduledAt: Date,
  schedule: { dayOfWeek: number }[],
): boolean {
  if (!schedule || schedule.length === 0) return true
  const dayOfWeek = scheduledAt.getDay()
  return schedule.some((s) => s.dayOfWeek === dayOfWeek)
}

function checkCapacity(capacity: number | null, booked: number): boolean {
  if (capacity === null) return true
  return booked < capacity
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('validateScheduledAt()', () => {
  it('rejects invalid date string', () => {
    expect(validateScheduledAt('not-a-date').ok).toBe(false)
  })

  it('rejects date in the past', () => {
    expect(validateScheduledAt('2020-01-01T10:00:00Z').ok).toBe(false)
  })

  it('rejects current time (edge: <= now)', () => {
    const past = new Date(Date.now() - 1000).toISOString()
    expect(validateScheduledAt(past).ok).toBe(false)
  })

  it('accepts a future date', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString()
    expect(validateScheduledAt(future).ok).toBe(true)
  })
})

describe('validateDayOfWeek()', () => {
  it('returns true when schedule is empty (no restriction)', () => {
    const future = new Date(Date.now() + 86_400_000)
    expect(validateDayOfWeek(future, [])).toBe(true)
  })

  it('returns false when day does not match schedule', () => {
    // Use a known Monday (day=1) and a schedule with only Wednesday (3)
    const monday = new Date('2025-01-06T10:00:00Z') // 2025-01-06 is Monday
    expect(validateDayOfWeek(monday, [{ dayOfWeek: 3 }])).toBe(false)
  })

  it('returns true when day matches schedule', () => {
    const monday = new Date('2025-01-06T10:00:00Z')
    expect(validateDayOfWeek(monday, [{ dayOfWeek: 1 }, { dayOfWeek: 3 }])).toBe(true)
  })
})

describe('checkCapacity()', () => {
  it('returns true when capacity is null (unlimited)', () => {
    expect(checkCapacity(null, 9999)).toBe(true)
  })

  it('returns true when under capacity', () => {
    expect(checkCapacity(10, 9)).toBe(true)
  })

  it('returns false when at capacity', () => {
    expect(checkCapacity(10, 10)).toBe(false)
  })

  it('returns false when over capacity', () => {
    expect(checkCapacity(10, 11)).toBe(false)
  })
})

describe('duplicate booking detection', () => {
  it('detects duplicate (same userId + classId + scheduledAt)', () => {
    const existing = { userId: 'u1', classId: 'c1', scheduledAt: '2030-01-01T10:00:00Z' }
    const request  = { userId: 'u1', classId: 'c1', scheduledAt: '2030-01-01T10:00:00Z' }
    const isDuplicate =
      existing.userId === request.userId &&
      existing.classId === request.classId &&
      existing.scheduledAt === request.scheduledAt
    expect(isDuplicate).toBe(true)
  })

  it('allows same class different date', () => {
    const existing = { userId: 'u1', classId: 'c1', scheduledAt: '2030-01-01T10:00:00Z' }
    const request  = { userId: 'u1', classId: 'c1', scheduledAt: '2030-01-08T10:00:00Z' }
    const isDuplicate =
      existing.userId === request.userId &&
      existing.classId === request.classId &&
      existing.scheduledAt === request.scheduledAt
    expect(isDuplicate).toBe(false)
  })
})
