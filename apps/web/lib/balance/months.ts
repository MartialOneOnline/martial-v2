import { zonedStartOfDay } from '@/lib/absences/periods'
import { dayKey } from '@/lib/absences/stopped'
import type { PnlMonth } from './pnl'

export type BalancePeriod = 'month' | '3m' | '12m' | 'year'
export const BALANCE_PERIODS: BalancePeriod[] = ['month', '3m', '12m', 'year']

/** Calendar months of the period in the school's timezone; the last one ends now */
export function balanceMonths(period: BalancePeriod, timeZone: string, now = new Date()): PnlMonth[] {
  const [y, m] = dayKey(now, timeZone).split('-').map(Number) as [number, number]
  const count = period === 'month' ? 1 : period === '3m' ? 3 : period === '12m' ? 12 : m
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i
    const from = zonedStartOfDay(y, m - offset, 1, timeZone)
    const next = zonedStartOfDay(y, m - offset + 1, 1, timeZone)
    return { key: dayKey(from, timeZone).slice(0, 7), from, to: offset === 0 ? now : new Date(next.getTime() - 1) }
  })
}


/** Offset (ms) of the timezone from UTC at an instant */
function tzOffsetMs(instant: number, timeZone: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant)).map(x => [x.type, x.value]))
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - Math.floor(instant / 1000) * 1000
}

/**
 * 12:00 civil time on that day in the school's timezone, as an instant —
 * midday, so the day never shifts, and right on DST-change days too
 * (no "midnight + 12 h", which lands at 11:00 or 13:00 on those days).
 */
export function schoolNoon(year: number, month: number, day: number, timeZone: string): Date {
  const wall = Date.UTC(year, month - 1, day, 12, 0, 0)
  let t = wall - tzOffsetMs(wall, timeZone)
  t = wall - tzOffsetMs(t, timeZone)
  return new Date(t)
}
