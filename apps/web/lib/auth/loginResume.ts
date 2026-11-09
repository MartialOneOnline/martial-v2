import type { SchoolContext } from './contexts'
import { resolveLoginRedirectAction } from './loginRedirect'
import { fetchAvailableContexts } from '@/app/choose-profile/logic'
import { readResumeGuard, shouldResumeSession, writeResumeGuard, type ResumeGuardEnv } from './sessionCookie'

// The body of /login's resolveRedirect(), with navigation, the school picker
// and fetch injected so it can be tested without a browser. When `signal` is
// aborted (session resume gave up), nothing here may navigate, open the
// picker or fall back to /my.
export async function runLoginRedirect(deps: {
  redirectTo: string | undefined
  pathname: string
  fetchImpl: typeof fetch
  navigate: (path: string) => void
  showPicker: (schools: SchoolContext[]) => void
  signal?: AbortSignal
}): Promise<void> {
  const { signal } = deps
  const go = (path: string) => { if (!signal?.aborted) deps.navigate(path) }
  const doFetch: typeof fetch = signal
    ? (input, init) => deps.fetchImpl(input, { ...init, signal })
    : deps.fetchImpl

  try {
    if (deps.redirectTo) {
      go(deps.redirectTo)
      return
    }

    const res = await doFetch('/api/auth/me')
    const json = await res.json()
    if (signal?.aborted) return

    if (json.user?.globalRole === 'SUPERADMIN') {
      go('/admin')
      return
    }

    const legacySchools: SchoolContext[] = json.contexts?.schools ?? []

    // See lib/auth/loginRedirect.ts for the full priority order.
    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools,
      isOnChooseProfile: deps.pathname === '/choose-profile',
      fetchContexts: () => fetchAvailableContexts(doFetch),
    })
    if (signal?.aborted) return

    switch (action.kind) {
      case 'dashboard-auto':
        await doFetch('/api/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: action.schoolId }),
        })
        go('/dashboard')
        return
      case 'legacy-picker':
        if (!signal?.aborted) deps.showPicker(action.schools)
        return
      case 'noop':
        return
      case 'push':
        go(action.path)
        return
    }
  } catch {
    go('/my')
  }
}

export type ResumeOutcome =
  // Show the login form (no session, invalid session, bounced back, error).
  | 'form'
  // Signed in, but no loop guard could be saved: ask before redirecting.
  | 'confirm'
  // runLoginRedirect was started.
  | 'redirecting'
  // Gave up (deadline): the caller already shows the form.
  | 'aborted'

// /login's "already signed in" path. `redirect` is runLoginRedirect bound
// to the page; it receives the same signal.
export async function resumeSession(deps: {
  oauthCallback: boolean
  oauthError: boolean
  guardEnv: ResumeGuardEnv
  now: number
  fetchImpl: typeof fetch
  redirect: (signal: AbortSignal) => Promise<void>
  signal: AbortSignal
}): Promise<ResumeOutcome> {
  const { signal } = deps
  if (!shouldResumeSession({
    hasSessionCookie: true,
    oauthCallback: deps.oauthCallback,
    oauthError: deps.oauthError,
    lastAttemptAt: readResumeGuard(deps.guardEnv),
    now: deps.now,
  })) return 'form'

  try {
    // Validated on the server (getUser), unlike the cookie's mere presence.
    const res = await deps.fetchImpl('/api/auth/me', { cache: 'no-store', signal })
    const json = res.ok ? await res.json() : null
    if (signal.aborted) return 'aborted'
    if (!json?.user) return 'form'
    if (!writeResumeGuard(deps.guardEnv, deps.now)) return 'confirm'
    await deps.redirect(signal)
    return signal.aborted ? 'aborted' : 'redirecting'
  } catch {
    return signal.aborted ? 'aborted' : 'form'
  }
}
