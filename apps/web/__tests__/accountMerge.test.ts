import { describe, it, expect, vi } from 'vitest'
import {
  combineMembers, combineProfile, defaultSides, suggestDefaults, mergeBlockers, mergeWarnings,
  runAccountMerge, mergedPlaceholderEmail, isRelayEmail,
  type MemberFields, type ProfileFields, type SideSummary, type MergeDeps, type AuthAdmin,
} from '@/lib/accountMerge'

const member = (o: Partial<MemberFields> = {}): MemberFields => ({
  role: 'STUDENT', customRoleId: null, status: 'INACTIVE', joinedAt: null,
  belt: null, beltRankId: null, beltDegree: null, beltDate: null,
  emergencyContact: null, medicalNotes: null, notes: null, ...o,
})

const profile = (o: Partial<ProfileFields> = {}): ProfileFields => ({
  name: null, phone: null, gender: null, dateOfBirth: null, avatarUrl: null,
  guardianName: null, guardianContact: null, guardianConsentAt: null, role: 'STUDENT', schoolId: null, ...o,
})

const side = (o: Partial<SideSummary> = {}): SideSummary => ({
  id: 'u1', name: 'Manuel', email: 'manuel@hotmail.com', phone: null, avatarUrl: null, role: 'STUDENT',
  schoolId: null, deletedAt: null, createdAt: new Date('2026-06-12'), supabaseAuthId: 'auth-1', activity: 0, ...o,
})

describe('combineMembers (same school on both accounts)', () => {
  it('keeps the V1 belt and earliest join date, takes the live status from the new account', () => {
    const keep = member({ status: 'INACTIVE', joinedAt: new Date('2025-01-06'), belt: 'Blanco', beltRankId: 'r1', beltDegree: 3 })
    const merge = member({ status: 'ACTIVE', joinedAt: new Date('2026-09-14'), notes: 'Self-requested' })
    const out = combineMembers(keep, merge)
    expect(out.status).toBe('ACTIVE')
    expect(out.joinedAt).toEqual(new Date('2025-01-06'))
    expect(out).toMatchObject({ belt: 'Blanco', beltRankId: 'r1', beltDegree: 3 })
    expect(out.notes).toBe('Self-requested')
  })

  it('moves the belt as one block from merge when keep has none', () => {
    const out = combineMembers(member({ beltDegree: 2 }), member({ belt: 'Azul', beltRankId: 'r2', beltDegree: 1, beltDate: new Date('2026-01-01') }))
    expect(out).toMatchObject({ belt: 'Azul', beltRankId: 'r2', beltDegree: 1, beltDate: new Date('2026-01-01') })
  })

  it('takes the higher role together with its custom role id, and joins distinct notes', () => {
    const out = combineMembers(member({ role: 'STUDENT', notes: 'a' }), member({ role: 'INSTRUCTOR', customRoleId: null, notes: 'b' }))
    expect(out.role).toBe('INSTRUCTOR')
    expect(out.notes).toBe('a\nb')
    expect(combineMembers(member({ notes: 'same' }), member({ notes: 'same' })).notes).toBe('same')
  })
})

describe('combineProfile', () => {
  it('fills gaps from merge without overwriting keep', () => {
    const out = combineProfile(
      profile({ name: 'Manuel', phone: '669304679' }),
      profile({ name: 'Other', phone: '+34669304679', dateOfBirth: new Date('1978-03-04'), avatarUrl: 'x.jpg' }),
    )
    expect(out).toMatchObject({ name: 'Manuel', phone: '669304679', dateOfBirth: new Date('1978-03-04'), avatarUrl: 'x.jpg' })
  })

  it('keeps staff access when a student row absorbs an owner account', () => {
    const out = combineProfile(profile({ role: 'STUDENT' }), profile({ role: 'SCHOOL_OWNER', schoolId: 's1' }))
    expect(out).toMatchObject({ role: 'SCHOOL_OWNER', schoolId: 's1' })
  })
})

