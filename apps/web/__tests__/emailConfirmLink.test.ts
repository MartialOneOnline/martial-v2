/**
 * buildEmailConfirmUrl / isEmailConfirmOtpType — the emailed confirmation
 * link must point at our server-side /auth/confirm/verify route (never at
 * Supabase's implicit-flow action_link, which the PKCE browser client can't
 * redeem), carry the matching OTP type, and only ever accept the email
 * verification types on the way back in.
 */
import { describe, it, expect } from 'vitest'
import { buildEmailConfirmUrl, isEmailConfirmOtpType } from '@/lib/auth/emailConfirmLink'

describe('buildEmailConfirmUrl', () => {
  it('builds a /auth/confirm/verify link with token_hash and type', () => {
    const url = new URL(buildEmailConfirmUrl({ appUrl: 'https://app.test', hashedToken: 'h1', verificationType: 'signup', redirect: undefined }))
    expect(url.origin + url.pathname).toBe('https://app.test/auth/confirm/verify')
    expect(url.searchParams.get('token_hash')).toBe('h1')
    expect(url.searchParams.get('type')).toBe('signup')
    expect(url.searchParams.has('redirect')).toBe(false)
  })

  it('carries the redirect through', () => {
    const url = new URL(buildEmailConfirmUrl({ appUrl: 'https://app.test', hashedToken: 'h1', verificationType: 'magiclink', redirect: '/my/events' }))
    expect(url.searchParams.get('redirect')).toBe('/my/events')
  })

  it('falls back to magiclink for an unknown or missing verification type', () => {
    for (const verificationType of [undefined, 'recovery', 'invite']) {
      const url = new URL(buildEmailConfirmUrl({ appUrl: 'https://app.test', hashedToken: 'h1', verificationType, redirect: undefined }))
      expect(url.searchParams.get('type')).toBe('magiclink')
    }
  })
})

describe('isEmailConfirmOtpType', () => {
  it('accepts only email verification types', () => {
    expect(isEmailConfirmOtpType('signup')).toBe(true)
    expect(isEmailConfirmOtpType('magiclink')).toBe(true)
    expect(isEmailConfirmOtpType('email')).toBe(true)
    expect(isEmailConfirmOtpType('recovery')).toBe(false)
    expect(isEmailConfirmOtpType('invite')).toBe(false)
    expect(isEmailConfirmOtpType(null)).toBe(false)
  })
})
