// Decides where a scrolling list should go after the next render, so two
// rules don't fight each other:
//   - an explicit change (filter, search, sort order) starts the list from the top;
//   - opening a person (deep link, or picking another one) brings their row into view.
// The latest request wins. Nothing is applied until the list is "ready", so a
// deep link waits until the initial search/sort from the URL or storage is in.

export type ScrollIntent = 'top' | 'reveal'

export interface ListScrollController {
  /** Ask for a scroll after the next render; replaces any pending request. */
  request(intent: ScrollIntent): void
  /**
   * 'top' for an explicit change, only when the value really changes. React
   * skips the render when state is set to the same value, so a request for an
   * unchanged control would linger and fire on some unrelated later render.
   */
  requestTopIfChanged<T>(prev: T, next: T): boolean
  /** Drop any pending request (the user just scrolled the list themselves). */
  clear(): void
  /** The list now shows its initial state (URL search, saved sort applied). */
  markReady(): void
  /** Take the pending request, if the list is ready; null means "leave it". */
  consume(): ScrollIntent | null
}

export function createListScrollController(): ListScrollController {
  // A fresh panel may have been opened on a person: reveal them once ready.
  let pending: ScrollIntent | null = 'reveal'
  let ready = false
  return {
    request(intent) { pending = intent },
    requestTopIfChanged(prev, next) {
      if (Object.is(prev, next)) return false
      pending = 'top'
      return true
    },
    clear() { pending = null },
    markReady() { ready = true },
    consume() {
      if (!ready) return null
      const intent = pending
      pending = null
      return intent
    },
  }
}
