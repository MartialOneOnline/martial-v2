import type { ActiveContext, ActiveContextMode, AvailableContext } from '@/lib/auth/activeContext'

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
