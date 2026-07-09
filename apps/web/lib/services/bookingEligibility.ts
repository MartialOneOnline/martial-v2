/**
 * bookingEligibility — single source of truth for "can this user book this
 * class occurrence", shared between the actual booking write (POST
 * /api/bookings) and the read-only timetable (GET /api/my/school-classes).
 *
 * Kept pure (no Prisma calls) for the same reason as classAccess.ts: callers
 * fetch/count and pass data in, so both routes can't silently diverge and
 * both are cheap to unit test.
 */

import { checkClassAccess, type ClassAccessConfig, type BookingCounts } from './classAccess'

export interface EligibleMembership {
  id: string
  startDate: Date
  endDate: Date | null
  classAccess: ClassAccessConfig | null
}

export interface BookingEligibilityInput {
  scheduledAt: Date
  classId: string
  capacity: number | null
  /** Confirmed/pending bookings already on this exact (classId, scheduledAt) slot. */
  bookedCount: number
  /** Null when the user has no active membership covering this school at all. */
  membership: EligibleMembership | null
  /** classAccess quota usage — only consulted when membership.classAccess has rules. */
  counts: BookingCounts
}

// Discriminates *why* a booking was denied, independent of the human-readable
// `reason` text — callers (route handlers) map this to an HTTP status without
// pattern-matching on wording, which would silently break if `reason` copy
// changes. FULL maps to 409 (the seat is a contested, racy resource); every
// other code maps to 403 (an eligibility/permission problem, not a conflict).
export type BookingEligibilityCode = 'NO_MEMBERSHIP' | 'MEMBERSHIP_EXPIRED' | 'CLASS_ACCESS_DENIED' | 'FULL'

export interface BookingEligibilityResult {
  allowed: boolean
  reason?: string
  code?: BookingEligibilityCode
}

export function checkBookingEligibility(input: BookingEligibilityInput): BookingEligibilityResult {
  if (!input.membership) {
    return { allowed: false, reason: 'No active membership for this school', code: 'NO_MEMBERSHIP' }
  }

  // A membership can be ACTIVE today but expire before a future occurrence —
  // each occurrence must be checked against its own scheduledAt individually,
  // not just "is the membership active right now".
  if (input.membership.endDate && input.membership.endDate < input.scheduledAt) {
    return { allowed: false, reason: 'Membership does not cover this session date', code: 'MEMBERSHIP_EXPIRED' }
  }

  const access = checkClassAccess(input.membership.classAccess, input.classId, input.counts)
  if (!access.allowed) return { ...access, code: 'CLASS_ACCESS_DENIED' }

  if (input.capacity !== null && input.bookedCount >= input.capacity) {
    return { allowed: false, reason: 'Class is full', code: 'FULL' }
  }

  return { allowed: true }
}
