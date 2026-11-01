import { describe, it, expect } from 'vitest'
import {
  normalizeBeltName, buildBeltIndex, resolveBeltRank, beltKey, beltOptions,
  matchesBeltFilter, parseBeltFilter, NO_BELT_KEY, type BeltSystemRef, type BeltMember,
} from '../lib/beltGroups'

const rank = (id: string, name: string, order: number, color = '#000000') => ({ id, name, color, order, maxDegrees: 4 })

const adults: BeltSystemRef = {
  id: 'sys-a', name: 'BJJ Adultos', isDefault: true,
  ranks: [rank('azul', 'Azul', 1, '#1D4ED8'), rank('blanco', 'Blanco', 0), rank('marron', 'Marron', 3), rank('morado', 'Morado', 2), rank('negro', 'Negro', 4)],
}
const kids: BeltSystemRef = {
  id: 'sys-k', name: 'BJJ Kids', isDefault: false,
  ranks: [rank('k-blanco', 'Blanco', 0), rank('k-gris', 'Gris-Blanco', 1)],
}

const member = (id: string, belt: string | null, beltRankId: string | null = null, beltDegree: number | null = 0, status = 'ACTIVE'): BeltMember =>
  ({ id, belt, beltRankId, beltDegree, status })

describe('normalizeBeltName', () => {
  it('ignores accents, case and the word "belt", and maps colours across languages', () => {
    expect(normalizeBeltName('Marrón')).toBe('brown')
    expect(normalizeBeltName('marron')).toBe('brown')
    expect(normalizeBeltName('Brown Belt')).toBe('brown')
    expect(normalizeBeltName(' Faixa Azul ')).toBe('blue')
    expect(normalizeBeltName('Blue Belt')).toBe(normalizeBeltName('Azul'))
  })
  it('keeps compound and non-colour names as they are', () => {
    expect(normalizeBeltName('Gris-Blanco')).toBe('gris-blanco')
    expect(normalizeBeltName('1er Dan')).toBe('1er dan')
  })
})

describe('resolveBeltRank', () => {
  const index = buildBeltIndex([adults, kids])

  it('matches by name when the student has no link', () => {
    expect(resolveBeltRank('Marrón', null, index)?.id).toBe('marron')
    expect(resolveBeltRank('Blue Belt', null, index)?.id).toBe('azul')
  })
  it('prefers the default system for a name two systems share', () => {
    expect(resolveBeltRank('Blanco', null, index)?.id).toBe('blanco')
  })
  it('keeps a link that still names the same belt (kids white belt)', () => {
    expect(resolveBeltRank('Blanco', 'k-blanco', index)?.id).toBe('k-blanco')
  })
  it('ignores a stale link left by a text-only belt change', () => {
    expect(resolveBeltRank('Morado', 'azul', index)?.id).toBe('morado')
  })
  it('uses the link when there is no text, and null for unknown belts', () => {
    expect(resolveBeltRank(null, 'negro', index)?.id).toBe('negro')
    expect(resolveBeltRank('Coral', null, index)).toBeNull()
  })
})

describe('beltOptions', () => {
  const index = buildBeltIndex([adults])
  const roster = [
    member('1', 'Blanco', 'blanco'), member('2', 'Blanco', null, 2, 'INACTIVE'),
    member('3', 'Marron', 'marron', 1), member('4', 'Blue Belt'),
    member('5', 'Coral'), member('6', 'coral'), member('7', 'Coral'),
    member('8', null, null, null), member('9', '  '),
  ]
  const options = beltOptions(roster, index)

  it('lists every catalog belt in order, then other names, then no belt', () => {
    expect(options.map(o => o.key)).toEqual(['r:blanco', 'r:azul', 'r:morado', 'r:marron', 'r:negro', 'n:coral', NO_BELT_KEY])
  })
  it('counts students and active students per belt', () => {
    const byKey = Object.fromEntries(options.map(o => [o.key, o]))
    expect(byKey['r:blanco']).toMatchObject({ count: 2, activeCount: 1 })
    expect(byKey['r:azul']).toMatchObject({ count: 1, name: 'Azul', color: '#1D4ED8' })
    expect(byKey['r:morado']!.count).toBe(0)
    expect(byKey['n:coral']).toMatchObject({ count: 3, name: 'Coral' })
    expect(byKey[NO_BELT_KEY]!.count).toBe(2)
  })
  it('groups by system name only when the school has several', () => {
    expect(options.every(o => o.group === null)).toBe(true)
    const two = beltOptions([], buildBeltIndex([adults, kids]))
    expect(two.find(o => o.key === 'r:k-gris')?.group).toBe('BJJ Kids')
  })
})

describe('belt filter', () => {
  const index = buildBeltIndex([adults])

  it('parses keys, legacy names and stripes from the query string', () => {
    expect(parseBeltFilter(['r:azul', 'Marrón', 'none', ''], ['2', '0', 'x', '-1'], index))
      .toEqual({ belts: ['r:azul', 'r:marron', NO_BELT_KEY], degrees: [0, 2] })
  })
  it('matches any of the selected belts and stripes', () => {
    const filter = { belts: ['r:azul', 'r:marron'], degrees: [1] }
    expect(matchesBeltFilter(member('a', 'Marron', null, 1), filter, index)).toBe(true)
    expect(matchesBeltFilter(member('b', 'Blue Belt', null, 1), filter, index)).toBe(true)
    expect(matchesBeltFilter(member('c', 'Azul', null, 2), filter, index)).toBe(false)
    expect(matchesBeltFilter(member('d', 'Negro', null, 1), filter, index)).toBe(false)
  })
  it('treats a missing stripe count as 0 and matches "no belt"', () => {
    expect(matchesBeltFilter(member('e', null, null, null), { belts: [NO_BELT_KEY], degrees: [0] }, index)).toBe(true)
    expect(beltKey({ belt: '', beltRankId: null }, index)).toBe(NO_BELT_KEY)
  })
})