describe('defaults', () => {
  const hotmail = { ...side({ id: 'h', activity: 171, createdAt: new Date('2026-06-12') }), login: { authId: 'a-h', email: 'manuel@hotmail.com', providers: ['email', 'azure'], lastSignInAt: '2026-10-07T00:00:00Z' } }
  const relay = { ...side({ id: 'r', email: 'x@privaterelay.appleid.com', activity: 20, createdAt: new Date('2026-08-13') }), login: { authId: 'a-r', email: 'x@privaterelay.appleid.com', providers: ['apple'], lastSignInAt: '2026-11-06T00:00:00Z' } }

  it('keeps the row with history, the most recently used login, and the real email', () => {
    expect(suggestDefaults(relay, hotmail)).toEqual({ keepId: 'h', mergeId: 'r', loginFrom: 'merge', emailFrom: 'keep' })
  })

  it('prefers the real email even when the relay row is kept', () => {
    expect(defaultSides(relay, hotmail).emailFrom).toBe('merge')
  })

  it('picks the side that has a login when only one does', () => {
    expect(defaultSides({ ...hotmail, login: null }, relay).loginFrom).toBe('merge')
    expect(defaultSides(hotmail, { ...relay, login: null }).loginFrom).toBe('keep')
  })

  it('detects relay addresses', () => {
    expect(isRelayEmail('CW6G9R2JG5@privaterelay.appleid.com')).toBe(true)
    expect(isRelayEmail('a@gmail.com')).toBe(false)
  })
})

describe('mergeBlockers', () => {
  const k = side({ id: 'k' })
  const m = side({ id: 'm', supabaseAuthId: 'auth-2' })
  it('allows a normal pair', () => expect(mergeBlockers(k, m, { loginFrom: 'merge' })).toEqual([]))
  it('blocks missing, identical, deleted and super admin accounts', () => {
    expect(mergeBlockers(null, m, { loginFrom: 'keep' })).toHaveLength(1)
    expect(mergeBlockers(k, side({ id: 'k' }), { loginFrom: 'keep' })).toContain('Pick two different accounts.')
    expect(mergeBlockers(k, side({ id: 'm', deletedAt: new Date() }), { loginFrom: 'keep' })[0]).toMatch(/already deleted/)
    expect(mergeBlockers(k, side({ id: 'm', role: 'SUPERADMIN' }), { loginFrom: 'keep' })[0]).toMatch(/Super Admin/)
  })
  it('blocks staff of two different schools', () => {
    expect(mergeBlockers(side({ id: 'k', schoolId: 'a' }), side({ id: 'm', schoolId: 'b' }), { loginFrom: 'keep' })[0]).toMatch(/different schools/)
  })
  it('blocks choosing a side without a login when the other has one', () => {
    expect(mergeBlockers(side({ id: 'k', supabaseAuthId: null }), m, { loginFrom: 'keep' })[0]).toMatch(/no login/)
    expect(mergeBlockers(side({ id: 'k', supabaseAuthId: null }), side({ id: 'm', supabaseAuthId: null }), { loginFrom: 'keep' })).toEqual([])
  })
})

describe('mergeWarnings', () => {
  const detail = (memberships: { status: string; schoolId: string; schoolName: string }[] = []) =>
    ({ schools: [], counts: {}, memberships: memberships.map((m, i) => ({ id: String(i), planName: 'Mensual', endDate: null, ...m })) }) as never
  const k = { ...side({ id: 'k' }), login: { authId: 'a1', email: 'manuel@hotmail.com', providers: ['email', 'azure'], lastSignInAt: null }, detail: detail([{ status: 'ACTIVE', schoolId: 's', schoolName: 'RGM' }]) }
  const m = { ...side({ id: 'm', email: 'x@privaterelay.appleid.com' }), login: { authId: 'a2', email: 'x@privaterelay.appleid.com', providers: ['apple'], lastSignInAt: null }, detail: detail([{ status: 'ACTIVE', schoolId: 's', schoolName: 'RGM' }]) }

  it('names the login that stops working, double active memberships and self-request leads', () => {
    const w = mergeWarnings(k, m, { keepId: 'k', mergeId: 'm', loginFrom: 'merge', emailFrom: 'keep' }, 1)
    expect(w[0]).toBe('The email + azure login of manuel@hotmail.com will stop working.')
    expect(w.some(x => x.includes('ACTIVE membership at RGM'))).toBe(true)
    expect(w.some(x => x.includes('Join this school'))).toBe(true)
  })

  it('warns when the kept email is a relay and the other is real', () => {
    const w = mergeWarnings(k, m, { keepId: 'k', mergeId: 'm', loginFrom: 'keep', emailFrom: 'merge' }, 0)
    expect(w.some(x => x.includes('Apple relay'))).toBe(true)
  })
})

