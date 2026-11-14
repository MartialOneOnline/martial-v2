/**
 * isApplePrivateRelayEmail() decides who gets asked for a real email in
 * /complete-profile and who is allowed to use POST /api/my/email — a false
 * positive would let a normal account rewrite its login email.
 */
import { describe, it, expect } from 'vitest'
import { isApplePrivateRelayEmail } from '@/lib/privateRelay'

describe('isApplePrivateRelayEmail()', () => {
  it('matches Apple relay addresses, case- and whitespace-insensitively', () => {
    expect(isApplePrivateRelayEmail('c4yptgkmps@privaterelay.appleid.com')).toBe(true)
    expect(isApplePrivateRelayEmail('  Abc@PrivateRelay.AppleID.com ')).toBe(true)
  })

  it('does not match normal addresses or lookalikes', () => {
    expect(isApplePrivateRelayEmail('hugo@gmail.com')).toBe(false)
    expect(isApplePrivateRelayEmail('x@privaterelay.appleid.com.evil.io')).toBe(false)
    expect(isApplePrivateRelayEmail('privaterelay.appleid.com@gmail.com')).toBe(false)
    expect(isApplePrivateRelayEmail('')).toBe(false)
    expect(isApplePrivateRelayEmail(null)).toBe(false)
  })
})

describe('needsRealEmailStep', () => {
  it('asks for a real email only for a relay address that can be changed', async () => {
    const { needsRealEmailStep } = await import('@/lib/privateRelay')
    expect(needsRealEmailStep('x@privaterelay.appleid.com', false)).toBe(true)
    // Blocked by a pending merge write: the step can't be completed, so /my and
    // /complete-profile must let the student continue with the other fields.
    expect(needsRealEmailStep('x@privaterelay.appleid.com', true)).toBe(false)
    expect(needsRealEmailStep('x@gmail.com', false)).toBe(false)
    expect(needsRealEmailStep(null, false)).toBe(false)
  })
})
