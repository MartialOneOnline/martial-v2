/**
 * Free trials (lib/services/trial.ts), as decided with the school owner on
 * 2026-11-02: days count from the first class, it ends on its last day (no
 * grace), an unused trial never expires (and can always book its first
 * class), a hand-set end date is kept, and an expired trial never blocks
 * entry. Includes the reproductions from Project Audit (PR #47, 104c2bf).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({ membershipFindMany: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { membership: { findMany: m.membershipFindMany } } }))

const trial = await import('@/lib/services/trial')
type TM = import('@/lib/services/trial').TrialMembership

const at = (iso: string) => new Date(iso)

/** A tiny fake DB: attended classes for the student, and the membership row it updates */
function fakeDb(attended: Date[]) {
  const writes: Array<{ startDate?: Date; endDate: Date | null }> = []
  const db = {
    booking: {
      findFirst: vi.fn(async ({ where }: { where: { scheduledAt: { gte: Date } } }) => {
        const d = attended.filter(a => a >= where.scheduledAt.gte).sort((a, b) => +a - +b)[0]
        return d ? { scheduledAt: d } : null
      }),
    },
    membership: { update: vi.fn(async ({ data }: { data: { startDate?: Date; endDate: Date | null } }) => { writes.push(data); return data }) },
  }
  return { db: db as never, writes, update: db.membership.update }
}
const tm = (over: Partial<TM> = {}): TM => ({
  id: 'mem', userId: 'u', schoolId: 's',
  createdAt: at('2026-10-19T10:00:00Z'), startDate: at('2026-10-19T10:00:00Z'), endDate: null,
  planId: 'plan', planName: 'Prueba 1 Semana', price: 0, plan: { planType: 'TRIAL', validityDays: 7 },
  ...over,
})
/** Applies a sync's write to the row, as the database would */
const apply = (row: TM, writes: Array<{ startDate?: Date; endDate: Date | null }>): TM =>
  writes.reduce<TM>((r, w) => ({ ...r, ...w }), row)

beforeEach(() => { vi.clearAllMocks() })

describe('pure rules', () => {
  it('7 days from the first class; over on its last day with no grace', () => {
    expect(trial.trialWindow(7, at('2026-10-20T18:00:00Z'))).toEqual({ startDate: at('2026-10-20T18:00:00Z'), endDate: at('2026-10-27T18:00:00Z') })
    const now = at('2026-10-28T00:00:00Z')
    expect(trial.trialLapsed({ endDate: at('2026-10-27T18:00:00Z'), used: true, manual: false }, now)).toBe(true)
    expect(trial.trialLapsed({ endDate: at('2026-10-29T18:00:00Z'), used: true, manual: false }, now)).toBe(false)
    // Unused: never, unless staff set the date by hand
    expect(trial.trialLapsed({ endDate: at('2026-10-01T00:00:00Z'), used: false, manual: false }, now)).toBe(false)
    expect(trial.trialLapsed({ endDate: at('2026-10-01T00:00:00Z'), used: false, manual: true }, now)).toBe(true)
  })

  it('recognises the plan-less trial from the public school page (7 days)', () => {
    const pub = { planId: null, planName: trial.PUBLIC_TRIAL_NAME, price: 0, plan: null }
    expect(trial.isTrialMembership(pub)).toBe(true)
    expect(trial.trialValidityDays(pub)).toBe(7)
    expect(trial.isTrialMembership({ planId: null, planName: 'Cuota mensual', price: 65, plan: null })).toBe(false)
  })

  it('a computed end date is not manual (DST hour tolerated); a cash override is', () => {
    expect(trial.isManualTrialEnd(at('2026-10-20T18:00:00Z'), at('2026-10-27T19:00:00Z'), 7)).toBe(false)
    expect(trial.isManualTrialEnd(at('2026-11-02T10:00:00Z'), at('2026-11-30T10:00:00Z'), 7)).toBe(true)
  })
})

