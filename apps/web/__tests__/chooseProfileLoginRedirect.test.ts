/**
 * Tests for app/choose-profile/loginRedirect.ts —
 * resolveChooseProfileLoginRedirect(), the counterpart to logic.ts's
 * resolveChooseProfileRedirect() but for the OTHER end of /choose-profile's
 * `?redirect=` handling: what URL to send an unauthenticated visitor to so
 * the original destination survives the login detour (P3 audit fix — see
 * CONTEXT.md; previously page.tsx hardcoded `/login?redirect=/choose-profile`
 * unconditionally, silently dropping any nested `?redirect=` the incoming
 * request carried, e.g. `/choose-profile?redirect=/my/events` becoming just
 * `/login?redirect=/choose-profile`).
 *
 * Covers the exact scenarios from the audit + task spec: no redirect param,
 * a plain path, a path with its own nested query string, external-host/
 * protocol-relative open-redirect attempts, and the /choose-profile loop
 * guard (with and without its own query string).
 */
import { describe, it, expect } from 'vitest'
import { resolveChooseProfileLoginRedirect, FALLBACK_LOGIN_REDIRECT } from '@/app/choose-profile/loginRedirect'

describe('resolveChooseProfileLoginRedirect', () => {
  it('falls back to the plain /login redirect when there is no redirect param', () => {
    expect(resolveChooseProfileLoginRedirect(undefined)).toBe('/login?redirect=/choose-profile')
    expect(resolveChooseProfileLoginRedirect(null)).toBe(FALLBACK_LOGIN_REDIRECT)
    expect(resolveChooseProfileLoginRedirect('')).toBe(FALLBACK_LOGIN_REDIRECT)
  })

  it('preserves a plain path, wrapping it as /choose-profile?redirect=<path> inside the login redirect', () => {
    // encodeURIComponent('/my/events') -> '%2Fmy%2Fevents'; the whole
    // '/choose-profile?redirect=%2Fmy%2Fevents' target is then
    // encodeURIComponent'd again to become login's own `redirect` value.
    expect(resolveChooseProfileLoginRedirect('/my/events')).toBe(
      '/login?redirect=%2Fchoose-profile%3Fredirect%3D%252Fmy%252Fevents',
    )
  })

  it('preserves /dashboard the same way', () => {
    expect(resolveChooseProfileLoginRedirect('/dashboard')).toBe(
      '/login?redirect=%2Fchoose-profile%3Fredirect%3D%252Fdashboard',
    )
  })

  it('preserves a redirect value that itself carries a nested query string', () => {
    const result = resolveChooseProfileLoginRedirect('/my/events?tab=upcoming')
    expect(result).toBe(
      `/login?redirect=${encodeURIComponent(`/choose-profile?redirect=${encodeURIComponent('/my/events?tab=upcoming')}`)}`,
    )
  })

  it('falls back for an external host', () => {
    expect(resolveChooseProfileLoginRedirect('https://evil.com')).toBe(FALLBACK_LOGIN_REDIRECT)
  })

  it('falls back for a protocol-relative //host value', () => {
    expect(resolveChooseProfileLoginRedirect('//evil.com')).toBe(FALLBACK_LOGIN_REDIRECT)
  })

  it('falls back (no loop) when the redirect points back at /choose-profile itself', () => {
    expect(resolveChooseProfileLoginRedirect('/choose-profile')).toBe(FALLBACK_LOGIN_REDIRECT)
  })

  it('falls back (no loop) when the redirect points at /choose-profile with its own query string', () => {
    expect(resolveChooseProfileLoginRedirect('/choose-profile?foo=bar')).toBe(FALLBACK_LOGIN_REDIRECT)
  })

  it('round-trips correctly through login/page.tsx-style safeRedirect(searchParams.get(...)) decoding', () => {
    // Simulates: browser navigates to the URL this function returns, then
    // /login reads its own `redirect` query param the same way
    // URLSearchParams/useSearchParams does (single percent-decode).
    const loginUrl = resolveChooseProfileLoginRedirect('/my/events')
    const qs = loginUrl.split('?').slice(1).join('?')
    const decoded = new URLSearchParams(qs).get('redirect')

    expect(decoded).toBe('/choose-profile?redirect=%2Fmy%2Fevents')

    // That decoded value is exactly what login/page.tsx's
    // `safeRedirect(searchParams.get('redirect'))` receives — confirm it
    // survives that validation (same-origin relative path, doesn't start
    // with '//') rather than being rejected.
    expect(decoded).toMatch(/^\/(?!\/)/)

    // And when the browser lands on that URL (`/choose-profile?redirect=
    // %2Fmy%2Fevents`), /choose-profile's own `searchParams` decodes the
    // value one more time, recovering the original destination.
    const chooseProfileQs = decoded!.split('?').slice(1).join('?')
    const finalRedirect = new URLSearchParams(chooseProfileQs).get('redirect')
    expect(finalRedirect).toBe('/my/events')
  })
})
