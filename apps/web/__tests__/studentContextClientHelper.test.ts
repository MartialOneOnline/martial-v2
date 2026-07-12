/**
 * lib/studentContext.ts — shared client-side helper /my/** pages use to
 * detect the student_context_required (409) signal from /api/my/** without
 * duplicating the same shape check on every page, and to build the
 * /choose-profile redirect target safely (via safeRedirect()).
 */
import { describe, it, expect } from 'vitest'
import { isStudentContextRequired, chooseProfileUrl, STUDENT_CONTEXT_REQUIRED_ERROR } from '@/lib/studentContext'

describe('isStudentContextRequired()', () => {
  it('is true for the exact error shape', () => {
    expect(isStudentContextRequired({ error: 'student_context_required' })).toBe(true)
  })

  it('is false for a normal successful body', () => {
    expect(isStudentContextRequired({ bookings: [], total: 0 })).toBe(false)
  })

  it('is false for a different error (e.g. Forbidden/Unauthorized)', () => {
    expect(isStudentContextRequired({ error: 'Forbidden' })).toBe(false)
    expect(isStudentContextRequired({ error: 'Unauthorized' })).toBe(false)
  })

  it('is false for null/undefined/non-object bodies (never throws)', () => {
    expect(isStudentContextRequired(null)).toBe(false)
    expect(isStudentContextRequired(undefined)).toBe(false)
    expect(isStudentContextRequired('a string')).toBe(false)
    expect(isStudentContextRequired(42)).toBe(false)
  })

  it('the exported constant matches what the backend actually sends', () => {
    expect(STUDENT_CONTEXT_REQUIRED_ERROR).toBe('student_context_required')
  })
})

describe('chooseProfileUrl()', () => {
  it('builds a redirect to /choose-profile carrying the safe, encoded path', () => {
    expect(chooseProfileUrl('/my/classes')).toBe('/choose-profile?redirect=%2Fmy%2Fclasses')
  })

  it('falls back to /my when the path is not same-origin-safe (goes through safeRedirect())', () => {
    expect(chooseProfileUrl('//evil.com')).toBe('/choose-profile?redirect=%2Fmy')
    expect(chooseProfileUrl('https://evil.com')).toBe('/choose-profile?redirect=%2Fmy')
  })

  it('falls back to /my for an empty path', () => {
    expect(chooseProfileUrl('')).toBe('/choose-profile?redirect=%2Fmy')
  })
})
