/**
 * The ?tab= of the current URL when it is one of `allowed` — lets links from
 * the Today page open a report on the right list. Client-only (call in an
 * effect, after hydration).
 */
export function tabFromUrl<T extends string>(allowed: readonly T[]): T | null {
  if (typeof window === 'undefined') return null
  const tab = new URLSearchParams(window.location.search).get('tab')
  return tab && (allowed as readonly string[]).includes(tab) ? tab as T : null
}
