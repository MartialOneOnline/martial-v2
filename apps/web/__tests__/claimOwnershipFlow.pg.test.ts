/**
 * Real-PostgreSQL integration tests for the ownership flow (audit follow-up
 * 2026-11-23). The in-memory fake (claimOwnershipFlow.test.ts) cannot prove
 * that row locks, conditional updates and rollbacks behave the same in
 * Postgres — these run the same lib/claims code against a real server.
 *
 * Opt-in and local-only: set CLAIMS_PG_URL to a throwaway database on
 * localhost / 127.0.0.1 with every migration applied
 * (`DIRECT_URL=$CLAIMS_PG_URL npx prisma migrate deploy`). Any other host is
 * refused, so this can never touch Supabase. Resend, Supabase Admin and the
 * session stay simulated — no real emails, no real Auth.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- route bodies are untyped JSON */
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'

const PG_URL = process.env.CLAIMS_PG_URL ?? ''
const isLocal = /^postgres(ql)?:\/\/[^@]*@(localhost|127\.0\.0\.1)(:\d+)?\//.test(PG_URL)
if (PG_URL && !isLocal) throw new Error('CLAIMS_PG_URL must point at a local throwaway database')
if (isLocal) process.env.DATABASE_URL = PG_URL
process.env.CLAIM_INVITE_SECRET = 'test-secret'

const h = vi.hoisted(() => ({
  send: vi.fn<(payload: any, opts?: any) => Promise<any>>(),
}))
vi.mock('@/lib/email/resend', () => ({
  FROM: 'Martial <notifications@martialapp.com>',
  APP_URL: 'https://app.test',
  getResend: () => ({ emails: { send: h.send } }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ auth: { admin: { generateLink: async () => ({ data: {}, error: null }) } } }) }))

const d = isLocal ? describe : describe.skip

