/**
 * planEligibility — can this membership plan be bought online right now, and
 * (optionally) what does buying it mean for one specific class?
 *
 * Shared by the public plan listing (GET /api/public/schools/[slug]/plans),
 * which only PRESENTS the result, and POST /api/my/checkout, which re-runs it
 * before any purchase/membership write or provider call. The client never
 * decides eligibility on its own.
 *
 * Pure (no Prisma): callers load the plan, the school's provider config and
 * the class context and pass them in.
 *
 * Buying a plan never books a class. The class check is an ESTIMATE for a
 * payment made now — it guarantees neither a place nor future access.
 */

import { computeAccessEndDate } from './accessEndDate'
import type { ScheduleSlot } from '@/lib/scheduling'
import { MANUAL_METHODS } from '@/lib/paymentMethods'

export type OnlineProvider = 'STRIPE' | 'REVOLUT'

export interface PlanForEligibility {
  price: number
  planType: string
  billingCycle: string
  validityDays: number | null
  paymentMethods: readonly string[]
  classAccess: unknown
}

/** Which providers the school has actually connected. */
export interface ProviderConfig {
  stripe: boolean
  /** Revolut needs both the secret key and the registered webhook secret. */
  revolut: boolean
}

export interface Offer {
  provider: OnlineProvider
  /** True only when this provider's checkout really sets up recurring charges. */
  renews: boolean
}

export type Validity =
  | { kind: 'renews'; billingCycle: string }
  | { kind: 'days'; days: number }
  | { kind: 'no_expiry' }

export type ClassCheck =
  /** The plan's class rules exclude this class. */
  | { status: 'not_included' }
  /** No non-cancelled session inside the search window — no date, no coverage claim. */
  | { status: 'no_upcoming_session' }
  /** Subscription: access lasts while it stays active; no date guarantee. */
  | { status: 'subscription'; nextSession: Date }
  | { status: 'covered'; nextSession: Date; accessEndsAt: Date | null }
  | { status: 'expires_before_session'; nextSession: Date; accessEndsAt: Date }

export interface Eligibility {
  /**
   * online      — at least one provider offer can actually be checked out.
   * manual      — no usable online offer, but the plan allows paying at the school.
   * unavailable — neither (no methods, provider allowed but not connected, free plan…).
   */
  purchase: 'online' | 'manual' | 'unavailable'
  offers: Offer[]
  validity: Validity
  classCheck?: ClassCheck
}

export interface ClassContext {
  classId: string
  /** Next non-cancelled session, or null when none was found in the window. */
  nextSession: Date | null
}

interface ClassRule { classId?: unknown; included?: unknown }

/**
 * Static reading of MembershipPlan.classAccess for one class — the same
 * semantics as checkClassAccess (lib/services/classAccess.ts) minus the usage
 * limits: no config, empty config or no rule for the class = included. Only an
 * explicit `included: false` rule excludes it. `classAccess = {}` therefore
 * means unrestricted, exactly as in the booking flow.
 */
export function planIncludesClass(classAccess: unknown, classId: string): boolean {
  if (!classAccess || typeof classAccess !== 'object') return true
  const rules = (classAccess as { classRules?: unknown }).classRules
  if (!Array.isArray(rules) || rules.length === 0) return true
  const rule = (rules as ClassRule[]).find(r => r?.classId === classId)
  if (!rule) return true
  return rule.included !== false
}

export function planValidity(plan: Pick<PlanForEligibility, 'planType' | 'billingCycle' | 'validityDays'>): Validity {
  if (plan.planType === 'SUBSCRIPTION') return { kind: 'renews', billingCycle: plan.billingCycle }
  if (plan.validityDays) return { kind: 'days', days: plan.validityDays }
  return { kind: 'no_expiry' }
}

