import { describe, it, expect } from 'vitest'
import {
  combineMembers, combineProfile, defaultSides, suggestDefaults, mergeBlockers, mergeWarnings,
  runAccountMerge, mergedPlaceholderEmail, isRelayEmail, pickContentAccess, pickWaiver, combineLessonViews,
  type MemberFields, type ProfileFields, type SideSummary, type MergeDeps, type AuthAdmin, type AuthUser, type MergeTxInput,
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

  it('with equal status takes the higher role together with its custom role id, and joins distinct notes', () => {
    const out = combineMembers(member({ status: 'ACTIVE', notes: 'a' }), member({ status: 'ACTIVE', role: 'INSTRUCTOR', notes: 'b' }))
    expect(out).toMatchObject({ role: 'INSTRUCTOR', status: 'ACTIVE' })
    expect(out.notes).toBe('a\nb')
    expect(combineMembers(member({ notes: 'same' }), member({ notes: 'same' })).notes).toBe('same')
  })

  // Role and status come from the same row: a revoked staff role must never
  // ride on the other row's ACTIVE status.
  it.each([
    ['INACTIVE', 'OWNER'], ['ARCHIVED', 'ADMIN'], ['PENDING', 'MANAGER'], ['FROZEN', 'INSTRUCTOR'],
  ])('does not reactivate a %s %s next to an ACTIVE student (either side)', (status, role) => {
    const revoked = member({ status, role })
    const student = member({ status: 'ACTIVE', role: 'STUDENT' })
    expect(combineMembers(revoked, student)).toMatchObject({ role: 'STUDENT', status: 'ACTIVE', customRoleId: null })
    expect(combineMembers(student, revoked)).toMatchObject({ role: 'STUDENT', status: 'ACTIVE', customRoleId: null })
  })

  it('keeps a revoked CUSTOM role out, and carries an active one with its customRoleId', () => {
    const custom = (status: string) => member({ status, role: 'CUSTOM', customRoleId: 'role-front-desk' })
    expect(combineMembers(custom('INACTIVE'), member({ status: 'ACTIVE' }))).toMatchObject({ role: 'STUDENT', customRoleId: null })
    expect(combineMembers(member({ status: 'ACTIVE' }), custom('ACTIVE'))).toMatchObject({ role: 'CUSTOM', customRoleId: 'role-front-desk', status: 'ACTIVE' })
  })

  it('keeps an owner who is ACTIVE on its own row', () => {
    expect(combineMembers(member({ status: 'ACTIVE' }), member({ status: 'ACTIVE', role: 'OWNER' }))).toMatchObject({ role: 'OWNER', status: 'ACTIVE' })
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

describe('pickContentAccess', () => {
  const now = new Date('2026-11-10')
  const access = (o: Partial<{ isActive: boolean; revokedAt: Date | null; endDate: Date | null }> = {}) =>
    ({ isActive: true, revokedAt: null, endDate: null, ...o })
  it('a live grant beats a revoked or expired one, whichever account has it', () => {
    expect(pickContentAccess(access({ isActive: false, revokedAt: new Date('2026-09-01') }), access(), now)).toBe('merge')
    expect(pickContentAccess(access({ endDate: new Date('2026-10-01') }), access(), now)).toBe('merge')
    expect(pickContentAccess(access(), access({ revokedAt: new Date('2026-09-01') }), now)).toBe('keep')
  })
  it('between two live grants keeps the longer one (no end date = open-ended); tie → keep', () => {
    expect(pickContentAccess(access({ endDate: new Date('2026-12-01') }), access({ endDate: new Date('2027-01-01') }), now)).toBe('merge')
    expect(pickContentAccess(access({ endDate: new Date('2027-01-01') }), access(), now)).toBe('merge')
    expect(pickContentAccess(access(), access(), now)).toBe('keep')
  })
})

describe('pickWaiver / combineLessonViews', () => {
  it('never lets a signed waiver be the one deleted', () => {
    expect(pickWaiver({ signedAt: null }, { signedAt: new Date() })).toBe('merge')
    expect(pickWaiver({ signedAt: new Date() }, { signedAt: null })).toBe('keep')
    expect(pickWaiver({ signedAt: null }, { signedAt: null })).toBe('keep')
    expect(pickWaiver({ signedAt: new Date() }, { signedAt: new Date() })).toBe('conflict')
  })
  it('adds lesson views together', () => {
    const out = combineLessonViews(
      { viewCount: 2, firstViewedAt: new Date('2026-09-01'), lastViewedAt: new Date('2026-09-10') },
      { viewCount: 3, firstViewedAt: new Date('2026-08-01'), lastViewedAt: new Date('2026-09-05') },
    )
    expect(out).toEqual({ viewCount: 5, firstViewedAt: new Date('2026-08-01'), lastViewedAt: new Date('2026-09-10') })
  })
  it('blocks a merge when both accounts signed the same waiver', () => {
    expect(mergeBlockers(side({ id: 'k' }), side({ id: 'm' }), { loginFrom: 'keep' }, { signedWaiverConflicts: 1 })[0]).toMatch(/signed the same waiver/)
  })
})

// ── Orchestration: a fake Supabase Auth and a fake locked database ─────────────

const FUTURE = '2126-01-01T00:00:00Z'

function harness(o: {
  keep?: Partial<SideSummary>
  merge?: Partial<SideSummary>
  // Return a value to override the auth call; undefined = normal behaviour
  getUser?: (id: string, n: number) => ReturnType<AuthAdmin['getUser']> | undefined
  updateUser?: (id: string, attrs: Record<string, unknown>) => { apply: boolean; error: string | null } | undefined
  failDb?: boolean
} = {}) {
  const authUsers: Record<string, AuthUser> = {
    'auth-h': { id: 'auth-h', email: 'manuel@hotmail.com', providers: ['email'], lastSignInAt: null, bannedUntil: null },
    'auth-r': { id: 'auth-r', email: 'x@privaterelay.appleid.com', providers: ['apple'], lastSignInAt: null, bannedUntil: null },
  }
  const rows: Record<string, SideSummary> = {
    K: side({ id: 'K', email: 'manuel@hotmail.com', supabaseAuthId: 'auth-h', ...o.keep }),
    S: side({ id: 'S', email: 'x@privaterelay.appleid.com', supabaseAuthId: 'auth-r', ...o.merge }),
  }
  const calls: string[] = []
  const reads: Record<string, number> = {}
  const auth: AuthAdmin = {
    async getUser(id) {
      reads[id] = (reads[id] ?? 0) + 1
      const forced = o.getUser?.(id, reads[id]!)
      if (forced) return forced
      const u = authUsers[id]
      return u ? { status: 'found', user: { ...u } } : { status: 'missing' }
    },
    async updateUser(id, attrs) {
      const forced = o.updateUser?.(id, attrs) ?? { apply: true, error: null }
      calls.push(`update ${id} ${JSON.stringify(attrs)}`)
      if (forced.apply && authUsers[id]) {
        const u = authUsers[id]!
        if (typeof attrs.email === 'string') u.email = attrs.email
        if (attrs.ban_duration === 'none') u.bannedUntil = null
        else if (attrs.ban_duration) u.bannedUntil = FUTURE
      }
      return { error: forced.error }
    },
  }
  // One lock for the pair, like SELECT … FOR UPDATE: callers queue up.
  let lock = Promise.resolve()
  const applied: MergeTxInput[] = []
  const deps: MergeDeps = {
    auth,
    async withLockedPair(_k, _m, fn) {
      const prev = lock
      let release!: () => void
      lock = new Promise(r => { release = r })
      await prev
      try {
        // Snapshot = rollback on failure
        const snapshot = JSON.parse(JSON.stringify(rows))
        try {
          return await fn({
            load: async id => (rows[id] ? { ...rows[id]!, createdAt: new Date(rows[id]!.createdAt), deletedAt: rows[id]!.deletedAt ? new Date(rows[id]!.deletedAt!) : null } : null),
            signedWaiverConflicts: async () => 0,
            applyDb: async input => {
              if (o.failDb) throw new Error('db down')
              calls.push('tx')
              applied.push(input)
              rows[input.mergeId]!.deletedAt = new Date()
              rows[input.mergeId]!.supabaseAuthId = null
              rows[input.keepId]!.supabaseAuthId = input.keptAuthId
              return { bookings: 17 }
            },
          })
        } catch (e) {
          Object.assign(rows, snapshot)
          throw e
        }
      } finally {
        release()
      }
    },
  }
  return { deps, calls, authUsers, rows, applied }
}

const KEEP_RELAY_LOGIN = { keepId: 'K', mergeId: 'S', loginFrom: 'merge', emailFrom: 'keep' } as const

describe('runAccountMerge', () => {
  it('disables the other login, gives the kept login the real email, then writes the database', async () => {
    const { deps, calls, authUsers, applied } = harness()
    const r = await runAccountMerge(deps, KEEP_RELAY_LOGIN, 'admin')
    expect(r).toEqual({ ok: true, moved: { bookings: 17 }, keptEmail: 'manuel@hotmail.com', disabledAuth: [{ id: 'auth-h', email: 'manuel@hotmail.com' }] })
    expect(calls).toEqual([
      `update auth-h ${JSON.stringify({ email: mergedPlaceholderEmail('K'), email_confirm: true, ban_duration: '876000h' })}`,
      `update auth-r ${JSON.stringify({ email: 'manuel@hotmail.com', email_confirm: true, ban_duration: 'none' })}`,
      'tx',
    ])
    expect(authUsers['auth-r']).toMatchObject({ email: 'manuel@hotmail.com', bannedUntil: null })
    expect(authUsers['auth-h']).toMatchObject({ email: mergedPlaceholderEmail('K'), bannedUntil: FUTURE })
    expect(applied[0]).toMatchObject({ keptAuthId: 'auth-r', actorId: 'admin' })
  })

  it('two concurrent merges of the same pair with opposite logins: one wins, the other is refused, one login stays usable', async () => {
    const { deps, authUsers } = harness()
    const [a, b] = await Promise.all([
      runAccountMerge(deps, KEEP_RELAY_LOGIN, null),
      runAccountMerge(deps, { ...KEEP_RELAY_LOGIN, loginFrom: 'keep' }, null),
    ])
    expect(a.ok).toBe(true)
    expect(b).toMatchObject({ ok: false, status: 409 })
    expect(authUsers['auth-r']!.bannedUntil).toBeNull() // the winner's login still works
  })

  it('a later attempt that keeps the other login repairs a half-done earlier one (unbans it)', async () => {
    // First attempt (keep the relay login) bans hotmail, then the database fails.
    const { deps, authUsers, rows } = harness({ failDb: true })
    await expect(runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).rejects.toThrow('db down')
    expect(authUsers['auth-h']!.bannedUntil).toBe(FUTURE)
    expect(rows.S!.deletedAt).toBeNull() // rolled back

    // Admin changes their mind and keeps the hotmail login instead.
    const ok = harness()
    Object.assign(ok.authUsers, authUsers)
    const r = await runAccountMerge(ok.deps, { ...KEEP_RELAY_LOGIN, loginFrom: 'keep' }, null)
    expect(r.ok).toBe(true)
    expect(ok.authUsers['auth-h']!.bannedUntil).toBeNull()
    expect(ok.authUsers['auth-h']!.email).toBe('manuel@hotmail.com')
    expect(ok.authUsers['auth-r']!.bannedUntil).toBe(FUTURE)
  })

  it.each([
    ['an error', { status: 'error', message: 'fetch failed' }],
  ] as const)('stops before changing anything when reading the other login returns %s', async (_label, answer) => {
    const { deps, calls } = harness({ getUser: id => (id === 'auth-h' ? Promise.resolve(answer) : undefined) })
    const r = await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)
    expect(r).toMatchObject({ ok: false, status: 503 })
    expect(calls).toEqual([])
  })

  it('does not finish when the ban answer is lost and the read-back can’t confirm it', async () => {
    const { deps, calls } = harness({
      updateUser: id => (id === 'auth-h' ? { apply: false, error: 'AuthRetryableFetchError' } : undefined),
    })
    const r = await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)
    expect(r).toMatchObject({ ok: false, status: 502 })
    expect(calls).not.toContain('tx')
  })

  it('does not finish when the read-back after the ban fails', async () => {
    const { deps, calls } = harness({ getUser: (id, n) => (id === 'auth-h' && n === 2 ? Promise.resolve({ status: 'error', message: 'timeout' }) : undefined) })
    expect(await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).toMatchObject({ ok: false, status: 502 })
    expect(calls).not.toContain('tx')
  })

  it('accepts a ban whose answer was lost but which the read-back shows applied', async () => {
    const { deps } = harness({ updateUser: id => (id === 'auth-h' ? { apply: true, error: 'AuthRetryableFetchError' } : undefined) })
    expect((await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).ok).toBe(true)
  })

  it('stops before the database if the kept login can’t be confirmed with the kept email', async () => {
    const { deps, calls } = harness({ updateUser: (id, a) => (id === 'auth-r' && 'email' in a ? { apply: false, error: 'email taken' } : undefined) })
    expect(await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).toMatchObject({ ok: false, status: 502 })
    expect(calls).not.toContain('tx')
  })

  it('a rerun after a half-done attempt completes and logs the unknown original email as null', async () => {
    let fail = true
    const { deps } = harness({ updateUser: (id, a) => (fail && id === 'auth-r' && 'email' in a ? { apply: false, error: 'x' } : undefined) })
    expect((await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).ok).toBe(false)
    fail = false
    const again = await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)
    expect(again.ok && again.disabledAuth).toEqual([{ id: 'auth-h', email: null }])
  })

  it('a login Supabase confirms is already gone needs no ban', async () => {
    const { deps, calls } = harness({ getUser: id => (id === 'auth-h' ? Promise.resolve({ status: 'missing' }) : undefined) })
    const r = await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)
    expect(r.ok && r.disabledAuth).toEqual([{ id: 'auth-h', email: null }])
    expect(calls.some(c => c.startsWith('update auth-h'))).toBe(false)
  })

  it('refuses when the chosen login no longer exists', async () => {
    const { deps, calls } = harness({ getUser: id => (id === 'auth-r' ? Promise.resolve({ status: 'missing' }) : undefined) })
    expect(await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).toMatchObject({ ok: false, status: 409 })
    expect(calls).toEqual([])
  })

  it('skips the kept login update when it already has the kept email and isn’t banned', async () => {
    const { deps, calls } = harness()
    await runAccountMerge(deps, { keepId: 'K', mergeId: 'S', loginFrom: 'keep', emailFrom: 'keep' }, null)
    expect(calls).toEqual([`update auth-r ${JSON.stringify({ email: mergedPlaceholderEmail('S'), email_confirm: true, ban_duration: '876000h' })}`, 'tx'])
  })

  it('touches no login when neither account has one (V1 imports)', async () => {
    const { deps, calls } = harness({ keep: { supabaseAuthId: null }, merge: { supabaseAuthId: null } })
    expect((await runAccountMerge(deps, { ...KEEP_RELAY_LOGIN, loginFrom: 'keep' }, null)).ok).toBe(true)
    expect(calls).toEqual(['tx'])
  })

  it('refuses a blocked pair without calling Auth', async () => {
    const { deps, calls } = harness({ merge: { role: 'SUPERADMIN' } })
    expect(await runAccountMerge(deps, KEEP_RELAY_LOGIN, null)).toMatchObject({ ok: false, status: 409 })
    expect(calls).toEqual([])
  })
})
