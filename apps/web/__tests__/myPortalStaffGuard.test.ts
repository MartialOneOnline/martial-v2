/**
 * Guards the inverse of hasDashboardAccess(): a staff-only account (its only
 * SchoolMember rows are OWNER/ADMIN/MANAGER/INSTRUCTOR/ASSISTANT_INSTRUCTOR/
 * RECEPTIONIST — created purely so hasDashboardAccess() lets them into
 * /dashboard, see contexts.ts) must not be able to render /my as if it were
 * a student portal. Before this fix:
 *   - app/dashboard/layout.tsx redirected non-staff users to /my, but
 *     app/my/layout.tsx had no equivalent check the other way, and
 *   - app/api/my/route.ts pulled schoolMembers[0] without filtering by role,
 *     so a staff-only SchoolMember row (no belt, no bookings) rendered as a
 *     fake/empty student profile at /my/profile.
 *
 * Fix: hasStudentAccess() (contexts.ts) requires a real STUDENT-role
 * SchoolMember; app/my/layout.tsx redirects staff-only accounts to
 * /dashboard; app/api/my/route.ts's schoolMembers query is now scoped to
 * role: 'STUDENT' and both GET/PATCH 403 a staff-only caller.
 *
 * Rule implemented: staff role alone -> blocked from /my. Staff + a real
 * STUDENT membership somewhere -> still allowed (legitimate dual role). No
 * SchoolMember at all -> unchanged, still allowed into /my (e.g. a brand new
 * account before joining any school).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── hasStudentAccess() unit tests ───────────────────────────────────────────

const mockCount = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { count: mockCount },
  },
}))

const { hasStudentAccess } = await import('@/lib/auth/contexts')

describe('hasStudentAccess()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true for a user with a real STUDENT-role SchoolMember', async () => {
    mockCount.mockResolvedValue(1)

    const allowed = await hasStudentAccess('user-1')

    expect(allowed).toBe(true)
    expect(mockCount).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
    })
  })

  it('returns false for a user with only staff-role SchoolMembers (or none)', async () => {
    mockCount.mockResolvedValue(0)

    const allowed = await hasStudentAccess('user-2')

    expect(allowed).toBe(false)
  })
})

// ── app/my/layout.tsx redirect behaviour ────────────────────────────────────

describe('MyLayout (app/my/layout.tsx)', () => {
  const mockGetAuthUser = vi.fn()
  const mockHasDashboardAccess = vi.fn()
  const mockHasStudentAccess = vi.fn()
  const mockRedirect = vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) })

  vi.doMock('next/navigation', () => ({ redirect: mockRedirect }))
  vi.doMock('@/lib/auth/server', () => ({ getAuthUser: mockGetAuthUser }))
  vi.doMock('@/lib/auth/contexts', () => ({
    hasDashboardAccess: mockHasDashboardAccess,
    hasStudentAccess: mockHasStudentAccess,
  }))
  vi.doMock('@/components/MyShell', () => ({ default: ({ children }: { children: unknown }) => children }))

  async function callLayout() {
    const { default: MyLayout } = await import('@/app/my/layout')
    return MyLayout({ children: 'kids' as unknown as React.ReactNode })
  }

  beforeEach(() => {
    vi.resetModules()
    mockGetAuthUser.mockReset()
    mockHasDashboardAccess.mockReset()
    mockHasStudentAccess.mockReset()
    mockRedirect.mockClear()
  })

  it('redirects to /login when there is no authenticated user', async () => {
    mockGetAuthUser.mockResolvedValue(null)

    await expect(callLayout()).rejects.toThrow('NEXT_REDIRECT:/login?redirect=/my')
  })

  it('redirects a staff-only account (no STUDENT membership) to /dashboard', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'owner-1', role: 'SCHOOL_OWNER' })
    mockHasDashboardAccess.mockResolvedValue(true)
    mockHasStudentAccess.mockResolvedValue(false)

    await expect(callLayout()).rejects.toThrow('NEXT_REDIRECT:/dashboard')
  })

  it('allows a normal STUDENT account through (renders MyShell, no redirect)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'student-1', role: 'STUDENT' })
    mockHasDashboardAccess.mockResolvedValue(false)
    mockHasStudentAccess.mockResolvedValue(true)

    const result = await callLayout()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })

  it('allows a staff account that is *also* a real STUDENT somewhere (dual role)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'dual-1', role: 'SCHOOL_OWNER' })
    mockHasDashboardAccess.mockResolvedValue(true)
    mockHasStudentAccess.mockResolvedValue(true)

    const result = await callLayout()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })

  it('allows a user with no SchoolMember at all (unchanged pre-existing behaviour)', async () => {
    mockGetAuthUser.mockResolvedValue({ id: 'fresh-1', role: 'STUDENT' })
    mockHasDashboardAccess.mockResolvedValue(false)
    mockHasStudentAccess.mockResolvedValue(false)

    const result = await callLayout()

    expect(mockRedirect).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})