export function evaluatePlanForPurchase(
  plan: PlanForEligibility,
  providers: ProviderConfig,
  now: Date,
  classContext?: ClassContext,
): Eligibility {
  const isSubscription = plan.planType === 'SUBSCRIPTION'
  const offers: Offer[] = []
  if (plan.price > 0) {
    if (plan.paymentMethods.includes('STRIPE') && providers.stripe) {
      offers.push({ provider: 'STRIPE', renews: isSubscription })
    }
    // Revolut checkouts are one-off orders: offering one for a subscription
    // would promise a renewal that never happens.
    if (!isSubscription && plan.paymentMethods.includes('REVOLUT') && providers.revolut) {
      offers.push({ provider: 'REVOLUT', renews: false })
    }
  }

  const allowsManual = plan.paymentMethods.some(m => (MANUAL_METHODS as readonly string[]).includes(m))
  const purchase: Eligibility['purchase'] = offers.length > 0 ? 'online' : allowsManual ? 'manual' : 'unavailable'

  const result: Eligibility = { purchase, offers, validity: planValidity(plan) }
  if (classContext) result.classCheck = evaluateClass(plan, offers, now, classContext)
  return result
}

function evaluateClass(plan: PlanForEligibility, offers: Offer[], now: Date, ctx: ClassContext): ClassCheck {
  if (!planIncludesClass(plan.classAccess, ctx.classId)) return { status: 'not_included' }
  if (!ctx.nextSession) return { status: 'no_upcoming_session' }
  if (plan.planType === 'SUBSCRIPTION') return { status: 'subscription', nextSession: ctx.nextSession }

  // Same end date the webhook will store if paid now. For a one-off plan the
  // two providers agree; use whichever is actually offered (Stripe first).
  const provider = offers[0]?.provider ?? 'STRIPE'
  const accessEndsAt = provider === 'STRIPE'
    ? computeAccessEndDate({ provider, planType: plan.planType, validityDays: plan.validityDays, now })
    : computeAccessEndDate({ provider, planType: plan.planType, validityDays: plan.validityDays, now })
  // Same comparison as POST /api/bookings: endDate >= scheduledAt.
  if (accessEndsAt && accessEndsAt < ctx.nextSession) {
    return { status: 'expires_before_session', nextSession: ctx.nextSession, accessEndsAt }
  }
  return { status: 'covered', nextSession: ctx.nextSession, accessEndsAt }
}

/** Can this plan be offered as a way into this specific class? */
export function isOfferableForClass(e: Eligibility): boolean {
  return e.purchase === 'online'
    && (e.classCheck?.status === 'covered' || e.classCheck?.status === 'subscription')
}

// ── Next session ──────────────────────────────────────────────────────────────

export const NEXT_SESSION_WINDOW_DAYS = 56 // 8 weeks

/** 'YYYY-MM-DD' of a UTC instant — the key ClassCancellation.date is stored under. */
export function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Next bookable session of a class, using the same calendar rules as
 * POST /api/bookings: UTC schedule slots (the system has no per-school time
 * zone yet), skipping occurrences the school cancelled. Looks at most
 * `windowDays` ahead; returns null when nothing is found — never a made-up date.
 */
export function findNextSession(
  schedule: ScheduleSlot[] | null | undefined,
  cancelledDateKeys: ReadonlySet<string>,
  now: Date,
  windowDays = NEXT_SESSION_WINDOW_DAYS,
): Date | null {
  if (!schedule || schedule.length === 0) return null
  const limit = now.getTime() + windowDays * 86_400_000
  let best: Date | null = null
  for (const slot of schedule) {
    if (typeof slot?.dayOfWeek !== 'number' || typeof slot?.startTime !== 'string') continue
    const [hh, mm] = slot.startTime.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue
    for (let day = 0; day <= windowDays; day++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + day, hh, mm, 0, 0))
      if (d.getUTCDay() !== slot.dayOfWeek) continue
      if (d <= now) continue // POST /api/bookings rejects past/now
      if (d.getTime() > limit) break
      if (cancelledDateKeys.has(utcDateKey(d))) continue
      if (!best || d < best) best = d
      break // first valid occurrence of this slot is its earliest
    }
  }
  return best
}
