import { describe, it, expect } from 'vitest'
import { safeRedirect } from '../lib/safeRedirect'

describe('safeRedirect', () => {
  it('keeps same-origin paths, query and hash included', () => {
    expect(safeRedirect('/my')).toBe('/my')
    expect(safeRedirect('/dashboard/classes?date=2026-11-04&class=abc&time=18:00')).toBe('/dashboard/classes?date=2026-11-04&class=abc&time=18:00')
    expect(safeRedirect('/join/rgm?welcome=1#top')).toBe('/join/rgm?welcome=1#top')
  })

  it('rejects empty, absolute and protocol-relative targets', () => {
    expect(safeRedirect(null)).toBeUndefined()
    expect(safeRedirect('')).toBeUndefined()
    expect(safeRedirect('https://example.test')).toBeUndefined()
    expect(safeRedirect('//example.test')).toBeUndefined()
    expect(safeRedirect('javascript:alert(1)')).toBeUndefined()
  })

  it('rejects backslash tricks browsers read as another host', () => {
    // `redirect=%2F%5Cexample.test` decodes to this — the audit repro.
    expect(safeRedirect('/\\example.test')).toBeUndefined()
    expect(safeRedirect('/\\/example.test')).toBeUndefined()
    expect(safeRedirect('/my\\..\\x')).toBeUndefined()
  })

  it('rejects control characters browsers strip before resolving', () => {
    expect(safeRedirect('/\t/example.test')).toBeUndefined()
    expect(safeRedirect('/\n/example.test')).toBeUndefined()
    expect(safeRedirect('/my\u0000')).toBeUndefined()
  })
})
