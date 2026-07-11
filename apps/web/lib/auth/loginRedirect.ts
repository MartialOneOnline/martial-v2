import type { AvailableContext } from './activeContext'
import type { SchoolContext } from './contexts'
import type { FetchContextsResult } from '@/app/choose-profile/logic'

// Pure, framework-free decision layer behind login/page.tsx's and
// LoginModal.tsx's `resolveRedirect()` — extracted so the "given N contexts
// + flags, where do I go?" question can be unit-tested with plain vitest,
// same reasoning/pattern as app/choose-profile/logic.ts (see Sesión 62): no
// next/navigation, no fetch mocking, no DOM. The two call sites stay
// responsible only for gathering the inputs (fetch /api/auth/me, fetch
// /api/auth/contexts) and acting on the returned LoginRedirectAction
// (router.push, the legacy POST /api/auth/context, or rendering
// SchoolPicker) — nothing here touches the network or the router directly.
//
// This is one of the most sensitive flows in the app (login redirect — if
// it breaks, nobody gets in), so this file is deliberately additive: every
// branch that existed before this PR (explicit redirect, SUPERADMIN, single
// staff school, multiple staff schools, fallback to /my) is preserved
// byte-for-byte in behavior, just re-expressed as data. The only new
// behavior is the ">1 real contexts -> /choose-profile" branch, and the
// safety net that falls back to the pre-existing staffSchools logic if the
// new GET /api/auth/contexts call fails for any reason.

// ── What the caller must do in response ─────────────────────────────────────
export type LoginRedirectAction =
  // Plain client-side navigation — the vast majority of cases.
  | { kind: 'push'; path: string }
  // Exactly today's "single staff/dashboard school" behavior: the caller
  // must first POST /api/auth/context with this schoolId (sets the
  // pre-existing currentSchoolId cookie — untouched, not the new
  // martial_active_context one), then push('/dashboard'). Never skipped.
  | { kind: 'dashboard-auto'; schoolId: string }
  // Fallback-only: the GET /api/auth/contexts call failed AND the legacy
  // staffSchools count from GET /api/auth/me is >1 — render the existing
  // inline SchoolPicker exactly like today, since we can't safely route to
  // /choose-profile without knowing the real (dashboard+student) context list.
  | { kind: 'legacy-picker'; schools: SchoolContext[] }
  // Already on /choose-profile (or about to be sent there again) — do
  // nothing, let the page render normally. Avoids a redirect loop.
  | { kind: 'noop' }

export type ResolveLoginRedirectInput = {
  // safeRedirect(...) output — undefined when no explicit redirect was requested.
  explicitPath: string | undefined
  // json.user?.globalRole === 'SUPERADMIN' from GET /api/auth/me.
  isSuperAdmin: boolean
  // json.contexts?.schools ?? [] from GET /api/auth/me — the pre-existing
  // SchoolContext[] model, used ONLY as the fallback source if the new
  // contexts endpoint fails. Never used when it succeeds.
  legacySchools: SchoolContext[]
  // Whether the browser is already sitting on /choose-profile — prevents
  // sending it there again in a loop.
  isOnChooseProfile: boolean
  // Injectable wrapper around GET /api/auth/contexts — same fetchImpl
  // pattern as app/choose-profile/logic.ts, so tests never touch global
  // fetch or need a real network. Only called when neither the explicit
  // redirect nor the SUPERADMIN branch already short-circuited — a
  // SUPERADMIN or an explicit-redirect login never counts contexts at all.
  fetchContexts: () => Promise<FetchContextsResult>
}

export async function resolveLoginRedirectAction(
  input: ResolveLoginRedirectInput,
): Promise<LoginRedirectAction> {
  // 1. Explicit redirect (?redirect=... / redirectTo prop) wins over
  //    everything else, exactly like today — never counts contexts, never
  //    even calls fetchContexts.
  if (input.explicitPath) {
    return { kind: 'push', path: input.explicitPath }
  }

  // 2. SUPERADMIN -> /admin, unconditionally, exactly like today — also
  //    never counts contexts.
  if (input.isSuperAdmin) {
    return { kind: 'push', path: '/admin' }
  }

  // 3. Count real contexts via the new endpoint.
  const result = await input.fetchContexts()

  if (!result.ok) {
    // GET /api/auth/contexts failed (network, non-2xx, bad JSON) — treat as
    // "couldn't determine >1", never block login, fall back to the
    // pre-existing staffSchools-based logic instead.
    return legacyStaffSchoolsAction(input.legacySchools)
  }

  return contextsAction(result.contexts, input.isOnChooseProfile)
}

// Exactly today's staffSchools branch (0 / 1 / >1), unchanged. Exported so
// the fallback path can be tested in isolation from the fetchContexts
// plumbing above.
export function legacyStaffSchoolsAction(schools: SchoolContext[]): LoginRedirectAction {
  const staffSchools = schools.filter(s => s.role !== 'STUDENT')

  if (staffSchools.length === 1 && staffSchools[0]) {
    return { kind: 'dashboard-auto', schoolId: staffSchools[0].schoolId }
  }

  if (staffSchools.length > 1) {
    return { kind: 'legacy-picker', schools: staffSchools }
  }

  return { kind: 'push', path: '/my' }
}

// The new rule: 0 -> /my (same fallback as today), exactly 1 -> the same
// destination as today for that single context's mode (dashboard -> auto-set
// cookie + /dashboard; student -> /my), >1 -> /choose-profile.
export function contextsAction(
  contexts: AvailableContext[],
  isOnChooseProfile: boolean,
): LoginRedirectAction {
  if (contexts.length === 0) {
    return { kind: 'push', path: '/my' }
  }

  if (contexts.length === 1) {
    const only = contexts[0]!
    return only.mode === 'dashboard'
      ? { kind: 'dashboard-auto', schoolId: only.schoolId }
      : { kind: 'push', path: '/my' }
  }

  if (isOnChooseProfile) {
    return { kind: 'noop' }
  }

  return { kind: 'push', path: '/choose-profile' }
}
