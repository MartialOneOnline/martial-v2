const COMBINING_DIACRITICS = /[̀-ͯ]/g

export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '')
    .toLowerCase()
}

export function matchesSearch(value: string, query: string): boolean {
  if (!query) return true
  return normalizeForSearch(value).includes(normalizeForSearch(query))
}
