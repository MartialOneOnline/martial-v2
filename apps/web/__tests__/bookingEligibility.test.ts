/**
 * Tests for checkBookingEligibility() — the single source of truth for "can
 * this user book this class occurrence", shared between POST /api/bookings
 * (the write) and GET /api/my/school-classes (the canBook read). See
 * lib/services/bookingEligibility.ts.
 */
import { describe, it, expect } from 'vitest'
import { checkBookingEligibility, type EligibleMembership } from '@/lib/services/bookingEligibility'
import type { BookingCounts } from '@/lib/services/classAccess'

const zeroCounts: BookingCounts = { perWeek: 0, perMonth: 0, total: 0, globalPerWeek: 0, globalPerMonth: 0, globalTotal: 0 }

const membership: EligibleMembership = {
  id: 'm1',
  startDate: new Date('2026-01-01T00:00:00Z'),
  endDate: null,
  classAccess: null,
}

describe('checkBookingEligibility()', () => {
  it('rejects when there is no active membership', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership: null,
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/no active membership/i)
  })

  it('rejects a session scheduled after the membership endDate', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-10T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership: { ...membership, endDate: new Date('2026-02-05T00:00:00Z') },
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/does not cover this session date/i)
  })

  it('allows a session scheduled before the membership endDate', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership: { ...membership, endDate: new Date('2026-02-05T00:00:00Z') },
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(true)
  })

  it('allows an unlimited (endDate: null) membership for any future date', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2030-01-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership,
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(true)
  })

  it('rejects when classAccess excludes this class', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership: {
        ...membership,
        classAccess: { classRules: [{ classId: 'c1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] },
      },
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/not included/i)
  })

  it('rejects when classAccess weekly quota is already used up', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 0,
      membership: {
        ...membership,
        classAccess: { classRules: [{ classId: 'c1', included: true, unlimited: false, limit: '2', limitType: 'PER_WEEK' }] },
      },
      counts: { ...zeroCounts, perWeek: 2 },
    })
    expect(result.allowed).toBe(false)
  })

  it('rejects when the class is at capacity, with code FULL (route maps this to 409, not 403)', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: 10,
      bookedCount: 10,
      membership,
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/full/i)
    expect(result.code).toBe('FULL')
  })

  it('tags every non-capacity rejection with a code other than FULL', () => {
    const noMembership = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'), classId: 'c1', capacity: null, bookedCount: 0,
      membership: null, counts: zeroCounts,
    })
    expect(noMembership.code).toBe('NO_MEMBERSHIP')

    const expired = checkBookingEligibility({
      scheduledAt: new Date('2026-02-10T10:00:00Z'), classId: 'c1', capacity: null, bookedCount: 0,
      membership: { ...membership, endDate: new Date('2026-02-05T00:00:00Z') }, counts: zeroCounts,
    })
    expect(expired.code).toBe('MEMBERSHIP_EXPIRED')

    const excluded = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'), classId: 'c1', capacity: null, bookedCount: 0,
      membership: {
        ...membership,
        classAccess: { classRules: [{ classId: 'c1', included: false, unlimited: true, limit: '', limitType: 'PER_WEEK' }] },
      },
      counts: zeroCounts,
    })
    expect(excluded.code).toBe('CLASS_ACCESS_DENIED')
  })

  it('allows when under capacity', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: 10,
      bookedCount: 9,
      membership,
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(true)
  })

  it('capacity: null means unlimited regardless of bookedCount', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-01T10:00:00Z'),
      classId: 'c1',
      capacity: null,
      bookedCount: 9999,
      membership,
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(true)
  })

  it('checks endDate before capacity — expired membership is rejected even in an empty class', () => {
    const result = checkBookingEligibility({
      scheduledAt: new Date('2026-02-10T10:00:00Z'),
      classId: 'c1',
      capacity: 10,
      bookedCount: 0,
      membership: { ...membership, endDate: new Date('2026-02-05T00:00:00Z') },
      counts: zeroCounts,
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/does not cover/i)
  })
})
