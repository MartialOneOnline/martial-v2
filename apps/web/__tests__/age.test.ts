/**
 * calculateAge() drives the guardian-consent gate (app/my/layout.tsx,
 * app/complete-profile/page.tsx) — a wrong age here either locks out an
 * adult or waves through a minor without consent, so it needs to get the
 * "hasn't had this year's birthday yet" case right, not just year subtraction.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { calculateAge, MIN_CONSENT_AGE } from '@/lib/age'

describe('calculateAge()', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts a full year when the birthday has already passed this year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(calculateAge(new Date('2010-01-01'))).toBe(16)
  })

  it('does not count this year yet when the birthday has not happened', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(calculateAge(new Date('2010-12-31'))).toBe(15)
  })

  it('handles the birthday falling exactly today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(calculateAge(new Date('2010-06-15'))).toBe(16)
  })

  it('accepts a date string, not just a Date object', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15'))
    expect(calculateAge('2010-01-01')).toBe(16)
  })

  it('MIN_CONSENT_AGE is 16', () => {
    expect(MIN_CONSENT_AGE).toBe(16)
  })
})
