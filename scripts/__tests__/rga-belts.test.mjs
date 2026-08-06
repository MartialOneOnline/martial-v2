import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseLine,
  mapBelt,
  parseBeltRankTitle,
  resolveBeltRankId,
  resolveBelt,
} from '../lib/rga-belts.mjs'

// ── CSV doubled-quote escaping ──────────────────────────────────────────────

test('parseLine unescapes a doubled-quote JSON field like userdetails.belts', () => {
  const line = '"745","{""18"":""332""}","A1"'
  assert.deepEqual(parseLine(line), ['745', '{"18":"332"}', 'A1'])
})

// ── resolveBeltRankId: numeric vs string JSON ids, empty/NULL/{}/[] ────────

test('resolveBeltRankId reads a string rank id for activity 18', () => {
  assert.equal(resolveBeltRankId('{"18":"332"}'), '332')
})

test('resolveBeltRankId reads a numeric rank id for activity 18', () => {
  assert.equal(resolveBeltRankId('{"18":1120}'), '1120')
})

test('resolveBeltRankId returns null for an empty string', () => {
  assert.equal(resolveBeltRankId(''), null)
})

test('resolveBeltRankId returns null for the literal "NULL"', () => {
  assert.equal(resolveBeltRankId('NULL'), null)
})

test('resolveBeltRankId returns null for an empty object', () => {
  assert.equal(resolveBeltRankId('{}'), null)
})

test('resolveBeltRankId returns null for an empty array', () => {
  assert.equal(resolveBeltRankId('[]'), null)
})

test('resolveBeltRankId returns null for invalid JSON', () => {
  assert.equal(resolveBeltRankId('not-json'), null)
})

// ── parseBeltRankTitle: color + degree parsing ──────────────────────────────

test('parseBeltRankTitle: Blanco with no degree', () => {
  assert.deepEqual(parseBeltRankTitle('Blanco'), { belt: 'Blanco', degree: 0 })
})

test('parseBeltRankTitle: Azul with a degree', () => {
  assert.deepEqual(parseBeltRankTitle('Azul 2 Grado'), { belt: 'Azul', degree: 2 })
})

test('parseBeltRankTitle: Morado with a degree', () => {
  assert.deepEqual(parseBeltRankTitle('Morado 3 Grado'), { belt: 'Morado', degree: 3 })
})

test('parseBeltRankTitle: Marron with a degree', () => {
  assert.deepEqual(parseBeltRankTitle('Marron 1 Grado'), { belt: 'Marron', degree: 1 })
})

test('parseBeltRankTitle: Negro with a degree', () => {
  assert.deepEqual(parseBeltRankTitle('Negro 1 Grado'), { belt: 'Negro', degree: 1 })
})

test('parseBeltRankTitle: fixes the V1 "Nagro" typo (plural "Grados")', () => {
  assert.deepEqual(parseBeltRankTitle('Nagro 4 Grados'), { belt: 'Negro', degree: 4 })
})

test('parseBeltRankTitle: null/empty title resolves to null', () => {
  assert.equal(parseBeltRankTitle(null), null)
  assert.equal(parseBeltRankTitle(''), null)
  assert.equal(parseBeltRankTitle(undefined), null)
})

// ── mapBelt: EN/ES + unknown fallback ───────────────────────────────────────

test('mapBelt passes through valid Spanish belt names', () => {
  assert.equal(mapBelt('Azul'), 'Azul')
})

test('mapBelt translates English belt names', () => {
  assert.equal(mapBelt('blue'), 'Azul')
  assert.equal(mapBelt('black'), 'Negro')
})

test('mapBelt defaults unknown input to Blanco', () => {
  assert.equal(mapBelt('rainbow'), 'Blanco')
  assert.equal(mapBelt(''), 'Blanco')
})

// ── resolveBelt: full pipeline (belts JSON -> belt_ranks lookup -> {belt, degree}) ─

const beltRankById = new Map([
  ['327', 'Blanco'],
  ['332', 'Azul'],
  ['333', 'Azul 1 Grado'],
  ['1123', 'Nagro 4 Grados'],
])

test('resolveBelt resolves a string-id JSON belts field end to end', () => {
  assert.deepEqual(resolveBelt('{"18":"332"}', beltRankById), { belt: 'Azul', degree: 0 })
})

test('resolveBelt resolves a numeric-id JSON belts field end to end', () => {
  assert.deepEqual(resolveBelt('{"18":1123}', beltRankById), { belt: 'Negro', degree: 4 })
})

test('resolveBelt returns null for empty belts structures', () => {
  assert.equal(resolveBelt('NULL', beltRankById), null)
  assert.equal(resolveBelt('', beltRankById), null)
  assert.equal(resolveBelt('{}', beltRankById), null)
  assert.equal(resolveBelt('[]', beltRankById), null)
})

test('resolveBelt returns null when the rank id has no matching belt_ranks row', () => {
  assert.equal(resolveBelt('{"18":"999999"}', beltRankById), null)
})
