import type { ActiveContext, ActiveContextMode, AvailableContext } from '@/lib/auth/activeContext'
import { safeRedirect } from '@/lib/safeRedirect'

// Pure, framework-free logic for /choose-profile — deliberately kept out of
// ChooseProfileClient.tsx so it's unit-testable without mocking React,
// next/navigation, or the DOM (this repo has no @testing-library/react
// precedent — see Sesión 57/CONTEXT.md — so component rendering itself is
// verified by hand, not by an automated test; this file is the part that
// CAN be tested with plain vitest, and is).

// ── 0 / 1 / >1 contexts → what the page shows ───────────────────────────────
//
// Deliberately does NOT auto-redirect on exactly one context. A user who
// lands on /choose-profile expects to make an explicit choice; silently
// redirecting them somewhere they didn't click is a surprise, and — unlike
// showing the single card, which is trivially reversible — a bad auto-
// redirect sends them into the wrong portal before they can object. Showing
// the lone card costs one extra click and nothing else, so it's the safer
// default until there's a concrete reason to skip it.
export type ChooseProfileView =
  | { kind: 'empty' }
  | { kind: 'single'; context: AvailableContext }
  | { kind: 'multiple'; contexts: AvailableContext[] }

export function classifyContexts(contexts: AvailableContext[]): ChooseProfileView {
  if (contexts.length === 0) return { kind: 'empty' }
  if (contexts.length === 1) return { kind: 'single', context: contexts[0]! }
  return { kind: 'multiple', contexts }
}

// ── mode → portal ────────────────────────────────────────────────────────
//
// Mirrors the mapping the rest of the app already encodes structurally via
// dashboard/layout.tsx (staff) vs my/layout.tsx (student) — kept here as one
// pure lookup so the client component and its tests share a single source
// of truth instead of each hardcoding '/dashboard' / '/my' separately.
export function redirectPathForMode(mode: ActiveContextMode): '/dashboard' | '/my' {
  return mode === 'dashboard' ? '/dashboard' : '/my'
}

// ── GET /api/auth/contexts ───────────────────────────────────────────────

export type FetchContextsResult =
  | { ok: true; contexts: AvailableContext[] }
  | { ok: false; error: 'network' | 'http' }

// Fetches the context list for the current session. Never throws — network
// failures and non-2xx responses both come back as a typed error the caller
// (ChooseProfileClient) turns into the visible error state + retry button.
// fetchImpl is injectable so tests can stub it without touching global fetch.
export async function fetchAvailableContexts(
  fetchImpl: typeof fetch = fetch,
): Promise<FetchContextsResult> {
  let res: Response
  try {
    res = await fetchImpl('/api/auth/contexts')
  } catch {
    return { ok: false, error: 'network' }
  }

  if (!res.ok) return { ok: false, error: 'http' }

  try {
    const json = await res.json()
    return { ok: true, contexts: Array.isArray(json.contexts) ? json.contexts : [] }
  } catch {
    return { ok: false, error: 'http' }
  }
}

// ── POST /api/auth/context/select ────────────────────────────────────────

export type SelectContextResult =
  | { ok: true; redirectTo: '/dashboard' | '/my' }
  | { ok: false; error: 'network' | 'http' }

// Selects a single {mode, schoolId} context. Deliberately never navigates
// itself (no next/navigation import here) — it just reports what to do,
// which is what makes it testable with plain vitest instead of a component
// test harness. The caller (ChooseProfileClient) is the one that calls
// router.push(redirectTo) on success or renders `error` without navigating
// on failure (403 from a stale/tampered card, 400, or a network error all
// collapse to the same 'http'/'network' outcome from the UI's point of view
// — the endpoint itself is the source of truth on *why* it failed, this
// layer only needs to know whether it's safe to proceed).
export async function selectProfileContext(
  context: ActiveContext,
  fetchImpl: typeof fetch = fetch,
): Promise<SelectContextResult> {
  let res: Response
  try {
    res = await fetchImpl('/api/auth/context/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: context.mode, schoolId: context.schoolId }),
    })
  } catch {
    return { ok: false, error: 'network' }
  }

  if (!res.ok) return { ok: false, error: 'http' }

  return { ok: true, redirectTo: redirectPathForMode(context.mode) }
}

// ── ?redirect= handling for /choose-profile ──────────────────────────────
//
// safeRedirect() only guarantees "same-origin, relative path" — it has no
// concept of dashboard vs student portals, so on its own it would happily
// let a `student` context redirect into `/dashboard/...` (or vice versa).
// This layer adds that mode/path compatibility check on top of
// safeRedirect(), plus a loop guard so a `?redirect=/choose-profile...`
// value can never send the user right back to this same page. Kept as its
// own pure function (same reasoning as redirectPathForMode()/
// classifyContexts() above) so ChooseProfileClient.tsx only has to call it
// and router.push() the result — no branching lives in the component.
const CHOOSE_PROFILE_PATH = '/choose-profile'

// Strips a query string/hash so the prefix checks below operate on the path
// only. A raw `?redirect=` value can itself carry a nested query string
// (e.g. `/choose-profile?redirect=%2Fchoose-profile%3Ffoo%3Dbar`, which
// `useSearchParams().get('redirect')` hands back already decoded as
// `/choose-profile?foo=bar`), and `/my/events?utm=x` should still be
// recognised as living under `/my`.
function pathnameOf(path: string): string {
  const cut = path.search(/[?#]/)
  return cut === -1 ? path : path.slice(0, cut)
}

// True when `pathname` is exactly `prefix` or nested under it — avoids
// `/myfoo` incorrectly matching prefix `/my`.
function isUnderPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

// Resolves where /choose-profile should send the user after they pick a
// context, honouring an optional `?redirect=` query param when present.
//
// Rules, in order:
//  1. No redirect param, or safeRedirect() rejects it outright (external
//     host, `//`-protocol-relative, `javascript:`, etc.) -> the existing
//     redirectPathForMode(mode) fallback — unchanged from before this
//     param existed.
//  2. The (safe) redirect resolves into /choose-profile itself, with or
//     without its own query string -> fallback, so this never loops back
//     to the selector page.
//  3. The redirect is safe and not a loop, but points at the *other*
//     portal's paths (a `student` context picking a `/dashboard/...` URL,
//     or a `dashboard` context picking a `/my/...` URL) -> fallback. A
//     `student` context must never land on /dashboard, and a `dashboard`
//     context must never land on /my.
//  4. Otherwise — safe, not a loop, matches the chosen mode's own portal
//     prefix -> honour it as-is.
export function resolveChooseProfileRedirect(
  mode: ActiveContextMode,
  rawRedirect: string | null | undefined,
): string {
  const fallback = redirectPathForMode(mode)
  const safe = safeRedirect(rawRedirect)
  if (!safe) return fallback

  const pathname = pathnameOf(safe)
  if (isUnderPath(pathname, CHOOSE_PROFILE_PATH)) return fallback

  const allowedPrefix = mode === 'dashboard' ? '/dashboard' : '/my'
  return isUnderPath(pathname, allowedPrefix) ? safe : fallback
}
