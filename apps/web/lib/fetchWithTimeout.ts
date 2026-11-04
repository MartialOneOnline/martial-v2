// fetch() with a hard timeout. A plain fetch() on a flaky mobile connection
// can hang for minutes with no error, which left the login button stuck on
// "Logging in…" with no way out. Aborts after `timeoutMs` so the caller's
// catch can reset the UI and offer a retry.
export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
