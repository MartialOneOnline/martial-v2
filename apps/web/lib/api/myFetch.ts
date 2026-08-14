import { primed } from './sessionPrimer'

// Wraps fetch() for /api/my calls from client components: routes the request
// through the session primer (see sessionPrimer.ts) to avoid racing proxy.ts's
// token refresh, and treats a 401 as a dead session rather than letting callers
// setState from an {error: ...} body shaped nothing like the expected response.
export async function myFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await primed(() => fetch(input, init))
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
  }
  return res
}