d('ownership flow on real PostgreSQL', () => {
  let prisma: typeof import('@/lib/db').prisma
  let L: {
    submit: typeof import('@/lib/claims/requests').submitClaimRequest
    link: typeof import('@/lib/claims/requests').linkSchool
    reject: typeof import('@/lib/claims/requests').rejectRequest
    prepare: typeof import('@/lib/claims/invitations').prepareInvitation
    deliver: typeof import('@/lib/claims/invitations').deliverInvitation
    accept: typeof import('@/lib/claims/accept').acceptInvitation
    token: typeof import('@/lib/claims/token').deriveInvitationToken
    counts: typeof import('@/lib/claims/queue').claimQueueCounts
    list: typeof import('@/lib/claims/adminViews').listClaimRequests
  }
  let adminId = ''
  let seq = 0
  const uniq = () => `${Date.now().toString(36)}${++seq}`

  beforeAll(async () => {
    prisma = (await import('@/lib/db')).prisma
    const req = await import('@/lib/claims/requests')
    const inv = await import('@/lib/claims/invitations')
    L = {
      submit: req.submitClaimRequest, link: req.linkSchool, reject: req.rejectRequest, prepare: inv.prepareInvitation, deliver: inv.deliverInvitation,
      accept: (await import('@/lib/claims/accept')).acceptInvitation, token: (await import('@/lib/claims/token')).deriveInvitationToken,
      counts: (await import('@/lib/claims/queue')).claimQueueCounts, list: (await import('@/lib/claims/adminViews')).listClaimRequests,
    }
  })
  afterAll(async () => { await prisma?.$disconnect() })

  beforeEach(async () => {
    h.send.mockReset().mockImplementation(async () => ({ data: { id: `email_${uniq()}` }, error: null }))
    await prisma.$executeRawUnsafe(`TRUNCATE claim_request_events, school_invitations, claim_requests, school_members, user_preferences, schools, users RESTART IDENTITY CASCADE`)
    adminId = (await prisma.user.create({ data: { email: `admin-${uniq()}@example.com`, role: 'SUPERADMIN' } })).id
    await prisma.platformSettings.upsert({ where: { id: 'singleton' }, update: {}, create: { id: 'singleton' } }).catch(() => {})
  })

  async function school(name = 'Guido’s Martial Arts') {
    return prisma.school.create({ data: { name, slug: `s-${uniq()}`, status: 'VERIFIED', city: 'Clovis' } })
  }
  async function invitedRequest(email = `owner-${uniq()}@example.com`) {
    const s = await school()
    const { id } = await L.submit({ schoolName: 'Guidos martial arts', city: 'Clovis', contactName: 'Alex Owner', contactEmail: email })
    await L.link(id, s.id, adminId)
    const { invitationId } = await L.prepare({ schoolId: s.id, claimRequestId: id, recipientEmail: email, recipientName: 'Alex Owner', actorUserId: adminId })
    await L.deliver(invitationId, 'send', adminId)
    const inv = await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: invitationId } })
    return { school: s, requestId: id, inv, token: L.token(inv.id, inv.tokenNonce!), email }
  }
  const identity = (email: string, id: string = randomUUID()) => ({ id, email, emailConfirmedAt: '2026-11-22T10:00:00Z' }) // supabaseAuthId is a uuid column

  it('the migration is present: new columns and enum values exist', async () => {
    const cols = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'school_invitations'`
    const names = cols.map(c => c.column_name)
    for (const c of ['claimRequestId', 'tokenNonce', 'deliveryStatus', 'deliveryKeyAt', 'deliveryPayload', 'acceptedUserId']) expect(names).toContain(c)
  })

  it('8 concurrent acceptances by the invited person: one user, one OWNER row, request completed, every call succeeds', async () => {
    const { token, email, school: s, requestId } = await invitedRequest()
    const who = identity(email)
    const results = await Promise.all(Array.from({ length: 8 }, () => L.accept(token, who)))
    expect(results.every(r => r.ok)).toBe(true)
    expect(results.filter(r => r.ok && !r.already)).toHaveLength(1)
    expect(await prisma.user.count({ where: { email } })).toBe(1)
    expect(await prisma.schoolMember.count({ where: { schoolId: s.id, role: 'OWNER' } })).toBe(1)
    expect((await prisma.claimRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe('COMPLETED')
    expect((await prisma.school.findUniqueOrThrow({ where: { id: s.id } })).status).toBe('VERIFIED')
  })

  it('two open invitations for the same school accepted at the same time by two people: exactly one owner', async () => {
    const a = await invitedRequest()
    // A second open invitation for the same school can only exist through old
    // data or a bug — insert it directly to prove the school lock holds anyway.
    const nonce = 'nonce-second'
    const second = await prisma.schoolInvitation.create({
      data: {
        name: a.school.name, email: 'second@example.com', sentToEmail: 'second@example.com', schoolId: a.school.id, token: `t-${uniq()}`,
        tokenNonce: nonce, tokenHash: (await import('@/lib/claims/token')).hashInvitationToken(L.token('x', 'y')), status: 'SENT', deliveryStatus: 'ACCEPTED',
        expiresAt: new Date(Date.now() + 86_400_000), isActive: true,
      },
    })
    const secondToken = L.token(second.id, nonce)
    await prisma.schoolInvitation.update({ where: { id: second.id }, data: { tokenHash: (await import('@/lib/claims/token')).hashInvitationToken(secondToken) } })

    const [r1, r2] = await Promise.all([L.accept(a.token, identity(a.email)), L.accept(secondToken, identity('second@example.com'))])
    const oks = [r1, r2].filter(r => r.ok)
    expect(oks).toHaveLength(1)
    expect([r1, r2].find(r => !r.ok)).toMatchObject({ ok: false, code: 'OWNER_CONFLICT' })
    expect(await prisma.schoolMember.count({ where: { schoolId: a.school.id, role: 'OWNER' } })).toBe(1)
  })

  it('a direct invitation with no school yet, accepted 6 times at once: exactly one school is created', async () => {
    const { hashInvitationToken } = await import('@/lib/claims/token')
    const email = `pipe-${uniq()}@example.com`
    const nonce = 'pipe-nonce'
    const inv = await prisma.schoolInvitation.create({
      data: { name: `Pipeline Dojo ${uniq()}`, email, sentToEmail: email, token: `t-${uniq()}`, tokenNonce: nonce, status: 'SENT', deliveryStatus: 'ACCEPTED', expiresAt: new Date(Date.now() + 86_400_000), isActive: true },
    })
    const token = L.token(inv.id, nonce)
    await prisma.schoolInvitation.update({ where: { id: inv.id }, data: { tokenHash: hashInvitationToken(token) } })
    const who = identity(email)
    const results = await Promise.all(Array.from({ length: 6 }, () => L.accept(token, who)))
    expect(results.every(r => r.ok)).toBe(true)
    expect(await prisma.school.count({ where: { name: inv.name } })).toBe(1)
    expect(await prisma.schoolMember.count({ where: { role: 'OWNER', user: { email } } })).toBe(1)
  })

  it('5 concurrent "send" clicks: one Resend call, the rest are told it is busy', async () => {
    const s = await school()
    const email = `owner-${uniq()}@example.com`
    const { id } = await L.submit({ schoolName: 'Guidos', city: 'Clovis', contactName: 'Alex', contactEmail: email })
    await L.link(id, s.id, adminId)
    const { invitationId } = await L.prepare({ schoolId: s.id, claimRequestId: id, recipientEmail: email, recipientName: null, actorUserId: adminId })
    h.send.mockClear()
    const settled = await Promise.allSettled(Array.from({ length: 5 }, () => L.deliver(invitationId, 'send', adminId)))
    expect(settled.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(settled.filter(r => r.status === 'rejected').every(r => (r as PromiseRejectedResult).reason.code === 'DELIVERY_BUSY')).toBe(true)
    // the admin notice + ack were sent by submit before mockClear; only the invite counts here
    expect(h.send).toHaveBeenCalledTimes(1)
  })

  it('two requests for the same school prepared concurrently: one open invitation', async () => {
    const s = await school()
    const ids = await Promise.all(['a', 'b'].map(async k => {
      const { id } = await L.submit({ schoolName: 'Guidos', city: 'Clovis', contactName: k, contactEmail: `${k}-${uniq()}@example.com` })
      await L.link(id, s.id, adminId)
      return id
    }))
    const settled = await Promise.allSettled(ids.map((rid, i) => L.prepare({ schoolId: s.id, claimRequestId: rid, recipientEmail: `p${i}-${uniq()}@example.com`, recipientName: null, actorUserId: adminId })))
    expect(settled.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect((settled.find(r => r.status === 'rejected') as PromiseRejectedResult).reason.code).toBe('ACTIVE_INVITATION_EXISTS')
    expect(await prisma.schoolInvitation.count({ where: { schoolId: s.id, isActive: true, usedAt: null, revokedAt: null } })).toBe(1)
  })

  it('a database failure in the middle of acceptance rolls everything back; the retry then succeeds', async () => {
    const { token, email, school: s, requestId, inv } = await invitedRequest()
    const who = identity(email)
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION fail_member_insert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$ LANGUAGE plpgsql`)
    await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_member BEFORE INSERT ON school_members FOR EACH ROW EXECUTE FUNCTION fail_member_insert()`)
    try {
      await expect(L.accept(token, who)).rejects.toThrow()
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER fail_member ON school_members`)
    }
    const after = await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: inv.id } })
    expect(after.usedAt).toBeNull()
    expect(await prisma.user.count({ where: { email } })).toBe(0)
    expect((await prisma.claimRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe('IN_PROGRESS')
    expect((await prisma.school.findUniqueOrThrow({ where: { id: s.id } })).claimedById).toBeNull()

    const ok = await L.accept(token, who)
    expect(ok).toMatchObject({ ok: true, already: false })
  })

  it('same-key retry: refused by the database condition once the key is older than 20 h, even if the row was read earlier', async () => {
    const s = await school()
    const email = `owner-${uniq()}@example.com`
    const { id } = await L.submit({ schoolName: 'Guidos', city: 'Clovis', contactName: 'Alex', contactEmail: email })
    await L.link(id, s.id, adminId)
    const { invitationId } = await L.prepare({ schoolId: s.id, claimRequestId: id, recipientEmail: email, recipientName: null, actorUserId: adminId })
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'application_error', message: 'fetch failed', statusCode: null } })
    await L.deliver(invitationId, 'send', adminId)
    const frozen = (await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: invitationId } })).deliveryPayload

    await prisma.schoolInvitation.update({ where: { id: invitationId }, data: { deliveryKeyAt: new Date(Date.now() - 21 * 3600_000) } })
    h.send.mockClear()
    await expect(L.deliver(invitationId, 'retry', adminId)).rejects.toMatchObject({ code: 'RETRY_WINDOW_PASSED' })
    expect(h.send).not.toHaveBeenCalled()
    const row = await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: invitationId } })
    expect(row.deliveryStatus).toBe('UNCERTAIN')
    expect(row.deliveryPayload).toEqual(frozen)
  })

  // ── Project Audit ad6777f ──────────────────────────────────────────────
  // A trigger with pg_sleep holds one side inside its transaction so the other
  // really runs concurrently (the race Codex reproduced).
  async function slowInsert(table: string, seconds: number) {
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION slow_insert() RETURNS trigger AS $$ BEGIN PERFORM pg_sleep(${seconds}); RETURN NEW; END $$ LANGUAGE plpgsql`)
    await prisma.$executeRawUnsafe(`CREATE TRIGGER slow_ins BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION slow_insert()`)
    return () => prisma.$executeRawUnsafe(`DROP TRIGGER slow_ins ON ${table}`)
  }
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  const openFor = (requestId: string) => prisma.schoolInvitation.findMany({ where: { claimRequestId: requestId, usedAt: null, revokedAt: null, isActive: true } })

  it('reject while an invitation is being prepared: the new invitation is revoked, never left open', async () => {
    const s = await school()
    const email = `owner-${uniq()}@example.com`
    const { id } = await L.submit({ schoolName: 'Guidos', city: 'Clovis', contactName: 'Alex', contactEmail: email })
    await L.link(id, s.id, adminId)
    const drop = await slowInsert('school_invitations', 0.4)
    try {
      const prep = L.prepare({ schoolId: s.id, claimRequestId: id, recipientEmail: email, recipientName: null, actorUserId: adminId })
      await sleep(150) // prepare now holds the school + request locks, inserting
      const rej = L.reject(id, 'Not the owner', adminId)
      const [p1, r1] = await Promise.allSettled([prep, rej])
      expect(p1.status).toBe('fulfilled')
      expect(r1.status).toBe('fulfilled')
    } finally { await drop() }
    expect((await prisma.claimRequest.findUniqueOrThrow({ where: { id } })).status).toBe('DISMISSED')
    expect(await openFor(id)).toHaveLength(0)
    const inv = await prisma.schoolInvitation.findFirstOrThrow({ where: { claimRequestId: id } })
    await expect(L.deliver(inv.id, 'send', adminId)).rejects.toMatchObject({ code: 'INVITATION_CLOSED' })
    expect(await L.accept(L.token(inv.id, inv.tokenNonce!), identity(email))).toMatchObject({ ok: false, code: 'INVALID_LINK' })
    expect(await prisma.schoolMember.count({ where: { schoolId: s.id } })).toBe(0)
  })

  it('reject racing an acceptance in flight: never DISMISSED with an owner (either order)', async () => {
    for (const first of ['accept', 'reject'] as const) {
      const { token, email, school: s, requestId } = await invitedRequest()
      const drop = await slowInsert(first === 'accept' ? 'school_members' : 'claim_request_events', 0.4)
      let results: PromiseSettledResult<unknown>[]
      try {
        const a = first === 'accept' ? L.accept(token, identity(email)) : null
        const r = first === 'reject' ? L.reject(requestId, 'Not the owner', adminId) : null
        await sleep(150)
        const b = first === 'accept' ? L.reject(requestId, 'Not the owner', adminId) : L.accept(token, identity(email))
        results = await Promise.allSettled([a ?? r!, b])
      } finally { await drop() }
      const status = (await prisma.claimRequest.findUniqueOrThrow({ where: { id: requestId } })).status
      const owners = await prisma.schoolMember.count({ where: { schoolId: s.id, role: 'OWNER' } })
      if (first === 'accept') {
        expect([status, owners], JSON.stringify(results)).toEqual(['COMPLETED', 1])
      } else {
        expect([status, owners], JSON.stringify(results)).toEqual(['DISMISSED', 0])
        expect(await prisma.user.count({ where: { email } })).toBe(0)
      }
    }
  })

  it('reject and accept interleaved at the worst point finish without a deadlock (same lock order)', async () => {
    const { token, email, school: s, requestId } = await invitedRequest()
    // Hold the school row so acceptance stops right after locking the invitation.
    let release!: () => void
    const held = new Promise<void>(r => { release = r })
    const holder = prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM schools WHERE id = ${s.id} FOR UPDATE`
      await held
    }, { timeout: 15_000 })
    await sleep(100)
    const acc = L.accept(token, identity(email)) // holds the invitation, waits for the school
    await sleep(150)
    const rej = L.reject(requestId, 'Not the owner', adminId) // must wait on the invitation before touching the request
    await sleep(150)
    release()
    await holder
    const [a, r] = await Promise.allSettled([acc, rej])
    expect(a.status, String((a as PromiseRejectedResult).reason)).toBe('fulfilled')
    expect((a as PromiseFulfilledResult<any>).value).toMatchObject({ ok: true })
    // The rejection sees the completed request and is refused cleanly — no deadlock.
    expect(r.status).toBe('rejected')
    expect((r as PromiseRejectedResult).reason.code).toBe('CHANGED_CONCURRENTLY')
    expect((await prisma.claimRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe('COMPLETED')
  })

  it('an invitation whose request is already DISMISSED (left open) is refused under the lock and rolled back', async () => {
    const { token, email, school: s, requestId, inv } = await invitedRequest()
    await prisma.claimRequest.update({ where: { id: requestId }, data: { status: 'DISMISSED' } }) // the old race's leftover state
    expect(await L.accept(token, identity(email))).toMatchObject({ ok: false, code: 'INVALID_LINK', reason: 'REVOKED' })
    expect((await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: inv.id } })).usedAt).toBeNull()
    expect(await prisma.schoolMember.count({ where: { schoolId: s.id } })).toBe(0)
    expect(await prisma.user.count({ where: { email } })).toBe(0)
  })

  it('a deleted account cannot consume the invitation; the invitation stays usable', async () => {
    const { token, email, school: s, inv } = await invitedRequest()
    const authId = randomUUID()
    await prisma.user.create({ data: { email: `deleted-${uniq()}@anon.invalid`, supabaseAuthId: authId, deletedAt: new Date() } })
    expect(await L.accept(token, identity(email, authId))).toMatchObject({ ok: false, code: 'ACCOUNT_DELETED' })
    expect((await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: inv.id } })).usedAt).toBeNull()
    expect(await prisma.schoolMember.count({ where: { schoolId: s.id } })).toBe(0)
    expect(await L.accept(token, identity(email))).toMatchObject({ ok: true, already: false }) // a live account still can
  })

  // ── Project Audit 2fcb966 · AD-5 ───────────────────────────────────────
  async function twoSchoolsFor(email: string) {
    return Promise.all([1, 2].map(async () => {
      const s = await school()
      const { id } = await L.submit({ schoolName: s.name, city: 'Clovis', contactName: 'Alex', contactEmail: email })
      await L.link(id, s.id, adminId)
      const { invitationId } = await L.prepare({ schoolId: s.id, claimRequestId: id, recipientEmail: email, recipientName: null, actorUserId: adminId })
      await L.deliver(invitationId, 'send', adminId)
      const inv = await prisma.schoolInvitation.findUniqueOrThrow({ where: { id: invitationId } })
      return { schoolId: s.id, requestId: id, token: L.token(inv.id, inv.tokenNonce!) }
    }))
  }

  it('same existing STUDENT accepts two schools at once: no deadlock, two OWNER rows, both requests completed, one user', async () => {
    const email = `owner-${uniq()}@example.com`
    const authId = randomUUID()
    const user = await prisma.user.create({ data: { email, supabaseAuthId: authId, role: 'STUDENT' } })
    const both = await twoSchoolsFor(email)
    // Barrier: the user-row UPDATE (role → SCHOOL_OWNER) pauses inside the
    // first transaction. Without per-account serialization the second one
    // takes its own lock on the user meanwhile and the two deadlock (40P01).
    await prisma.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION slow_user_update() RETURNS trigger AS $$ BEGIN PERFORM pg_sleep(0.5); RETURN NEW; END $$ LANGUAGE plpgsql`)
    await prisma.$executeRawUnsafe(`CREATE TRIGGER slow_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION slow_user_update()`)
    let results: PromiseSettledResult<any>[]
    try {
      results = await Promise.allSettled(both.map(b => L.accept(b.token, identity(email, authId))))
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER slow_upd ON users`)
    }
    expect(results.map(r => r.status), JSON.stringify(results.map(r => r.status === 'rejected' ? String(r.reason).slice(0, 200) : r.value))).toEqual(['fulfilled', 'fulfilled'])
    expect(results.map(r => (r as PromiseFulfilledResult<any>).value)).toEqual([expect.objectContaining({ ok: true, already: false }), expect.objectContaining({ ok: true, already: false })])
    expect(await prisma.user.count({ where: { email } })).toBe(1)
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('SCHOOL_OWNER')
    expect(await prisma.schoolMember.count({ where: { userId: user.id, role: 'OWNER', status: 'ACTIVE' } })).toBe(2)
    for (const b of both) expect((await prisma.claimRequest.findUniqueOrThrow({ where: { id: b.requestId } })).status).toBe('COMPLETED')
  })

  it('a brand-new person accepts two schools at once: one user is created, both complete', async () => {
    const email = `new-${uniq()}@example.com`
    const authId = randomUUID()
    const both = await twoSchoolsFor(email)
    const drop = await slowInsert('users', 0.4) // first creator pauses; the second must wait, not collide
    let results: PromiseSettledResult<any>[]
    try {
      results = await Promise.allSettled(both.map(b => L.accept(b.token, identity(email, authId))))
    } finally { await drop() }
    expect(results.map(r => r.status === 'fulfilled' && r.value.ok), JSON.stringify(results.map(r => r.status === 'rejected' ? String(r.reason).slice(0, 200) : r.value))).toEqual([true, true])
    expect(await prisma.user.count({ where: { email } })).toBe(1)
    expect(await prisma.schoolMember.count({ where: { role: 'OWNER', schoolId: { in: both.map(b => b.schoolId) } } })).toBe(2)
  })

  it('dashboard counters equal the lists they open', async () => {
    await L.submit({ schoolName: 'One', city: null, contactName: 'A', contactEmail: `a-${uniq()}@example.com` })
    await invitedRequest()
    await prisma.claimRequest.create({ data: { schoolName: 'Old', contactName: 'X', contactEmail: 'x@example.com', status: 'RESOLVED', resolvedAt: new Date() } })
    const counts = await L.counts(prisma)
    for (const view of ['pending', 'in_progress', 'legacy', 'history'] as const) {
      expect((await L.list(view, '')).requests.length, view).toBe(counts[view])
    }
    expect(counts).toEqual({ pending: 1, in_progress: 1, legacy: 1, history: 1 })
  })
})
