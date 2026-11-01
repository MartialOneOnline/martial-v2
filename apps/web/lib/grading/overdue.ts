// Overdue gradings — students who earned a grading and haven't been given it.
// New students go first: in the first months a missed stripe is the most
// likely to cost a student (RGM: only 33% of new students are still active
// after 3 months).
import type { ReadinessStatus } from './readiness'

/** A grading owed for this long counts as overdue */
export const OVERDUE_DAYS = 14
/** Students with the school for less than this are "new" */
export const NEW_STUDENT_MONTHS = 6

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days between an ISO date and now; null without a date */
export function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS))
}

/** Whole calendar months with the school; null when the join date is unknown */
export function monthsWithSchool(joinedAt: Date | null, now: Date): number | null {
  if (!joinedAt) return null
  let m = (now.getUTCFullYear() - joinedAt.getUTCFullYear()) * 12 + (now.getUTCMonth() - joinedAt.getUTCMonth())
  if (now.getUTCDate() < joinedAt.getUTCDate()) m -= 1
  return Math.max(0, m)
}

export interface GradingQueueRow {
  name: string
  isNew: boolean
  daysOverdue: number | null
  readiness: { status: ReadinessStatus; due: { count: number } | null; percent: number | null }
}

const STATUS_ORDER: Record<ReadinessStatus, number> = { READY: 0, ALMOST_READY: 1, NOT_READY: 2, NO_RULES: 3, TOP_RANK: 4 }

/**
 * Report order. Due first; among them new students first, then the longest
 * overdue, then most steps owed. The rest: closest to their next grading.
 */
export function compareGradingQueue(a: GradingQueueRow, b: GradingQueueRow): number {
  const sa = a.readiness.status, sb = b.readiness.status
  if (sa !== sb) return STATUS_ORDER[sa] - STATUS_ORDER[sb]
  if (sa === 'READY') {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1
    const d = (b.daysOverdue ?? -1) - (a.daysOverdue ?? -1)
    if (d) return d
    const c = (b.readiness.due?.count ?? 0) - (a.readiness.due?.count ?? 0)
    if (c) return c
  }
  return (b.readiness.percent ?? -1) - (a.readiness.percent ?? -1) || a.name.localeCompare(b.name)
}

export function isOverdue(row: Pick<GradingQueueRow, 'daysOverdue' | 'readiness'>): boolean {
  return row.readiness.status === 'READY' && (row.daysOverdue ?? 0) >= OVERDUE_DAYS
}

/**
 * Counts for the "Overdue" and "New students due" chips over the rows the
 * other filters (belt) leave — so each count matches the list its chip opens.
 */
export function focusCounts<T extends Pick<GradingQueueRow, 'isNew' | 'daysOverdue' | 'readiness'>>(rows: T[]): { overdue: number; newDue: number } {
  let overdue = 0, newDue = 0
  for (const r of rows) {
    if (isOverdue(r)) overdue++
    if (r.isNew && r.readiness.status === 'READY') newDue++
  }
  return { overdue, newDue }
}
