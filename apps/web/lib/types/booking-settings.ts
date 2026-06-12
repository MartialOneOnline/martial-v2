/**
 * Booking settings for a class.
 * All values are in minutes relative to class start time.
 * null on a class = inherit from school's defaultBookingSettings.
 *
 * Example: bookingOpensMins: 10080 = booking opens 7 days before class
 *          bookingClosesMins: 60   = booking closes 1 hour before class
 */
export interface BookingSettings {
  // Booking window
  bookingOpensMins?:      number  // how far in advance booking opens
  bookingClosesMins?:     number  // how close to class booking closes

  // Cancellation window
  cancelOpensMins?:       number  // how far in advance cancellation opens
  cancelClosesMins?:      number  // how close to class cancellation closes

  // Minimum enrollment
  minStudents?:           number  // min bookings required for class to run
  minStudentsCancelMins?: number  // mins before class: auto-cancel if below min

  // QR attendance check-in window (deferred — store shape now)
  qrOpensMins?:           number
  qrClosesMins?:          number
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  bookingOpensMins:      10080,  // 7 days
  bookingClosesMins:     60,     // 1 hour
  cancelOpensMins:       10080,  // 7 days
  cancelClosesMins:      120,    // 2 hours
  minStudents:           0,      // no minimum
  minStudentsCancelMins: 120,    // 2 hours
}

/** Merge class-level overrides on top of school defaults */
export function resolveBookingSettings(
  classSettings: BookingSettings | null,
  schoolDefaults: BookingSettings,
): BookingSettings {
  return { ...DEFAULT_BOOKING_SETTINGS, ...schoolDefaults, ...classSettings }
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

export function minsToHoursAndMins(total: number): { hours: number; mins: number } {
  return { hours: Math.floor(total / 60), mins: total % 60 }
}

export function hoursAndMinsToTotal(hours: number, mins: number): number {
  return hours * 60 + mins
}
