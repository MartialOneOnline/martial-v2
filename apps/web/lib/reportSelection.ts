// Small helpers that keep the Users report's audience (the students a
// campaign or export goes to) in sync with what's on screen. Kept pure so
// they're testable without a DOM.

import { addMonths, monthRange, type MonthKey } from './memberActivity'

/** How far back the New / Lost / Came back month picker goes by default. */
export const SEGMENT_MONTHS_BACK = 24

/**
 * Months offered by the segment month picker, newest first. Always includes
 * the selected month and every month on the chart (a Custom range can sit
 * outside the default window), so the picker can never show a month other
 * than the one actually requested.
 */
export function segmentMonthOptions(currentMonth: MonthKey, chartMonths: MonthKey[], selected?: MonthKey | null): MonthKey[] {
  const set = new Set(monthRange(addMonths(currentMonth, -(SEGMENT_MONTHS_BACK - 1)), currentMonth))
  for (const m of chartMonths) if (m <= currentMonth) set.add(m)
  if (selected && selected <= currentMonth) set.add(selected)
  return [...set].sort().reverse()
}

/**
 * Guards async work against the context changing underneath it: begin()
 * before the request, isCurrent(token) when it resolves, invalidate() when
 * the context (tab, month, filters, an explicit clear) changes. A response
 * from an older context is then dropped instead of applied — e.g. a slow
 * "Select all" from the New tab landing after the user switched to Lost.
 */
export function createRequestGuard() {
  let generation = 0
  return {
    begin: () => ++generation,
    isCurrent: (token: number) => token === generation,
    invalidate: () => { generation++ },
  }
}
export type RequestGuard = ReturnType<typeof createRequestGuard>
