/**
 * School-ownership flow: request → review → linked school → invitation →
 * acceptance → access (Lote AD, 2026-11-22). Replaces
 * claimSchoolSecurity.test.ts, whose open P0 (owning a school with only the
 * invitation id + a chosen password) is closed by this flow.
 *
 * Runs the real route handlers and lib/claims against an in-memory Prisma
 * stand-in with transactional rollback and row locks
 * (helpers/claimsFakeDb.ts). Resend, Supabase Admin and the session are
 * simulated: no real emails, no real Auth.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- route bodies and fake rows are untyped JSON */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, resetFakeDb } from './helpers/claimsFakeDb'

process.env.CLAIM_INVITE_SECRET = 'test-secret'

const h = vi.hoisted(() => ({
  send: vi.fn<(payload: any, opts?: any) => Promise<any>>(),
  generateLink: vi.fn<(args: any) => Promise<any>>(),
  identity: { current: null as null | { id: string; email: string; emailConfirmedAt: string | null } },
  admin: { allowed: true, id: 'admin-1' },
}))

vi.mock('@/lib/db', () => ({ prisma: fakeDb.prisma }))
vi.mock('@/lib/email/resend', () => ({
  FROM: 'Martial <notifications@martialapp.com>',
  APP_URL: 'https://app.test',
  getResend: () => ({ emails: { send: h.send } }),
}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ auth: { admin: { generateLink: h.generateLink } } }) }))
vi.mock('@/lib/claims/session', () => ({ getAuthIdentity: async () => h.identity.current }))
vi.mock('@/lib/auth/server', async () => {
  const { NextResponse } = await import('next/server')
  return {
    guardSuperadmin: async () => (h.admin.allowed ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 })),
    guardSuperadminUser: async () => (h.admin.allowed ? { id: h.admin.id, email: 'admin@test' } : NextResponse.json({ error: 'Forbidden' }, { status: 403 })),
  }
})

const { __resetRateLimitsForTests } = await import('@/lib/rateLimit')
const requestRoute = await import('@/app/api/claim/request/route')
const tokenRoute = await import('@/app/api/claim/[token]/route')
const verifyRoute = await import('@/app/api/claim/[token]/verify/route')
const completeRoute = await import('@/app/api/claim/[token]/complete/route')
const adminList = await import('@/app/api/admin/claim-requests/route')
const adminDetail = await import('@/app/api/admin/claim-requests/[id]/route')
const adminCandidates = await import('@/app/api/admin/claim-requests/[id]/candidates/route')
const schoolInvite = await import('@/app/api/admin/schools/[id]/resend-invite/route')
const pipeline = await import('@/app/api/admin/invitations/route')
const onboardingValidate = await import('@/app/api/onboarding/validate/route')
const onboardingComplete = await import('@/app/api/onboarding/complete/route')
const { deriveInvitationToken } = await import('@/lib/claims/token')
const { significantTokens } = await import('@/lib/claims/candidates')

// ── helpers ─────────────────────────────────────────────────────────────────

const T = fakeDb.tables

function req(body?: unknown, url = 'https://app.test/x'): NextRequest {
  return { json: async () => body ?? {}, headers: { get: () => null }, url } as unknown as NextRequest
}
const p = <K extends string>(k: K, v: string) => ({ params: Promise.resolve({ [k]: v } as Record<K, string>) })

async function json(res: Response) { return { status: res.status, body: await res.json() as any } }

function addSchool(data: Record<string, unknown> = {}) {
  const row = { id: `school_${T.school!.length + 1}`, name: 'Guido’s Martial Arts', slug: `guidos-${T.school!.length + 1}`, status: 'VERIFIED', claimedById: null, claimedAt: null, email: 'info@guidos.example', city: 'Clovis', country: 'US', website: null, logoUrl: null, language: 'en', createdAt: new Date(), ...data }
  T.school!.push(row)
  return row
}
function addUser(data: Record<string, unknown>) {
  const row = { id: `user_${T.user!.length + 1}`, role: 'STUDENT', name: null, supabaseAuthId: null, createdAt: new Date(), ...data }
  T.user!.push(row)
  return row
}
function addOwner(schoolId: string) {
  const owner = addUser({ email: 'existing-owner@example.com', supabaseAuthId: 'auth-owner' })
  T.schoolMember!.push({ id: `m_${T.schoolMember!.length + 1}`, schoolId, userId: owner.id, role: 'OWNER', status: 'ACTIVE' })
  return owner
}
const accepted = (id = 'email_1') => ({ data: { id }, error: null })

async function submit(extra: Record<string, unknown> = {}) {
  const res = await requestRoute.POST(req({ schoolName: 'Guidos martial arts', city: 'Clovis', contactName: 'Alex Owner', contactEmail: 'Alex.Owner1@outlook.com', ...extra }))
  expect(res.status).toBe(200)
  return T.claimRequest!.at(-1)!
}
async function action(id: string, body: Record<string, unknown>) {
  return json(await adminDetail.POST(req(body), p('id', id)))
}
async function linkedRequest(schoolData: Record<string, unknown> = {}) {
  const school = addSchool(schoolData)
  const request = await submit()
  expect((await action(request.id, { action: 'link', schoolId: school.id })).status).toBe(200)
  return { school, request }
}
function currentToken(invitationId: string): string {
  const inv = T.schoolInvitation!.find(i => i.id === invitationId)!
  return deriveInvitationToken(inv.id, inv.tokenNonce)
}
async function invited(schoolData: Record<string, unknown> = {}) {
  const { school, request } = await linkedRequest(schoolData)
  h.send.mockResolvedValueOnce(accepted('email_inv'))
  const r = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail, recipientName: 'Alex Owner' })
  expect(r.body.ok).toBe(true)
  const inv = T.schoolInvitation!.at(-1)!
  return { school, request, inv, token: currentToken(inv.id) }
}
const alex = { id: 'auth-alex', email: 'alex.owner1@outlook.com', emailConfirmedAt: '2026-11-22T10:00:00Z' }

