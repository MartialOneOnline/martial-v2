/**
 * Regression tests for the fail-open dismiss bug: handleDismiss() used to
 * run `fetch(...)` in a try and call onDismiss() unconditionally in
 * `finally`, so a failed request still hid the checklist (and never
 * re-enabled the button, since `dismissing` was never reset).
 *
 * GettingStartedChecklist.tsx calls createGettingStartedDismissRunner()'s
 * returned function directly with `onSuccess: onDismiss` / `onFailure: () =>
 * { setDismissing(false); setDismissError(true) }` — exercising the runner
 * with real assertions on which callback fires (and how many times) proves
 * the same outcome the component produces, without rendering it. Component
 * rendering isn't used because this repo has no @testing-library/react or
 * DOM test environment (vitest.config.ts runs `environment: 'node'`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGettingStartedDismissRunner, submitGettingStartedDismiss } from '@/lib/gettingStartedDismiss'

describe('submitGettingStartedDismiss()', () => {
  const originalFetch = global.fetch
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { global.fetch = originalFetch })

  it('resolves true on a 2xx response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await expect(submitGettingStartedDismiss()).resolves.toBe(true)
  })

  it('resolves false on a non-2xx response', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 500 }))
    await expect(submitGettingStartedDismiss()).resolves.toBe(false)
  })

  it('resolves false, never throws, when fetch itself rejects', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new TypeError('network error'))
    await expect(submitGettingStartedDismiss()).resolves.toBe(false)
  })

  it('POSTs the dismiss endpoint', async () => {
    vi.mocked(global.fetch).mockResolvedValue(new Response(null, { status: 200 }))
    await submitGettingStartedDismiss()
    expect(global.fetch).toHaveBeenCalledWith('/api/dashboard/getting-started/dismiss', { method: 'POST' })
  })
})

describe('createGettingStartedDismissRunner() — with an injected submit outcome', () => {
  it('success: calls the hide callback (onSuccess) exactly once, never onFailure', async () => {
    const submit = vi.fn().mockResolvedValue(true)
    const onSuccess = vi.fn()
    const onFailure = vi.fn()

    await createGettingStartedDismissRunner(submit)({ onSuccess, onFailure })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('HTTP error (submit resolves false): never calls onSuccess, calls onFailure, and a later retry can still succeed', async () => {
    const submit = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const run = createGettingStartedDismissRunner(submit)

    await run({ onSuccess, onFailure })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFailure).toHaveBeenCalledTimes(1)

    // Retry: the guard must have released, so this reaches submit again.
    await run({ onSuccess, onFailure })
    expect(submit).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('a submission already in flight blocks a second one from reaching submit until the first settles', async () => {
    let resolveSubmit!: (ok: boolean) => void
    const submit = vi.fn().mockReturnValue(new Promise<boolean>(resolve => { resolveSubmit = resolve }))
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const run = createGettingStartedDismissRunner(submit)

    const first = run({ onSuccess, onFailure })
    const second = run({ onSuccess, onFailure })

    expect(submit).toHaveBeenCalledTimes(1)

    resolveSubmit(true)
    await Promise.all([first, second])

    expect(submit).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('once a submission settles, the guard releases — a later call is not permanently locked out', async () => {
    const submit = vi.fn().mockResolvedValue(true)
    const onSuccess = vi.fn()
    const run = createGettingStartedDismissRunner(submit)

    await run({ onSuccess, onFailure: vi.fn() })
    await run({ onSuccess, onFailure: vi.fn() })

    expect(submit).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalledTimes(2)
  })
})

describe('createGettingStartedDismissRunner() — default submit (real fetch wiring, matches production usage)', () => {
  const originalFetch = global.fetch
  beforeEach(() => { global.fetch = vi.fn() })
  afterEach(() => { global.fetch = originalFetch })

  it('network error: fetch rejecting never calls onSuccess, calls onFailure, and a retry still reaches fetch again', async () => {
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new TypeError('network error'))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const onSuccess = vi.fn()
    const onFailure = vi.fn()
    const run = createGettingStartedDismissRunner() // no override — exercises submitGettingStartedDismiss for real

    await run({ onSuccess, onFailure })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onFailure).toHaveBeenCalledTimes(1)

    await run({ onSuccess, onFailure })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })
})
