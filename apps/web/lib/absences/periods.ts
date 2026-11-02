// Period windows for the Absences report, in the SCHOOL's timezone (the
// shared lib/reportPeriods.ts works in the server's, which is UTC on Vercel:
// a class at 00:30 Madrid time would land on the previous day). Kept local to
// this report so the other reports don't change behaviour.
import { dayKey } from './stopped'
import { startOfCivilDayUtc } from '../memberActivity'

export type AbsencePeriod = '30d' | '90d' | '12m'
export interface ZonedPoint { key: string; kind: 'days' | 'month'; from: Date; to: Date }

/**
 * The first instant of that civil day in the timezone (month 1-based; overflow
 * allowed, e.g. day 0). Uses the shared civil-day search, so a day whose
 * midnight doesn't exist (DST starting at 00:00, e.g. São Paulo 2018-11-04)
 * starts at its first real instant.
 */
export function zonedStartOfDay(year: number, month: number, day: number, timeZone: string): Date {
  const key = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10)
  return startOfCivilDayUtc(key, timeZone)
}

const ymd = (key: string) => key.split('-').map(Number) as [number, number, number]

/**
 * 30d: ten 3-day buckets ending today; 90d: this month and the two before;
 * 12m: this month and the eleven before. Buckets touch end to start, so every
 * event lands in exactly one, and `to` of the last one is `now`.
 */
export function absencePeriod(period: AbsencePeriod, timeZone: string, now = new Date()): { from: Date; to: Date; points: ZonedPoint[] } {
  const [y, m, d] = ymd(dayKey(now, timeZone))
  const points: ZonedPoint[] = []
  if (period === '30d') {
    for (let i = 9; i >= 0; i--) {
      const lastDay = d - i * 3
      const from = zonedStartOfDay(y, m, lastDay - 2, timeZone)
      const to = new Date(zonedStartOfDay(y, m, lastDay + 1, timeZone).getTime() - 1)
      points.push({ key: dayKey(from, timeZone).slice(0, 10), kind: 'days', from, to })
    }
  } else {
    const months = period === '90d' ? 3 : 12
    for (let i = months - 1; i >= 0; i--) {
      const from = zonedStartOfDay(y, m - i, 1, timeZone)
      const to = new Date(zonedStartOfDay(y, m - i + 1, 1, timeZone).getTime() - 1)
      points.push({ key: dayKey(from, timeZone).slice(0, 7), kind: 'month', from, to })
    }
  }
  const last = points[points.length - 1]!
  last.to = now
  return { from: points[0]!.from, to: now, points }
}

export const isAbsencePeriod = (p: string | null): p is AbsencePeriod => p === '30d' || p === '90d' || p === '12m'
