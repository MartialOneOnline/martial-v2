import type { Locale } from './i18n/translations'

// Contact-book style grouping for people lists: alphabetical sections (A, B, …)
// with a jump rail, or month sections for "most recent first".

const COMBINING_DIACRITICS = /[̀-ͯ]/g
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** Bucket for names that don't start with a letter (digits, emoji, empty). */
export const OTHER_KEY = '#'

/** Rail letters for a locale. Spanish has Ñ as its own letter, after N. */
export function alphabetFor(locale: Locale): string[] {
  const letters = locale === 'es'
    ? [...LATIN.slice(0, 14), 'Ñ', ...LATIN.slice(14)]
    : LATIN
  return [...letters, OTHER_KEY]
}

/** Section letter for a name: accents fold to the base letter (Álvaro → A). */
export function letterKey(name: string, locale: Locale): string {
  const first = name.trim().charAt(0)
  if (!first) return OTHER_KEY
  if (first === 'ñ' || first === 'Ñ') return locale === 'es' ? 'Ñ' : 'N'
  const base = first.normalize('NFD').replace(COMBINING_DIACRITICS, '').toUpperCase()
  return /^[A-Z]$/.test(base) ? base : OTHER_KEY
}

export interface Section<T> {
  key: string
  label: string
  items: T[]
}

/** A–Z sections, in rail order; names compared case- and accent-insensitively. */
export function groupAlphabetically<T extends { name: string }>(items: T[], locale: Locale): Section<T>[] {
  const order = alphabetFor(locale)
  const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true })
  const keyed = items.map(item => ({ item, key: letterKey(item.name, locale) }))
  keyed.sort((a, b) => (order.indexOf(a.key) - order.indexOf(b.key)) || collator.compare(a.item.name, b.item.name))

  const sections: Section<T>[] = []
  for (const { item, key } of keyed) {
    const last = sections[sections.length - 1]
    if (last && last.key === key) last.items.push(item)
    else sections.push({ key, label: key, items: [item] })
  }
  return sections
}

/** Newest first, one section per month; items without a date go last under "—". */
export function groupByMonth<T extends { joinedAt: string | null }>(items: T[], locale: Locale): Section<T>[] {
  const fmt = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
  const time = (v: string | null) => (v ? new Date(v).getTime() : Number.NEGATIVE_INFINITY)
  const sorted = [...items].sort((a, b) => time(b.joinedAt) - time(a.joinedAt))

  const sections: Section<T>[] = []
  for (const item of sorted) {
    let key = 'none', label = '—'
    if (item.joinedAt) {
      const d = new Date(item.joinedAt)
      key = `${d.getFullYear()}-${d.getMonth()}`
      const text = fmt.format(d)
      label = text.charAt(0).toUpperCase() + text.slice(1)
    }
    const last = sections[sections.length - 1]
    if (last && last.key === key) last.items.push(item)
    else sections.push({ key, label, items: [item] })
  }
  return sections
}