beforeEach(() => {
  resetFakeDb()
  __resetRateLimitsForTests()
  h.send.mockReset().mockResolvedValue(accepted())
  h.generateLink.mockReset().mockResolvedValue({ data: { properties: { action_link: 'https://supabase.test/verify?x' } }, error: null })
  h.identity.current = null
  h.admin.allowed = true
  T.platformSettings!.push({ id: 'singleton', superAdminEmail: 'boss@martialapp.com' })
})

// ── 1. Submission ───────────────────────────────────────────────────────────

describe('request submission', () => {
  it('persists the request even when the admin notification fails, and records the failure', async () => {
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'application_error', message: 'Resend down', statusCode: 500 } })
    const r = await submit()
    expect(r.status).toBe('PENDING')
    expect(r.contactEmail).toBe('alex.owner1@outlook.com')
    expect(T.claimRequestEvent!.map(e => e.type)).toEqual(['SUBMITTED', 'ADMIN_NOTIFY_FAILED'])
  })

  it('persists the request when the email SDK throws', async () => {
    h.send.mockRejectedValue(new Error('socket hang up'))
    const r = await submit()
    expect(T.claimRequest).toHaveLength(1)
    expect(r.status).toBe('PENDING')
  })

  it('links the admin email straight to the request and escapes visitor input', async () => {
    await submit({ schoolName: '<img src=x onerror=alert(1)>Dojo', message: '<script>x</script>' })
    const adminMail = h.send.mock.calls[0]![0]
    const id = T.claimRequest![0]!.id
    expect(adminMail.html).toContain(`https://app.test/admin/claims/${id}`)
    expect(adminMail.html).not.toContain('<script>')
    expect(adminMail.html).not.toContain('<img src=x')
    expect(adminMail.html).toContain('&lt;script&gt;')
    expect(adminMail.subject).not.toMatch(/[\r\n]/)
    expect(h.send.mock.calls[0]![1]).toEqual({ idempotencyKey: `claim-request-admin/${id}` })
  })

  it('keeps a validated reference to the school page it started from — and ignores unknown or archived slugs', async () => {
    const school = addSchool({ slug: 'guidos-clovis' })
    addSchool({ slug: 'gone', status: 'ARCHIVED' })
    const a = await submit({ schoolSlug: 'guidos-clovis' })
    const b = await submit({ schoolSlug: 'does-not-exist' })
    const c = await submit({ schoolSlug: 'gone' })
    expect(a.sourceSchoolId).toBe(school.id)
    expect(b.sourceSchoolId).toBeNull()
    expect(c.sourceSchoolId).toBeNull()
    // A reference is a hint only: nothing linked, nothing granted.
    expect(a.schoolId).toBeNull()
    expect(T.schoolMember).toHaveLength(0)
  })

  it('rejects an invalid email without saving and never echoes data back', async () => {
    const res = await requestRoute.POST(req({ schoolName: 'X', contactName: 'Y', contactEmail: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(T.claimRequest).toHaveLength(0)
    const ok = await json(await requestRoute.POST(req({ schoolName: 'X', contactName: 'Y', contactEmail: 'y@x.io' })))
    expect(ok.body).toEqual({ ok: true })
  })
})

// ── 2. Admin review ─────────────────────────────────────────────────────────

describe('admin review', () => {
  it('a legacy RESOLVED request with no school stays visible in history, flagged, and can be reopened (no new request)', async () => {
    T.claimRequest!.push({ id: 'cr_legacy', status: 'RESOLVED', schoolName: 'Guidos martial arts', city: 'Clovis', contactName: 'Alex owner', contactEmail: 'alex.owner1@outlook.com', phone: null, message: null, locale: null, sourceSchoolId: null, schoolId: null, createdAt: new Date('2026-11-22T02:45:27Z'), resolvedAt: new Date('2026-11-22T06:48:58Z') })
    const pending = await json(await adminList.GET(req(undefined, 'https://app.test/api/admin/claim-requests?view=pending')))
    expect(pending.body.requests).toHaveLength(0)
    const history = await json(await adminList.GET(req(undefined, 'https://app.test/api/admin/claim-requests?view=history&q=clovis')))
    expect(history.body.requests).toHaveLength(1)
    expect(history.body.requests[0].needsAssociationReview).toBe(true)

    const detail = await json(await adminDetail.GET(req(), p('id', 'cr_legacy')))
    expect(detail.body.nextStep).toMatch(/Reopen/)

    const reopened = await action('cr_legacy', { action: 'reopen' })
    expect(reopened.status).toBe(200)
    expect(T.claimRequest).toHaveLength(1)
    expect(T.claimRequest![0]!.status).toBe('PENDING')
    expect(T.claimRequestEvent!.find(e => e.type === 'REOPENED')!.actorUserId).toBe('admin-1')
    expect((await action('cr_legacy', { action: 'reopen' })).status).toBe(409)
  })

  it('reject needs a reason, revokes an open invitation, and can be reopened', async () => {
    const { request, inv } = await invited()
    expect((await action(request.id, { action: 'reject', reason: '  ' })).status).toBe(400)
    expect((await action(request.id, { action: 'reject', reason: 'Not the owner' })).status).toBe(200)
    const row = T.claimRequest!.find(r => r.id === request.id)!
    expect(row.status).toBe('DISMISSED')
    expect(row.rejectReason).toBe('Not the owner')
    expect(T.schoolInvitation!.find(i => i.id === inv.id)!.revokedAt).toBeInstanceOf(Date)
    expect((await action(request.id, { action: 'reopen' })).status).toBe(200)
    expect(T.claimRequest!.find(r => r.id === request.id)!.status).toBe('IN_PROGRESS') // school stays linked
  })

  it('the old "Mark resolved" PATCH no longer exists', () => {
    expect((adminList as Record<string, unknown>).PATCH).toBeUndefined()
  })

  it('non-superadmins get 403 from every admin route, with no side effects', async () => {
    const school = addSchool()
    const request = await submit()
    h.admin.allowed = false
    const before = JSON.stringify(T)
    expect((await adminList.GET(req(undefined, 'https://app.test/a'))).status).toBe(403)
    expect((await adminDetail.GET(req(), p('id', request.id))).status).toBe(403)
    for (const body of [{ action: 'link', schoolId: school.id }, { action: 'reject', reason: 'x' }, { action: 'create_school', name: 'X' }, { action: 'send_invitation', recipientEmail: 'a@b.co' }]) {
      expect((await adminDetail.POST(req(body), p('id', request.id))).status).toBe(403)
    }
    expect((await adminCandidates.GET(req(undefined, 'https://app.test/a'), p('id', request.id))).status).toBe(403)
    expect((await schoolInvite.POST(req({ recipientEmail: 'a@b.co' }), p('id', school.id))).status).toBe(403)
    expect((await pipeline.POST(req({ name: 'X', email: 'a@b.co' }))).status).toBe(403)
    expect(JSON.stringify(T)).toBe(before)
    expect(h.send).toHaveBeenCalledTimes(2) // only the two submission emails
  })
})

// ── 3. Linking ──────────────────────────────────────────────────────────────

describe('linking a school', () => {
  it('finds "Guido’s Martial Arts" in Clovis as a candidate without linking it', async () => {
    expect(significantTokens('Guidos martial arts')).toEqual(['guido'])
    const school = addSchool()
    addSchool({ name: 'Other Dojo', city: 'Madrid', email: null })
    const request = await submit()
    const detail = await json(await adminDetail.GET(req(), p('id', request.id)))
    expect(detail.body.candidates.map((c: any) => c.id)).toEqual([school.id])
    expect(detail.body.candidates[0].reasons).toEqual(expect.arrayContaining(['Same city']))
    expect(T.claimRequest![0]!.schoolId).toBeNull()
  })

  it('links an existing school: no school created, school data untouched, original request kept, repeat is idempotent', async () => {
    const school = addSchool({ email: 'public@guidos.example', name: 'Guido’s Martial Arts' })
    const request = await submit()
    const schoolsBefore = JSON.stringify(T.school)
    expect((await action(request.id, { action: 'link', schoolId: school.id })).status).toBe(200)
    expect((await action(request.id, { action: 'link', schoolId: school.id })).status).toBe(200)
    expect(T.school).toHaveLength(1)
    expect(JSON.stringify(T.school)).toBe(schoolsBefore)
    const row = T.claimRequest![0]!
    expect(row).toMatchObject({ status: 'IN_PROGRESS', schoolId: school.id, linkedById: 'admin-1', schoolName: 'Guidos martial arts' })
    expect(T.claimRequestEvent!.filter(e => e.type === 'SCHOOL_LINKED')).toHaveLength(1)
  })

  it('creating a school warns about possible duplicates first, then creates it once when acknowledged', async () => {
    const dup = addSchool({ name: 'Guidos Martial Arts Academy' })
    const request = await submit()
    const first = await action(request.id, { action: 'create_school', name: 'Guidos martial arts', city: 'Clovis', country: 'us' })
    expect(first.status).toBe(409)
    expect(first.body.code).toBe('POSSIBLE_DUPLICATES')
    expect(first.body.candidates.map((c: any) => c.id)).toEqual([dup.id])
    expect(T.school).toHaveLength(1)

    const second = await action(request.id, { action: 'create_school', name: 'Guidos martial arts', city: 'Clovis', country: 'us', acknowledgedDuplicates: [dup.id] })
    expect(second.status).toBe(200)
    expect(T.school).toHaveLength(2)
    const created = T.school![1]!
    expect(created).toMatchObject({ name: 'Guidos martial arts', city: 'Clovis', country: 'US', status: 'UNVERIFIED', email: null })
    expect(T.claimRequest![0]!.schoolId).toBe(created.id)
    // A repeated click cannot create a second school.
    expect((await action(request.id, { action: 'create_school', name: 'Guidos martial arts', acknowledgedDuplicates: [dup.id] })).status).toBe(409)
    expect(T.school).toHaveLength(2)
  })

  it('cannot change the linked school while an invitation is open', async () => {
    const { request } = await invited()
    const other = addSchool({ name: 'Elsewhere' })
    expect((await action(request.id, { action: 'link', schoolId: other.id })).status).toBe(409)
    expect((await action(request.id, { action: 'unlink' })).status).toBe(409)
  })
})

// ── 4. Invitation delivery ──────────────────────────────────────────────────

describe('invitation delivery', () => {
  it('goes to the approved requester email, not School.email, and never changes School.email', async () => {
    const { school, inv } = await invited({ email: 'public@guidos.example' })
    const call = h.send.mock.calls.at(-1)!
    expect(call[0].to).toBe('alex.owner1@outlook.com')
    expect(call[0].html).toContain('https://app.test/claim/')
    expect(T.school!.find(s => s.id === school.id)!.email).toBe('public@guidos.example')
    expect(inv).toMatchObject({ deliveryStatus: 'ACCEPTED', status: 'SENT', providerMessageId: 'email_inv', sentToEmail: 'alex.owner1@outlook.com' })
    // The raw token is never stored.
    expect(JSON.stringify(inv)).not.toContain(currentToken(inv.id))
  })

  it('a Resend rejection is not reported as sent, and does not complete the request', async () => {
    const { request } = await linkedRequest()
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'Invalid `to` field', statusCode: 422 } })
    const r = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    expect(r.body.ok).toBe(false)
    expect(r.body.delivery.kind).toBe('rejected')
    const inv = T.schoolInvitation!.at(-1)!
    expect(inv).toMatchObject({ deliveryStatus: 'FAILED', status: 'PENDING', sentAt: null })
    expect(T.claimRequest![0]!.status).toBe('IN_PROGRESS')
    expect(r.body.detail.invitations[0].state).toBe('failed')
    // The never-delivered token cannot be used.
    expect((await tokenRoute.GET(req(), p('token', currentToken(inv.id)))).status).toBe(410)
  })

  it('an unknown outcome (timeout) is retried with the same Idempotency-Key and identical email', async () => {
    const { request } = await linkedRequest()
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'application_error', message: 'fetch failed', statusCode: null } })
    const first = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    expect(first.body.delivery.kind).toBe('uncertain')
    const inv = T.schoolInvitation!.at(-1)!
    expect(inv.deliveryStatus).toBe('UNCERTAIN')
    const token = currentToken(inv.id)

    h.send.mockResolvedValueOnce(accepted('email_retry'))
    const retry = await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    expect(retry.body.ok).toBe(true)
    const [a, b] = h.send.mock.calls.slice(-2)
    expect(b![1].idempotencyKey).toBe(a![1].idempotencyKey)
    expect(b![0]).toEqual(a![0])
    expect(currentToken(inv.id)).toBe(token)
    expect(T.schoolInvitation).toHaveLength(1)
  })

  it('after a definite rejection, a retry uses a new key (nothing was sent) but keeps the link', async () => {
    const { request } = await linkedRequest()
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'rate_limit_exceeded', message: 'Too many', statusCode: 429 } })
    await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    const inv = T.schoolInvitation!.at(-1)!
    const token = currentToken(inv.id)
    await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    const [a, b] = h.send.mock.calls.slice(-2)
    expect(b![1].idempotencyKey).not.toBe(a![1].idempotencyKey)
    expect(currentToken(inv.id)).toBe(token)
  })

  it('a stale SENDING lock (function died mid-send) is retryable as uncertain', async () => {
    const { request } = await linkedRequest()
    h.send.mockImplementationOnce(async () => { throw new Error('killed') })
    await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    const inv = T.schoolInvitation!.at(-1)!
    inv.deliveryStatus = 'SENDING'
    inv.deliveryStartedAt = new Date(Date.now() - 10 * 60 * 1000)
    expect((await action(request.id, { action: 'retry_invitation', invitationId: inv.id })).body.ok).toBe(true)
  })

  it('double click / two admins: one invitation and one email', async () => {
    const { request } = await linkedRequest()
    let release!: () => void
    h.send.mockImplementationOnce(() => new Promise(r => { release = () => r(accepted('slow')) }))
    const a = action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    await new Promise(r => setTimeout(r, 5))
    const b = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    release()
    const first = await a
    expect(first.body.ok).toBe(true)
    expect(b.status).toBe(409)
    expect(T.schoolInvitation).toHaveLength(1)
    expect(h.send.mock.calls.filter(c => c[0].html?.includes('/claim/'))).toHaveLength(1)
  })

  it('an expired invitation cannot be retried; "resend" issues a new link that works and kills the old one', async () => {
    const { request, inv, token } = await invited()
    inv.expiresAt = new Date(Date.now() - 1000)
    expect((await tokenRoute.GET(req(), p('token', token))).status).toBe(410)
    expect((await action(request.id, { action: 'retry_invitation', invitationId: inv.id })).status).toBe(409)
    const resent = await action(request.id, { action: 'resend_invitation', invitationId: inv.id })
    expect(resent.body.ok).toBe(true)
    const fresh = currentToken(inv.id)
    expect(fresh).not.toBe(token)
    expect(inv.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 3600 * 1000)
    expect((await tokenRoute.GET(req(), p('token', token))).status).toBe(404)
    expect((await tokenRoute.GET(req(), p('token', fresh))).status).toBe(200)
  })

  it('revoked or accepted invitations cannot be resent or reactivated', async () => {
    const { request, inv } = await invited()
    expect((await action(request.id, { action: 'revoke_invitation', invitationId: inv.id })).status).toBe(200)
    expect((await action(request.id, { action: 'resend_invitation', invitationId: inv.id })).status).toBe(409)
    expect((await action(request.id, { action: 'retry_invitation', invitationId: inv.id })).status).toBe(409)
    expect(inv.revokedAt).toBeInstanceOf(Date)

    const second = await invited()
    h.identity.current = alex
    expect((await completeRoute.POST(req(), p('token', second.token))).status).toBe(200)
    expect((await action(second.request.id, { action: 'resend_invitation', invitationId: second.inv.id })).status).toBe(409)
  })

  it('refuses to invite when the school already has an owner', async () => {
    const { school, request } = await linkedRequest()
    addOwner(school.id)
    const r = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    expect(r.status).toBe(409)
    expect(r.body.code).toBe('OWNER_EXISTS')
    expect(T.schoolInvitation).toHaveLength(0)
  })

  it('All Schools "Invite owner" uses the confirmed recipient and the same canonical path', async () => {
    const school = addSchool({ email: 'public@guidos.example' })
    expect((await schoolInvite.POST(req({}), p('id', school.id))).status).toBe(400)
    const r = await json(await schoolInvite.POST(req({ recipientEmail: 'owner@guidos.example' }), p('id', school.id)))
    expect(r.body.ok).toBe(true)
    const inv = T.schoolInvitation![0]!
    expect(inv).toMatchObject({ sentToEmail: 'owner@guidos.example', deliveryStatus: 'ACCEPTED', claimRequestId: null })
    expect(h.send.mock.calls.at(-1)![0].to).toBe('owner@guidos.example')
    expect(school.email).toBe('public@guidos.example')
  })

  it('pipeline invitations report delivery honestly', async () => {
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'bad', statusCode: 422 } })
    const r = await json(await pipeline.POST(req({ name: 'New Dojo', email: 'new@dojo.example' })))
    expect(r.status).toBe(201)
    expect(r.body.emailSent).toBe(false)
    expect(r.body.tokenHash).toBeUndefined()
    expect(T.schoolInvitation![0]!.deliveryStatus).toBe('FAILED')
  })
})

