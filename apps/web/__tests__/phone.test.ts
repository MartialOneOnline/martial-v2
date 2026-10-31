/**
 * The Users report's WhatsApp/call links are how a school contacts lost or
 * at-risk students — a wrong number means the message never arrives.
 */
import { describe, it, expect } from 'vitest'
import { cleanPhone, whatsappNumber } from '@/lib/phone'

describe('cleanPhone()', () => {
  it('treats empty and imported "NULL" placeholders as missing', () => {
    expect(cleanPhone(null)).toBeNull()
    expect(cleanPhone('')).toBeNull()
    expect(cleanPhone('  ')).toBeNull()
    expect(cleanPhone('NULL')).toBeNull()
    expect(cleanPhone('null')).toBeNull()
    expect(cleanPhone('-')).toBeNull()
  })
  it('keeps a real number as entered', () => {
    expect(cleanPhone(' +34 612 345 678 ')).toBe('+34 612 345 678')
  })
})

describe('whatsappNumber()', () => {
  it('keeps international numbers', () => {
    expect(whatsappNumber('+34 612 345 678', 'ES')).toBe('34612345678')
    expect(whatsappNumber('+44 7911 123456', 'ES')).toBe('447911123456')
    expect(whatsappNumber('0034612345678', 'ES')).toBe('34612345678')
  })
  it('adds the school country code to national numbers', () => {
    expect(whatsappNumber('612345678', 'ES')).toBe('34612345678')
    expect(whatsappNumber('612 34 56 78', 'ES')).toBe('34612345678')
    expect(whatsappNumber('07911 123456', 'GB')).toBe('447911123456')
  })
  // Audit PR #35 (P2): national rules differ per country
  it('keeps Italy\'s significant leading 0 and drops the trunk 0 elsewhere', () => {
    expect(whatsappNumber('0212345678', 'IT')).toBe('390212345678')
    expect(whatsappNumber('0791234567', 'CH')).toBe('41791234567')
  })
  it('gives no WhatsApp number when the country cannot be determined or the number is invalid', () => {
    expect(whatsappNumber('612345678', null)).toBeNull()
    expect(whatsappNumber('612345678', 'XX')).toBeNull()
    expect(whatsappNumber('12345', 'ES')).toBeNull()
  })
  it('does not double the code when it is already there without "+"', () => {
    expect(whatsappNumber('34612345678', 'ES')).toBe('34612345678')
  })
  it('returns null for missing phones', () => {
    expect(whatsappNumber('NULL', 'ES')).toBeNull()
    expect(whatsappNumber(null, 'ES')).toBeNull()
  })
})
