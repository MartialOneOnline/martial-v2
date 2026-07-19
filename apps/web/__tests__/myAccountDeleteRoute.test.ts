import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))

const mockUserFindUnique = vi.fn()
const mockUserUpdate = vi.fn()
const mockTxUserUpdate = vi.fn()
const mockTxLeadUpdateMany = vi.fn()
const mockTransaction = vi.fn(async (callback: (tx: unknown) => unknown) =>
  callback({ user: { update: mockTxUserUpdate }, lead: { updateMany: mockTxLeadUpdateMany } }),
)
vi.mock('@/lib/db', () => ({ prisma: {
  user: { findUnique: mockUserFindUnique, update: mockUserUpdate },
  $transaction: mockTransaction,
} }))

const mockDeleteAuthUser = vi.fn()
const mockUpdateUserById = vi.fn()
const mockStorageList = vi.fn()
const mockStorageRemove = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser: mockDeleteAuthUser, updateUserById: mockUpdateUserById } },
    storage: { from: () => ({ list: mockStorageList, remove: mockStorageRemove }) },
  }),
}))

const { DELETE } = await import('@/app/api/my/account/route')

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  mockUserFindUnique.mockResolvedValue({ id: 'user-1', supabaseAuthId: 'auth-1', deletedAt: null })
  mockTxUserUpdate.mockResolvedValue({ id: 'user-1' })
  mockTxLeadUpdateMany.mockResolvedValue({ count: 0 })
  mockUserUpdate.mockResolvedValue({ id: 'user-1' })
  mockDeleteAuthUser.mockResolvedValue({ error: null })
  mockUpdateUserById.mockResolvedValue({ error: null })
  mockStorageList.mockResolvedValue({ data: [], error: null })
  mockStorageRemove.mockResolvedValue({ error: null })
})

describe('DELETE /api/my/account', () => {
  it('requires authentication', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await DELETE()).status).toBe(401)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejects an already self-deleted account even with a live session', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', supabaseAuthId: 'auth-1', deletedAt: new Date() })
    const res = await DELETE()
    expect(res.status).toBe(404)
    expect(mockTransaction).not.toHaveBeenCalled()
    expect(mockDeleteAuthUser).not.toHaveBeenCalled()
  })

  it('anonymizes only the authenticated user without deleting historical relations', async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(mockTxUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        name: null, phone: null, avatarUrl: null, dateOfBirth: null,
        email: 'deleted+user-1@deleted.martialapp.invalid',
        deletedAt: expect.any(Date),
      }),
    })
    expect(mockDeleteAuthUser).toHaveBeenCalledWith('auth-1')
    expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { supabaseAuthId: null } })
  })

  it('cannot target another user because identity comes only from the session', async () => {
    await DELETE()
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: 'auth-1' },
      select: { id: true, supabaseAuthId: true, deletedAt: true },
    })
    const firstUpdate = mockTxUserUpdate.mock.calls[0]
    if (!firstUpdate) throw new Error('Expected anonymization update')
    expect(firstUpdate[0].where).toEqual({ id: 'user-1' })
  })

  it('anonymizes any Lead row this user converted from (CRM data, no legal reason to retain)', async () => {
    await DELETE()
    expect(mockTxLeadUpdateMany).toHaveBeenCalledWith({
      where: { convertedUserId: 'user-1' },
      data: { name: 'Deleted user', email: null, phone: null },
    })
  })

  describe('avatar storage cleanup', () => {
    it('removes every extension found for this exact user, in one call', async () => {
      mockStorageList.mockResolvedValue({ data: [{ name: 'auth-1.jpg' }, { name: 'auth-1.png' }], error: null })
      const res = await DELETE()
      expect(res.status).toBe(200)
      expect(mockStorageList).toHaveBeenCalledWith('avatars', { search: 'auth-1' })
      expect(mockStorageRemove).toHaveBeenCalledWith(['avatars/auth-1.jpg', 'avatars/auth-1.png'])
    })

    it('never removes another user whose id merely contains this one as a substring', async () => {
      // storage.list()'s `search` is a loose match — 'auth-1' also matches
      // 'auth-10.jpg' and 'not-auth-1-fake.png'. Only the exact
      // `{supabaseAuthId}.{ext}` shape may be deleted.
      mockStorageList.mockResolvedValue({
        data: [
          { name: 'auth-1.jpg' },
          { name: 'auth-10.jpg' },
          { name: 'not-auth-1-fake.png' },
        ],
        error: null,
      })
      const res = await DELETE()
      expect(res.status).toBe(200)
      expect(mockStorageRemove).toHaveBeenCalledWith(['avatars/auth-1.jpg'])
    })

    it('skips storage removal when nothing is found for this user', async () => {
      const res = await DELETE()
      expect(res.status).toBe(200)
      expect(mockStorageRemove).not.toHaveBeenCalled()
    })

    it('aborts before anonymizing when list() fails, so the request is safely retryable', async () => {
      mockStorageList.mockResolvedValue({ data: null, error: { message: 'storage unavailable' } })
      const res = await DELETE()
      expect(res.status).toBe(502)
      expect(mockTransaction).not.toHaveBeenCalled()
      expect(mockDeleteAuthUser).not.toHaveBeenCalled()
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })

    it('aborts before anonymizing when remove() fails, so the request is safely retryable', async () => {
      mockStorageList.mockResolvedValue({ data: [{ name: 'auth-1.jpg' }], error: null })
      mockStorageRemove.mockResolvedValue({ error: { message: 'not found' } })
      const res = await DELETE()
      expect(res.status).toBe(502)
      expect(mockTransaction).not.toHaveBeenCalled()
      expect(mockDeleteAuthUser).not.toHaveBeenCalled()
      expect(mockUpdateUserById).not.toHaveBeenCalled()
    })
  })

  it('falls back to banning the Supabase user when deletion fails, and still blocks login', async () => {
    mockDeleteAuthUser.mockResolvedValue({ error: { message: 'transient failure' } })
    const res = await DELETE()
    expect(res.status).toBe(200)
    // Combined into a single call — AdminUserAttributes accepts ban_duration
    // and email together, so this can't land half-applied (banned but the
    // original email still stuck on the Supabase user, or vice versa).
    expect(mockUpdateUserById).toHaveBeenCalledTimes(1)
    expect(mockUpdateUserById).toHaveBeenCalledWith('auth-1', {
      ban_duration: '876000h',
      email: 'deleted+user-1@deleted.martialapp.invalid',
    })
    // supabaseAuthId is only cleared on a real delete — the Supabase row still
    // exists here (just banned), so nulling it would orphan a live auth user.
    expect(mockUserUpdate).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.banned).toBe(true)
  })

  it('reports failure when the combined ban+email fallback also fails', async () => {
    mockDeleteAuthUser.mockResolvedValue({ error: { message: 'transient failure' } })
    mockUpdateUserById.mockResolvedValue({ error: { message: 'ban also failed' } })
    const res = await DELETE()
    expect(res.status).toBe(502)
    expect(mockUserUpdate).not.toHaveBeenCalled()
  })
})
