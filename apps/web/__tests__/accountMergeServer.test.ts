/* eslint-disable @typescript-eslint/no-explicit-any -- fake Prisma/Supabase clients */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const getUserById = vi.fn()
const updateUserById = vi.fn()
const createClient = vi.fn((...args: unknown[]) => args && ({ auth: { admin: { getUserById, updateUserById } } }))
vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: unknown[]) => createClient(...a) }))

let mergeMap: Record<string, string> = {}
const claimQuery = vi.fn()
const claimFindUnique = vi.fn()
const pinFindMany = vi.fn()
const pinCreateMany = vi.fn()
const pinDeleteMany = vi.fn()
vi.mock('@/lib/db', () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) => fn({ $queryRaw: claimQuery, accountMergeClaim: { findUnique: claimFindUnique } }),
    accountMergeAuthPin: { findMany: pinFindMany, createMany: pinCreateMany, deleteMany: pinDeleteMany },
    accountMerge: { findFirst: vi.fn(async ({ where }: any) => (mergeMap[where.mergedUserId] ? { keptUserId: mergeMap[where.mergedUserId] } : null)) },
    user: { findMany: vi.fn(async ({ where }: any) => where.id.in.map((id: string) => ({ id, name: `Name ${id}`, email: `${id}@x.com` }))) },
  },
}))

const { supabaseAuthAdmin, isUserNotFound, isUncertainWriteError, abortingFetch, prismaClaimStore, prismaPinStore, resolveMergedPair } = await import('@/lib/accountMergeServer')
const { resolveSurvivingUserId, lockSurvivingUser } = await import('@/lib/mergedUsers')

beforeEach(() => vi.clearAllMocks())
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('supabaseAuthAdmin reads — only a confirmed "not found" counts as missing', () => {
  it('maps a found user, including the ban', async () => {
    getUserById.mockResolvedValue({ data: { user: { id: 'a', email: 'a@x.com', identities: [{ provider: 'apple' }], last_sign_in_at: null, banned_until: '2126-01-01T00:00:00Z' } }, error: null })
    expect(await supabaseAuthAdmin().getUser('a')).toEqual({ status: 'found', user: { id: 'a', email: 'a@x.com', providers: ['apple'], lastSignInAt: null, bannedUntil: '2126-01-01T00:00:00Z' } })
  })
  it('404 / user_not_found → missing', async () => {
    getUserById.mockResolvedValue({ data: { user: null }, error: { status: 404, code: 'user_not_found', message: 'User not found' } })
    expect(await supabaseAuthAdmin().getUser('a')).toEqual({ status: 'missing' })
  })
  it('any other error, a lost response, an empty answer or a throw → error', async () => {
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
  it('isUserNotFound', () => {
    expect(isUserNotFound({ status: 404 })).toBe(true)
    expect(isUserNotFound({ code: 'user_not_found' })).toBe(true)
    expect(isUserNotFound({ status: 0 })).toBe(false)
    expect(isUserNotFound(null)).toBe(false)
  })
})

describe('supabaseAuthAdmin writes — whether a failed write may still land later', () => {
  it('a definite 4xx refusal is not uncertain; network errors, 5xx, 408/429, throws and timeouts are', async () => {
    updateUserById.mockResolvedValueOnce({ error: { status: 422, message: 'Email address already registered' } })
    expect(await supabaseAuthAdmin().updateUser('a', { email: 'b@x.com' })).toEqual({ error: 'Email address already registered', uncertain: false })
    updateUserById.mockResolvedValueOnce({ error: { status: 503, message: 'unavailable' } })
    expect((await supabaseAuthAdmin().updateUser('a', {})).uncertain).toBe(true)
    updateUserById.mockResolvedValueOnce({ error: { name: 'AuthRetryableFetchError', status: 0, message: 'fetch failed' } })
    expect((await supabaseAuthAdmin().updateUser('a', {})).uncertain).toBe(true)
    updateUserById.mockRejectedValueOnce(new Error('net'))
    expect(await supabaseAuthAdmin().updateUser('a', {})).toEqual({ error: 'net', uncertain: true })
    updateUserById.mockResolvedValueOnce({ error: null })
    expect(await supabaseAuthAdmin().updateUser('a', {})).toEqual({ error: null, uncertain: false })
  })
  it('isUncertainWriteError', () => {
    expect(isUncertainWriteError({ status: 400 })).toBe(false)
    expect(isUncertainWriteError({ status: 408 })).toBe(true)
    expect(isUncertainWriteError({ status: 429 })).toBe(true)
    expect(isUncertainWriteError({ status: 400, name: 'AuthRetryableFetchError' })).toBe(true)
    expect(isUncertainWriteError({})).toBe(true)
  })
})

describe('abortingFetch — Auth requests are aborted, not just abandoned', () => {
  it('the merge client is built with it', () => {
    supabaseAuthAdmin()
    expect(createClient.mock.calls[0]![2]).toMatchObject({ global: { fetch: abortingFetch } })
  })
  it('every request carries an abort signal, combined with the caller’s', async () => {
    const seen: AbortSignal[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init: RequestInit) => { seen.push(init.signal!); return new Response('{}') }))
    await abortingFetch('https://x', {})
    expect(seen[0]).toBeInstanceOf(AbortSignal)
    const caller = new AbortController()
    await abortingFetch('https://x', { signal: caller.signal })
    expect(seen[1]!.aborted).toBe(false)
    caller.abort()
    expect(seen[1]!.aborted).toBe(true)
  })
})

