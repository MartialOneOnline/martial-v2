import { describe, it, expect, vi } from 'vitest'
import { loadLeadDetail } from '../lib/leads/detailLoad'

type Lead = { id: string }

function deferred() {
  let resolve!: (r: Response) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<Response>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const flush = () => new Promise(r => setTimeout(r, 0))

function drawer() {
  // Mirrors the drawer state: the last handler call wins
  const state = { lead: null as Lead | null, error: false, loading: true }
  const handlers = {
    onLoaded: (l: Lead) => { state.lead = l; state.error = false },
    onError: () => { state.lead = null; state.error = true },
    onSettled: () => { state.loading = false },
  }
  return { state, handlers }
}

describe('loadLeadDetail', () => {
  it('a late 404 for lead A does not replace lead B (audit repro)', async () => {
    const a = deferred(), b = deferred()
    const fetchFn = vi.fn((url: string) => (url.endsWith('/A') ? a.promise : b.promise)) as unknown as typeof fetch
    const { state, handlers } = drawer()

    const cancelA = loadLeadDetail<Lead>('A', handlers, fetchFn)
    cancelA() // drawer closed / switched to B
    loadLeadDetail<Lead>('B', handlers, fetchFn)
    b.resolve(json({ lead: { id: 'B' } }))
    await flush()
    expect(state.lead).toEqual({ id: 'B' })

    a.resolve(json({ error: 'Not found' }, 404))
    await flush()
    expect(state).toEqual({ lead: { id: 'B' }, error: false, loading: false })
  })

  it('a late network failure of a cancelled load is ignored, finally included', async () => {
    const a = deferred()
    const fetchFn = vi.fn(() => a.promise) as unknown as typeof fetch
    const onError = vi.fn(), onSettled = vi.fn(), onLoaded = vi.fn()
    const cancel = loadLeadDetail<Lead>('A', { onLoaded, onError, onSettled }, fetchFn)
    cancel()
    a.reject(new Error('network'))
    await flush()
    expect(onError).not.toHaveBeenCalled()
    expect(onSettled).not.toHaveBeenCalled()
    expect(onLoaded).not.toHaveBeenCalled()
  })

  it('cancel aborts the request', () => {
    const fetchFn = vi.fn(() => new Promise<Response>(() => {})) as unknown as typeof fetch
    const cancel = loadLeadDetail<Lead>('A', drawer().handlers, fetchFn)
    const signal = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![1].signal as AbortSignal
    expect(signal.aborted).toBe(false)
    cancel()
    expect(signal.aborted).toBe(true)
  })

  it('a live load still reports errors and settles', async () => {
    const fetchFn = vi.fn(async () => json({ error: 'Forbidden' }, 403)) as unknown as typeof fetch
    const { state, handlers } = drawer()
    loadLeadDetail<Lead>('A', handlers, fetchFn)
    await flush()
    expect(state).toEqual({ lead: null, error: true, loading: false })
  })
})
