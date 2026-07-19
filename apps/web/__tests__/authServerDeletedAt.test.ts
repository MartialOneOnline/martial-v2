import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { user: { findUnique: mockFindUnique, update: mockUpdate } } }))

const { resolveDbUser } = await import('@/lib/auth/server')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveDbUser deletedAt gate', () => {
  it('returns null for a self-deleted (anonymized) user even though the row still exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', role: 'STUDENT', email: 'deleted+user-1@deleted.martialapp.invalid', name: null, deletedAt: new Date() })
    const result = await resolveDbUser({ id: 'auth-1', email: 'deleted+user-1@deleted.martialapp.invalid' })
    expect(result).toBeNull()
  })

  it('returns the user normally when deletedAt is null', async () => {
    mockFindUnique.mockResolvedValue({ id: 'user-1', role: 'STUDENT', email: 'student@example.com', name: 'Student', deletedAt: null })
    const result = await resolveDbUser({ id: 'auth-1', email: 'student@example.com' })
    expect(result?.id).toBe('user-1')
  })

  it('applies the same gate on the email-fallback linking path', async () => {
    mockFindUnique
      .mockResolvedValueOnce(null) // no match by supabaseAuthId yet
      .mockResolvedValueOnce({ id: 'user-1', role: 'STUDENT', email: 'student@example.com', name: 'Student', deletedAt: new Date() })
    const result = await resolveDbUser({ id: 'auth-1', email: 'student@example.com' })
    expect(result).toBeNull()
    // Still links the auth id even though the caller ends up rejected — a
    // deleted user's row shouldn't stay perpetually unlinked from its
    // (now orphaned, but harmless) auth id.
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { supabaseAuthId: 'auth-1' } })
  })
})
