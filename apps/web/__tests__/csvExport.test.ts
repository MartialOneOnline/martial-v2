/**
 * buildCsv() feeds every dashboard "Export". The Users report passes the UI
 * locale so Spanish/Portuguese/French Excel opens it in columns with real
 * numbers; every other export keeps the original comma format.
 */
import { describe, it, expect } from 'vitest'
import { buildCsv } from '@/lib/csvExport'

describe('buildCsv()', () => {
  const headers = ['Mes', '% bajas']
  const rows = [['2026-10', 15.2], ['2026-11', null]]

  it('keeps the original comma format when no locale is given (existing exports)', () => {
    expect(buildCsv(headers, rows)).toBe('"Mes","% bajas"\n"2026-10","15.2"\n"2026-11",""')
  })

  it('uses ";" and a decimal comma for Spanish, Portuguese and French Excel', () => {
    for (const locale of ['es', 'pt', 'fr', 'es-ES']) {
      expect(buildCsv(headers, rows, { locale })).toBe('"Mes";"% bajas"\n"2026-10";"15,2"\n"2026-11";""')
    }
  })

  it('keeps "." decimals for English', () => {
    expect(buildCsv(headers, rows, { locale: 'en' })).toBe('"Mes","% bajas"\n"2026-10","15.2"\n"2026-11",""')
  })

  it('only converts numbers — text containing dots or separators is escaped, not rewritten', () => {
    expect(buildCsv(['a'], [['v1.2; "x"']], { locale: 'es' })).toBe('"a"\n"v1.2; ""x"""')
  })

  // Audit PR #36 (P2): a known zero count must not become an empty cell
  it('writes 0 as 0 and only null/undefined as empty', () => {
    expect(buildCsv(['n', 'pct'], [[0, null], [0, undefined]], { locale: 'es' })).toBe('"n";"pct"\n"0";""\n"0";""')
    expect(buildCsv(['n'], [[0]])).toBe('"n"\n"0"')
  })
})
