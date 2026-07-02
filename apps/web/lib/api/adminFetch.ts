'use client'

// Wraps fetch() for /api/admin and /api/dashboard calls from client components.
// A 401 means the session is gone (expired/invalid) — bounce to login instead
// of letting callers set state from an {error: ...} body shaped nothing like
// the expected response, which crashes on the first `data.foo.bar` access.
export async function adminFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
  }
  return res
}
