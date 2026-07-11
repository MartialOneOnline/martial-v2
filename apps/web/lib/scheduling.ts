/**
 * scheduling.ts — Reusable scheduling utilities for class booking.
 *
 * NOTE: All dates are computed in UTC by default. The `timezone` field on
 * the School model is not yet populated in the database. Once it is, callers
 * should pass it to `nextOccurrence` and convert accordingly (e.g. with
 * `date-fns-tz`). Until then, UTC is a safe, deterministic default.
 *
 * dayOfWeek convention: 0 = Sunday … 6 = Saturday (same as Date.prototype.getDay).
 */

export interface ScheduleSlot {
  dayOfWeek: number   // 0=Sun … 6=Sat
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
}

/**
 * Returns the next Date at or after `from` whose UTC day-of-week matches
 * `targetDay`, with the UTC time set to `time` (HH:MM).
 *
 * If today matches `targetDay` but the time has already passed, it returns
 * the same weekday in the following week.
 */
export function nextOccurrence(from: Date, targetDay: number, time: string): Date {
  const parts = time.split(':').map(Number)
  const hours   = parts[0] ?? 0
  const minutes = parts[1] ?? 0

  // Start from a copy of `from` with the target time set in UTC
  const result = new Date(from)
  result.setUTCHours(hours, minutes, 0, 0)

  const currentDay = result.getUTCDay()
  let daysAhead = targetDay - currentDay
  if (daysAhead < 0) daysAhead += 7

  // Same day but time already passed → jump to next week
  if (daysAhead === 0 && result <= from) daysAhead = 7

  result.setUTCDate(result.getUTCDate() + daysAhead)
  return result
}

/**
 * Given a class schedule array, returns the scheduledAt Date for the
 * next upcoming occurrence of the FIRST matching slot found.
 *
 * Returns null if schedule is empty or contains no valid slots.
 */
export function nextScheduledAt(schedule: ScheduleSlot[], from: Date = new Date()): Date | null {
  if (!schedule || schedule.length === 0) return null

  // Pick the slot with the nearest next occurrence
  let earliest: Date | null = null
  for (const slot of schedule) {
    const occ = nextOccurrence(from, slot.dayOfWeek, slot.startTime)
    if (!earliest || occ < earliest) {
      earliest = occ
    }
  }
  return earliest
}

/**
 * Given a specific calendar date (YYYY-MM-DD, interpreted as UTC) and a
 * class schedule, returns the scheduledAt Date for that day's occurrence —
 * the same UTC-date + slot.startTime instant that occurrence generation
 * (see GET /api/my/school-classes, which drives self-booking) would produce
 * for a real slot on that day. Falls back to noon UTC on that date when the
 * class has no schedule slot for that day-of-week (e.g. an unscheduled
 * class, or a one-off booking on a day the class doesn't normally run), so
 * callers that don't require a real slot still get a deterministic value.
 *
 * Used by staff-facing "add booking" flows, which only collect a date (not
 * a full scheduledAt) — resolving through this keeps their bookings on the
 * exact same instant a self-booking would use for that class+day, so
 * capacity counts, advisory locks and the partial unique index all see the
 * same rows regardless of which flow created them.
 */
export function scheduledAtForDate(dateStr: string, schedule: ScheduleSlot[] | null): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const year  = y ?? 1970
  const month = (m ?? 1) - 1
  const day   = d ?? 1
  const dow = new Date(Date.UTC(year, month, day)).getUTCDay()

  const slot = schedule?.find(s => s.dayOfWeek === dow)
  if (slot) {
    const [hh, mm] = slot.startTime.split(':').map(Number)
    return new Date(Date.UTC(year, month, day, hh ?? 0, mm ?? 0, 0, 0))
  }
  return new Date(Date.UTC(year, month, day, 12, 0, 0, 0))
}

/**
 * Validates that a given `scheduledAt` Date matches one of the class's
 * schedule slots (same UTC day-of-week AND time within a 1-minute tolerance).
 *
 * Used by the API server to reject spoofed scheduledAt values.
 */
export function isValidScheduledAt(scheduledAt: Date, schedule: ScheduleSlot[]): boolean {
  if (!schedule || schedule.length === 0) return true // no schedule constraint

  const dow = scheduledAt.getUTCDay()

  return schedule.some(slot => {
    if (slot.dayOfWeek !== dow) return false
    // Allow ±1 minute tolerance to account for clock drift / rounding
    const [sh, sm] = slot.startTime.split(':').map(Number)
    const slotMinutes = (sh ?? 0) * 60 + (sm ?? 0)
    const atMinutes   = scheduledAt.getUTCHours() * 60 + scheduledAt.getUTCMinutes()
    return Math.abs(slotMinutes - atMinutes) <= 1
  })
}
