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
    expect(whatsappNumber('+44 7700 900123', 'ES')).toBe('447700900123')
    expect(whatsappNumber('0034612345678', 'ES')).toBe('34612345678')
  })
  it('adds the school country code to national numbers', () => {
    expect(whatsappNumber('612345678', 'ES')).toBe('34612345678')
    expect(whatsappNumber('612 34 56 78', 'ES')).toBe('34612345678')
    expect(whatsappNumber('07700 900123', 'GB')).toBe('447700900123')
  })
  it('does not double the code when it is already there without "+"', () => {
    expect(whatsappNumber('34612345678', 'ES')).toBe('34612345678')
  })
  it('returns null for missing phones', () => {
    expect(whatsappNumber('NULL', 'ES')).toBeNull()
    expect(whatsappNumber(null, 'ES')).toBeNull()
  })
})
