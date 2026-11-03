// "Today" page: what is worth doing today, built from the reports that
// already decide it (Payments, Leads, Absences, Bookings, Gradings) — no new
// rules here, only selection and order. Pure: the API route feeds it.
//
// Times: bookings keep the timetable's wall-clock time in UTC fields (see
// lib/bookings/occupancy.ts), so "today" is a wall date too.

import { dateKey, hhmm, parseSchedule, slotMinutes, type OccClass } from '../bookings/occupancy'

/** How many people each block shows before "See all" */
export const BLOCK_ITEMS = 5
/** Students who just went 14 days without coming: the first week of "at risk" */
export const RETAIN_MAX_DAYS = 21
/** Unmarked classes from this many days back */
export const UNMARKED_DAYS = 7

export interface Contact {
  name: string
  email: string | null
  phone: string | null
  whatsapp: string | null
  /** SchoolMember id for the profile link */
  memberId: string | null
}

export type BlockState = 'ok' | 'forbidden' | 'error' | 'off'

export interface Session {
  classId: string; className: string; time: string; endTime: string
  booked: number; capacity: number | null; cancelled: boolean
}
export interface Unmarked { classId: string; className: string; date: string; time: string; unmarked: number }

// ── Today's classes (wall time) ──────────────────────────────────────────────

export function todaySessions(input: {
  classes: Array<Omit<OccClass, 'schedule' | 'createdAt'> & { schedule: unknown }>
  bookings: Array<{ classId: string; scheduledAt: Date }>
  cancelledClassIds: Set<string>
  nowWall: Date
}): Session[] {
  const today = dateKey(input.nowWall)
  const dow = input.nowWall.getUTCDay()
  const booked = new Map<string, number>()
  for (const b of input.bookings) {
    if (dateKey(b.scheduledAt) !== today) continue
    const k = `${b.classId}|${hhmm(b.scheduledAt)}`
    booked.set(k, (booked.get(k) ?? 0) + 1)
  }
  return input.classes.filter(c => c.isActive).flatMap(c => {
    const cls: OccClass = { ...c, schedule: parseSchedule(c.schedule), createdAt: new Date(0) }
    return cls.schedule.filter(s => s.dayOfWeek === dow).map(s => {
      const minutes = slotMinutes(cls, s)
      const end = (Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3, 5)) + minutes) % (24 * 60)
      return {
        classId: c.id, className: c.name, time: s.startTime,
        endTime: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
        booked: booked.get(`${c.id}|${s.startTime}`) ?? 0,
        capacity: c.capacity && c.capacity > 0 ? c.capacity : null,
        cancelled: input.cancelledClassIds.has(c.id),
      }
    })
  }).sort((a, b) => a.time.localeCompare(b.time) || a.className.localeCompare(b.className))
}

/** Unmarked sessions of the last UNMARKED_DAYS days (the Bookings report decides "unmarked") */
export function recentUnmarked(list: Unmarked[], nowWall: Date): Unmarked[] {
  const from = dateKey(new Date(nowWall.getTime() - UNMARKED_DAYS * 86_400_000))
  return list.filter(u => u.date >= from)
}

// ── Leads with a trial class today or tomorrow ───────────────────────────────

/** upcomingAt is a booking time (wall clock): compare by wall date */
export function trialDay(upcomingAt: string | null, nowWall: Date): 'TODAY' | 'TOMORROW' | null {
  if (!upcomingAt) return null
  const day = upcomingAt.slice(0, 10)
  if (day === dateKey(nowWall)) return 'TODAY'
  if (day === dateKey(new Date(nowWall.getTime() + 86_400_000))) return 'TOMORROW'
  return null
}

// ── Retain: paying students who just reached 14 days away ───────────────────

export interface AwayRow extends Contact { daysSince: number | null; plan: { name: string; paying: boolean; trial: boolean } | null }
export function justAtRisk(rows: AwayRow[]): AwayRow[] {
  return rows
    .filter(r => r.plan?.paying && r.daysSince !== null && r.daysSince <= RETAIN_MAX_DAYS)
    .sort((a, b) => (a.daysSince ?? 0) - (b.daysSince ?? 0))
}

// ── The three most urgent things, for the dashboard home ────────────────────

export type ActionKind =
  | 'COLLECT' | 'TRIAL_TODAY' | 'NOT_CONTACTED' | 'FAILED' | 'RETAIN'
  | 'APPROVALS' | 'UNMARKED' | 'TRIED_NOT_JOINED' | 'GRADING'

/** Highest first: money of people still training, then people about to walk in, … */
export const ACTION_ORDER: ActionKind[] = [
  'COLLECT', 'TRIAL_TODAY', 'NOT_CONTACTED', 'FAILED', 'RETAIN', 'APPROVALS', 'UNMARKED', 'TRIED_NOT_JOINED', 'GRADING',
]

export const ACTION_HREF: Record<ActionKind, string> = {
  COLLECT: '/dashboard/reports/payments?tab=COLLECT',
  FAILED: '/dashboard/reports/payments?tab=FAILED',
  TRIAL_TODAY: '/dashboard/reports/leads?tab=UPCOMING_TRIAL',
  NOT_CONTACTED: '/dashboard/reports/leads?tab=NOT_CONTACTED',
  TRIED_NOT_JOINED: '/dashboard/reports/leads?tab=TRIED_NOT_JOINED',
  RETAIN: '/dashboard/reports/absents?tab=AT_RISK',
  APPROVALS: '/dashboard/users?filter=Pending',
  UNMARKED: '/dashboard/reports/bookings?tab=UNMARKED',
  GRADING: '/dashboard/reports/gradings',
}

export function topActions(counts: Partial<Record<ActionKind, number>>, limit = 3): Array<{ kind: ActionKind; count: number; href: string }> {
  return ACTION_ORDER
    .filter(k => (counts[k] ?? 0) > 0)
    .slice(0, limit)
    .map(k => ({ kind: k, count: counts[k]!, href: ACTION_HREF[k] }))
}
