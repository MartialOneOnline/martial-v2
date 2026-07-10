// Guards against accidentally pointing sandbox/smoke-test tooling at a real
// Stripe LIVE-mode key — used by scripts/seed-sandbox-school.ts, NOT by the
// real dashboard save route (POST/PATCH /api/dashboard/school), which must
// keep accepting live keys for real schools connecting their own Stripe
// account. This is deliberately narrow tooling, not a payment-logic change.

export class LiveStripeKeyError extends Error {}

const LIVE_KEY_PATTERN = /^(sk|pk|rk)_live_/

// Stripe secret/publishable/restricted keys all carry a "_test_" or
// "_live_" segment identifying the mode — webhook signing secrets
// (whsec_...) don't, since the same format is used for both, so they can't
// be checked this way (see the runbook for how to avoid mixing those up).
export function isLiveStripeKey(key: string): boolean {
  return LIVE_KEY_PATTERN.test(key.trim())
}

export function isStripeTestModeKey(key: string): boolean {
  return /^(sk|pk|rk)_test_/.test(key.trim())
}

// Throws LiveStripeKeyError if `key` looks like a Stripe LIVE-mode key.
// Call this before writing any key into sandbox/test fixtures.
export function assertNotLiveStripeKey(key: string, label: string): void {
  if (isLiveStripeKey(key)) {
    throw new LiveStripeKeyError(
      `${label} looks like a Stripe LIVE-mode key (starts with a "_live_" prefix). ` +
      `Refusing to use it for sandbox/test setup — this must be a test-mode key ` +
      `(starts with sk_test_/pk_test_/rk_test_). Get one from ` +
      `https://dashboard.stripe.com/test/apikeys.`,
    )
  }
}
