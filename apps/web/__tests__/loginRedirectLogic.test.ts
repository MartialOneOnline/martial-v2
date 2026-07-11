/**
 * Tests for lib/auth/loginRedirect.ts — the pure decision layer behind
 * login/page.tsx's and components/LoginModal.tsx's `resolveRedirect()`.
 *
 * This is the most sensitive flow in the app: if login redirect breaks,
 * nobody gets in. So every branch that existed BEFORE this PR is asserted
 * to be byte-identical (explicit redirect, SUPERADMIN, single staff school
 * -> /dashboard with the auto-set currentSchoolId call, 0 contexts -> /my,
 * legacy multi-school picker as a fallback), and the only genuinely new
 * behavior (>1 real contexts -> /choose-profile, mixed staff+student counted
 * via the real AvailableContext[] instead of the old staffSchools-only
 * model) is covered on top of that.
 *
 * fetchContexts is injected (same fetchImpl pattern as
 * app/choose-profile/logic.ts's fetchAvailableContexts) so none of this
 * needs to mock global fetch, next/navigation, or touch the DOM.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  resolveLoginRedirectAction,
  legacyStaffSchoolsAction,
  contextsAction,
} from '@/lib/auth/loginRedirect'
import type { AvailableContext } from '@/lib/auth/activeContext'
import type { SchoolContext } from '@/lib/auth/contexts'
import type { FetchContextsResult } from '@/app/choose-profile/logic'

function dashboardContext(overrides: Partial<AvailableContext> = {}): AvailableContext {
  return {
    mode: 'dashboard',
    schoolId: 'school-a',
    schoolName: 'Alpha BJJ',
    schoolLogoUrl: null,
    role: 'OWNER',
    subtitle: null,
    ...overrides,
  }
}

function studentContext(overrides: Partial<AvailableContext> = {}): AvailableContext {
  return {
    mode: 'student',
    schoolId: 'school-b',
    schoolName: 'Beta Judo',
    schoolLogoUrl: null,
    role: 'STUDENT',
    subtitle: null,
    ...overrides,
  }
}

function schoolContext(overrides: Partial<SchoolContext> = {}): SchoolContext {
  return {
    schoolId: 'school-x',
    schoolName: 'Legacy School',
    schoolSlug: 'legacy-school',
    role: 'OWNER',
    permissions: [],
    ...overrides,
  }
}

function okResult(contexts: AvailableContext[]): FetchContextsResult {
  return { ok: true, contexts }
}

function failResult(error: 'network' | 'http' = 'network'): FetchContextsResult {
  return { ok: false, error }
}

// ── resolveLoginRedirectAction(): priority order ────────────────────────────

describe('resolveLoginRedirectAction()', () => {
  it('honors an explicit redirect over everything else, without ever counting contexts', async () => {
    const fetchContexts = vi.fn()

    const action = await resolveLoginRedirectAction({
      explicitPath: '/some/deep/link',
      isSuperAdmin: true, // even if it were also a superadmin — explicit wins first
      legacySchools: [schoolContext(), schoolContext({ schoolId: 'school-y' })],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/some/deep/link' })
    expect(fetchContexts).not.toHaveBeenCalled()
  })

  it('sends SUPERADMIN to /admin without counting contexts', async () => {
    const fetchContexts = vi.fn()

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: true,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/admin' })
    expect(fetchContexts).not.toHaveBeenCalled()
  })

  it('routes a single STUDENT-only context to /my, identical to today', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(okResult([studentContext()]))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/my' })
  })

  it('routes a single STAFF-only context to dashboard-auto (same as today\'s auto-set + /dashboard)', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(okResult([dashboardContext({ schoolId: 'school-1' })]))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'dashboard-auto', schoolId: 'school-1' })
  })

  it('routes zero contexts to /my, unchanged from today', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(okResult([]))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/my' })
  })

  it('routes 2 staff contexts to /choose-profile (no longer the inline SchoolPicker)', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(
      okResult([dashboardContext({ schoolId: 'school-1' }), dashboardContext({ schoolId: 'school-2', schoolName: 'Gamma Karate' })]),
    )

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/choose-profile' })
  })

  it('routes 2 student contexts to /choose-profile', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(
      okResult([studentContext({ schoolId: 'school-1' }), studentContext({ schoolId: 'school-2', schoolName: 'Delta Judo' })]),
    )

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/choose-profile' })
  })

  it('routes staff-in-A + student-in-B (the previously mis-routed case) to /choose-profile', async () => {
    // This is exactly the case the prior audit flagged: staffSchools.length
    // === 1 under the OLD model (only school A counts, since B is a STUDENT
    // row) used to auto-redirect straight to /dashboard with no picker. The
    // new real-contexts count sees 2 (dashboard + student) and sends the
    // user to /choose-profile instead.
    const fetchContexts = vi.fn().mockResolvedValue(
      okResult([dashboardContext({ schoolId: 'school-a' }), studentContext({ schoolId: 'school-b' })]),
    )

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [schoolContext({ schoolId: 'school-a' })], // old model would've seen staffSchools.length === 1
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/choose-profile' })
  })

  it('does not redirect again if already on /choose-profile', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(
      okResult([dashboardContext({ schoolId: 'school-a' }), studentContext({ schoolId: 'school-b' })]),
    )

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: true,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'noop' })
  })

  it('falls back to the legacy staffSchools logic when GET /api/auth/contexts fails (network)', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(failResult('network'))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [schoolContext({ schoolId: 'school-1' })],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'dashboard-auto', schoolId: 'school-1' })
  })

  it('falls back to the legacy staffSchools logic when GET /api/auth/contexts fails (http/JSON error)', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(failResult('http'))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [schoolContext({ schoolId: 'school-1' }), schoolContext({ schoolId: 'school-2' })],
      isOnChooseProfile: false,
      fetchContexts,
    })

    // 2 legacy staff schools + failed contexts fetch -> legacy inline picker,
    // NOT /choose-profile — we can't safely combine dashboard+student counts
    // without the new endpoint, so login must not block or guess.
    expect(action).toEqual({
      kind: 'legacy-picker',
      schools: [schoolContext({ schoolId: 'school-1' }), schoolContext({ schoolId: 'school-2' })],
    })
  })

  it('falls back to /my when contexts fetch fails and there are zero legacy staff schools', async () => {
    const fetchContexts = vi.fn().mockResolvedValue(failResult('network'))

    const action = await resolveLoginRedirectAction({
      explicitPath: undefined,
      isSuperAdmin: false,
      legacySchools: [],
      isOnChooseProfile: false,
      fetchContexts,
    })

    expect(action).toEqual({ kind: 'push', path: '/my' })
  })
})

// ── legacyStaffSchoolsAction(): today's exact staffSchools branch ──────────

describe('legacyStaffSchoolsAction()', () => {
  it('returns dashboard-auto for exactly one non-STUDENT school', () => {
    const action = legacyStaffSchoolsAction([schoolContext({ schoolId: 'school-1' })])
    expect(action).toEqual({ kind: 'dashboard-auto', schoolId: 'school-1' })
  })

  it('returns legacy-picker for more than one non-STUDENT school', () => {
    const schools = [schoolContext({ schoolId: 'school-1' }), schoolContext({ schoolId: 'school-2' })]
    const action = legacyStaffSchoolsAction(schools)
    expect(action).toEqual({ kind: 'legacy-picker', schools })
  })

  it('excludes STUDENT rows from the staffSchools count', () => {
    const action = legacyStaffSchoolsAction([
      schoolContext({ schoolId: 'school-1', role: 'OWNER' }),
      schoolContext({ schoolId: 'school-2', role: 'STUDENT' }),
    ])
    // Only 1 real staff school -> dashboard-auto, the STUDENT row doesn't count.
    expect(action).toEqual({ kind: 'dashboard-auto', schoolId: 'school-1' })
  })

  it('returns /my when there are zero non-STUDENT schools', () => {
    const action = legacyStaffSchoolsAction([schoolContext({ role: 'STUDENT' })])
    expect(action).toEqual({ kind: 'push', path: '/my' })
  })

  it('returns /my for an empty schools array', () => {
    expect(legacyStaffSchoolsAction([])).toEqual({ kind: 'push', path: '/my' })
  })
})

// ── contextsAction(): the new real-contexts branch ──────────────────────────

describe('contextsAction()', () => {
  it('returns /my for zero contexts', () => {
    expect(contextsAction([], false)).toEqual({ kind: 'push', path: '/my' })
  })

  it('returns dashboard-auto for a single dashboard context', () => {
    const action = contextsAction([dashboardContext({ schoolId: 'school-1' })], false)
    expect(action).toEqual({ kind: 'dashboard-auto', schoolId: 'school-1' })
  })

  it('returns /my for a single student context', () => {
    const action = contextsAction([studentContext()], false)
    expect(action).toEqual({ kind: 'push', path: '/my' })
  })

  it('returns /choose-profile for 2+ contexts when not already there', () => {
    const action = contextsAction([dashboardContext(), studentContext()], false)
    expect(action).toEqual({ kind: 'push', path: '/choose-profile' })
  })

  it('returns noop for 2+ contexts when already on /choose-profile', () => {
    const action = contextsAction([dashboardContext(), studentContext()], true)
    expect(action).toEqual({ kind: 'noop' })
  })
})
