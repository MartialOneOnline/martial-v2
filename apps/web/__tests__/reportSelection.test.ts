/**
 * Audit PR #35 (P1 ×2): the month shown in the segment picker must be the one
 * requested, and a pending "Select all" must never land in a different group
 * — otherwise a campaign goes to the wrong students.
 */
import { describe, it, expect } from 'vitest'
import { segmentMonthOptions, createRequestGuard, SEGMENT_MONTHS_BACK } from '@/lib/reportSelection'

describe('segmentMonthOptions()', () => {
  it('offers the last 24 months, newest first', () => {
    const opts = segmentMonthOptions('2026-10', [])
    expect(opts).toHaveLength(SEGMENT_MONTHS_BACK)
    expect(opts[0]).toBe('2026-10')
    expect(opts[opts.length - 1]).toBe('2024-11')
  })

  it('always contains the current month even when a Custom chart only covers older months', () => {
    // Custom = August → chart is Jul–Aug, but the default segment month is October
    const opts = segmentMonthOptions('2026-10', ['2026-07', '2026-08'], '2026-10')
    expect(opts).toContain('2026-10')
    expect(opts).toContain('2026-08')
  })

  it('includes a selected or charted month older than the default window', () => {
    const opts = segmentMonthOptions('2026-10', ['2023-01', '2023-02'], '2022-06')
    expect(opts).toContain('2023-01')
    expect(opts).toContain('2022-06')
    expect(opts.slice().sort().reverse()).toEqual(opts)
  })

  it('never offers future months', () => {
    expect(segmentMonthOptions('2026-10', ['2026-11'], '2026-12')).not.toContain('2026-11')
    expect(segmentMonthOptions('2026-10', [], '2026-12')).not.toContain('2026-12')
  })
})

describe('createRequestGuard()', () => {
  it('drops a response after the tab/month changed while it was pending', () => {
    const g = createRequestGuard()
    const token = g.begin()     // "Select all" on New
    g.invalidate()              // user switches to Lost
    expect(g.isCurrent(token)).toBe(false)
  })

  it('drops a response after an explicit clear while it was pending', () => {
    const g = createRequestGuard()
    const token = g.begin()
    g.invalidate()              // "Clear" pressed
    expect(g.isCurrent(token)).toBe(false)
  })

  it('only the latest of two overlapping requests applies', () => {
    const g = createRequestGuard()
    const first = g.begin()
    const second = g.begin()
    expect(g.isCurrent(first)).toBe(false)
    expect(g.isCurrent(second)).toBe(true)
  })
})
