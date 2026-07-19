import { safeRedirect } from './safeRedirect'

// Sanitizes a `?redirect=` value for the email-confirmation flow (register
// -> email -> /auth/confirm -> destination). Reuses safeRedirect()'s
// same-origin/relative-path check (external hosts, `//`, `javascript:`,
// etc. are already rejected there) and adds a loop guard on top: a redirect
// back into /auth/** (confirm, verify-pending, login, ...) is nonsensical
// for this flow, so it's treated the same as "no redirect" rather than
// trusted as-is — same reasoning as the /choose-profile loop guard in
// app/choose-profile/logic.ts, kept as its own small pure function here
// (not shared) since that file is a different feature's scope.
//
// Never trust a client-supplied redirect without running it through this
// again server-side — register/route.ts and resend-confirmation/route.ts
// both call this on the request body, not just the client-side callers.
export function safeConfirmRedirect(raw: string | null | undefined): string | undefined {
  const safe = safeRedirect(raw)
  if (!safe) return undefined

  const pathname = safe.split(/[?#]/)[0]
  if (pathname === '/auth' || pathname?.startsWith('/auth/')) return undefined

  return safe
}
