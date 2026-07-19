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