// ── 5. Acceptance ───────────────────────────────────────────────────────────

describe('acceptance', () => {
  it('opening the link (GET) never consumes it', async () => {
    const { inv, token } = await invited()
    const r = await json(await tokenRoute.GET(req(), p('token', token)))
    expect(r.status).toBe(200)
    expect(r.body.maskedEmail).toBe('al***@outlook.com')
    expect(r.body.session).toBe('none')
    expect(JSON.stringify(r.body)).not.toContain('alex.owner1')
    expect(inv.status).toBe('OPENED')
    expect(inv.usedAt).toBeNull()
    expect(T.schoolMember).toHaveLength(0)
  })

  it('verify emails a Supabase link to the invited address only (invite for new, magiclink fallback)', async () => {
    const { token } = await invited()
    h.generateLink.mockResolvedValueOnce({ data: null, error: { message: 'A user with this email address has already been registered' } })
    const r = await verifyRoute.POST(req({ locale: 'es' }), p('token', token))
    expect(r.status).toBe(200)
    expect(h.generateLink.mock.calls.map(c => [c[0].type, c[0].email])).toEqual([['invite', 'alex.owner1@outlook.com'], ['magiclink', 'alex.owner1@outlook.com']])
    expect(h.generateLink.mock.calls[0]![0].options.redirectTo).toBe(`https://app.test/auth/confirm?redirect=${encodeURIComponent(`/claim/${token}`)}`)
    const mail = h.send.mock.calls.at(-1)![0]
    expect(mail.to).toBe('alex.owner1@outlook.com')
    expect(mail.subject).toMatch(/Confirma tu email/)
  })

  it('new account: grants OWNER on the linked school only, completes the request, keeps VERIFIED', async () => {
    const { school, request, inv, token } = await invited({ status: 'VERIFIED' })
    addSchool({ name: 'Unrelated', slug: 'unrelated' })
    h.identity.current = alex
    const r = await json(await completeRoute.POST(req(), p('token', token)))
    expect(r).toMatchObject({ status: 200, body: { ok: true, schoolId: school.id, already: false } })
    expect(T.user).toHaveLength(1)
    const user = T.user![0]!
    expect(user).toMatchObject({ supabaseAuthId: 'auth-alex', email: 'alex.owner1@outlook.com', role: 'SCHOOL_OWNER' })
    expect(T.schoolMember).toEqual([expect.objectContaining({ schoolId: school.id, userId: user.id, role: 'OWNER', status: 'ACTIVE' })])
    expect(T.school!.find(s => s.id === school.id)).toMatchObject({ status: 'VERIFIED', claimedById: user.id })
    expect(T.school).toHaveLength(2) // no school created
    expect(inv).toMatchObject({ status: 'REGISTERED', acceptedUserId: user.id })
    expect(T.claimRequest!.find(x => x.id === request.id)).toMatchObject({ status: 'COMPLETED', completedUserId: user.id })
    expect(T.userPreference![0]).toMatchObject({ userId: user.id, lastSchoolId: school.id })
  })

  it('an UNVERIFIED school becomes CLAIMED (never published/verified further)', async () => {
    const { school, token } = await invited({ status: 'UNVERIFIED' })
    h.identity.current = alex
    await completeRoute.POST(req(), p('token', token))
    expect(T.school!.find(s => s.id === school.id)!.status).toBe('CLAIMED')
  })

  it('existing account: reuses the user, never touches Auth or the password, never lowers a role', async () => {
    const existing = addUser({ email: 'Alex.Owner1@outlook.com', supabaseAuthId: 'auth-alex', role: 'STUDENT', name: 'Alex' })
    const { token } = await invited()
    h.identity.current = alex
    h.generateLink.mockClear()
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(200)
    expect(T.user).toHaveLength(1)
    expect(existing).toMatchObject({ role: 'SCHOOL_OWNER', name: 'Alex', supabaseAuthId: 'auth-alex' })
    expect(h.generateLink).not.toHaveBeenCalled()

    const admin = addUser({ email: 'boss@x.io', supabaseAuthId: 'auth-boss', role: 'SUPERADMIN' })
    const second = await invited({ name: 'Second', slug: 'second' })
    second.inv.sentToEmail = 'boss@x.io'
    h.identity.current = { id: 'auth-boss', email: 'boss@x.io', emailConfirmedAt: 'x' }
    expect((await completeRoute.POST(req(), p('token', second.token))).status).toBe(200)
    expect(admin.role).toBe('SUPERADMIN')
  })

  it('a Prisma user with no Auth link is linked; one linked to another Auth account is never re-pointed', async () => {
    const orphan = addUser({ email: 'alex.owner1@outlook.com', supabaseAuthId: null })
    const { token } = await invited()
    h.identity.current = alex
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(200)
    expect(orphan.supabaseAuthId).toBe('auth-alex')

    resetFakeDb(); T.platformSettings!.push({ id: 'singleton' })
    const other = addUser({ email: 'alex.owner1@outlook.com', supabaseAuthId: 'auth-SOMEONE-ELSE' })
    const second = await invited()
    const r = await json(await completeRoute.POST(req(), p('token', second.token)))
    expect(r).toMatchObject({ status: 409, body: { error: 'ACCOUNT_CONFLICT' } })
    expect(other.supabaseAuthId).toBe('auth-SOMEONE-ELSE')
    expect(T.schoolMember).toHaveLength(0)
    expect(second.inv.usedAt).toBeNull()
    expect(T.claimRequestEvent!.some(e => e.type === 'IDENTITY_CONFLICT')).toBe(true)
  })

  it('a different signed-in account gets no access and causes no writes', async () => {
    const { inv, token } = await invited()
    h.identity.current = { id: 'auth-mallory', email: 'mallory@evil.example', emailConfirmedAt: 'x' }
    const view = await json(await tokenRoute.GET(req(), p('token', token)))
    expect(view.body.session).toBe('other')
    const before = JSON.stringify({ u: T.user, m: T.schoolMember, s: T.school })
    const r = await json(await completeRoute.POST(req(), p('token', token)))
    expect(r).toMatchObject({ status: 403, body: { error: 'WRONG_ACCOUNT' } })
    expect(JSON.stringify({ u: T.user, m: T.schoolMember, s: T.school })).toBe(before)
    expect(inv.usedAt).toBeNull()
  })

  it('requires a session and a confirmed email', async () => {
    const { token } = await invited()
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(401)
    h.identity.current = { ...alex, emailConfirmedAt: null }
    expect(await json(await completeRoute.POST(req(), p('token', token)))).toMatchObject({ status: 403, body: { error: 'EMAIL_NOT_CONFIRMED' } })
    expect(T.schoolMember).toHaveLength(0)
  })

  it('an owner who appeared after sending blocks the acceptance: no replacement, invitation kept, conflict recorded', async () => {
    const { school, inv, token } = await invited()
    const owner = addOwner(school.id)
    h.identity.current = alex
    expect(await json(await completeRoute.POST(req(), p('token', token)))).toMatchObject({ status: 409, body: { error: 'OWNER_CONFLICT' } })
    expect(T.schoolMember!.filter(m => m.role === 'OWNER').map(m => m.userId)).toEqual([owner.id])
    expect(inv.usedAt).toBeNull()
    expect(T.claimRequestEvent!.some(e => e.type === 'OWNER_CONFLICT')).toBe(true)
  })

  it('concurrent and repeated acceptance: one owner row, one user, the repeat reports success', async () => {
    const { school, token } = await invited()
    h.identity.current = alex
    const results = await Promise.all([completeRoute.POST(req(), p('token', token)), completeRoute.POST(req(), p('token', token))].map(async r => json(await r)))
    expect(results.map(r => r.status).sort()).toEqual([200, 200])
    expect(results.filter(r => r.body.already).length).toBe(1)
    expect(T.user).toHaveLength(1)
    expect(T.schoolMember!.filter(m => m.schoolId === school.id)).toHaveLength(1)
    const again = await json(await completeRoute.POST(req(), p('token', token)))
    expect(again.body).toMatchObject({ ok: true, already: true })
    // Someone else holding the used link gets nothing.
    h.identity.current = { id: 'auth-x', email: 'alex.owner1@outlook.com', emailConfirmedAt: 'x' }
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(409)
  })

  it('a failure in the middle of acceptance rolls everything back and can be retried', async () => {
    const { request, inv, token } = await invited()
    h.identity.current = alex
    fakeDb.faults['schoolMember.upsert'] = new Error('connection reset')
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(500)
    // (rows are restored from a snapshot on rollback — re-read them)
    expect(T.schoolInvitation!.find(i => i.id === inv.id)!.usedAt).toBeNull()
    expect(T.user).toHaveLength(0)
    expect(T.schoolMember).toHaveLength(0)
    expect(T.claimRequest!.find(r => r.id === request.id)!.status).toBe('IN_PROGRESS')
    delete fakeDb.faults['schoolMember.upsert']
    expect((await completeRoute.POST(req(), p('token', token))).status).toBe(200)
    expect(T.schoolMember).toHaveLength(1)
  })

  it('a pipeline invitation without a school creates exactly one school on acceptance', async () => {
    await pipeline.POST(req({ name: 'Fresh Dojo', email: 'alex.owner1@outlook.com', city: 'Clovis' }))
    const inv = T.schoolInvitation![0]!
    const token = currentToken(inv.id)
    h.identity.current = alex
    await Promise.all([completeRoute.POST(req(), p('token', token)), completeRoute.POST(req(), p('token', token))])
    expect(T.school).toHaveLength(1)
    expect(T.school![0]).toMatchObject({ name: 'Fresh Dojo', status: 'CLAIMED' })
    expect(T.schoolInvitation!.find(i => i.id === inv.id)!.schoolId).toBe(T.school![0]!.id)
    expect(T.schoolMember).toHaveLength(1)
  })

  it('sets the school context cookie for the right school', async () => {
    const { school, token } = await invited()
    h.identity.current = alex
    const res = await completeRoute.POST(req(), p('token', token))
    expect(res.headers.get('set-cookie')).toContain(`currentSchoolId=${school.id}`)
  })
})

