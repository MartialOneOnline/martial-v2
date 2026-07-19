/**
 * Regression test for the fail-open dismiss bug: handleDismiss() used to run
 * `fetch(...)` in a try and call onDismiss() unconditionally in `finally`,
 * so a failed request still hid the checklist (and never re-enabled the
 * button, since `dismissing` was never reset). submitGettingStartedDismiss()
 * is the pure fetch/outcome logic extracted from
 * app/dashboard/GettingStartedChecklist.tsx so this can be verified without
 * rendering the component — this repo has no @testing-library/react / DOM
 * test environment (vitest.config.ts runs `environment: 'node'`). The
 * component itself only calls onDismiss() (which is what actually hides the
 * checklist, per its `dismissed` prop) when this function resolves true, and
 * resets `dismissing` to re-allow a retry when it resolves false — see the
 * component's handleDismiss().
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { submitGettingStartedDismiss } from '@/lib/gettingStartedDismiss'

const originalFetch = global.fetch

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  global.fetch = originalFetch
})

describe('submitGettingStartedDismiss()', () => {
  it('resolves true on a 2xx response — the checklist may be hidden', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await expect(submitGettingStartedDismiss()).resolves.toBe(true)
  })

  it('resolves false on a non-2xx response — must not hide, retry stays available', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 500 }))
    await expect(submitGettingStartedDismiss()).resolves.toBe(false)
  })

  it('resolves false (never throws) when fetch itself rejects — must not hide, retry stays available', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError('network error'))
    await expect(submitGettingStartedDismiss()).resolves.toBe(false)
  })

  it('always POSTs the dismiss endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await submitGettingStartedDismiss()
    expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/getting-started/dismiss', { method: 'POST' })
  })
})
