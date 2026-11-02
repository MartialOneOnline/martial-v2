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

