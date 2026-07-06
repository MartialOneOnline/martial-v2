/**
 * classAccess — pure enforcement logic for MembershipPlan.classAccess rules.
 *
 * The classAccess JSON is authored in MembershipsClient:ClassAccessBuilder and
 * stored on MembershipPlan.classAccess. This module decodes it and decides
 * whether a booking is permitted, given pre-fetched booking counts.
 *
 * Keeping this pure (no Prisma calls) means the booking route fetches counts
 * and passes them in, and tests can exercise every branch without a DB.
 */

// ── Shape of classAccess JSON ──────────────────────────────────────────────────

export interface ClassAccessRule {
  classId:   string
  included:  boolean
  unlimited: boolean
  limit:     string             // stored as string in the builder form
  limitType: 'PER_WEEK' | 'PER_MONTH' | 'TOTAL'
}

export interface ClassAccessConfig {
  classRules?:      ClassAccessRule[]
  globalLimit?:     string      // empty string = no global cap
  globalLimitType?: 'PER_WEEK' | 'PER_MONTH' | 'TOTAL'
}

// ── Booking counts supplied by the caller ──────────────────────────────────────

export interface BookingCounts {
  /** Bookings for this specific class this calendar week (Mon 00:00 → now) */
  perWeek:        number
  /** Bookings for this specific class this calendar month */
  perMonth:       number
  /** Bookings for this specific class since membership.startDate */
  total:          number
  /** All bookings at this school this calendar week (for global cap) */
  globalPerWeek:  number
  /** All bookings at this school this calendar month (for global cap) */
  globalPerMonth: number
  /** All bookings on this membership since startDate (for global TOTAL cap — e.g. 10-class pack) */
  globalTotal:    number
}

// ── Guard ──────────────────────────────────────────────────────────────────────

export interface AccessResult {
  allowed: boolean
  reason?: string
}

/**
 * Decide whether a booking is allowed under the membership's classAccess rules.
 *
 * Returns `{ allowed: true }` when:
 *   - classAccess is absent or empty (backward compat — plans created before this feature)
 *   - the class has no explicit rule (unlisted classes are permitted)
 *   - the class is included and its limit (if any) is not yet reached
 *   - the global cap (if set) is not yet reached
 *
 * Returns `{ allowed: false, reason }` when any rule is violated.
 */
export function checkClassAccess(
  classAccess: ClassAccessConfig | null | undefined,
  classId: string,
  counts: BookingCounts,
): AccessResult {
  // No config or empty config → allow (plans without rules are unrestricted)
  if (!classAccess) return { allowed: true }
  const hasRules = (classAccess.classRules?.length ?? 0) > 0
  const hasGlobal = !!classAccess.globalLimit && classAccess.globalLimit !== ''
  if (!hasRules && !hasGlobal) return { allowed: true }

  // Per-class rule
  if (hasRules) {
    const rule = classAccess.classRules!.find(r => r.classId === classId)
    if (rule) {
      if (!rule.included) {
        return { allowed: false, reason: 'This class is not included in your membership plan' }
      }
      if (!rule.unlimited) {
        const cap = parseInt(rule.limit, 10)
        if (!isNaN(cap) && cap > 0) {
          const used =
            rule.limitType === 'PER_WEEK'  ? counts.perWeek  :
            rule.limitType === 'PER_MONTH' ? counts.perMonth :
            counts.total
          if (used >= cap) {
            const period =
              rule.limitType === 'PER_WEEK'  ? 'this week'  :
              rule.limitType === 'PER_MONTH' ? 'this month' :
              'on this membership'
            return {
              allowed: false,
              reason: `Booking limit reached: ${cap} sessions for this class ${period}`,
            }
          }
        }
      }
    }
    // No rule for this class → permitted (admin opted this class into "no restriction")
  }

  // Global cap
  if (hasGlobal) {
    const cap = parseInt(classAccess.globalLimit!, 10)
    if (!isNaN(cap) && cap > 0) {
      const used =
        classAccess.globalLimitType === 'PER_WEEK'  ? counts.globalPerWeek  :
        classAccess.globalLimitType === 'PER_MONTH' ? counts.globalPerMonth :
        counts.globalTotal
      const period =
        classAccess.globalLimitType === 'PER_WEEK'  ? 'this week'      :
        classAccess.globalLimitType === 'PER_MONTH' ? 'this month'     :
        'on this pass'
      if (used >= cap) {
        return {
          allowed: false,
          reason: `All ${cap} classes ${period} have been used`,
        }
      }
    }
  }

  return { allowed: true }
}