// ── 6. Retired paths and navigation ─────────────────────────────────────────

describe('retired paths and navigation links', () => {
  it('legacy onboarding endpoints are gone (410) and old /claim/<invitation id> links do not resolve', async () => {
    expect((await onboardingValidate.GET()).status).toBe(410)
    expect((await onboardingComplete.POST()).status).toBe(410)
    const { inv } = await invited()
    expect((await tokenRoute.GET(req(), p('token', inv.id))).status).toBe(404)
    h.identity.current = alex
    expect((await completeRoute.POST(req(), p('token', inv.id))).status).toBe(410)
  })

  it('admin notice → request detail → linked school: every hop has a stable link', async () => {
    const { school, request } = await linkedRequest()
    expect(h.send.mock.calls[0]![0].html).toContain(`/admin/claims/${request.id}`)
    const list = await json(await adminList.GET(req(undefined, 'https://app.test/api/admin/claim-requests?view=in_progress')))
    expect(list.body.requests[0]).toMatchObject({ id: request.id, school: { id: school.id } })
    const detail = await json(await adminDetail.GET(req(), p('id', request.id)))
    expect(detail.body.school.id).toBe(school.id)
    const { schoolOwnershipHistory } = await import('@/lib/claims/adminViews')
    const history = await schoolOwnershipHistory(school.id)
    expect(history.requests.map(r => r.id)).toEqual([request.id])
  })
})