describe('syncTrialWindow', () => {
  it('anchors on the first class after assignment', async () => {
    const { db, writes } = fakeDb([at('2026-11-02T18:00:00Z'), at('2026-11-04T18:00:00Z')])
    const s = await trial.syncTrialWindow(db, tm())
    expect(s).toMatchObject({ endDate: at('2026-11-09T18:00:00Z'), used: true, manual: false })
    expect(writes).toEqual([{ startDate: at('2026-11-02T18:00:00Z'), endDate: at('2026-11-09T18:00:00Z') }])
  })

  it('P1 audit: repeated syncs never move the window (reference = creation, not startDate)', async () => {
    // One-day trial created 2 Nov 12:00; classes on 31 Oct and 1 Nov at 18:00
    const created = at('2026-11-02T12:00:00Z')
    const { db, writes } = fakeDb([at('2026-10-31T18:00:00Z'), at('2026-11-01T18:00:00Z')])
    let row = tm({ createdAt: created, startDate: created, plan: { planType: 'TRIAL', validityDays: 1 } })
    const first = await trial.syncTrialWindow(db, row)
    row = apply(row, writes.splice(0))
    const second = await trial.syncTrialWindow(db, row)
    expect(first.endDate).toEqual(at('2026-11-02T18:00:00Z'))
    expect(second.endDate).toEqual(first.endDate)
    expect(writes).toEqual([]) // nothing to change the second time
    expect(trial.trialLapsed(second, at('2026-11-02T15:00:00Z'))).toBe(false)
  })

  it('P1 audit: an old unused trial loses its stale end date, so its first class can be booked', async () => {
    const { db, writes } = fakeDb([])
    const s = await trial.syncTrialWindow(db, tm({ createdAt: at('2026-10-01T10:00:00Z'), startDate: at('2026-10-01T10:00:00Z'), endDate: at('2026-10-08T10:00:00Z') }))
    expect(s).toMatchObject({ endDate: null, used: false })
    expect(writes).toEqual([{ endDate: null }])
  })

  it('P2 audit: a hand-set end date (cash override) is kept through attendance and sweeps', async () => {
    const { db, update } = fakeDb([at('2026-11-02T18:00:00Z')])
    const s = await trial.syncTrialWindow(db, tm({ createdAt: at('2026-11-02T10:00:00Z'), startDate: at('2026-11-02T10:00:00Z'), endDate: at('2026-11-30T10:00:00Z') }))
    expect(s).toMatchObject({ endDate: at('2026-11-30T10:00:00Z'), used: true, manual: true })
    expect(update).not.toHaveBeenCalled()
  })

  it('dry run computes without writing', async () => {
    const { db, update } = fakeDb([at('2026-10-21T18:00:00Z')])
    await trial.syncTrialWindow(db, tm({ endDate: at('2026-10-26T10:00:00Z') }), { write: false })
    expect(update).not.toHaveBeenCalled()
  })
})

describe('trialExpiredFor (check-in note, never a block)', () => {
  const now = at('2026-11-02T12:00:00Z')
  const row = (status: string, endDate: string | null, planType = 'TRIAL') => ({
    status, endDate: endDate ? at(endDate) : null, planId: 'p', planName: 'x', price: 0, plan: { planType, validityDays: 7 },
  })
  it('expired trial and no other plan → true', async () => {
    m.membershipFindMany.mockResolvedValue([row('EXPIRED', '2026-10-27T18:00:00Z')])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(true)
  })
  it('active trial past its last day → true; within it or not started → false', async () => {
    m.membershipFindMany.mockResolvedValueOnce([row('ACTIVE', '2026-10-27T18:00:00Z')])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(true)
    m.membershipFindMany.mockResolvedValueOnce([row('ACTIVE', '2026-11-05T18:00:00Z')])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
    m.membershipFindMany.mockResolvedValueOnce([row('ACTIVE', null)])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
  })
  it('a paid plan (or nothing at all) → false', async () => {
    m.membershipFindMany.mockResolvedValueOnce([row('ACTIVE', '2026-12-02T00:00:00Z', 'SUBSCRIPTION'), row('EXPIRED', '2026-10-27T18:00:00Z')])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
    m.membershipFindMany.mockResolvedValueOnce([])
    expect(await trial.trialExpiredFor('u', 's', now)).toBe(false)
  })
})
