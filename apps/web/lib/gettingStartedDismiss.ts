// Pure request/outcome logic for GettingStartedChecklist.tsx's dismiss
// button, kept in its own non-JSX module so it can be unit tested without
// rendering the component — this repo has no @testing-library/react or DOM
// test environment (vitest.config.ts runs `environment: 'node'`). Returns
// true only for a real 2xx response; false for a non-2xx response or a
// thrown network error, never throws itself.
export async function submitGettingStartedDismiss(): Promise<boolean> {
  try {
    const res = await fetch('/api/dashboard/getting-started/dismiss', { method: 'POST' })
    return res.ok
  } catch {
    return false
  }
}

export type GettingStartedDismissCallbacks = {
  onSuccess: () => void
  onFailure: () => void
}

export type GettingStartedDismissRunner = (callbacks: GettingStartedDismissCallbacks) => Promise<void>

// Orchestrates one dismiss attempt: guards against a second submission while
// one is already in flight, then maps the outcome to exactly one of the two
// callbacks. The in-flight guard lives in this closure rather than in the
// component's React state — a click handler's `dismissing` state read at
// call time can't guarantee it reflects an update `setDismissing(true)`
// made earlier in the very same handler (React doesn't re-render
// synchronously mid-handler), so a component-state-only guard can't fully
// rule out two overlapping submissions. `submit` is injected so tests can
// control the outcome without touching global fetch. Call
// createGettingStartedDismissRunner() once per component instance (e.g. via
// useRef/useState(() => ...)) — a fresh call makes a fresh, independent guard.
export function createGettingStartedDismissRunner(
  submit: () => Promise<boolean> = submitGettingStartedDismiss,
): GettingStartedDismissRunner {
  let inFlight = false
  return async function runGettingStartedDismiss(callbacks) {
    if (inFlight) return
    inFlight = true
    try {
      const ok = await submit()
      if (ok) callbacks.onSuccess()
      else callbacks.onFailure()
    } finally {
      inFlight = false
    }
  }
}
