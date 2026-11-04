// Bounded network calls for the sign-in flows. A plain fetch() on a flaky
// mobile connection can hang for minutes with no error — including *after*
// the headers arrive, while the body is still streaming — which left the
// login button stuck on "Logging in…" with no way out.
//
// fetchJson() keeps one deadline over the whole request: connect, headers
// and reading the body. When it passes (or when the caller's own `signal`
// aborts, e.g. a whole sign-in attempt being cancelled) every pending step
// rejects, so the caller's catch can reset the UI and offer a retry.

export const DEFAULT_TIMEOUT_MS = 15000

export type JsonResult<T> = { ok: boolean; status: number; data: T | null }

export async function fetchJson<T = Record<string, unknown>>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  { timeoutMs = DEFAULT_TIMEOUT_MS, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<JsonResult<T>> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(abort, timeoutMs)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    // Read inside the deadline: res.text() is aborted by the same signal.
    const text = await res.text()
    let data: T | null = null
    try { data = text ? (JSON.parse(text) as T) : null } catch { data = null }
    return { ok: res.ok, status: res.status, data }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

// fetch()-compatible wrapper bound to a cancellation signal and a deadline
// that also covers the body (the returned Response is fully buffered), for
// helpers that take a `fetchImpl` such as fetchAvailableContexts().
export function boundedFetch(signal: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal.aborted) abort()
    signal.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(abort, timeoutMs)
    try {
      const res = await fetch(input, { ...init, signal: controller.signal })
      const body = await res.arrayBuffer()
      return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers })
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
    }
  }
}
