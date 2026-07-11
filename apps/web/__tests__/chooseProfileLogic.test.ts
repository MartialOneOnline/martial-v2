/**
 * Tests for app/choose-profile/logic.ts — the pure, framework-free layer
 * behind /choose-profile (the Facebook-style context switcher UI, Sesión
 * 60/61 laid the server-side foundation; this is the first PR that adds a
 * page). Kept separate from ChooseProfileClient.tsx specifically so it can
 * be unit-tested with plain vitest: this repo has no @testing-library/react
 * precedent (see Sesión 57 — ClassesClient's frontend fix shipped without a
 * component test because the infra doesn't exist here), so the UI itself is
 * verified by hand/preview, and this file is what carries the automated
 * coverage for the screen's logic.
 *
 * Covers:
 *  - classifyContexts(): 0 / 1 / >1 contexts -> which view to render, and
 *    that it does NOT collapse 1 and >1 into the same shape (the "single"
 *    case intentionally never triggers an auto-redirect elsewhere in this
 *    file — see logic.ts's own comment on why).
 *  - redirectPathForMode(): dashboard -> /dashboard, student -> /my.
 *  - fetchAvailableContexts(): success, non-2xx, and network-throw paths
 *    against an injected fetch stub (no real network/DOM involved).
 *  - selectProfileContext(): success posts the exact {mode, schoolId}
 *    payload and resolves the right redirectTo; 403/400 (modeled as any
 *    non-2xx) and network failures both resolve ok:false without throwing.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  classifyContexts,
  redirectPathForMode,
  fetchAvailableContexts,
  selectProfileContext,
} from '@/app/choose-profile/logic'
import type { AvailableContext } from '@/lib/auth/activeContext'

function dashboardContext(overrides: Partial<AvailableContext> = {}): AvailableContext {
  return {
    mode: 'dashboard',
    schoolId: 'school-1',
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
    schoolId: 'school-2',
    schoolName: 'Beta Judo',
    schoolLogoUrl: null,
    role: 'STUDENT',
    subtitle: 'Blue Belt · Degree 2',
    ...overrides,
  }
}

// ── classifyContexts() ───────────────────────────────────────────────────────

describe('classifyContexts()', () => {
  it('returns empty for zero contexts', () => {
    expect(classifyContexts([])).toEqual({ kind: 'empty' })
  })

  it('returns single for exactly one context, carrying that context', () => {
    const ctx = dashboardContext()
    expect(classifyContexts([ctx])).toEqual({ kind: 'single', context: ctx })
  })

  it('returns multiple for two or more contexts, carrying the full list', () => {
    const a = dashboardContext()
    const b = studentContext()
    expect(classifyContexts([a, b])).toEqual({ kind: 'multiple', contexts: [a, b] })
  })
})

// ── redirectPathForMode() ────────────────────────────────────────────────────

describe('redirectPathForMode()', () => {
  it('maps dashboard -> /dashboard', () => {
    expect(redirectPathForMode('dashboard')).toBe('/dashboard')
  })

  it('maps student -> /my', () => {
    expect(redirectPathForMode('student')).toBe('/my')
  })
})

// ── fetchAvailableContexts() ─────────────────────────────────────────────────

describe('fetchAvailableContexts()', () => {
  it('returns ok:true with the parsed contexts array on a 200', async () => {
    const contexts = [dashboardContext()]
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ contexts, activeContext: null }),
    })

    const result = await fetchAvailableContexts(fetchImpl as unknown as typeof fetch)

    expect(result).toEqual({ ok: true, contexts })
    expect(fetchImpl).toHaveBeenCalledWith('/api/auth/contexts')
  })

  it('returns ok:false, error:"http" on a non-2xx response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) })

    const result = await fetchAvailableContexts(fetchImpl as unknown as typeof fetch)

    expect(result).toEqual({ ok: false, error: 'http' })
  })

  it('returns ok:false, error:"network" when fetch itself throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await fetchAvailableContexts(fetchImpl as unknown as typeof fetch)

    expect(result).toEqual({ ok: false, error: 'network' })
  })

  it('returns ok:false, error:"http" when the body is not valid JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('bad json') },
    })

    const result = await fetchAvailableContexts(fetchImpl as unknown as typeof fetch)

    expect(result).toEqual({ ok: false, error: 'http' })
  })

  it('defaults contexts to [] if the field is missing/malformed', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    const result = await fetchAvailableContexts(fetchImpl as unknown as typeof fetch)

    expect(result).toEqual({ ok: true, contexts: [] })
  })
})

// ── selectProfileContext() ───────────────────────────────────────────────────

describe('selectProfileContext()', () => {
  it('posts exactly {mode, schoolId} and resolves redirectTo for a dashboard context on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    const result = await selectProfileContext(
      { mode: 'dashboard', schoolId: 'school-1' },
      fetchImpl as unknown as typeof fetch,
    )

    expect(result).toEqual({ ok: true, redirectTo: '/dashboard' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/auth/context/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'dashboard', schoolId: 'school-1' }),
    })
  })

  it('resolves redirectTo /my for a student context on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })

    const result = await selectProfileContext(
      { mode: 'student', schoolId: 'school-2' },
      fetchImpl as unknown as typeof fetch,
    )

    expect(result).toEqual({ ok: true, redirectTo: '/my' })
  })

  it('resolves ok:false without throwing on a 403 (invalid/tampered context)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 })

    const result = await selectProfileContext(
      { mode: 'dashboard', schoolId: 'someone-elses-school' },
      fetchImpl as unknown as typeof fetch,
    )

    expect(result).toEqual({ ok: false, error: 'http' })
  })

  it('resolves ok:false without throwing on a 400', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 400 })

    const result = await selectProfileContext(
      { mode: 'dashboard', schoolId: '' },
      fetchImpl as unknown as typeof fetch,
    )

    expect(result).toEqual({ ok: false, error: 'http' })
  })

  it('resolves ok:false, error:"network" on a network failure, never redirects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    const result = await selectProfileContext(
      { mode: 'student', schoolId: 'school-2' },
      fetchImpl as unknown as typeof fetch,
    )

    expect(result).toEqual({ ok: false, error: 'network' })
  })
})
