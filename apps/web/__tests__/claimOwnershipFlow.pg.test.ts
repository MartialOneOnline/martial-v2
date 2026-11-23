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
      submit: req.submitClaimRequest, link: req.linkSchool, prepare: inv.prepareInvitation, deliver: inv.deliverInvitation,
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