// ── Audit follow-up (2026-11-23): retry window, frozen content, counters, old links ──

const HOUR = 60 * 60 * 1000
async function uncertainInvitation() {
  const { school, request } = await linkedRequest()
  h.send.mockResolvedValueOnce({ data: null, error: { name: 'application_error', message: 'fetch failed', statusCode: null } })
  const first = await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
  expect(first.body.delivery.kind).toBe('uncertain')
  return { school, request, inv: T.schoolInvitation!.at(-1)! }
}

describe('same-key retry safety', () => {
  it('a same-key retry sends byte-identical content even if school name, language and contact changed in between', async () => {
    const { school, request, inv } = await uncertainInvitation()
    const [firstPayload, firstOpts] = h.send.mock.calls.at(-1)!
    // Everything the template reads changes between attempts.
    school.name = 'Renamed Academy'
    school.language = 'fr'
    const reqRow = T.claimRequest!.find(r => r.id === request.id)!
    reqRow.locale = 'es'
    reqRow.contactName = 'Somebody Else'

    h.send.mockResolvedValueOnce(accepted('email_retry'))
    expect((await action(request.id, { action: 'retry_invitation', invitationId: inv.id })).body.ok).toBe(true)
    const [retryPayload, retryOpts] = h.send.mock.calls.at(-1)!
    expect(retryOpts.idempotencyKey).toBe(firstOpts.idempotencyKey)
    expect(retryPayload).toEqual(firstPayload)
    expect(retryPayload.subject).not.toContain('Renamed')
  })

  it('the frozen payload never stores the raw token; the sent email carries the working link', async () => {
    const { inv } = await uncertainInvitation()
    const stored = JSON.stringify(inv.deliveryPayload)
    const token = currentToken(inv.id)
    expect(stored).not.toContain(token)
    expect(stored).toContain('__MARTIAL_CLAIM_INVITE_URL__')
    const [sent] = h.send.mock.calls.at(-1)!
    expect(sent.html).toContain(`https://app.test/claim/${token}`)
    expect(sent.text).toContain(`https://app.test/claim/${token}`)
    expect(sent.html).not.toContain('__MARTIAL_CLAIM_INVITE_URL__')
  })

  it('within 20 h of the first attempt the retry is allowed; after it, it is refused without calling Resend', async () => {
    const { request, inv } = await uncertainInvitation()
    inv.deliveryKeyAt = new Date(Date.now() - 19 * HOUR)
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'application_error', message: 'fetch failed', statusCode: null } })
    const allowed = await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    expect(allowed.status).toBe(200)
    expect(allowed.body.delivery.kind).toBe('uncertain') // Resend was called again, same key
    expect(inv.deliveryStatus).toBe('UNCERTAIN')
    // A same-key retry does not restart the window.
    expect(Date.now() - inv.deliveryKeyAt.getTime()).toBeGreaterThan(18 * HOUR)

    inv.deliveryKeyAt = new Date(Date.now() - 21 * HOUR)
    const calls = h.send.mock.calls.length
    const refused = await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    expect(refused.status).toBe(409)
    expect(refused.body.code).toBe('RETRY_WINDOW_PASSED')
    expect(h.send.mock.calls.length).toBe(calls)
    expect(inv.deliveryStatus).toBe('UNCERTAIN')

    const detail = await json(await adminDetail.GET(req(), p('id', request.id)))
    expect(detail.body.invitations[0]).toMatchObject({ state: 'uncertain', retryWindowPassed: true })
    expect(JSON.stringify(detail.body)).not.toContain('deliveryPayload')
  })

  it('a stale SENDING lock from days ago is not "safely" retried either', async () => {
    const { request, inv } = await uncertainInvitation()
    inv.deliveryStatus = 'SENDING'
    inv.deliveryStartedAt = new Date(Date.now() - 3 * 24 * HOUR)
    inv.deliveryKeyAt = new Date(Date.now() - 3 * 24 * HOUR)
    const r = await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    expect(r.body.code).toBe('RETRY_WINDOW_PASSED')
  })

  it('after the window, "resend" is the way out: new key, new frozen email, old link dead, new link works', async () => {
    const { request, inv } = await uncertainInvitation()
    const oldToken = currentToken(inv.id)
    const [, oldOpts] = h.send.mock.calls.at(-1)!
    inv.deliveryKeyAt = new Date(Date.now() - 30 * HOUR)
    h.send.mockResolvedValueOnce(accepted('email_new'))
    expect((await action(request.id, { action: 'resend_invitation', invitationId: inv.id })).body.ok).toBe(true)
    const [newPayload, newOpts] = h.send.mock.calls.at(-1)!
    expect(newOpts.idempotencyKey).not.toBe(oldOpts.idempotencyKey)
    expect(Date.now() - inv.deliveryKeyAt.getTime()).toBeLessThan(60_000)
    const newToken = currentToken(inv.id)
    expect(newToken).not.toBe(oldToken)
    expect(newPayload.html).toContain(newToken)
    expect((await tokenRoute.GET(req(), p('token', oldToken))).status).toBe(404)
    expect((await tokenRoute.GET(req(), p('token', newToken))).status).toBe(200)
  })

  it('a retry after a provider rejection is a new key and may use the corrected content', async () => {
    const { school, request } = await linkedRequest()
    h.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'bad', statusCode: 422 } })
    await action(request.id, { action: 'send_invitation', recipientEmail: request.contactEmail })
    const inv = T.schoolInvitation!.at(-1)!
    school.name = 'Corrected Name'
    await action(request.id, { action: 'retry_invitation', invitationId: inv.id })
    const [a, b] = h.send.mock.calls.slice(-2)
    expect(b![1].idempotencyKey).not.toBe(a![1].idempotencyKey)
    expect(b![0].subject).toContain('Corrected Name')
  })
})

