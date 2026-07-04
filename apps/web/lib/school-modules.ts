export type SchoolModuleKey = 'store' | 'curriculum' | 'news'

export const SCHOOL_MODULE_KEYS: SchoolModuleKey[] = ['store', 'curriculum', 'news']

const DEFAULTS: Record<SchoolModuleKey, boolean> = {
  store: false,
  curriculum: false,
  news: false,
}

// Merges a raw (possibly incomplete or untrusted) value against the module
// defaults — missing or invalid keys resolve to disabled rather than throwing,
// so older schools without any modules set still get a valid shape.
export function getSchoolModules(raw: unknown): Record<SchoolModuleKey, boolean> {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    store: typeof value.store === 'boolean' ? value.store : DEFAULTS.store,
    curriculum: typeof value.curriculum === 'boolean' ? value.curriculum : DEFAULTS.curriculum,
    news: typeof value.news === 'boolean' ? value.news : DEFAULTS.news,
  }
}