describe('runAccountMerge (Auth first, then the database)', () => {
  function setup(o: { keep?: Partial<SideSummary>; merge?: Partial<SideSummary>; failUpdate?: (id: string, attrs: object) => string | null } = {}) {
    const users: Record<string, { id: string; email: string | null; providers: string[]; lastSignInAt: string | null }> = {
      'auth-h': { id: 'auth-h', email: 'manuel@hotmail.com', providers: ['email'], lastSignInAt: null },
      'auth-r': { id: 'auth-r', email: 'x@privaterelay.appleid.com', providers: ['apple'], lastSignInAt: null },
    }
    const calls: string[] = []
    const auth: AuthAdmin = {
      getUser: vi.fn(async id => users[id] ?? null),
      updateUser: vi.fn(async (id, attrs) => {
        const err = o.failUpdate?.(id, attrs) ?? null
        calls.push(`update ${id} ${JSON.stringify(attrs)}${err ? ' FAIL' : ''}`)
        if (!err && attrs.email) users[id] = { ...users[id]!, email: attrs.email }
        return { error: err }
      }),
    }
    const rows: Record<string, SideSummary> = {
      K: side({ id: 'K', email: 'manuel@hotmail.com', supabaseAuthId: 'auth-h', ...o.keep }),
      S: side({ id: 'S', email: 'x@privaterelay.appleid.com', supabaseAuthId: 'auth-r', ...o.merge }),
    }
    const runTx = vi.fn(async () => { calls.push('tx'); return { bookings: 17 } })
    const deps: MergeDeps = { auth, load: async id => rows[id] ?? null, runTx }
    return { deps, calls, runTx, users }
  }

  it('disables the other login, gives the kept login the real email, then writes the database', async () => {
    const { deps, calls, runTx, users } = setup()
    const r = await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep' }, 'admin')
    expect(r).toEqual({ ok: true, moved: { bookings: 17 }, keptEmail: 'manuel@hotmail.com', disabledAuth: [{ id: 'auth-h', email: 'manuel@hotmail.com' }] })
    expect(calls).toEqual([
      `update auth-h ${JSON.stringify({ email: mergedPlaceholderEmail('K'), email_confirm: true, ban_duration: '876000h' })}`,
      `update auth-r ${JSON.stringify({ email: 'manuel@hotmail.com', email_confirm: true })}`,
      'tx',
    ])
    expect(users['auth-r']!.email).toBe('manuel@hotmail.com')
    expect(runTx).toHaveBeenCalledWith(expect.objectContaining({ keptAuthId: 'auth-r', actorId: 'admin' }))
  })

  it('stops before the database if the other login cannot be disabled', async () => {
    const { deps, runTx } = setup({ failUpdate: id => (id === 'auth-h' ? 'boom' : null) })
    const r = await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep' }, null)
    expect(r).toMatchObject({ ok: false, status: 502 })
    expect(runTx).not.toHaveBeenCalled()
  })

  it('stops before the database if the kept login’s email cannot change, and a rerun completes', async () => {
    let fail = true
    const { deps, runTx } = setup({ failUpdate: (id, a) => (fail && id === 'auth-r' && 'email' in a ? 'taken' : null) })
    const choice = { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep' } as const
    expect(await runAccountMerge(deps, choice, null)).toMatchObject({ ok: false, status: 502 })
    expect(runTx).not.toHaveBeenCalled()
    fail = false
    const again = await runAccountMerge(deps, choice, null)
    expect(again.ok).toBe(true)
    // The original address isn't known on the rerun — logged as null, not as the placeholder
    expect(again.ok && again.disabledAuth).toEqual([{ id: 'auth-h', email: null }])
  })

  it('skips the email update when the kept login already has the kept email', async () => {
    const { deps, calls } = setup()
    await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'keep', emailFrom: 'keep' }, null)
    expect(calls).toEqual([`update auth-r ${JSON.stringify({ email: mergedPlaceholderEmail('S'), email_confirm: true, ban_duration: '876000h' })}`, 'tx'])
  })

  it('touches no login when neither account has one (V1 imports)', async () => {
    const { deps, calls } = setup({ keep: { supabaseAuthId: null }, merge: { supabaseAuthId: null } })
    const r = await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'keep', emailFrom: 'keep' }, null)
    expect(r.ok).toBe(true)
    expect(calls).toEqual(['tx'])
  })

  it('refuses a blocked pair without calling Auth', async () => {
    const { deps, calls } = setup({ merge: { role: 'SUPERADMIN' } })
    const r = await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'keep', emailFrom: 'keep' }, null)
    expect(r).toMatchObject({ ok: false, status: 409 })
    expect(calls).toEqual([])
  })
})
