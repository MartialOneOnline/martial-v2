import { safeRedirect } from '@/lib/safeRedirect'

// Pure, framework-free logic for the OTHER end of /choose-profile's
// ?redirect= handling: what login URL to send an unauthenticated visitor to
// so that, after they log in, they land back on /choose-profile with the
// SAME ?redirect= they originally asked for. resolveChooseProfileRedirect()
// in logic.ts handles the symmetric case (?redirect= consumed AFTER a
// context is chosen); this file is its counterpart for the guard BEFORE
// that — /choose-profile's own auth check in page.tsx. Kept in its own file
// (not logic.ts, which is off-limits for this fix) so it can be unit-tested
// with plain vitest without touching next/navigation or React, same
// reasoning as logic.ts and lib/auth/loginRedirect.ts.

const CHOOSE_PROFILE_PATH = '/choose-profile'

// Behavior unchanged when there's nothing safe to preserve — this was the
// entire previous hardcoded redirect() call in page.tsx.
export const FALLBACK_LOGIN_REDIRECT = `/login?redirect=${CHOOSE_PROFILE_PATH}`

// Strips a query string/hash so the prefix check below operates on the path
// only — mirrors logic.ts's pathnameOf(), duplicated here (rather than
// imported) because logic.ts doesn't export it and this fix is scoped to
// stay out of that file.
function pathnameOf(path: string): string {
  const cut = path.search(/[?#]/)
  return cut === -1 ? path : path.slice(0, cut)
}

// True when `safe` points at /choose-profile itself (with or without its
// own query string) or anything nested under it — guards against a
// ?redirect= value sending the user right back into this same login/choose-
// profile loop.
function isChooseProfileLoop(safe: string): boolean {
  const pathname = pathnameOf(safe)
  return pathname === CHOOSE_PROFILE_PATH || pathname.startsWith(`${CHOOSE_PROFILE_PATH}/`)
}

// Resolves the URL /choose-profile's server-side auth guard should redirect
// an unauthenticated visitor to, given the raw `?redirect=` value (if any)
// their request to /choose-profile carried.
//
// Rules, in order:
//  1. No redirect param, or safeRedirect() rejects it outright (external
//     host, `//`-protocol-relative, `javascript:`, malformed/non-string,
//     etc.) -> FALLBACK_LOGIN_REDIRECT, exactly today's behavior.
//  2. The (safe) redirect resolves into /choose-profile itself (or nested
//     under it) -> also FALLBACK_LOGIN_REDIRECT, so login never loops back
//     into this same page pointlessly.
//  3. Otherwise -> preserve it: send login to a `redirect` that itself
//     points back at `/choose-profile?redirect=<original>`, so picking a
//     context later still has the original destination available via
//     resolveChooseProfileRedirect() in logic.ts.
//
// Encoding: the inner `safe` value is encodeURIComponent'd once to become
// the *value* of choose-profile's own `redirect` query param (same
// single-encode convention as chooseProfileUrl() in lib/studentContext.ts).
// That whole `/choose-profile?redirect=...` string is then
// encodeURIComponent'd a SECOND time to become the *value* of login's
// `redirect` query param — required because it itself contains a literal
// `?` and `=` that must not be parsed as part of /login's own query string.
// This round-trips correctly through app/login/page.tsx's
// `safeRedirect(searchParams.get('redirect'))`: browsers/URLSearchParams
// percent-decode a query value exactly once, so `searchParams.get(...)`
// there receives back the single-encoded `/choose-profile?redirect=...`
// string, which still starts with `/` and isn't `//` — safeRedirect() on
// the login side accepts it unchanged, and router.push() sends the browser
// to that exact URL, where THIS repo's /choose-profile page decodes its own
// `redirect` query param once more (via the `searchParams` prop) to recover
// the original path.
export function resolveChooseProfileLoginRedirect(rawRedirect: string | null | undefined): string {
  const safe = safeRedirect(rawRedirect)
  if (!safe || isChooseProfileLoop(safe)) return FALLBACK_LOGIN_REDIRECT

  const target = `${CHOOSE_PROFILE_PATH}?redirect=${encodeURIComponent(safe)}`
  return `/login?redirect=${encodeURIComponent(target)}`
}
