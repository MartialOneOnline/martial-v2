/**
 * Tests for the sandbox/smoke-test guard against accidentally using a
 * Stripe LIVE-mode key (lib/services/stripeKeyGuard.ts). This guard is only
 * ever wired into scripts/seed-sandbox-school.ts — the real dashboard save
 * route intentionally has no such check, since real schools must be able to
 * save live keys.
 */
import { describe, it, expect } from 'vitest'
import { assertNotLiveStripeKey, isLiveStripeKey, isStripeTestModeKey, LiveStripeKeyError } from '@/lib/services/stripeKeyGuard'

describe('isLiveStripeKey', () => {
  it.each([
    'sk_live_51ABCDEFGHIJKLMNOPQR',
    'pk_live_51ABCDEFGHIJKLMNOPQR',
    'rk_live_51ABCDEFGHIJKLMNOPQR',
  ])('detects a live-mode key: %s', (key) => {
    expect(isLiveStripeKey(key)).toBe(true)
  })

  it.each([
    'sk_test_51ABCDEFGHIJKLMNOPQR',
    'pk_test_51ABCDEFGHIJKLMNOPQR',
    'whsec_abcdefghijklmnopqrstuvwx',
    '',
    'not-a-stripe-key-at-all',
  ])('does not flag a non-live key: %s', (key) => {
    expect(isLiveStripeKey(key)).toBe(false)
  })

  it('trims whitespace before checking', () => {
    expect(isLiveStripeKey('  sk_live_51ABC  ')).toBe(true)
  })
})

describe('isStripeTestModeKey', () => {
  it('recognizes sk_test_/pk_test_/rk_test_ keys', () => {
    expect(isStripeTestModeKey('sk_test_51ABC')).toBe(true)
    expect(isStripeTestModeKey('pk_test_51ABC')).toBe(true)
    expect(isStripeTestModeKey('rk_test_51ABC')).toBe(true)
  })

  it('rejects live keys and non-Stripe strings', () => {
    expect(isStripeTestModeKey('sk_live_51ABC')).toBe(false)
    expect(isStripeTestModeKey('whsec_abc')).toBe(false)
    expect(isStripeTestModeKey('')).toBe(false)
  })
})

describe('assertNotLiveStripeKey', () => {
  it('throws LiveStripeKeyError for a live key', () => {
    expect(() => assertNotLiveStripeKey('sk_live_51ABC', 'Stripe secret key')).toThrow(LiveStripeKeyError)
    expect(() => assertNotLiveStripeKey('sk_live_51ABC', 'Stripe secret key')).toThrow(/LIVE-mode key/)
  })

  it('does not throw for a test key', () => {
    expect(() => assertNotLiveStripeKey('sk_test_51ABC', 'Stripe secret key')).not.toThrow()
  })

  it('does not throw for an unrelated/empty string (not this guard\'s job to validate format)', () => {
    expect(() => assertNotLiveStripeKey('', 'Stripe secret key')).not.toThrow()
    expect(() => assertNotLiveStripeKey('whsec_abc', 'Stripe webhook secret')).not.toThrow()
  })
})
