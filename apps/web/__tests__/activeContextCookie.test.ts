/**
 * Tests for lib/auth/activeContextCookie.ts — the next/headers-coupled layer
 * on top of the pure lib/auth/activeContext.ts (listAvailableContexts /
 * isValidContext, Session 60). Covers parsing/serializing the
 * martial_active_context cookie and getActiveContext()'s revalidation.
 *
 * Key property under test: a cookie value is never trusted on its own.
 * getActiveContext() always calls isValidContext() against the DB, so a
 * hand-edited cookie (well-formed JSON, bogus/foreign schoolId) is treated
 * exactly like a missing one — it never grants access by itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockIsValidContext = vi.fn()
const mockListAvailableContexts = vi.fn()
vi.mock('@/lib/auth/activeContext', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/activeContext')>(
    '@/lib/auth/activeContext',
  )
  return {
    ...actual,
    isValidContext: mockIsValidContext,
    listAvailableContexts: mockListAvailableContexts,
  }
})

const mockCookieGet = vi.fn()
vi.mock('next/headers', () => ({
  cookies: () => ({ get: mockCookieGet }),
}))

const {
  parseActiveContextCookie,
  serializeActiveContextCookie,
  getActiveContext,
  getActiveStudentContext,
  ACTIVE_CONTEXT_COOKIE_NAME,
} = await import('@/lib/auth/activeContextCookie')

function availableContext(overrides: Record<string, unknown> = {}) {
  return {
    mode: 'student',
    schoolId: 'school-1',
    schoolName: 'Roger Gracie',
    schoolLogoUrl: null,
    role: 'STUDENT',
    subtitle: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ACTIVE_CONTEXT_COOKIE_NAME', () => {
  it('is a distinct name from the pre-existing currentSchoolId cookie', () => {
    expect(ACTIVE_CONTEXT_COOKIE_NAME).toBe('martial_active_context')
    expect(ACTIVE_CONTEXT_COOKIE_NAME).not.toBe('currentSchoolId')
  })
})

describe('parseActiveContextCookie()', () => {
  it('returns null for undefined (no cookie set)', () => {
    expect(parseActiveContextCookie(undefined)).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parseActiveContextCookie('not-json{')).toBeNull()
  })

  it('returns null for valid JSON that is not an object', () => {
    expect(parseActiveContextCookie('"just a string"')).toBeNull()
    expect(parseActiveContextCookie('42')).toBeNull()
    expect(parseActiveContextCookie('null')).toBeNull()
  })

  it('returns null when mode is not one of the two valid values', () => {
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'admin', schoolId: 's1' }))).toBeNull()
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'DASHBOARD', schoolId: 's1' }))).toBeNull()
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'Student', schoolId: 's1' }))).toBeNull()
  })

  it('returns null when schoolId is missing, empty, or the wrong type', () => {
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'dashboard' }))).toBeNull()
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'dashboard', schoolId: '' }))).toBeNull()
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'dashboard', schoolId: 123 }))).toBeNull()
    expect(parseActiveContextCookie(JSON.stringify({ mode: 'dashboard', schoolId: null }))).toBeNull()
  })

  it('parses a valid dashboard context', () => {
    const raw = JSON.stringify({ mode: 'dashboard', schoolId: 'school-1' })
    expect(parseActiveContextCookie(raw)).toEqual({ mode: 'dashboard', schoolId: 'school-1' })
  })

  it('parses a valid student context', () => {
    const raw = JSON.stringify({ mode: 'student', schoolId: 'school-2' })
    expect(parseActiveContextCookie(raw)).toEqual({ mode: 'student', schoolId: 'school-2' })
  })

  it('drops extra fields — only mode/schoolId survive', () => {
    const raw = JSON.stringify({ mode: 'dashboard', schoolId: 'school-1', extra: 'nope', role: 'OWNER' })
    expect(parseActiveContextCookie(raw)).toEqual({ mode: 'dashboard', schoolId: 'school-1' })
  })
})

describe('serializeActiveContextCookie()', () => {
  it('serializes exactly {mode, schoolId}, dropping any other property', () => {
    const context = { mode: 'student' as const, schoolId: 'school-1' }
    const serialized = serializeActiveContextCookie(context)
    expect(JSON.parse(serialized)).toEqual({ mode: 'student', schoolId: 'school-1' })
  })

  it('round-trips through parseActiveContextCookie', () => {
    const context = { mode: 'dashboard' as const, schoolId: 'school-9' }
    const parsed = parseActiveContextCookie(serializeActiveContextCookie(context))
    expect(parsed).toEqual(context)
  })
})

describe('getActiveContext()', () => {
  it('returns null when there is no cookie', async () => {
    mockCookieGet.mockReturnValue(undefined)

    const result = await getActiveContext('user-1')

    expect(result).toBeNull()
    expect(mockIsValidContext).not.toHaveBeenCalled()
  })

  it('returns null when the cookie is malformed JSON, without calling isValidContext', async () => {
    mockCookieGet.mockReturnValue({ value: '{not valid json' })

    const result = await getActiveContext('user-1')

    expect(result).toBeNull()
    expect(mockIsValidContext).not.toHaveBeenCalled()
  })

  it('returns the parsed context when it revalidates successfully', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify({ mode: 'student', schoolId: 'school-1' }) })
    mockIsValidContext.mockResolvedValue(true)

    const result = await getActiveContext('user-1')

    expect(result).toEqual({ mode: 'student', schoolId: 'school-1' })
    expect(mockIsValidContext).toHaveBeenCalledWith('user-1', { mode: 'student', schoolId: 'school-1' })
  })

  it('returns null for a manipulated cookie — well-formed JSON, but isValidContext rejects it (foreign/bogus schoolId)', async () => {
    // Simulates a hand-edited cookie: valid shape, but the schoolId does not
    // belong to this user (or does not exist at all). isValidContext() does
    // its own DB check and is the thing that actually enforces this — the
    // cookie's mere presence and well-formedness must not be enough.
    mockCookieGet.mockReturnValue({
      value: JSON.stringify({ mode: 'dashboard', schoolId: 'someone-elses-school' }),
    })
    mockIsValidContext.mockResolvedValue(false)

    const result = await getActiveContext('user-1')

    expect(result).toBeNull()
    expect(mockIsValidContext).toHaveBeenCalledWith('user-1', {
      mode: 'dashboard',
      schoolId: 'someone-elses-school',
    })
  })
})

describe('getActiveStudentContext()', () => {
  it('uses the cookie when it is a valid student-mode context', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify({ mode: 'student', schoolId: 'school-9' }) })
    mockIsValidContext.mockResolvedValue(true)

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ok', schoolId: 'school-9' })
    expect(mockListAvailableContexts).not.toHaveBeenCalled()
  })

  it('treats a valid dashboard-mode cookie as "no student cookie" and falls back to listAvailableContexts', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify({ mode: 'dashboard', schoolId: 'school-9' }) })
    mockIsValidContext.mockResolvedValue(true)
    mockListAvailableContexts.mockResolvedValue([availableContext({ schoolId: 'school-1' })])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ok', schoolId: 'school-1' })
  })

  it('falls back when there is no cookie at all and exactly one real student context exists', async () => {
    mockCookieGet.mockReturnValue(undefined)
    mockListAvailableContexts.mockResolvedValue([availableContext({ schoolId: 'school-1' })])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ok', schoolId: 'school-1' })
  })

  it('returns ambiguous for 2+ student contexts with no cookie', async () => {
    mockCookieGet.mockReturnValue(undefined)
    mockListAvailableContexts.mockResolvedValue([
      availableContext({ schoolId: 'school-1' }),
      availableContext({ schoolId: 'school-2' }),
    ])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ambiguous' })
  })

  it('returns ambiguous for 2+ student contexts even with a manipulated/foreign-school cookie rejected by isValidContext', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify({ mode: 'student', schoolId: 'someone-elses-school' }) })
    mockIsValidContext.mockResolvedValue(false)
    mockListAvailableContexts.mockResolvedValue([
      availableContext({ schoolId: 'school-1' }),
      availableContext({ schoolId: 'school-2' }),
    ])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ambiguous' })
  })

  it('picks school B when the cookie points at B out of 2 real student contexts', async () => {
    mockCookieGet.mockReturnValue({ value: JSON.stringify({ mode: 'student', schoolId: 'school-b' }) })
    mockIsValidContext.mockResolvedValue(true)
    mockListAvailableContexts.mockResolvedValue([
      availableContext({ schoolId: 'school-a' }),
      availableContext({ schoolId: 'school-b' }),
    ])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ok', schoolId: 'school-b' })
    expect(mockListAvailableContexts).not.toHaveBeenCalled()
  })

  it('returns none when there are zero real student contexts', async () => {
    mockCookieGet.mockReturnValue(undefined)
    mockListAvailableContexts.mockResolvedValue([])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'none' })
  })

  it('ignores non-student contexts (dashboard) when counting for ambiguity', async () => {
    mockCookieGet.mockReturnValue(undefined)
    mockListAvailableContexts.mockResolvedValue([
      availableContext({ mode: 'dashboard', schoolId: 'school-1', role: 'OWNER' }),
      availableContext({ mode: 'student', schoolId: 'school-2' }),
    ])

    const result = await getActiveStudentContext('user-1')

    expect(result).toEqual({ kind: 'ok', schoolId: 'school-2' })
  })
})