describe('dashboard counters share the queue criteria', () => {
  it('every ownership counter equals the length of the list it links to', async () => {
    const { claimQueueCounts } = await import('@/lib/claims/queue')
    await submit({ schoolName: 'Pending One' })
    await submit({ schoolName: 'Pending Two', contactEmail: 'two@example.com' })
    await invited()
    T.claimRequest!.push({ id: 'legacy_1', status: 'RESOLVED', schoolId: null, schoolName: 'Old Closed', city: null, contactName: 'X', contactEmail: 'x@example.com', createdAt: new Date(), resolvedAt: new Date() })
    T.claimRequest!.push({ id: 'legacy_2', status: 'RESOLVED', schoolId: T.school![0]!.id, schoolName: 'Old Linked', city: null, contactName: 'Y', contactEmail: 'y@example.com', createdAt: new Date(), resolvedAt: new Date() })
    const counts = await claimQueueCounts(fakeDb.prisma as any)
    for (const view of ['pending', 'in_progress', 'legacy', 'history'] as const) {
      const list = await json(await adminList.GET(req(undefined, `https://app.test/api/admin/claim-requests?view=${view}`)))
      expect(list.body.requests.length, view).toBe(counts[view])
      expect(list.body.counts[view], view).toBe(counts[view])
    }
    expect(counts).toEqual({ pending: 2, in_progress: 1, legacy: 1, history: 2 })
  })

  it('the incident shape (1 pending request, 0 schools under review) shows 1 to review on the dashboard', async () => {
    await submit()
    const stats = await import('@/app/api/admin/stats/route')
    void stats // stats route is exercised by adminMembershipDriftRouteGuards; here the shared counter itself:
    const { claimQueueCounts, listingReviewCounts } = await import('@/lib/claims/queue')
    expect((await claimQueueCounts(fakeDb.prisma as any)).pending).toBe(1)
    expect((await listingReviewCounts(fakeDb.prisma as any)).total).toBe(0)
  })

  it('invitation indicators: real month boundary, accepted vs sent conversion, and where each "needs action" lives', async () => {
    const { summarizeInvitations } = await import('@/lib/claims/queue')
    const now = new Date('2026-11-23T08:00:00Z')
    const base = { status: 'SENT', deliveryStatus: 'ACCEPTED', deliveryStartedAt: null, expiresAt: new Date('2026-11-25T00:00:00Z'), usedAt: null, revokedAt: null, isActive: true, sentAt: new Date('2026-11-20T00:00:00Z'), registeredAt: null, claimRequestId: 'r1' }
    const s = summarizeInvitations([
      { ...base }, // awaiting
      { ...base, status: 'REGISTERED', usedAt: new Date('2026-11-01T00:00:00Z') }, // accepted this month
      { ...base, status: 'REGISTERED', usedAt: new Date('2026-10-31T23:59:59Z') }, // accepted last month
      { ...base, expiresAt: new Date('2026-11-22T00:00:00Z') }, // expired → needs action
      { ...base, deliveryStatus: 'FAILED', sentAt: null }, // failed
      { ...base, deliveryStatus: 'PREPARED', sentAt: null, claimRequestId: null }, // pipeline, not sent
      { ...base, deliveryStatus: null, claimRequestId: null }, // pre-2026-11 open → old link
      { ...base, revokedAt: new Date() }, // revoked: counts nowhere
    ], now)
    expect(s).toMatchObject({ total: 8, accepted: 2, acceptedThisMonth: 1, awaitingAcceptance: 1, needsAction: 4, needsActionFromRequests: 2, needsActionPipeline: 2 })
    expect(s.needsActionBreakdown).toEqual({ notSent: 1, failed: 1, uncertain: 0, expired: 1, legacyLink: 1 })
    expect(s.conversionRate).toBe(Math.round((2 / 6) * 100))
  })
})

