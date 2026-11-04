import { afterEach, describe, it, expect, vi } from 'vitest'
import { fetchJson, boundedFetch } from '../lib/fetchWithTimeout'

// A response whose headers arrive (200) but whose body never finishes —
// the audit repro. The stream errors when the request's signal aborts, the
// way a real fetch body does.
function stalledBodyFetch(): typeof fetch {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"ok":'))
        signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')))
      },
    })
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as unknown as typeof fetch
}

afterEach(() => { vi.unstubAllGlobals() })

describe('fetchJson', () => {
  it('times out while the body is still streaming after a 200', async () => {
    vi.stubGlobal('fetch', stalledBodyFetch())
    await expect(fetchJson('/api/auth/login', {}, { timeoutMs: 30 })).rejects.toThrow()
  })

  it('aborts when the caller cancels, even mid-body', async () => {
    vi.stubGlobal('fetch', stalledBodyFetch())
    const ctrl = new AbortController()
    const pending = fetchJson('/api/auth/me', {}, { timeoutMs: 5000, signal: ctrl.signal })
    setTimeout(() => ctrl.abort(), 10)
    await expect(pending).rejects.toThrow()
  })

  it('returns status and parsed JSON, or null data for non-JSON error pages', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"nope"}', { status: 401 })))
    await expect(fetchJson('/x')).resolves.toEqual({ ok: false, status: 401, data: { error: 'nope' } })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>504</html>', { status: 504 })))
    await expect(fetchJson('/x')).resolves.toEqual({ ok: false, status: 504, data: null })
  })
})

describe('boundedFetch', () => {
  it('covers the body too and rejects when the shared attempt is cancelled', async () => {
    vi.stubGlobal('fetch', stalledBodyFetch())
    const ctrl = new AbortController()
    const pending = boundedFetch(ctrl.signal, 5000)('/api/auth/contexts')
    setTimeout(() => ctrl.abort(), 10)
    await expect(pending).rejects.toThrow()
  })

  it('times out a stalled body on its own', async () => {
    vi.stubGlobal('fetch', stalledBodyFetch())
    await expect(boundedFetch(new AbortController().signal, 30)('/api/auth/contexts')).rejects.toThrow()
  })
})
