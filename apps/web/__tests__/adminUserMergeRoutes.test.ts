/**
 * /api/admin/users/merge and /api/admin/users/duplicates expose and rewrite
 * cross-school accounts: superadmin only, password re-check before merging,
 * and a wrong password must not answer 401 (adminFetch would log the admin out).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const guardSuperadmin = vi.fn()
const guardSuperadminUser = vi.fn()
vi.mock('@/lib/auth/server', () => ({ guardSuperadmin, guardSuperadminUser }))

const buildMergePreview = vi.fn()
const findDuplicateCandidates = vi.fn(async () => [])
const runTx = vi.fn()
vi.mock('@/lib/accountMergeServer', () => ({
  buildMergePreview,
  findDuplicateCandidates,
  supabaseAuthAdmin: () => ({}),
  prismaMergeDeps: () => ({ runTx }),
}))

const runAccountMerge = vi.fn()
vi.mock('@/lib/accountMerge', async orig => ({ ...(await orig<object>()), runAccountMerge }))

const signInWithPassword = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { signInWithPassword } }) }))

const merge = await import('@/app/api/admin/users/merge/route')
const dupes = await import('@/app/api/admin/users/duplicates/route')

const DENY = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
const req = (url: string, body?: object) =>
  new NextRequest(`http://localhost${url}`, body ? { method: 'POST', body: JSON.stringify(body) } : undefined)
const VALID = { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep', password: 'pw' }

beforeEach(() => vi.clearAllMocks())

describe('guards', () => {
  it('preview, duplicates and merge reject non-superadmins without doing anything', async () => {
    guardSuperadmin.mockResolvedValue(DENY)
    guardSuperadminUser.mockResolvedValue(DENY)
    expect((await merge.GET(req('/api/admin/users/merge?keepId=K&mergeId=S'))).status).toBe(403)
    expect((await dupes.GET(req('/api/admin/users/duplicates'))).status).toBe(403)
    expect((await merge.POST(req('/api/admin/users/merge', VALID))).status).toBe(403)
    expect(buildMergePreview).not.toHaveBeenCalled()
    expect(findDuplicateCandidates).not.toHaveBeenCalled()
    expect(runAccountMerge).not.toHaveBeenCalled()
  })
})

describe('GET preview', () => {
  beforeEach(() => guardSuperadmin.mockResolvedValue(null))
  it('requires both ids and passes only valid sides through', async () => {
    expect((await merge.GET(req('/api/admin/users/merge?keepId=K'))).status).toBe(400)
    buildMergePreview.mockResolvedValue({ choice: {} })
    await merge.GET(req('/api/admin/users/merge?keepId=K&mergeId=S&loginFrom=evil&emailFrom=merge&suggest=1'))
    expect(buildMergePreview).toHaveBeenCalledWith({}, { keepId: 'K', mergeId: 'S', loginFrom: undefined, emailFrom: 'merge', suggest: true })
  })
  it('404s for an unknown account', async () => {
    buildMergePreview.mockResolvedValue(null)
    expect((await merge.GET(req('/api/admin/users/merge?keepId=K&mergeId=S'))).status).toBe(404)
  })
})

describe('POST merge', () => {
  beforeEach(() => guardSuperadminUser.mockResolvedValue({ id: 'admin', email: 'admin@x.com' }))

  it('rejects a malformed body and a missing password', async () => {
    expect((await merge.POST(req('/api/admin/users/merge', { ...VALID, loginFrom: 'both' }))).status).toBe(400)
    expect((await merge.POST(req('/api/admin/users/merge', { ...VALID, password: '' }))).status).toBe(400)
    expect(runAccountMerge).not.toHaveBeenCalled()
  })

  it('answers a wrong password with 403 and merges nothing', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const res = await merge.POST(req('/api/admin/users/merge', VALID))
    expect(res.status).toBe(403)
    expect(runAccountMerge).not.toHaveBeenCalled()
  })

  it('merges as the signed-in admin once the password checks out', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    runAccountMerge.mockResolvedValue({ ok: true, moved: {}, keptEmail: 'a@b.c', disabledAuth: [] })
    const res = await merge.POST(req('/api/admin/users/merge', VALID))
    expect(res.status).toBe(200)
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'admin@x.com', password: 'pw' })
    expect(runAccountMerge).toHaveBeenCalledWith({ runTx }, { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep' }, 'admin')
  })

  it('passes blockers through with their status', async () => {
    signInWithPassword.mockResolvedValue({ error: null })
    runAccountMerge.mockResolvedValue({ ok: false, status: 409, error: 'Super Admin accounts can’t be merged.' })
    const res = await merge.POST(req('/api/admin/users/merge', VALID))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/Super Admin/)
  })
})
