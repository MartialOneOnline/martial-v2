/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma/Supabase clients */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getUserById = vi.fn()
const updateUserById = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ auth: { admin: { getUserById, updateUserById } } }) }))
vi.mock('@/lib/db', () => ({ prisma: {} }))

const { supabaseAuthAdmin, isUserNotFound } = await import('@/lib/accountMergeServer')
const { resolveSurvivingUserId } = await import('@/lib/mergedUsers')

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.useRealTimers())

describe('supabaseAuthAdmin — only a confirmed "not found" counts as missing', () => {
  it('maps a found user, including the ban', async () => {
    getUserById.mockResolvedValue({ data: { user: { id: 'a', email: 'a@x.com', identities: [{ provider: 'apple' }], last_sign_in_at: null, banned_until: '2126-01-01T00:00:00Z' } }, error: null })
    expect(await supabaseAuthAdmin().getUser('a')).toEqual({ status: 'found', user: { id: 'a', email: 'a@x.com', providers: ['apple'], lastSignInAt: null, bannedUntil: '2126-01-01T00:00:00Z' } })
  })
  it('404 / user_not_found → missing', async () => {
    getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found', message: 'User not found' } })
    expect(await supabaseAuthAdmin().getUser('a')).toEqual({ status: 'missing' })
  })
  it('any other error, a lost response or a throw → error', async () => {
    getUserById.mockResolvedValueOnce({ data: { user: null }, error: { status: 500, message: 'boom' } })
    expect((await supabaseAuthAdmin().getUser('a')).status).toBe('error')
    getUserById.mockResolvedValueOnce({ data: { user: null }, error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } })
    expect((await supabaseAuthAdmin().getUser('a')).status).toBe('error')
    getUserById.mockRejectedValueOnce(new Error('socket hang up'))
    expect((await supabaseAuthAdmin().getUser('a')).status).toBe('error')
    getUserById.mockResolvedValueOnce({ data: { user: null }, error: null })
    expect((await supabaseAuthAdmin().getUser('a')).status).toBe('error')
  })
  it('a hanging call times out as an error', async () => {
    vi.useFakeTimers()
    getUserById.mockReturnValue(new Promise(() => {}))
    const p = supabaseAuthAdmin().getUser('a')
    await vi.advanceTimersByTimeAsync(10_001)
    expect((await p).status).toBe('error')
  })
  it('updateUser never throws', async () => {
    updateUserById.mockRejectedValueOnce(new Error('net'))
    expect(await supabaseAuthAdmin().updateUser('a', { ban_duration: 'none' })).toEqual({ error: 'net' })
  })
  it('isUserNotFound', () => {
    expect(isUserNotFound({ status: 404 })).toBe(true)
    expect(isUserNotFound({ code: 'user_not_found' })).toBe(true)
    expect(isUserNotFound({ status: 0 })).toBe(false)
    expect(isUserNotFound(null)).toBe(false)
  })
})

describe('resolveSurvivingUserId', () => {
  const db = (map: Record<string, string>) => ({
    accountMerge: { findFirst: vi.fn(async ({ where }: any) => (map[where.mergedUserId] ? { keptUserId: map[where.mergedUserId] } : null)) },
  }) as any
  it('returns the id itself when it was never merged', async () => {
    expect(await resolveSurvivingUserId('u', db({}))).toBe('u')
  })
  it('follows a chain of merges', async () => {
    expect(await resolveSurvivingUserId('a', db({ a: 'b', b: 'c' }))).toBe('c')
  })
  it('stops on a cycle instead of looping', async () => {
    expect(['a', 'b']).toContain(await resolveSurvivingUserId('a', db({ a: 'b', b: 'a' })))
  })
})
