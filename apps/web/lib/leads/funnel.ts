// Leads report — where each prospect is in the funnel and who needs a nudge.
//
// The CRM status alone isn't enough: staff rarely move a lead by hand, and a
// lead isn't linked to its bookings. So each lead is matched (by email, or
// its convertedUserId) to the school's bookings and paid membership
// payments, and its stage is the furthest point with evidence:
//   NEW → CONTACTED → TRIAL_BOOKED → TRIED → JOINED
// LOST leads (closed by staff) stay out of the follow-up lists.
//
// Only activity from when the lead got in touch counts (Project Audit PR #43
// P1): someone who trained and paid two years ago and now writes again is a
// prospect again, not "already joined". A day of slack covers a walk-in whose
// lead is typed in after their first class.

export type LeadStage = 'NEW' | 'CONTACTED' | 'TRIAL_BOOKED' | 'TRIED' | 'JOINED'
export type FollowUp = 'NOT_CONTACTED' | 'UPCOMING_TRIAL' | 'NO_SHOW' | 'TRIED_NOT_JOINED'

/** A lead with no contact for this long is "not contacted" (not just "new") */
export const CONTACT_WITHIN_HOURS = 48
/** Activity this long before the lead was created still counts as this lead's */
export const EVIDENCE_SLACK_HOURS = 24

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface LeadEvidence {
  id: string
  status: 'NEW' | 'INVITED' | 'CONTACTED' | 'TRIAL_BOOKED' | 'CONVERTED' | 'LOST'
  createdAt: Date
  convertedAt: Date | null
  /** Staff notes on the lead — a note means someone talked to them */
  notesCount: number
  lastNoteAt: Date | null
  /** Their bookings at this school (any status, any date — filtered here) */
  bookings: Array<{ scheduledAt: Date; status: string; attended: boolean }>
  /** Dates of their paid membership payments at this school (any date — filtered here) */
  payments: Date[]
}

export interface LeadProgress {
  stage: LeadStage
  lost: boolean
  contacted: boolean
  trialBooked: boolean
  tried: boolean
  joined: boolean
  /** Next booking still to come (not cancelled) */
  upcomingAt: Date | null
  /** Last class actually attended */
  lastAttendedAt: Date | null
  /**
   * Open follow-ups the school should act on. A lead can be in two: someone
   * who tried a class and has another one booked is both "tried, didn't
   * join" and "trial coming up".
   */
  followUps: FollowUp[]
  /** Days since the moment the non-upcoming follow-up is about (created, no-show, last class) */
  followUpDays: number | null
}

const days = (from: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - from.getTime()) / DAY_MS))

export function leadProgress(l: LeadEvidence, now: Date): LeadProgress {
  const evidenceFrom = l.createdAt.getTime() - EVIDENCE_SLACK_HOURS * HOUR_MS
  const bookings = l.bookings.filter(b => b.scheduledAt.getTime() >= evidenceFrom)
  const live = bookings.filter(b => b.status !== 'CANCELLED')
  const attended = bookings.filter(b => b.attended && b.scheduledAt <= now)
  const upcoming = live.filter(b => b.scheduledAt > now && !b.attended)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
  const lastAttendedAt = attended.reduce<Date | null>((m, b) => (!m || b.scheduledAt > m ? b.scheduledAt : m), null)
  const paidSince = l.payments.some(d => d.getTime() >= evidenceFrom)

  const joined = l.status === 'CONVERTED' || paidSince
  // Only real attendance — a direct sign-up didn't "come to try" (PR #43 P2)
  const tried = attended.length > 0
  const trialBooked = live.length > 0 || l.status === 'TRIAL_BOOKED'
  // Any booking, even one later cancelled, means there was contact (PR #43 P2)
  const contacted = l.status !== 'NEW' || l.notesCount > 0 || bookings.length > 0 || trialBooked
  const stage: LeadStage = joined ? 'JOINED' : tried ? 'TRIED' : trialBooked ? 'TRIAL_BOOKED' : contacted ? 'CONTACTED' : 'NEW'
  const lost = l.status === 'LOST' && !joined

  const followUps: FollowUp[] = []
  let followUpDays: number | null = null
  if (!joined && !lost) {
    if (upcoming.length) followUps.push('UPCOMING_TRIAL')
    if (tried) {
      followUps.push('TRIED_NOT_JOINED')
      followUpDays = days(lastAttendedAt!, now)
    } else if (!upcoming.length && trialBooked) {
      // Booked (or marked as booked) but never came and nothing booked ahead
      followUps.push('NO_SHOW')
      const lastBooked = live.reduce<Date | null>((m, b) => (!m || b.scheduledAt > m ? b.scheduledAt : m), null)
      followUpDays = days(lastBooked ?? l.createdAt, now)
    } else if (!contacted && now.getTime() - l.createdAt.getTime() >= CONTACT_WITHIN_HOURS * HOUR_MS) {
      followUps.push('NOT_CONTACTED')
      followUpDays = days(l.createdAt, now)
    }
  }

  return {
    stage, lost, contacted, trialBooked, tried, joined,
    upcomingAt: upcoming[0]?.scheduledAt ?? null, lastAttendedAt, followUps, followUpDays,
  }
}

export interface FunnelCounts {
  total: number
  contacted: number
  trialBooked: number
  tried: number
  joined: number
  /** Came to try AND joined — the base of "of those who tried, X% joined" */
  triedAndJoined: number
  lost: number
}

/**
 * Each stage counts the leads with evidence for it. Joining implies contact,
 * but not a trial: a direct sign-up never booked or came to try a class.
 */
export function funnelCounts(rows: LeadProgress[]): FunnelCounts {
  const c: FunnelCounts = { total: rows.length, contacted: 0, trialBooked: 0, tried: 0, joined: 0, triedAndJoined: 0, lost: 0 }
  for (const r of rows) {
    if (r.contacted || r.joined) c.contacted++
    if (r.trialBooked || r.tried) c.trialBooked++
    if (r.tried) c.tried++
    if (r.joined) c.joined++
    if (r.tried && r.joined) c.triedAndJoined++
    if (r.lost) c.lost++
  }
  return c
}

/** Share of `n` over `of`, as a whole percent; null when there's nothing to divide */
export function rate(n: number, of: number): number | null {
  return of > 0 ? Math.round((n / of) * 100) : null
}

/** Follow-up list order: most urgent first */
export function compareFollowUp(a: { followUpDays: number | null; createdAt: Date; upcomingAt?: Date | null }, b: typeof a, kind: FollowUp): number {
  if (kind === 'UPCOMING_TRIAL') return (a.upcomingAt?.getTime() ?? 0) - (b.upcomingAt?.getTime() ?? 0)
  // Recent first: a 3-day-old no-show is easier to recover than a 300-day-old one
  return (a.followUpDays ?? 0) - (b.followUpDays ?? 0) || b.createdAt.getTime() - a.createdAt.getTime()
}
