type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export type AttendResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; reason: string; httpStatus: 422 }

export type NoShowResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; reason: string; httpStatus: 422 }

export type UnmarkResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; reason: string; httpStatus: 422 }

export function canMarkNoShow(status: BookingStatus): NoShowResult {
  if (status === 'CANCELLED') {
    return { ok: false, reason: 'Cannot mark a cancelled booking as no-show', httpStatus: 422 }
  }
  if (status === 'NO_SHOW') {
    return { ok: true, alreadyDone: true }
  }
  // Staff/instructors may correct a mistaken "attended" mark by switching it to no-show.
  return { ok: true, alreadyDone: false }
}

/**
 * Pure guard for reverting a COMPLETED/NO_SHOW booking back to CONFIRMED,
 * so staff can undo an attendance mark made by mistake.
 */
export function canUnmarkAttendance(status: BookingStatus): UnmarkResult {
  if (status === 'CANCELLED') {
    return { ok: false, reason: 'Cannot unmark a cancelled booking', httpStatus: 422 }
  }
  if (status !== 'COMPLETED' && status !== 'NO_SHOW') {
    return { ok: true, alreadyDone: true }
  }
  return { ok: true, alreadyDone: false }
}

/**
 * Pure guard for the "mark attended" transition.
 * Returns ok=true when the update should proceed (alreadyDone=true = idempotent skip).
 * Returns ok=false for terminal states that block the transition.
 */
export function canMarkAttended(
  status: BookingStatus,
  attendedAt: Date | null,
): AttendResult {
  if (status === 'CANCELLED') {
    return { ok: false, reason: 'Cannot mark a cancelled booking as attended', httpStatus: 422 }
  }
  if (status === 'COMPLETED' && attendedAt !== null) {
    return { ok: true, alreadyDone: true }
  }
  return { ok: true, alreadyDone: false }
}
