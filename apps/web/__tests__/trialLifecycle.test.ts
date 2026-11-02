/**
 * Free trials (lib/services/trial.ts), as decided with the school owner on
 * 2026-11-02: days count from the first class, it ends on its last day (no
 * grace), an unused trial never expires, and an expired trial never blocks
 * entry — the check-in just says so.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  bookingFindFirst: vi.fn(), membershipUpdate: vi.fn(), membershipFindMany: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  prisma: {
    booking: { findFirst: m.bookingFindFirst },
    membership: { update: m.membershipUpdate, findMany: m.membershipFindMany },
  },
}))

const trial = await import('@/lib/services/trial')

const day = (iso: string) => new Date(`${iso}T18:00:00Z`)
const membership = (over: Record<string, unknown> = {}) => ({
  id: 'mem', userId: 'u', schoolId: 's', startDate: day('2026-10-19'), endDate: null as Date | null,
  plan: { validityDays: 7 }, ...over,
})

beforeEach(() => { vi.clearAllMocks() })

describe('trialWindow / trialLapsed (pure)', () => {
  it('7 days from the first class', () => {
    expect(trial.trialWindow(7, day('2026-10-20'))).toEqual({ startDate: day('2026-10-20'), endDate: day('2026-10-27') })
    expect(trial.trialWindow(7, null)).toBeNull()
    expect(trial.trialWindow(null, day('2026-10-20'))).toBeNull()
  })

  it('over on its last day with no grace; never when unused', () => {
    const now = day('2026-10-28')
    expect(trial.trialLapsed(day('2026-10-27'), true, now)).toBe(true)
    expect(trial.trialLapsed(day('2026-10-29'), true, now)).toBe(false)
    expect(trial.trialLapsed(day('2026-10-01'), false, now)).toBe(false)
    expect(trial.trialLapsed(null, true, now)).toBe(false)
  })
})

describe('syncTrialWindow', () => {
  it('assigned on the 19th, first class on the 2nd of next month → 7 days from that class', async () => {
    m.bookingFindFirst.mockResolvedValue({ scheduledAt: day('2026-11-02') })
    const s = await trial.syncTrialWindow({ booking: { findFirst: m.bookingFindFirst }, membership: { update: m.membershipUpdate } } as never, membership())
    expect(s).toEqual({ id: 'mem', endDate: day('2026-11-09'), used: true })
    expect(m.membershipUpdate).toHaveBeenCalledWith({ where: { id: 'mem' }, data: { startDate: day('2026-11-02'), endDate: day('2026-11-09') } })
  })

  it('counts a trial class done the same day just before staff assigned it', async () => {
    m.bookingFindFirst.mockResolvedValue({ scheduledAt: day('2026-10-19') })
    await trial.syncTrialWindow({ booking: { findFirst: m.bookingFindFirst }, membership: { update: m.membershipUpdate } } as never, membership({ startDate: new Date('2026-10-19T20:00:00Z') }))
    const where = m.bookingFindFirst.mock.calls[0]![0].where
    expect(where.scheduledAt.gte.getTime()).toBe(new Date('2026-10-18T20:00:00Z').getTime())
    expect(where).toMatchObject({ userId: 'u', class: { schoolId: 's' }, attendedAt: { not: null } })
  })

  it('no class yet → unchanged, unused; already anchored → no write; dry run never writes', async () => {
    m.bookingFindFirst.mockResolvedValueOnce(null)
    const db = { booking: { findFirst: m.bookingFindFirst }, membership: { update: m.membershipUpdate } } as never
    expect(await trial.syncTrialWindow(db, membership())).toEqual({ id: 'mem', endDate: null, used: false })
    m.bookingFindFirst.mockResolvedValueOnce({ scheduledAt: day('2026-10-20') })
    await trial.syncTrialWindow(db, membership({ startDate: day('2026-10-20'), endDate: day('2026-10-27') }))
    m.bookingFindFirst.mockResolvedValueOnce({ scheduledAt: day('2026-10-21') })
    await trial.syncTrialWindow(db, membership(), { write: false })
    expect(m.membershipUpdate).not.toHaveBeenCalled()
  })
})

describe('trialExpiredFor (check-in note, never a block)', () => {
  const now = day('2026-11-02')
  it('expired trial and no other plan → true', async () => {
    m.membershipFindMany.mockResolvedValue([{ status: 'EXPIRED', endDate: day('2026-10-27'), plan: { planType: 'TRIAL' } }])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(true)
  })
  it('active trial past its last day (sweep not run yet) → true; still within it → false', async () => {
    m.membershipFindMany.mockResolvedValueOnce([{ status: 'ACTIVE', endDate: day('2026-10-27'), plan: { planType: 'TRIAL' } }])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(true)
    m.membershipFindMany.mockResolvedValueOnce([{ status: 'ACTIVE', endDate: day('2026-11-05'), plan: { planType: 'TRIAL' } }])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
  })
  it('a paid plan (or nothing at all) → false', async () => {
    m.membershipFindMany.mockResolvedValueOnce([
      { status: 'ACTIVE', endDate: day('2026-12-02'), plan: { planType: 'SUBSCRIPTION' } },
      { status: 'EXPIRED', endDate: day('2026-10-27'), plan: { planType: 'TRIAL' } },
    ])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
    m.membershipFindMany.mockResolvedValueOnce([])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
  })
})
