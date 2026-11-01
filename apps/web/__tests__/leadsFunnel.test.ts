import { describe, it, expect } from 'vitest'
import { CONTACT_WITHIN_HOURS, compareFollowUp, funnelCounts, leadProgress, rate, type LeadEvidence } from '../lib/leads/funnel'

const NOW = new Date('2026-11-01T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000
const ago = (d: number) => new Date(NOW.getTime() - d * DAY)

const lead = (p: Partial<LeadEvidence> = {}): LeadEvidence => ({
  id: 'l1', status: 'NEW', createdAt: ago(5), convertedAt: null, notesCount: 0, lastNoteAt: null,
  bookings: [], payments: [], ...p,
})
const booking = (daysAgo: number, p: { status?: string; attended?: boolean } = {}) =>
  ({ scheduledAt: ago(daysAgo), status: p.status ?? 'CONFIRMED', attended: p.attended ?? false })

describe('leadProgress()', () => {
  it(`new lead with no contact after ${CONTACT_WITHIN_HOURS}h → not contacted`, () => {
    expect(leadProgress(lead(), NOW)).toMatchObject({ stage: 'NEW', followUps: ['NOT_CONTACTED'], followUpDays: 5 })
  })
  it('a lead that wrote in the last 48h is not flagged yet', () => {
    expect(leadProgress(lead({ createdAt: new Date(NOW.getTime() - 47 * 60 * 60 * 1000) }), NOW).followUps).toEqual([])
  })
  it('a staff note counts as contacted', () => {
    expect(leadProgress(lead({ notesCount: 1 }), NOW)).toMatchObject({ stage: 'CONTACTED', contacted: true, followUps: [] })
  })
  it('booked a class that already happened and never came → no-show', () => {
    const p = leadProgress(lead({ createdAt: ago(15), bookings: [booking(10), booking(3, { status: 'NO_SHOW' })] }), NOW)
    expect(p).toMatchObject({ stage: 'TRIAL_BOOKED', followUps: ['NO_SHOW'], followUpDays: 3 })
  })
  it('status TRIAL_BOOKED with no booking found (trial booked elsewhere) still counts as booked', () => {
    expect(leadProgress(lead({ status: 'TRIAL_BOOKED' }), NOW)).toMatchObject({ trialBooked: true, followUps: ['NO_SHOW'] })
  })
  it('P2 (PR #43 audit): a cancelled booking is not a trial booking, but it is contact', () => {
    expect(leadProgress(lead({ bookings: [booking(2, { status: 'CANCELLED' })] }), NOW))
      .toMatchObject({ trialBooked: false, contacted: true, stage: 'CONTACTED', followUps: [] })
  })
  it('a class booked ahead → trial coming up', () => {
    const p = leadProgress(lead({ bookings: [booking(-2)] }), NOW)
    expect(p).toMatchObject({ followUps: ['UPCOMING_TRIAL'], upcomingAt: ago(-2) })
  })
  it('came to a class and has not joined → tried, not joined (days since last class)', () => {
    const p = leadProgress(lead({ status: 'CONTACTED', createdAt: ago(30), bookings: [booking(20, { attended: true }), booking(6, { attended: true, status: 'COMPLETED' })] }), NOW)
    expect(p).toMatchObject({ stage: 'TRIED', followUps: ['TRIED_NOT_JOINED'], followUpDays: 6, lastAttendedAt: ago(6) })
  })
  it('a paid membership or CONVERTED status → joined, no follow-up', () => {
    expect(leadProgress(lead({ payments: [ago(1)], bookings: [booking(5, { attended: true })] }), NOW)).toMatchObject({ stage: 'JOINED', followUps: [] })
    expect(leadProgress(lead({ status: 'CONVERTED' }), NOW)).toMatchObject({ stage: 'JOINED', joined: true })
  })
  it('LOST leads are closed: no follow-up, but a payment still makes them joined', () => {
    expect(leadProgress(lead({ status: 'LOST' }), NOW)).toMatchObject({ lost: true, followUps: [] })
    expect(leadProgress(lead({ status: 'LOST', payments: [ago(1)] }), NOW)).toMatchObject({ lost: false, joined: true })
  })
})

describe('funnelCounts() / rate()', () => {
  it('each stage counts the leads with evidence for it (a direct sign-up did not try a class)', () => {
    const rows = [
      lead(),
      lead({ notesCount: 1 }),
      lead({ bookings: [booking(3)] }),
      lead({ bookings: [booking(3, { attended: true })] }),
      lead({ status: 'CONVERTED' }),
      lead({ status: 'LOST' }),
    ].map(l => leadProgress(l, NOW))
    expect(funnelCounts(rows)).toEqual({ total: 6, contacted: 5, trialBooked: 2, tried: 1, joined: 1, triedAndJoined: 0, lost: 1 })
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

describe('Project Audit PR #43', () => {
  it('P1: activity from before the lead got in touch does not count', () => {
    // Trained and paid two years ago, writes again five days ago
    const p = leadProgress(lead({ createdAt: ago(5), bookings: [booking(730, { attended: true })], payments: [ago(720)] }), NOW)
    expect(p).toMatchObject({ tried: false, joined: false, stage: 'NEW', followUps: ['NOT_CONTACTED'] })
  })
  it('P1: a payment after the lead counts even if older ones exist', () => {
    expect(leadProgress(lead({ createdAt: ago(5), payments: [ago(700), ago(1)] }), NOW).joined).toBe(true)
  })
  it(`P1: a class up to ${24}h before the lead was typed in (walk-in) still counts`, () => {
    const p = leadProgress(lead({ createdAt: ago(5), bookings: [{ scheduledAt: new Date(ago(5).getTime() - 20 * 60 * 60 * 1000), status: 'COMPLETED', attended: true }] }), NOW)
    expect(p.tried).toBe(true)
  })
  it('P1: an explicit CONVERTED status still counts on its own', () => {
    expect(leadProgress(lead({ status: 'CONVERTED', payments: [ago(700)] }), NOW).joined).toBe(true)
  })
  it('P2: "of those who tried" uses tried AND joined', () => {
    const rows = [
      lead({ status: 'CONVERTED' }),                                   // direct sign-up, never tried
      lead({ bookings: [booking(3, { attended: true })] }),            // tried, didn't join
    ].map(l => leadProgress(l, NOW))
    const c = funnelCounts(rows)
    expect(c).toMatchObject({ tried: 1, joined: 1, triedAndJoined: 0 })
    expect(rate(c.triedAndJoined, c.tried)).toBe(0)
  })
  it('P2: tried a class and has another one booked → both lists', () => {
    const p = leadProgress(lead({ bookings: [booking(3, { attended: true }), booking(-2)] }), NOW)
    expect(p.followUps).toEqual(['UPCOMING_TRIAL', 'TRIED_NOT_JOINED'])
    expect(p).toMatchObject({ upcomingAt: ago(-2), followUpDays: 3 })
  })
})

