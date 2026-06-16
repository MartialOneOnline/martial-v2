import { describe, it, expect } from 'vitest'
import { canMarkAttended } from '../lib/services/attendance'

describe('canMarkAttended()', () => {
  it('allows marking a PENDING booking as attended', () => {
    const result = canMarkAttended('PENDING', null)
    expect(result).toEqual({ ok: true, alreadyDone: false })
  })

  it('allows marking a CONFIRMED booking as attended', () => {
    const result = canMarkAttended('CONFIRMED', null)
    expect(result).toEqual({ ok: true, alreadyDone: false })
  })

  it('allows marking a NO_SHOW booking as attended (staff override)', () => {
    const result = canMarkAttended('NO_SHOW', null)
    expect(result).toEqual({ ok: true, alreadyDone: false })
  })

  it('blocks marking a CANCELLED booking as attended', () => {
    const result = canMarkAttended('CANCELLED', null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.httpStatus).toBe(422)
      expect(result.reason).toMatch(/cancelled/i)
    }
  })

  it('is idempotent: COMPLETED + attendedAt set returns alreadyDone=true', () => {
    const result = canMarkAttended('COMPLETED', new Date())
    expect(result).toEqual({ ok: true, alreadyDone: true })
  })

  it('is not idempotent when COMPLETED but attendedAt is null (edge case: re-mark)', () => {
    // attendedAt missing even though status=COMPLETED — proceed with the write
    const result = canMarkAttended('COMPLETED', null)
    expect(result).toEqual({ ok: true, alreadyDone: false })
  })
})
