import { safeRedirect } from './safeRedirect'

// The error code /api/my/** endpoints return (HTTP 409) when a student
// belongs to 2+ schools and neither a valid martial_active_context cookie
// nor a single unambiguous school lets the server pick one — see
// getActiveStudentContext() in lib/auth/activeContextCookie.ts. /my/** pages
// use this to distinguish "ambiguous context, please choose" from a genuine
// empty result or a real error (network/401/500), which must keep surfacing
// exactly as they did before this endpoint existed.
export const STUDENT_CONTEXT_REQUIRED_ERROR = 'student_context_required'

// Response bodies from these endpoints are always small, already-parsed
// JSON objects (or arbitrary junk on a genuine error) — this only checks
// shape, it never assumes `body` is the expected DTO.
export function isStudentContextRequired(body: unknown): boolean {
  return (
    !!body &&
    typeof body === 'object' &&
    (body as Record<string, unknown>).error === STUDENT_CONTEXT_REQUIRED_ERROR
  )
}

// Builds the /choose-profile target for a given /my/** path, routed through
// safeRedirect() — the same same-origin-only guard already used for the
// ?redirect= param in app/login/page.tsx and components/LoginModal.tsx — so
// a path is never embedded verbatim without going through that validation.
//
// NOTE: /choose-profile does not consume this ?redirect= param yet (see
// app/choose-profile/logic.ts#redirectPathForMode() — after picking a
// context it always sends the user to /dashboard or /my, never a custom
// path). It's included here for forward compatibility only: today the user
// lands on /my after picking and can navigate back to wherever they were,
// which will now succeed since the cookie is set. Wiring /choose-profile to
// honour ?redirect= is left to a future PR — documented in CONTEXT.md rather
// than done here, since this PR's scope is /api/my/** + a minimal handler,
// not changes to the already-merged /choose-profile UI.
export function chooseProfileUrl(path: string): string {
  const safePath = safeRedirect(path) ?? '/my'
  return `/choose-profile?redirect=${encodeURIComponent(safePath)}`
}
