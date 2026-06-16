type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export type AttendResult =
  | { ok: true; alreadyDone: boolean }
  | { ok: false; reason: string; httpStatus: 422 }

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
