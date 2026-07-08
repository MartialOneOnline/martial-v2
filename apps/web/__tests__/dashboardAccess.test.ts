/**
 * Tests for hasDashboardAccess() — the gate apps/web/app/dashboard/layout.tsx
 * uses to let a user into /dashboard. Must check SchoolMember, never the
 * global User.role: a user's global role can lag behind school-level grants
 * (e.g. claiming a school never touches it, see app/api/claim/[id]/route.ts),
 * so a STUDENT-global-role owner/staff member must still get in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCount = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    schoolMember: { count: mockCount },
  },
}))

const { hasDashboardAccess } = await import('@/lib/auth/contexts')

describe('hasDashboardAccess()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true for a user with an active staff-facing SchoolMember', async () => {
    mockCount.mockResolvedValue(1)

    const allowed = await hasDashboardAccess('user-1')

    expect(allowed).toBe(true)
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: 'ACTIVE',
        role: { in: ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST'] },
      },
    })
  })

  it('returns false for a user with only STUDENT memberships (or none)', async () => {
    mockCount.mockResolvedValue(0)

    const allowed = await hasDashboardAccess('user-2')

    expect(allowed).toBe(false)
  })
})
