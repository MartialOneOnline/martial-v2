/**
 * Tests for the in-memory fixed-window rate limiter backing
 * /api/auth/resend-confirmation's per-IP and per-email throttling.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isRateLimited, __resetRateLimitsForTests } from '@/lib/rateLimit'

beforeEach(() => {
  __resetRateLimitsForTests()
  vi.useFakeTimers()
  vi.setSystemTime(0)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('isRateLimited', () => {
  it('allows requests under the limit', () => {
    expect(isRateLimited('k1', 3, 1000)).toBe(false)
    expect(isRateLimited('k1', 3, 1000)).toBe(false)
    expect(isRateLimited('k1', 3, 1000)).toBe(false)
  })

  it('blocks once the limit is exceeded within the window', () => {
    expect(isRateLimited('k2', 2, 1000)).toBe(false)
    expect(isRateLimited('k2', 2, 1000)).toBe(false)
    expect(isRateLimited('k2', 2, 1000)).toBe(true)
    expect(isRateLimited('k2', 2, 1000)).toBe(true)
  })

  it('resets after the window elapses', () => {
    expect(isRateLimited('k3', 1, 1000)).toBe(false)
    expect(isRateLimited('k3', 1, 1000)).toBe(true)

    vi.setSystemTime(1001)

    expect(isRateLimited('k3', 1, 1000)).toBe(false)
  })

  it('tracks independent keys independently', () => {
    expect(isRateLimited('ip:1.2.3.4', 1, 1000)).toBe(false)
    expect(isRateLimited('ip:1.2.3.4', 1, 1000)).toBe(true)
    // A different key (e.g. a different IP, or an email-scoped key) is unaffected.
    expect(isRateLimited('email:a@b.com', 1, 1000)).toBe(false)
  })
})
