import { describe, it, expect } from 'vitest'
import { alphabetFor, letterKey, groupAlphabetically, groupByMonth, OTHER_KEY } from '../lib/alphaIndex'

const names = (xs: { name: string }[]) => xs.map(x => x.name)

describe('alphabetFor', () => {
  it('puts Ñ after N only in Spanish, and # last', () => {
    const es = alphabetFor('es')
    expect(es.indexOf('Ñ')).toBe(es.indexOf('N') + 1)
    expect(es.at(-1)).toBe(OTHER_KEY)
    expect(alphabetFor('en')).not.toContain('Ñ')
    expect(alphabetFor('en')).toHaveLength(27)
  })
})

describe('letterKey', () => {
  it('folds accents and case to the base letter', () => {
    expect(letterKey('Álvaro', 'es')).toBe('A')
    expect(letterKey('ana belén', 'es')).toBe('A')
    expect(letterKey('Íñigo', 'en')).toBe('I')
    expect(letterKey('Çelik', 'fr')).toBe('C')
  })
  it('keeps Ñ as its own letter only in Spanish', () => {
    expect(letterKey('Ñuño', 'es')).toBe('Ñ')
    expect(letterKey('Ñuño', 'en')).toBe('N')
  })
  it('sends digits, symbols and blanks to #', () => {
    expect(letterKey('2 Hermanos', 'es')).toBe(OTHER_KEY)
    expect(letterKey('  ', 'es')).toBe(OTHER_KEY)
    expect(letterKey('🥋 Kid', 'es')).toBe(OTHER_KEY)
  })
})

describe('groupAlphabetically', () => {
  const people = ['Sergio', 'ana', 'Álvaro', 'Ana Belén', 'Nuria', 'Ñuño', 'Óscar', '3 Test', 'Zoe', 'Bruno']
    .map(name => ({ name }))

  it('orders sections by the rail and names case/accent-insensitively', () => {
    const sections = groupAlphabetically(people, 'es')
    expect(sections.map(s => s.key)).toEqual(['A', 'B', 'N', 'Ñ', 'O', 'S', 'Z', '#'])
    expect(names(sections[0]!.items)).toEqual(['Álvaro', 'ana', 'Ana Belén'])
  })

  it('merges Ñ into N outside Spanish', () => {
    const sections = groupAlphabetically(people, 'en')
    const n = sections.find(s => s.key === 'N')!
    // Accent-insensitive: Ñuño compares as "Nuno", before "Nuria".
    expect(names(n.items)).toEqual(['Ñuño', 'Nuria'])
    expect(sections.some(s => s.key === 'Ñ')).toBe(false)
  })

  it('does not mutate the input', () => {
    const copy = [...people]
    groupAlphabetically(people, 'es')
    expect(people).toEqual(copy)
  })
})

describe('groupByMonth', () => {
  it('lists newest first, one section per month, undated last', () => {
    const items = [
      { name: 'a', joinedAt: '2026-10-03T10:00:00.000Z' },
      { name: 'b', joinedAt: null },
      { name: 'c', joinedAt: '2026-11-02T10:00:00.000Z' },
      { name: 'd', joinedAt: '2026-10-20T10:00:00.000Z' },
    ]
    const sections = groupByMonth(items, 'en')
    expect(sections.map(s => names(s.items))).toEqual([['c'], ['d', 'a'], ['b']])
    expect(sections[0]!.label).toBe('November 2026')
    expect(sections.at(-1)!.label).toBe('—')
  })

  it('capitalises localised month names', () => {
    const [s] = groupByMonth([{ name: 'a', joinedAt: '2026-11-02T10:00:00.000Z' }], 'es')
    expect(s!.label.startsWith('N')).toBe(true)
  })
})
