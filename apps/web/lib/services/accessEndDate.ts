/**
 * accessEndDate — when a paid, webhook-activated membership stops granting
 * access. Extracted verbatim from the two payment webhooks so the public
 * purchase sheet can estimate the same date the webhook will later store.
 *
 * The two providers intentionally differ and MUST keep doing so (historic
 * orders started before this extraction are processed by the same code):
 *
 *   STRIPE  — only non-SUBSCRIPTION plans get an end date (a subscription's
 *             life is driven by Stripe subscription events instead). The raw
 *             value comes from checkout metadata as a string ('' when unset);
 *             it is tested for truthiness BEFORE being converted to a number,
 *             exactly like the original inline code.
 *   REVOLUT — any plan with a truthy validityDays gets an end date, including
 *             SUBSCRIPTION plans (Revolut checkouts are one-off orders, there is
 *             no renewal). A falsy value (null / 0) means no end date.
 *
 * `null` = no end date = access does not expire on its own.
 */

const DAY_MS = 86_400_000

export type AccessEndDateInput =
  | { provider: 'STRIPE'; planType: string; validityDays: string | number | null | undefined; now: Date }
  | { provider: 'REVOLUT'; planType: string; validityDays: number | null | undefined; now: Date }

export function computeAccessEndDate(input: AccessEndDateInput): Date | null {
  if (input.provider === 'STRIPE') {
    if (input.planType === 'SUBSCRIPTION' || !input.validityDays) return null
    return new Date(input.now.getTime() + Number(input.validityDays) * DAY_MS)
  }
  if (!input.validityDays) return null
  return new Date(input.now.getTime() + input.validityDays * DAY_MS)
}