describe('old links are explained, never granted', () => {
  const oldId = 'cmabcdefghijklmnopqrstuvw' // cuid-shaped, like pre-2026-11 /claim/<id> emails
  it('an unused old /claim/<id> link explains itself, records it for the admin, and grants nothing', async () => {
    const { request } = await linkedRequest()
    T.schoolInvitation!.push({ ...T.schoolInvitation![0], id: oldId, status: 'SENT', schoolId: T.school![0]!.id, claimRequestId: request.id, deliveryStatus: null, tokenHash: null, tokenNonce: null, usedAt: null, revokedAt: null, isActive: true, email: 'alex.owner1@outlook.com' })
    const r = await json(await tokenRoute.GET(req(), p('token', oldId)))
    expect(r).toEqual({ status: 410, body: { error: 'LEGACY_LINK' } })
    expect(T.claimRequestEvent!.some(e => e.type === 'LEGACY_LINK_OPENED' && e.claimRequestId === request.id)).toBe(true)
    h.identity.current = alex
    const c = await json(await completeRoute.POST(req(), p('token', oldId)))
    expect(c.status).toBe(410)
    expect(T.schoolMember!.filter(m => m.role === 'OWNER')).toHaveLength(0)
  })

  it('an already accepted old link sends the person to sign in', async () => {
    T.schoolInvitation!.push({ id: oldId, status: 'REGISTERED', usedAt: null, claimRequestId: null, tokenHash: null, isActive: true, revokedAt: null })
    const r = await json(await tokenRoute.GET(req(), p('token', oldId)))
    expect(r.body.error).toBe('LEGACY_USED')
  })

  it('anything else is a plain invalid link', async () => {
    expect((await json(await tokenRoute.GET(req(), p('token', 'cmnotarealinvitationid0000')))).body.error).toBe('NOT_FOUND')
    expect((await json(await tokenRoute.GET(req(), p('token', 'garbage')))).body.error).toBe('NOT_FOUND')
  })
})
