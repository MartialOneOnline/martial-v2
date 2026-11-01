export type SchoolModuleKey = 'store' | 'curriculum' | 'news' | 'music' | 'timer' | 'grading'

export const SCHOOL_MODULE_KEYS: SchoolModuleKey[] = ['store', 'curriculum', 'news', 'music', 'timer', 'grading']

const DEFAULTS: Record<Exclude<SchoolModuleKey, 'grading'>, boolean> = {
  store: false,
  curriculum: false,
  news: false,
  music: false,
  timer: false,
}

export interface SchoolModuleOptions {
  /**
   * Active grading systems of the school. Belts & gradings is a module like
   * the others (a boxing gym has no belts), but it predates the switch: a
   * school that never set it keeps grading on if it already has a system.
   */
  activeGradingSystems?: number
}

// Merges a raw (possibly incomplete or untrusted) value against the module
// defaults — missing or invalid keys resolve to disabled rather than throwing,
// so older schools without any modules set still get a valid shape.
export function getSchoolModules(raw: unknown, opts: SchoolModuleOptions = {}): Record<SchoolModuleKey, boolean> {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const flag = (key: Exclude<SchoolModuleKey, 'grading'>) => (typeof value[key] === 'boolean' ? (value[key] as boolean) : DEFAULTS[key])
  return {
    store: flag('store'),
    curriculum: flag('curriculum'),
    news: flag('news'),
    music: flag('music'),
    timer: flag('timer'),
    grading: typeof value.grading === 'boolean' ? value.grading : (opts.activeGradingSystems ?? 0) > 0,
  }
}

/**
 * Modules to store after a settings save: the request's values win, and a key
 * the request doesn't send keeps its current (resolved) value — so an older
 * client that doesn't know about `grading` can't switch it off by omission.
 */
export function mergeSchoolModules(current: unknown, incoming: unknown, opts: SchoolModuleOptions = {}): Record<SchoolModuleKey, boolean> {
  const resolved = getSchoolModules(current, opts)
  const value = incoming && typeof incoming === 'object' ? (incoming as Record<string, unknown>) : {}
  const out = { ...resolved }
  for (const key of SCHOOL_MODULE_KEYS) {
    if (typeof value[key] === 'boolean') out[key] = value[key] as boolean
  }
  return out
}

/** Whether belts & gradings show anywhere for this school (dashboard and /my). */
export function isGradingEnabled(raw: unknown, activeGradingSystems: number): boolean {
  return getSchoolModules(raw, { activeGradingSystems }).grading
}

/**
 * Client-side module state: the shared dashboard context once it has loaded
 * (so a change made in Settings wins, both ways), the value the server
 * rendered the page with until then (stable first paint), else unknown.
 */
export function resolveGradingEnabled(context: boolean | null, server: boolean | null | undefined): boolean | null {
  if (context !== null) return context
  return server ?? null
}
