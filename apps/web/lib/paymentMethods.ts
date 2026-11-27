// Master catalog of payment method keys a school can offer its own members.
// Which of these are actually selectable by a school is gated by
// PlatformSettings.enabledPaymentMethods (see /api/admin/settings/payments) —
// this constant is just the full universe of valid keys.
export const PAYMENT_METHOD_KEYS = ['STRIPE', 'REVOLUT', 'CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'PAYPAL', 'OTHER'] as const

export type PaymentMethodKey = typeof PAYMENT_METHOD_KEYS[number]

// Shared payment-method options for the class / event / membership plan forms —
// these only offer the subset that makes sense for a one-off or recurring charge
// (no DIRECT_DEBIT/PAYPAL/OTHER), rendered as icon pills with identical styling
// across ClassesClient, EventsClient and MembershipsClient.
export const BOOKING_PAYMENT_OPTIONS = [
  { value: 'STRIPE',        label: 'Online (Stripe)',  icon: '💳' },
  { value: 'REVOLUT',       label: 'Online (Revolut)', icon: '💳' },
  { value: 'CASH',          label: 'Cash at door',     icon: '💵' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer',    icon: '🏦' },
] as const

export type BookingPaymentMethod = typeof BOOKING_PAYMENT_OPTIONS[number]['value']

// ── Strict per-plan method resolution ─────────────────────────────────────────
// A plan's `paymentMethods` is the only source of truth for how it may be paid.
// These resolvers never substitute a different method for one the caller asked
// for: an explicit request that the plan doesn't allow is rejected, and a plan
// with no usable method is rejected rather than silently falling back to CASH.

export const ONLINE_METHODS = ['STRIPE', 'REVOLUT'] as const
export type OnlineMethod = typeof ONLINE_METHODS[number]

export const MANUAL_METHODS = ['CASH', 'BANK_TRANSFER', 'DIRECT_DEBIT', 'OTHER'] as const
export type ManualMethod = typeof MANUAL_METHODS[number]

export type MethodResolution<M extends string> =
  | { ok: true; method: M }
  | { ok: false; error: string }

/**
 * Online checkout provider for a plan. `requested` undefined/null means the
 * caller expressed no preference: pick STRIPE, then REVOLUT, among the plan's
 * allowed methods. An explicit request must be an online method the plan allows.
 */
export function resolveOnlineMethod(requested: unknown, planMethods: readonly string[]): MethodResolution<OnlineMethod> {
  if (requested !== undefined && requested !== null) {
    if (typeof requested !== 'string' || !(ONLINE_METHODS as readonly string[]).includes(requested))
      return { ok: false, error: 'Invalid payment method' }
    if (!planMethods.includes(requested))
      return { ok: false, error: 'This payment method is not available for this plan' }
    return { ok: true, method: requested as OnlineMethod }
  }
  const method = ONLINE_METHODS.find(m => planMethods.includes(m))
  return method ? { ok: true, method } : { ok: false, error: 'No online payment method available for this plan' }
}

/**
 * Manual (pay-the-school) method for a plan request. Same contract as
 * resolveOnlineMethod: no preference → first allowed manual method in catalog
 * order; explicit request must be a manual method the plan allows.
 */
export function resolveManualMethod(requested: unknown, planMethods: readonly string[]): MethodResolution<ManualMethod> {
  if (requested !== undefined && requested !== null) {
    if (typeof requested !== 'string' || !(MANUAL_METHODS as readonly string[]).includes(requested))
      return { ok: false, error: 'Invalid payment method' }
    if (!planMethods.includes(requested))
      return { ok: false, error: 'This payment method is not available for this plan' }
    return { ok: true, method: requested as ManualMethod }
  }
  const method = MANUAL_METHODS.find(m => planMethods.includes(m))
  return method ? { ok: true, method } : { ok: false, error: 'This plan cannot be requested for payment at the school' }
}
