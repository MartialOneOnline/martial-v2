import { describe, it, expect } from 'vitest'
import {
  hasSessionCookie,
  isSessionCookieName,
  shouldResumeSession,
  LOGIN_RESUME_GUARD_MS,
} from '@/lib/auth/sessionCookie'

describe('session cookie detection', () => {
  it('accepts the session cookie and its numbered chunks only', () => {
    expect(isSessionCookieName('sb-abc-auth-token')).toBe(true)
    expect(isSessionCookieName('sb-abc-auth-token.0')).toBe(true)
    expect(isSessionCookieName('sb-abc-auth-token-code-verifier')).toBe(false)
    expect(isSessionCookieName('sb-abc-auth-token.x')).toBe(false)
    expect(isSessionCookieName('currentSchoolId')).toBe(false)
    expect(hasSessionCookie(['currentSchoolId', 'sb-abc-auth-token.1'])).toBe(true)
    expect(hasSessionCookie(['sb-abc-auth-token-code-verifier'])).toBe(false)
  })
})

describe('/login session resume', () => {
  const base = { hasSessionCookie: true, oauthCallback: false, oauthError: false, lastAttemptAt: null, now: 1_000_000 }

  it('resumes a signed-in visitor (mobile app cold start on /login)', () => {
    expect(shouldResumeSession(base)).toBe(true)
  })

  it('shows the form without a session cookie', () => {
    expect(shouldResumeSession({ ...base, hasSessionCookie: false })).toBe(false)
  })

  it('leaves the OAuth return and OAuth errors to their own handling', () => {
    expect(shouldResumeSession({ ...base, oauthCallback: true })).toBe(false)
    expect(shouldResumeSession({ ...base, oauthError: true })).toBe(false)
  })

  it('does not loop when the last resume bounced straight back', () => {
    expect(shouldResumeSession({ ...base, lastAttemptAt: base.now - 2_000 })).toBe(false)
    expect(shouldResumeSession({ ...base, lastAttemptAt: base.now - LOGIN_RESUME_GUARD_MS })).toBe(true)
  })
})

// ── Guard persistence ───────────────────────────────────────────────────────
import { readResumeGuard, writeResumeGuard, type ResumeGuardEnv } from '@/lib/auth/sessionCookie'
import { resumeSession, runLoginRedirect } from '@/lib/auth/loginResume'
import { vi } from 'vitest'

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const m = new Map<string, string>()
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v) } }
}
function cookieJar(opts: { blocked?: boolean } = {}) {
  let jar: string[] = []
  return {
    readCookies: () => jar.join('; '),
    writeCookie: (c: string) => {
      if (opts.blocked) return // e.g. cookies disabled: silently dropped
      const pair = c.split(';')[0]!
      const name = pair.split('=')[0]
      jar = jar.filter(p => p.split('=')[0] !== name).concat(pair)
    },
  }
}
const throwingStorage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: () => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('SecurityError') },
}

describe('resume loop guard', () => {
  it('uses sessionStorage when available', () => {
    const env: ResumeGuardEnv = { storage: memoryStorage(), ...cookieJar() }
    expect(writeResumeGuard(env, 123)).toBe(true)
    expect(readResumeGuard(env)).toBe(123)
  })

  it('falls back to a short-lived cookie when storage throws', () => {
    const env: ResumeGuardEnv = { storage: throwingStorage, ...cookieJar() }
    expect(writeResumeGuard(env, 456)).toBe(true)
    expect(readResumeGuard(env)).toBe(456)
  })

  it('reports failure when neither store keeps the value', () => {
    const env: ResumeGuardEnv = { storage: throwingStorage, ...cookieJar({ blocked: true }) }
    expect(writeResumeGuard(env, 789)).toBe(false)
    expect(readResumeGuard(env)).toBeNull()
  })
})

// ── Resume flow ─────────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}
function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}
// Like fetch: rejects with AbortError once the signal fires, even if the
// response is released later.
function abortableFetch(handler: (url: string) => Promise<Response>): typeof fetch {
  return (input, init) => new Promise<Response>((resolve, reject) => {
    const signal = init?.signal
    if (signal?.aborted) return reject(new DOMException('aborted', 'AbortError'))
    signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    handler(String(input)).then(resolve, reject)
  })
}

