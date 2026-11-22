/**
 * Permissions and school isolation for the campaign send paths: /process only
 * sends a campaign of the caller's current school with campaigns.manage;
 * the detail endpoint only shows its own school's campaign; the cron needs
 * CRON_SECRET and recovers abandoned claims before sending.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getAuthUser = vi.fn()
const getCurrentSchoolId = vi.fn()
const requireSchoolAccess = vi.fn()
const memberHasPermission = vi.fn()
const processPending = vi.fn()
const recoverAll = vi.fn()
const summarize = vi.fn()
const getPause = vi.fn()
const campaignFindFirst = vi.fn()
const campaignFindMany = vi.fn()

vi.mock('@/lib/auth/server', () => ({ getAuthUser, getCurrentSchoolId }))
vi.mock('@/lib/auth/contexts', () => ({ requireSchoolAccess }))
vi.mock('@/lib/auth/customRoles', () => ({ memberHasPermission }))
vi.mock('@/lib/services/campaigns', () => ({ processPendingCampaignRecipients: processPending }))
vi.mock('@/lib/services/campaignDelivery', () => ({
  recoverAllExpiredClaims: recoverAll,
  prismaCampaignDeliveryRepo: { summarize },
}))
vi.mock('@/lib/email/rateLimiter', () => ({ BULK_LANE: 'resend:bulk', prismaRateLimitStore: { getPause } }))
vi.mock('@/lib/db', () => ({
  prisma: {
    campaign: { findFirst: campaignFindFirst, findMany: campaignFindMany },
    campaignRecipient: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
  },
}))

const processRoute = await import('@/app/api/dashboard/campaigns/[id]/process/route')
const detailRoute = await import('@/app/api/dashboard/campaigns/[id]/route')
const cronRoute = await import('@/app/api/cron/campaign-send/route')

const params = (id: string) => ({ params: Promise.resolve({ id }) })
const post = () => new NextRequest('http://localhost/api/dashboard/campaigns/c1/process', { method: 'POST' })

beforeEach(() => {
  vi.clearAllMocks()
  getAuthUser.mockResolvedValue({ id: 'u1', role: 'USER' })
  getCurrentSchoolId.mockResolvedValue('schoolA')
  requireSchoolAccess.mockResolvedValue({ id: 'm1', role: 'ADMIN' })
  memberHasPermission.mockResolvedValue(true)
  processPending.mockResolvedValue({ processed: 1, sent: 1, failed: 0, remaining: 0 })
  summarize.mockResolvedValue({ pending: 0, sending: 0, sent: 1, failed: 0, uncertain: 0, skipped: 0, retryScheduled: 0, nextAttemptAt: null })
  getPause.mockResolvedValue(null)
})

describe('POST /process', () => {
  it('401 without a session', async () => {
    getAuthUser.mockResolvedValue(null)
    expect((await processRoute.POST(post(), params('c1'))).status).toBe(401)
    expect(processPending).not.toHaveBeenCalled()
  })
  it('403 without school.campaigns.manage', async () => {
    memberHasPermission.mockResolvedValue(false)
    expect((await processRoute.POST(post(), params('c1'))).status).toBe(403)
    expect(memberHasPermission).toHaveBeenCalledWith(expect.anything(), 'school.campaigns.manage')
    expect(processPending).not.toHaveBeenCalled()
  })
  it('403 when not a member of the current school', async () => {
    requireSchoolAccess.mockRejectedValue(new Error('no access'))
    expect((await processRoute.POST(post(), params('c1'))).status).toBe(403)
    expect(processPending).not.toHaveBeenCalled()
  })
  it("404 for another school's campaign — lookup is scoped to the current school", async () => {
    campaignFindFirst.mockResolvedValue(null)
    expect((await processRoute.POST(post(), params('campaign-of-B'))).status).toBe(404)
    expect(campaignFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'campaign-of-B', schoolId: 'schoolA' } }))
    expect(processPending).not.toHaveBeenCalled()
  })
  it('sends its own campaign within the request budget', async () => {
    campaignFindFirst.mockResolvedValue({ id: 'c1' })
    const res = await processRoute.POST(post(), params('c1'))
    expect(res.status).toBe(200)
    expect(processPending).toHaveBeenCalledWith('c1', { budgetMs: 40_000 })
  })
})

describe('GET detail', () => {
  it("404 for another school's campaign", async () => {
    campaignFindFirst.mockResolvedValue(null)
    const res = await detailRoute.GET(new NextRequest('http://localhost/x'), params('campaign-of-B'))
    expect(res.status).toBe(404)
    expect(campaignFindFirst).toHaveBeenCalledWith({ where: { id: 'campaign-of-B', schoolId: 'schoolA' } })
    expect(summarize).not.toHaveBeenCalled()
  })
  it('includes the delivery summary and only quota/config waits (not transient 429 pauses)', async () => {
    campaignFindFirst.mockResolvedValue({ id: 'c1', status: 'SENDING' })
    summarize.mockResolvedValue({ pending: 25, sending: 0, sent: 24, failed: 0, uncertain: 0, skipped: 0, retryScheduled: 25, nextAttemptAt: new Date('2026-11-21T00:01:00Z') })
    getPause.mockResolvedValue({ reason: 'DAILY_QUOTA', until: new Date('2026-11-21T00:01:00Z'), detail: 'x' })
    const body = await (await detailRoute.GET(new NextRequest('http://localhost/x'), params('c1'))).json()
    expect(body.delivery).toMatchObject({ pending: 25, retryScheduled: 25, waiting: { reason: 'DAILY_QUOTA', until: '2026-11-21T00:01:00.000Z' } })
    expect(body.delivery.waiting).not.toHaveProperty('detail')

    getPause.mockResolvedValue({ reason: 'RATE_LIMIT', until: new Date(), detail: 'x' })
    const body2 = await (await detailRoute.GET(new NextRequest('http://localhost/x'), params('c1'))).json()
    expect(body2.delivery.waiting).toBeNull()
  })
  it('403 without campaigns.view', async () => {
    memberHasPermission.mockResolvedValue(false)
    expect((await detailRoute.GET(new NextRequest('http://localhost/x'), params('c1'))).status).toBe(403)
  })
})

describe('cron campaign-send', () => {
  it('requires CRON_SECRET', async () => {
    process.env.CRON_SECRET = 's3cret'
    const res = await cronRoute.GET(new NextRequest('http://localhost/api/cron/campaign-send'))
    expect(res.status).toBe(401)
    expect(recoverAll).not.toHaveBeenCalled()
  })
  it('recovers abandoned claims, then stops at the first quota wait', async () => {
    process.env.CRON_SECRET = 's3cret'
    campaignFindMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }])
    recoverAll.mockResolvedValue(1)
    processPending.mockResolvedValueOnce({ processed: 3, sent: 3, failed: 0, remaining: 5, waiting: { reason: 'DAILY_QUOTA', until: 'x' } })
    const res = await cronRoute.GET(new NextRequest('http://localhost/api/cron/campaign-send', { headers: { authorization: 'Bearer s3cret' } }))
    const body = await res.json()
    expect(recoverAll).toHaveBeenCalledTimes(1)
    expect(processPending).toHaveBeenCalledTimes(1)
    expect(body).toMatchObject({ campaigns: 2, processed: 3, recovered: 1, waiting: { reason: 'DAILY_QUOTA' } })
  })
})
