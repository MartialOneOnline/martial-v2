/**
 * Project Audit re-audit 5: self-delete (DELETE /api/my/account) racing an
 * account merge. The route claims the user (shared with the merge tool,
 * lib/authPins.ts) and re-checks users.supabaseAuthId under that claim, so it
 * can never delete one login and unlink another; and the real resolveDbUser()
 * must not provision a new User for the kept login afterwards.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthPin, ClaimStore, PinStore } from '@/lib/accountMerge'

// ── in-memory users table ──
type Row = { id: string; email: string; supabaseAuthId: string | null; deletedAt: Date | null; name: string | null; role: string }
let users: Row[]
const match = (r: Row, where: Record<string, unknown>) => Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v)
const pick = (r: Row | undefined) => (r ? { ...r } : null)
const prismaUser = {
  findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => pick(users.find(r => match(r, where)))),
  update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => { const r = users.find(x => x.id === where.id)!; Object.assign(r, data); return { ...r } }),
  updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Partial<Row> }) => { const rs = users.filter(r => match(r, where)); rs.forEach(r => Object.assign(r, data)); return { count: rs.length } }),
  create: vi.fn(async ({ data }: { data: Partial<Row> }) => { const r = { id: `new-${users.length}`, deletedAt: null, name: null, role: 'STUDENT', supabaseAuthId: null, email: '', ...data } as Row; users.push(r); return { ...r } }),
}
vi.mock('@/lib/db', () => ({
  prisma: {
    user: prismaUser,
    $transaction: async (fn: (tx: unknown) => unknown) => fn({ user: prismaUser, lead: { updateMany: async () => ({ count: 0 }) } }),
  },
}))

// ── claims/pins shared with "the merge" ──
const claimRows: Record<string, { attemptId: string; holdUntil: number }> = {}
let onClaim: ((ids: string[]) => void) | null = null
const claims: ClaimStore = {
  async acquire(ids, attemptId, holdUntil) {
    const hook = onClaim
    onClaim = null
    hook?.(ids) // e.g. a merge committing just before this claim is granted
    if (ids.some(id => claimRows[id] && claimRows[id]!.holdUntil > Date.now())) return { ok: false, holdUntil: new Date(Date.now() + 60_000) }
    for (const id of ids) claimRows[id] = { attemptId, holdUntil: holdUntil.getTime() }
    return { ok: true }
  },
  async release(ids, attemptId) { for (const id of ids) if (claimRows[id]?.attemptId === attemptId) delete claimRows[id] },
}
const pinRows: Record<string, AuthPin> = {}
const pins: PinStore = {
  async get(ids) { return ids.map(id => pinRows[id]).filter((p): p is AuthPin => !!p) },
  async put(p) { pinRows[p.authId] ??= p },
  async remove(a, t) { if (pinRows[a]?.attemptId === t) delete pinRows[a] },
}
vi.mock('@/lib/authPins', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/authPins')>()
  return { ...actual, authWriteGuard: actual.makeAuthWriteGuard(claims, pins) }
})

// ── Supabase: the session's login, and the admin API ──
let sessionAuthId = 'auth-k'
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: { id: sessionAuthId } } }) } }) }))
vi.mock('next/headers', () => ({ cookies: () => ({ getAll: () => [] }) }))
const deleteUser = vi.fn(async (id: string) => ({ error: id ? null : null }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { deleteUser, updateUserById: vi.fn(async () => ({ error: null })) } },
    storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) },
  }),
}))

const { DELETE } = await import('@/app/api/my/account/route')
const { resolveDbUser } = await import('@/lib/auth/server')

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of Object.keys(claimRows)) delete claimRows[k]
  onClaim = null
  sessionAuthId = 'auth-k'
  users = [{ id: 'K', email: 'manuel@hotmail.com', supabaseAuthId: 'auth-k', deletedAt: null, name: 'Manuel', role: 'STUDENT' }]
})

// What a merge that keeps G's Google login does to K (G's row is deleted).
const mergeKeepingGoogleLogin = () => { users.find(r => r.id === 'K')!.supabaseAuthId = 'auth-g' }

describe('self-delete vs. account merge', () => {
  it('a merge that committed just before the claim: nothing deleted, nothing unlinked, and the kept OAuth login still reaches K', async () => {
    onClaim = () => mergeKeepingGoogleLogin()
    const res = await DELETE()
    expect(res.status).toBe(409)
    expect((await res.json()).code).toBe('account_changed')
    expect(deleteUser).not.toHaveBeenCalled()
    expect(users).toHaveLength(1)
    expect(users[0]).toMatchObject({ id: 'K', supabaseAuthId: 'auth-g', deletedAt: null, email: 'manuel@hotmail.com' })

    // Later sign-in with the kept Google login: resolves to K, no new User.
    const resolved = await resolveDbUser({ id: 'auth-g', email: 'manuel@hotmail.com', app_metadata: { provider: 'google' } } as never)
    expect(resolved?.id).toBe('K')
    expect(prismaUser.create).not.toHaveBeenCalled()
  })

  it('a merge running right now holds the user: DELETE is refused', async () => {
    claimRows.K = { attemptId: 'merge', holdUntil: Date.now() + 60_000 }
    expect((await DELETE()).status).toBe(409)
    expect(deleteUser).not.toHaveBeenCalled()
    expect(users[0]!.deletedAt).toBeNull()
  })

  it('a normal delete deletes the session’s login and unlinks only that one', async () => {
    const res = await DELETE()
    expect(res.status).toBe(200)
    expect(deleteUser).toHaveBeenCalledWith('auth-k')
    expect(users[0]).toMatchObject({ supabaseAuthId: null })
    expect(users[0]!.deletedAt).not.toBeNull()
    expect(claimRows).toEqual({})
  })
})