describe('resumeSession + runLoginRedirect', () => {
  const student = { user: { id: 'u1', globalRole: 'STUDENT' }, contexts: { schools: [] } }

  function setup(fetchImpl: typeof fetch, guardEnv: ResumeGuardEnv = { storage: memoryStorage(), ...cookieJar() }) {
    const navigate = vi.fn()
    const showPicker = vi.fn()
    const controller = new AbortController()
    const run = resumeSession({
      oauthCallback: false,
      oauthError: false,
      guardEnv,
      now: Date.now(),
      fetchImpl,
      redirect: (signal) => runLoginRedirect({ redirectTo: undefined, pathname: '/login', fetchImpl, navigate, showPicker, signal }),
      signal: controller.signal,
    })
    return { run, navigate, showPicker, controller }
  }

  it('sends a valid student on to /my', async () => {
    const fetchImpl = abortableFetch(async url =>
      url === '/api/auth/contexts' ? json({ contexts: [{ mode: 'student', schoolId: 's1' }] }) : json(student))
    const { run, navigate } = setup(fetchImpl)
    expect(await run).toBe('redirecting')
    expect(navigate).toHaveBeenCalledWith('/my')
  })

  it('shows the form for an invalid session', async () => {
    const { run, navigate } = setup(abortableFetch(async () => json({ role: null }, 401)))
    expect(await run).toBe('form')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('asks to continue instead of redirecting when no guard can be saved', async () => {
    const { run, navigate } = setup(
      abortableFetch(async () => json(student)),
      { storage: throwingStorage, ...cookieJar({ blocked: true }) },
    )
    expect(await run).toBe('confirm')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('a late response after the deadline never navigates or opens the picker', async () => {
    // First /me answers; the second one (inside the redirect) hangs.
    const second = deferred<Response>()
    let meCalls = 0
    const fetchImpl = abortableFetch(url => {
      if (url === '/api/auth/me') return ++meCalls === 1 ? Promise.resolve(json(student)) : second.promise
      return Promise.resolve(json({ contexts: [] }))
    })
    const { run, navigate, showPicker, controller } = setup(fetchImpl)
    await new Promise(r => setTimeout(r, 0))
    expect(meCalls).toBe(2)

    controller.abort() // the 8s deadline: the form is back, the user types
    second.resolve(json({ user: { id: 'u1', globalRole: 'STUDENT' }, contexts: { schools: [{ schoolId: 'a', role: 'OWNER' }, { schoolId: 'b', role: 'OWNER' }] } }))

    expect(await run).toBe('aborted')
    await new Promise(r => setTimeout(r, 0))
    expect(navigate).not.toHaveBeenCalled()
    expect(showPicker).not.toHaveBeenCalled()
  })

  it('an aborted redirect does not fall back to /my either', async () => {
    const navigate = vi.fn()
    const controller = new AbortController()
    controller.abort()
    await runLoginRedirect({
      redirectTo: undefined,
      pathname: '/login',
      fetchImpl: abortableFetch(async () => json(student)),
      navigate,
      showPicker: vi.fn(),
      signal: controller.signal,
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('normal logins (no signal) keep the old behaviour, including the /my fallback', async () => {
    const navigate = vi.fn()
    await runLoginRedirect({
      redirectTo: undefined,
      pathname: '/login',
      fetchImpl: async () => { throw new Error('network') },
      navigate,
      showPicker: vi.fn(),
    })
    expect(navigate).toHaveBeenCalledWith('/my')
  })
})

// ── "Continue" with a hung response ─────────────────────────────────────────
import { startResumeAttempt } from '@/lib/auth/loginResume'

describe('"Continue" after the already-signed-in card', () => {
  it('a held /api/auth/me times out back to the card and the late answer never navigates', async () => {
    vi.useFakeTimers()
    try {
      const held = deferred<Response>()
      const fetchImpl = abortableFetch(() => held.promise)
      const navigate = vi.fn()
      const showPicker = vi.fn()
      const ui = { spinner: true, card: false }

      const attempt = startResumeAttempt(
        signal => runLoginRedirect({ redirectTo: undefined, pathname: '/login', fetchImpl, navigate, showPicker, signal }),
        { ms: 8000, onTimeout: () => { ui.spinner = false; ui.card = true } },
      )

      await vi.advanceTimersByTimeAsync(9000)
      expect(ui).toEqual({ spinner: false, card: true })
      expect(attempt.signal.aborted).toBe(true)

      held.resolve(json({ user: { id: 'u1', globalRole: 'STUDENT' }, contexts: { schools: [] } }))
      await attempt.promise
      await vi.advanceTimersByTimeAsync(0)
      expect(navigate).not.toHaveBeenCalled()
      expect(showPicker).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancel (unmount) aborts without touching the UI', async () => {
    vi.useFakeTimers()
    try {
      const onTimeout = vi.fn()
      const attempt = startResumeAttempt(() => new Promise<void>(() => {}), { ms: 8000, onTimeout })
      attempt.cancel()
      await vi.advanceTimersByTimeAsync(9000)
      expect(attempt.signal.aborted).toBe(true)
      expect(onTimeout).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
