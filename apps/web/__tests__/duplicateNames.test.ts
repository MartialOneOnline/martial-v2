/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma client */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findPartialNamePairs, nameTokens } from '@/lib/duplicateNames'

const userFindMany = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { user: { findMany: (...a: any[]) => userFindMany(...a) } } }))

const { findDuplicateCandidates } = await import('@/lib/accountMergeServer')

const person = (id: string, name: string | null) => ({ id, name })
const user = (id: string, name: string | null, o: { email?: string; phone?: string | null } = {}) => ({
  id, name, email: o.email ?? `${id}@x.com`, phone: o.phone ?? null, avatarUrl: null,
  createdAt: new Date('2026-01-01'), schoolMembers: [], _count: { bookings: 0, memberships: 0 },
})

describe('nameTokens', () => {
  it('ignores accents, case, punctuation and connecting words', () => {
    expect(nameTokens('  María-José de la CRUZ ')).toEqual(['maria', 'jose', 'cruz'])
    expect(nameTokens(null)).toEqual([])
  })
})

describe('findPartialNamePairs', () => {
  it('pairs a name with the same name plus a second surname', () => {
    expect(findPartialNamePairs([person('long', 'Íñigo Pérez Gómez'), person('short', 'Inigo Perez')]))
      .toEqual([['short', 'long']])
  })

  it('accepts a skipped middle surname and connecting words', () => {
    expect(findPartialNamePairs([person('a', 'Ana Gómez'), person('b', 'Ana de Pérez Gómez')]))
      .toEqual([['a', 'b']])
  })

  it('does not pair different first names, one-word names or identical names', () => {
    expect(findPartialNamePairs([person('a', 'Luis Perez'), person('b', 'Inigo Perez Gomez')])).toEqual([])
    expect(findPartialNamePairs([person('a', 'Inigo'), person('b', 'Inigo Perez')])).toEqual([])
    expect(findPartialNamePairs([person('a', 'Inigo Perez'), person('b', 'Íñigo Pérez')])).toEqual([])
  })

  it('stops at a short name that fits too many accounts', () => {
    const people = [person('short', 'Jose Garcia'), ...['Lopez', 'Perez', 'Ruiz', 'Diaz'].map(s => person(s, `Jose Garcia ${s}`))]
    expect(findPartialNamePairs(people)).toEqual([])
    expect(findPartialNamePairs(people.slice(0, 4))).toHaveLength(3)
  })
})

describe('findDuplicateCandidates', () => {
  beforeEach(() => userFindMany.mockReset())

  it('lists the partial-name pair with its own reason, after exact matches', async () => {
    userFindMany.mockResolvedValue([
      user('s1', 'Íñigo Pérez Gómez'), user('s2', 'Inigo Perez'),
      user('m1', 'Marta Ruiz'), user('m2', 'Marta Ruiz'),
    ])
    const pairs = await findDuplicateCandidates()
    expect(pairs.map(p => [p.a.id, p.b.id, p.reasons])).toEqual([
      ['m1', 'm2', ['name']],
      ['s1', 's2', ['similar_name']],
    ])
  })

  it('keeps one row when a similar name also shares the phone', async () => {
    userFindMany.mockResolvedValue([
      user('s1', 'Íñigo Pérez Gómez', { phone: '+34 600 111 222' }),
      user('s2', 'Inigo Perez', { phone: '600111222' }),
    ])
    const pairs = await findDuplicateCandidates()
    expect(pairs).toHaveLength(1)
    expect(pairs[0]!.reasons.sort()).toEqual(['phone', 'similar_name'])
  })
})
