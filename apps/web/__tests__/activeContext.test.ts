/**
 * Tests for lib/auth/activeContext.ts — the pure, server-side foundation for
 * the Facebook-style context switcher (list available {mode, school} pairs +
 * validate one). No UI/cookie/redirect behaviour lives here yet; this file
 * only covers listAvailableContexts() and isValidContext().
 *
 * Key invariant under test: SchoolMember has @@unique([schoolId, userId]), so
 * a single row can only ever produce ONE AvailableContext (either 'dashboard'
 * or 'student', never both) — "staff who is also graded" does not create a
 * second, separate student context for the same school.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFindMany = vi.fn()
const mockCount = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { findMany: mockFindMany, count: mockCount },
  },
}))

const { listAvailableContexts, isValidContext } = await import('@/lib/auth/activeContext')

function member(overrides: Record<string, unknown>) {
  return {
    role: 'STUDENT',
    status: 'ACTIVE',
    belt: null,
    beltDegree: null,
    school: { id: 'school-1', name: 'Roger Gracie', logoUrl: null },
    ...overrides,
  }
}

describe('listAvailableContexts()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns one student context for a user who is STUDENT in exactly one school', async () => {
    mockFindMany.mockResolvedValue([member({})])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toEqual([
      { mode: 'student', schoolId: 'school-1', schoolName: 'Roger Gracie', schoolLogoUrl: null, role: 'STUDENT', subtitle: null },
    ])
  })

  it('returns two distinct student contexts for a STUDENT in two schools', async () => {
    mockFindMany.mockResolvedValue([
      member({ school: { id: 'school-1', name: 'Alpha BJJ', logoUrl: null } }),
      member({ school: { id: 'school-2', name: 'Beta BJJ', logoUrl: null } }),
    ])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toHaveLength(2)
    expect(contexts.map(c => c.schoolId).sort()).toEqual(['school-1', 'school-2'])
    expect(contexts.every(c => c.mode === 'student')).toBe(true)
  })

  it('returns one dashboard context for an OWNER in one school', async () => {
    mockFindMany.mockResolvedValue([
      member({ role: 'OWNER', school: { id: 'school-1', name: 'Roger Gracie', logoUrl: 'https://x/logo.png' } }),
    ])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toEqual([
      { mode: 'dashboard', schoolId: 'school-1', schoolName: 'Roger Gracie', schoolLogoUrl: 'https://x/logo.png', role: 'OWNER', subtitle: null },
    ])
  })

  it('returns two dashboard contexts for STAFF in two schools', async () => {
    mockFindMany.mockResolvedValue([
      member({ role: 'INSTRUCTOR', school: { id: 'school-1', name: 'Alpha BJJ', logoUrl: null } }),
      member({ role: 'MANAGER', school: { id: 'school-2', name: 'Beta BJJ', logoUrl: null } }),
    ])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toHaveLength(2)
    expect(contexts.every(c => c.mode === 'dashboard')).toBe(true)
  })

  it('returns exactly 2 contexts for STAFF in school A + STUDENT in school B, dashboard first', async () => {
    mockFindMany.mockResolvedValue([
      member({ role: 'STUDENT', school: { id: 'school-b', name: 'Beta BJJ', logoUrl: null } }),
      member({ role: 'ADMIN', school: { id: 'school-a', name: 'Alpha BJJ', logoUrl: null } }),
    ])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toHaveLength(2)
    expect(contexts[0]).toMatchObject({ mode: 'dashboard', schoolId: 'school-a' })
    expect(contexts[1]).toMatchObject({ mode: 'student', schoolId: 'school-b' })
  })

  it('does not generate an extra student context from a staff row that also carries belt/beltDegree', async () => {
    // Same SchoolMember row: role OWNER but belt/beltDegree populated (e.g. an
    // instructor who trains and grades too). Unique constraint on
    // (schoolId, userId) means there is only ever this one row for this
    // school — it must map to exactly one context, not two.
    mockFindMany.mockResolvedValue([
      member({ role: 'OWNER', belt: 'Black Belt', beltDegree: 2, school: { id: 'school-1', name: 'Roger Gracie', logoUrl: null } }),
    ])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toHaveLength(1)
    expect(contexts[0]!.mode).toBe('dashboard')
  })

  it('includes belt/degree as subtitle for a student context when present', async () => {
    mockFindMany.mockResolvedValue([member({ belt: 'Blue Belt', beltDegree: 2 })])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts[0]!.subtitle).toBe('Blue Belt · Degree 2')
  })

  it('omits the degree suffix when beltDegree is 0', async () => {
    mockFindMany.mockResolvedValue([member({ belt: 'White Belt', beltDegree: 0 })])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts[0]!.subtitle).toBe('White Belt')
  })

  it('an ARCHIVED membership produces no context (query excludes it — never reaches the mapping step)', async () => {
    // The DB query itself filters status, so an ARCHIVED row would simply
    // never be returned by findMany in production. Simulate that here by
    // returning an empty result, matching what Prisma would actually give
    // back for a caller whose only membership is ARCHIVED.
    mockFindMany.mockResolvedValue([])

    const contexts = await listAvailableContexts('user-1')

    expect(contexts).toEqual([])
    // The where-clause sent to Prisma is what actually enforces this —
    // assert it excludes ARCHIVED/INACTIVE/PENDING for both branches.
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        OR: [
          { status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] } },
          { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
        ],
      },
      include: { school: { select: { id: true, name: true, logoUrl: true } } },
    })
  })
})

describe('isValidContext()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts a dashboard context for an ACTIVE staff role in that school', async () => {
    mockCount.mockResolvedValue(1)

    const valid = await isValidContext('user-1', { mode: 'dashboard', schoolId: 'school-1' })

    expect(valid).toBe(true)
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        schoolId: 'school-1',
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] },
      },
    })
  })

  it('accepts a student context for an ACTIVE/LEAD/FROZEN STUDENT in that school', async () => {
    mockCount.mockResolvedValue(1)

    const valid = await isValidContext('user-1', { mode: 'student', schoolId: 'school-1' })

    expect(valid).toBe(true)
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        schoolId: 'school-1',
        status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] },
        role: 'STUDENT',
      },
    })
  })

  it('rejects mode "dashboard" when the real row for that school is STUDENT', async () => {
    mockCount.mockResolvedValue(0)

    const valid = await isValidContext('user-1', { mode: 'dashboard', schoolId: 'school-1' })

    expect(valid).toBe(false)
  })

  it('rejects mode "student" when the real row for that school is staff', async () => {
    mockCount.mockResolvedValue(0)

    const valid = await isValidContext('user-1', { mode: 'student', schoolId: 'school-1' })

    expect(valid).toBe(false)
  })

  it('rejects a schoolId that belongs to a different user', async () => {
    mockCount.mockResolvedValue(0)

    const valid = await isValidContext('user-1', { mode: 'dashboard', schoolId: 'someone-elses-school' })

    expect(valid).toBe(false)
    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1', schoolId: 'someone-elses-school' }) }))
  })

  it('rejects a schoolId that does not exist', async () => {
    mockCount.mockResolvedValue(0)

    const valid = await isValidContext('user-1', { mode: 'student', schoolId: 'nonexistent-school' })

    expect(valid).toBe(false)
  })

  it('rejects when the matching membership is ARCHIVED', async () => {
    // ARCHIVED is outside both status filters, so the count query — which
    // hard-codes 'ACTIVE' / ['ACTIVE','LEAD','FROZEN'] — returns 0 for it
    // regardless of mode, exactly like it would for a nonexistent row.
    mockCount.mockResolvedValue(0)

    const dashboardValid = await isValidContext('user-1', { mode: 'dashboard', schoolId: 'school-1' })
    const studentValid = await isValidContext('user-1', { mode: 'student', schoolId: 'school-1' })

    expect(dashboardValid).toBe(false)
    expect(studentValid).toBe(false)
  })
})