describe('prismaClaimStore.acquire', () => {
  it('takes every claim when none is live', async () => {
    claimQuery.mockResolvedValue([{ userId: 'x' }])
    expect(await prismaClaimStore.acquire(['S', 'K'], 'a1', new Date())).toEqual({ ok: true })
    // fixed order (sorted) so two acquirers can't deadlock
    expect(claimQuery.mock.calls.map(c => c[1])).toEqual(['K', 'S'])
  })
  it('reports busy (and the transaction rolls back) when one claim is still live', async () => {
    const until = new Date('2026-11-10T12:05:00Z')
    claimQuery.mockResolvedValueOnce([{ userId: 'K' }]).mockResolvedValueOnce([])
    claimFindUnique.mockResolvedValue({ holdUntil: until })
    expect(await prismaClaimStore.acquire(['K', 'S'], 'a1', new Date())).toEqual({ ok: false, holdUntil: until })
  })
})

describe('resolveSurvivingUserId / lockSurvivingUser', () => {
  const db = (map: Record<string, string>, deleted: string[] = Object.keys(map)) => ({
    accountMerge: { findFirst: vi.fn(async ({ where }: any) => (map[where.mergedUserId] ? { keptUserId: map[where.mergedUserId] } : null)) },
    $queryRaw: vi.fn(async (_s: TemplateStringsArray, id: string) => [{ deletedAt: deleted.includes(id) ? new Date() : null }]),
  }) as any
  it('returns the id itself when it was never merged', async () => {
    expect(await resolveSurvivingUserId('u', db({}))).toBe('u')
    expect(await lockSurvivingUser(db({}), 'u')).toBe('u')
  })
  it('follows a chain of merges, locking each row on the way', async () => {
    const d = db({ a: 'b', b: 'c' })
    expect(await resolveSurvivingUserId('a', d)).toBe('c')
    expect(await lockSurvivingUser(d, 'a')).toBe('c')
    expect(d.$queryRaw.mock.calls.map((c: any[]) => c[1])).toEqual(['a', 'b', 'c'])
  })
  it('a row deleted by a merge (FOR SHARE finds nothing) leads to the survivor', async () => {
    const d = {
      accountMerge: { findFirst: vi.fn(async ({ where }: any) => (where.mergedUserId === 'S' ? { keptUserId: 'K' } : null)) },
      $queryRaw: vi.fn(async (_s: TemplateStringsArray, id: string) => (id === 'S' ? [] : [{ deletedAt: null }])),
    } as any
    expect(await lockSurvivingUser(d, 'S')).toBe('K')
  })
  it('a missing row with no merge is returned as is (the write then fails on its foreign key)', async () => {
    const d = { accountMerge: { findFirst: vi.fn(async () => null) }, $queryRaw: vi.fn(async () => []) } as any
    expect(await lockSurvivingUser(d, 'gone')).toBe('gone')
  })
  it('a self-deleted (not merged) account stays as it is', async () => {
    expect(await lockSurvivingUser(db({}, ['u']), 'u')).toBe('u')
  })
  it('stops on a cycle instead of looping', async () => {
    expect(['a', 'b']).toContain(await resolveSurvivingUserId('a', db({ a: 'b', b: 'a' })))
    expect(['a', 'b']).toContain(await lockSurvivingUser(db({ a: 'b', b: 'a' }), 'a'))
  })
})

describe('prismaPinStore', () => {
  it('put never overwrites an existing pin (skipDuplicates); remove only deletes this attempt’s', async () => {
    await prismaPinStore.put({ authId: 'a', attemptId: 't1', intent: 'KEEP', email: 'x@y.com' })
    expect(pinCreateMany).toHaveBeenCalledWith({ data: [{ authId: 'a', attemptId: 't1', intent: 'KEEP', email: 'x@y.com' }], skipDuplicates: true })
    await prismaPinStore.remove('a', 't1')
    expect(pinDeleteMany).toHaveBeenCalledWith({ where: { authId: 'a', attemptId: 't1' } })
  })
  it('get maps rows back to intents', async () => {
    pinFindMany.mockResolvedValue([{ authId: 'a', attemptId: 't1', intent: 'RETIRE', email: '' }, { authId: 'b', attemptId: 't2', intent: 'KEEP', email: 'b@x.com' }])
    expect(await prismaPinStore.get(['a', 'b'])).toEqual([
      { authId: 'a', attemptId: 't1', intent: 'RETIRE' },
      { authId: 'b', attemptId: 't2', intent: 'KEEP', email: 'b@x.com' },
    ])
    expect(await prismaPinStore.get([])).toEqual([])
  })
})

describe('resolveMergedPair', () => {
  it('both ids in the same account → same', async () => {
    mergeMap = { S: 'K' }
    expect(await resolveMergedPair('K', 'S')).toEqual({ status: 'same', survivorId: 'K' })
    mergeMap = { S: 'K', K: 'Z' }
    expect(await resolveMergedPair('K', 'S')).toEqual({ status: 'same', survivorId: 'Z' })
  })
  it('S went into another account C while K is independent → elsewhere, with the destination', async () => {
    mergeMap = { S: 'C' }
    expect(await resolveMergedPair('K', 'S')).toEqual({
      status: 'elsewhere',
      moves: [{ fromId: 'S', intoId: 'C', intoName: 'Name C', intoEmail: 'C@x.com' }],
    })
  })
  it('neither id was merged → null', async () => {
    mergeMap = {}
    expect(await resolveMergedPair('K', 'S')).toBeNull()
  })
})
