/**
 * Tests for resolveAuthHashRedirect() — decides where to send traffic that lands
 * on the homepage carrying a Supabase auth hash (redirect_to not allow-listed).
 */
import { describe, it, expect } from 'vitest'
import { resolveAuthHashRedirect } from '@/lib/authHashRedirect'

describe('resolveAuthHashRedirect', () => {
  it('redirects a first-send invite (type=invite) to set-password, preserving the full hash', () => {
    const hash = '#access_token=eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jb20ifQ.sig&refresh_token=r1&expires_in=3600&expires_at=1999999999&token_type=bearer&type=invite'
    expect(resolveAuthHashRedirect(hash, '/')).toBe('/auth/set-password' + hash)
  })

  it('redirects a resend invite (type=magiclink) to set-password, preserving the full hash', () => {
    const hash = '#access_token=eyJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImFAYi5jb20ifQ.sig&refresh_token=r2&type=magiclink'
    expect(resolveAuthHashRedirect(hash, '/')).toBe('/auth/set-password' + hash)
  })

  it('sends the token in the hash, never as a query string', () => {
    const hash = '#access_token=abc.def.sig&refresh_token=r3&type=invite'
    const result = resolveAuthHashRedirect(hash, '/')
    expect(result).toContain('#access_token=')
    expect(result).not.toContain('?access_token=')
  })

  it('does nothing for a normal homepage load with no hash', () => {
    expect(resolveAuthHashRedirect('', '/')).toBeNull()
  })

  it('does nothing for an unrelated/incomplete hash', () => {
    expect(resolveAuthHashRedirect('#foo=bar', '/')).toBeNull()
    expect(resolveAuthHashRedirect('#type=invite', '/')).toBeNull() // no access_token
  })

  it('sends an expired/invalid invite (error hash, no access_token) to /login', () => {
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(resolveAuthHashRedirect(hash, '/')).toBe('/login')
  })

  it('redirects a password-recovery hash (type=recovery) to reset-password, preserving the full hash', () => {
    const hash = '#access_token=abc.def.sig&refresh_token=r4&type=recovery'
    expect(resolveAuthHashRedirect(hash, '/')).toBe('/auth/reset-password' + hash)
  })

  it('does nothing outside the homepage — pages with their own hash handling must not be hijacked', () => {
    const inviteHash = '#access_token=abc.def.sig&refresh_token=r5&type=invite'
    const magiclinkHash = '#access_token=abc.def.sig&refresh_token=r6&type=magiclink'
    const recoveryHash = '#access_token=abc.def.sig&refresh_token=r7&type=recovery'
    const errorHash = '#error=access_denied&error_code=otp_expired'
    expect(resolveAuthHashRedirect(inviteHash, '/auth/confirm')).toBeNull()
    expect(resolveAuthHashRedirect(magiclinkHash, '/auth/confirm')).toBeNull()
    expect(resolveAuthHashRedirect(recoveryHash, '/auth/reset-password')).toBeNull()
    expect(resolveAuthHashRedirect(errorHash, '/auth/accept-invite')).toBeNull()
  })
})
