import { describe, it, expect } from 'vitest'
import { CONTACT_WITHIN_HOURS, compareFollowUp, funnelCounts, leadProgress, rate, type LeadEvidence } from '../lib/leads/funnel'

const NOW = new Date('2026-11-01T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const ago = (d: number) => new Date(NOW.getTime() - d * DAY)

const lead = (p: Partial<LeadEvidence> = {}): LeadEvidence => ({
  id: 'l1', status: 'NEW', createdAt: ago(5), convertedAt: null, notesCount: 0, lastNoteAt: null,
  bookings: [], firstPaidAt: null, ...p,
})
const booking = (daysAgo: number, p: { status?: string; attended?: boolean } = {}) =>
  ({ scheduledAt: ago(daysAgo), status: p.status ?? 'CONFIRMED', attended: p.attended ?? false })

describe('leadProgress()', () => {
  it(`new lead with no contact after ${CONTACT_WITHIN_HOURS}h → not contacted`, () => {
    expect(leadProgress(lead(), NOW)).toMatchObject({ stage: 'NEW', followUp: 'NOT_CONTACTED', followUpDays: 5 })
  })
  it('a lead that wrote in the last 48h is not flagged yet', () => {
    expect(leadProgress(lead({ createdAt: new Date(NOW.getTime() - 47 * 60 * 60 * 1000) }), NOW).followUp).toBeNull()
  })
  it('a staff note counts as contacted', () => {
    expect(leadProgress(lead({ notesCount: 1 }), NOW)).toMatchObject({ stage: 'CONTACTED', contacted: true, followUp: null })
  })
  it('booked a class that already happened and never came → no-show', () => {
    const p = leadProgress(lead({ bookings: [booking(10), booking(3, { status: 'NO_SHOW' })] }), NOW)
    expect(p).toMatchObject({ stage: 'TRIAL_BOOKED', followUp: 'NO_SHOW', followUpDays: 3 })
  })
  it('status TRIAL_BOOKED with no booking found (trial booked elsewhere) still counts as booked', () => {
    expect(leadProgress(lead({ status: 'TRIAL_BOOKED' }), NOW)).toMatchObject({ trialBooked: true, followUp: 'NO_SHOW' })
  })
  it('cancelled bookings alone are not a trial booking', () => {
    expect(leadProgress(lead({ bookings: [booking(2, { status: 'CANCELLED' })] }), NOW)).toMatchObject({ trialBooked: false, followUp: 'NOT_CONTACTED' })
  })
  it('a class booked ahead → trial coming up', () => {
    const p = leadProgress(lead({ bookings: [booking(-2)] }), NOW)
    expect(p).toMatchObject({ followUp: 'UPCOMING_TRIAL', upcomingAt: ago(-2) })
  })
  it('came to a class and has not joined → tried, not joined (days since last class)', () => {
    const p = leadProgress(lead({ status: 'CONTACTED', bookings: [booking(20, { attended: true }), booking(6, { attended: true, status: 'COMPLETED' }), booking(-3)] }), NOW)
    expect(p).toMatchObject({ stage: 'TRIED', followUp: 'TRIED_NOT_JOINED', followUpDays: 6, lastAttendedAt: ago(6) })
  })
  it('a paid membership or CONVERTED status → joined, no follow-up', () => {
    expect(leadProgress(lead({ firstPaidAt: ago(1), bookings: [booking(5, { attended: true })] }), NOW)).toMatchObject({ stage: 'JOINED', followUp: null })
    expect(leadProgress(lead({ status: 'CONVERTED' }), NOW)).toMatchObject({ stage: 'JOINED', joined: true })
  })
  it('LOST leads are closed: no follow-up, but a payment still makes them joined', () => {
    expect(leadProgress(lead({ status: 'LOST' }), NOW)).toMatchObject({ lost: true, followUp: null })
    expect(leadProgress(lead({ status: 'LOST', firstPaidAt: ago(1) }), NOW)).toMatchObject({ lost: false, joined: true })
  })
})

describe('funnelCounts() / rate()', () => {
  it('each stage counts every lead that reached it', () => {
    const rows = [
      lead(),
      lead({ notesCount: 1 }),
      lead({ bookings: [booking(3)] }),
      lead({ bookings: [booking(3, { attended: true })] }),
      lead({ status: 'CONVERTED' }),
      lead({ status: 'LOST' }),
    ].map(l => leadProgress(l, NOW))
    expect(funnelCounts(rows)).toEqual({ total: 6, contacted: 5, trialBooked: 3, tried: 2, joined: 1, lost: 1 })
  })
  it('rate() rounds and is null without a base', () => {
    expect(rate(1, 3)).toBe(33)
    expect(rate(0, 0)).toBeNull()
  })
})

describe('compareFollowUp()', () => {
  it('upcoming trials soonest first; the rest most recent first', () => {
    const a = { followUpDays: 2, createdAt: ago(10), upcomingAt: ago(-5) }
    const b = { followUpDays: 30, createdAt: ago(40), upcomingAt: ago(-1) }
    expect([a, b].sort((x, y) => compareFollowUp(x, y, 'NO_SHOW'))[0]).toBe(a)
    expect([a, b].sort((x, y) => compareFollowUp(x, y, 'UPCOMING_TRIAL'))[0]).toBe(b)
  })
})
