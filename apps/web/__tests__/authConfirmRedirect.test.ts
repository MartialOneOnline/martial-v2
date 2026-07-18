/**
 * Tests for safeConfirmRedirect() — the ?redirect= sanitizer used across
 * register -> email -> /auth/confirm -> destination. Wraps safeRedirect()
 * (external/protocol-relative rejection already covered by its own tests)
 * and adds a loop guard: a redirect back into /auth/** would be
 * nonsensical for this flow.
 */
import { describe, it, expect } from 'vitest'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'

describe('safeConfirmRedirect', () => {
  it('passes through a normal same-origin path', () => {
    expect(safeConfirmRedirect('/my/events')).toBe('/my/events')
    expect(safeConfirmRedirect('/dashboard/classes')).toBe('/dashboard/classes')
  })

  it('preserves an attached query string', () => {
    expect(safeConfirmRedirect('/my/events?tab=upcoming')).toBe('/my/events?tab=upcoming')
  })

  it('rejects missing/empty values', () => {
    expect(safeConfirmRedirect(undefined)).toBeUndefined()
    expect(safeConfirmRedirect(null)).toBeUndefined()
    expect(safeConfirmRedirect('')).toBeUndefined()
  })

  it('rejects external hosts and protocol-relative URLs (delegated to safeRedirect)', () => {
    expect(safeConfirmRedirect('https://evil.com')).toBeUndefined()
    expect(safeConfirmRedirect('//evil.com')).toBeUndefined()
    expect(safeConfirmRedirect('javascript:alert(1)')).toBeUndefined()
  })

  it('rejects a loop back into /auth/confirm itself', () => {
    expect(safeConfirmRedirect('/auth/confirm')).toBeUndefined()
    expect(safeConfirmRedirect('/auth/confirm?redirect=/my')).toBeUndefined()
  })

  it('rejects a loop into any other /auth/** page (verify-pending, login, set-password, ...)', () => {
    expect(safeConfirmRedirect('/auth/verify-pending')).toBeUndefined()
    expect(safeConfirmRedirect('/auth/login')).toBeUndefined()
    expect(safeConfirmRedirect('/auth/set-password?schoolId=x')).toBeUndefined()
  })

  it('does not reject a path that merely starts with "/auth" as a different segment (no false-positive prefix match)', () => {
    expect(safeConfirmRedirect('/authoring/foo')).toBe('/authoring/foo')
  })
})
