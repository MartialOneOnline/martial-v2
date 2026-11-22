/**
 * Units around reliable campaign delivery: Resend response classification,
 * limiter config/semantics, the client polling loop, the recovery plan for
 * the 20/11 Roger Gracie Málaga campaign, and the SQL the Postgres repo and
 * limiter issue (shape only — no database in tests).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const queryRaw = vi.fn()
const executeRaw = vi.fn()
vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: queryRaw, $executeRaw: executeRaw } }))

const { classifySendResponse, retryAfterMs, quotaUsed } = await import('@/lib/email/resendOutcome')
const { bulkRateConfigFromEnv, bulkSpacingMs, nextUtcMidnight, createMemoryRateLimitStore, prismaRateLimitStore } = await import('@/lib/email/rateLimiter')
const { pollCampaignProcess } = await import('@/lib/campaignPolling')
const { planRecovery, classifyOldFailure } = await import('@/lib/campaignRecovery')
const { prismaCampaignDeliveryRepo } = await import('@/lib/services/campaignDelivery')

const NOW = Date.UTC(2026, 10, 20, 18, 0, 0)
const err = (name: string, statusCode: number | null, message = name, headers: Record<string, string> | null = {}) =>
  ({ data: null, error: { name, statusCode, message }, headers })

describe('classifySendResponse', () => {
  it('accepted', () => {
    expect(classifySendResponse({ data: { id: 'e1' }, error: null, headers: {} }, NOW)).toEqual({ kind: 'accepted', id: 'e1' })
  })
  it('429 rate limit with Retry-After seconds / HTTP date / ratelimit-reset', () => {
    expect(classifySendResponse(err('rate_limit_exceeded', 429, 'x', { 'retry-after': '2' }), NOW)).toMatchObject({ kind: 'rate_limited', retryAfterMs: 2000 })
    expect(retryAfterMs({ 'Retry-After': new Date(NOW + 3000).toUTCString() }, NOW)).toBe(3000)
    expect(retryAfterMs({ 'ratelimit-reset': '1' }, NOW)).toBe(1000)
    expect(retryAfterMs({}, NOW)).toBeNull()
  })
  it('quotas', () => {
    expect(classifySendResponse(err('daily_quota_exceeded', 429), NOW)).toMatchObject({ kind: 'quota', scope: 'daily' })
    expect(classifySendResponse(err('monthly_quota_exceeded', 429), NOW)).toMatchObject({ kind: 'quota', scope: 'monthly' })
  })
  it('network error / abort (statusCode null) and 5xx are uncertain', () => {
    expect(classifySendResponse(err('application_error', null, 'Unable to fetch data. The request could not be resolved.', null), NOW).kind).toBe('uncertain')
    expect(classifySendResponse(err('internal_server_error', 500), NOW).kind).toBe('uncertain')
    expect(classifySendResponse(err('application_error', 503), NOW).kind).toBe('uncertain')
    expect(classifySendResponse({ data: null, error: null, headers: {} } as never, NOW).kind).toBe('uncertain')
  })
  it('idempotency in flight → uncertain; changed body → conflict', () => {
    expect(classifySendResponse(err('concurrent_idempotent_requests', 409), NOW).kind).toBe('uncertain')
    expect(classifySendResponse(err('invalid_idempotent_request', 409), NOW).kind).toBe('idempotency_conflict')
  })
  it('config vs permanent', () => {
    expect(classifySendResponse(err('missing_api_key', 401), NOW).kind).toBe('config')
    expect(classifySendResponse(err('restricted_api_key', 403), NOW).kind).toBe('config')
    expect(classifySendResponse(err('validation_error', 422, 'Invalid `to`'), NOW)).toMatchObject({ kind: 'permanent', message: 'Invalid `to`' })
    expect(classifySendResponse(err('validation_error', 403, 'domain not verified'), NOW).kind).toBe('permanent')
  })
  it('quota headers (used counts)', () => {
    expect(quotaUsed({ 'x-resend-daily-quota': '42' }, 'daily')).toBe(42)
    expect(quotaUsed({}, 'monthly')).toBeNull()
  })
})

describe('limiter config and memory store', () => {
  beforeEach(() => {
    for (const k of ['RESEND_RATE_LIMIT_PER_SECOND', 'RESEND_BULK_SHARE', 'RESEND_DAILY_QUOTA', 'RESEND_MONTHLY_QUOTA', 'RESEND_QUOTA_RESERVE']) delete process.env[k]
  })
  it('defaults: Resend team default 10 req/s, half for bulk, quotas unknown', () => {
    expect(bulkRateConfigFromEnv()).toEqual({ teamRatePerSecond: 10, bulkShare: 0.5, dailyQuota: null, monthlyQuota: null, quotaReserve: 10 })
  })
  it('quotas and rate come from env, never hard-coded per plan', () => {
    process.env.RESEND_RATE_LIMIT_PER_SECOND = '20'
    process.env.RESEND_BULK_SHARE = '0.25'
    process.env.RESEND_DAILY_QUOTA = '100'
    process.env.RESEND_MONTHLY_QUOTA = '3000'
    const cfg = bulkRateConfigFromEnv()
    expect(cfg).toMatchObject({ teamRatePerSecond: 20, bulkShare: 0.25, dailyQuota: 100, monthlyQuota: 3000 })
    expect(bulkSpacingMs(cfg)).toBe(200)
    process.env.RESEND_BULK_SHARE = '7' // invalid share ignored
    expect(bulkRateConfigFromEnv().bulkShare).toBe(0.5)
  })
  it('next UTC midnight (daily quota is a UTC calendar day)', () => {
    expect(new Date(nextUtcMidnight(Date.UTC(2026, 10, 20, 23, 59))).toISOString()).toBe('2026-11-21T00:01:00.000Z')
    expect(new Date(nextUtcMidnight(Date.UTC(2026, 11, 31, 5))).toISOString()).toBe('2027-01-01T00:01:00.000Z')
  })
  it('reserve refuses slots beyond maxWait and reports the pause; pauses never shorten', async () => {
    let t = NOW
    const store = createMemoryRateLimitStore(() => t)
    expect(await store.reserve('k', 200, 1000)).toEqual({ ok: true, waitMs: 0 })
    expect(await store.reserve('k', 200, 1000)).toEqual({ ok: true, waitMs: 200 })
    await store.pause('k', t + 60_000, 'DAILY_QUOTA', 'quota')
    await store.pause('k', t + 1_000, 'RATE_LIMIT', 'short') // ignored: shorter
    const r = await store.reserve('k', 200, 1000)
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.pause?.reason).toBe('DAILY_QUOTA')
    t += 61_000
    expect((await store.reserve('k', 200, 1000)).ok).toBe(true)
    expect(await store.getPause('k')).toBeNull()
  })
})

describe('Postgres SQL shape', () => {
  beforeEach(() => { queryRaw.mockReset(); executeRaw.mockReset() })
  const sqlOf = (call: unknown[]) => (call[0] as TemplateStringsArray).join('?')

  it('claim is one UPDATE over a SKIP LOCKED subselect, gated on campaign SENDING and due time', async () => {
    queryRaw.mockResolvedValueOnce([])
    await prismaCampaignDeliveryRepo.claimNext('c1', 'tok', new Date(NOW), 120_000)
    const sql = sqlOf(queryRaw.mock.calls[0]!)
    expect(sql).toMatch(/UPDATE "campaign_recipients" r/)
    expect(sql).toMatch(/FOR UPDATE OF r2 SKIP LOCKED/)
    expect(sql).toMatch(/c\."status" = 'SENDING'/)
    expect(sql).toMatch(/"nextAttemptAt" IS NULL OR r2\."nextAttemptAt" <=/)
    expect(sql).toMatch(/"attempts" = r\."attempts" \+ 1/)
    expect(queryRaw.mock.calls[0]!.slice(1)).toContain('c1')
  })
  it('recovery marks expired SENDING claims as uncertain (keeps the idempotency key)', async () => {
    executeRaw.mockResolvedValueOnce(2)
    expect(await prismaCampaignDeliveryRepo.recoverExpiredClaims(null, new Date(NOW))).toBe(2)
    const sql = sqlOf(executeRaw.mock.calls[0]!)
    expect(sql).toMatch(/"uncertainSince" = COALESCE\("uncertainSince", "lastAttemptAt"/)
    expect(sql).not.toMatch(/idempotencyGen/)
    expect(sql).toMatch(/"status" = 'SENDING'\s+AND "claimedUntil" </)
  })
  it('limiter reserve is a single upsert using the database clock', async () => {
    queryRaw.mockResolvedValueOnce([{ reserved: true, wait_ms: 150, paused_until: null, pause_reason: null, pause_detail: null }])
    expect(await prismaRateLimitStore.reserve('resend:bulk', 200, 10_000)).toEqual({ ok: true, waitMs: 150 })
    const sql = sqlOf(queryRaw.mock.calls[0]!)
    expect(sql).toMatch(/clock_timestamp\(\) AT TIME ZONE 'UTC'/)
    expect(sql).toMatch(/ON CONFLICT \("key"\) DO UPDATE/)
    expect(sql).toMatch(/COALESCE\("email_rate_limits"\."pausedUntil"/)
    queryRaw.mockResolvedValueOnce([{ reserved: false, wait_ms: 5000, paused_until: new Date(NOW + 5000), pause_reason: 'RATE_LIMIT', pause_detail: null }])
    expect(await prismaRateLimitStore.reserve('resend:bulk', 200, 1_000)).toMatchObject({ ok: false, pause: { reason: 'RATE_LIMIT' } })
  })
})

describe('pollCampaignProcess', () => {
  const mk = (responses: object[]) => {
    let t = NOW
    const calls: number[] = []
    const fetch = vi.fn(async () => {
      calls.push(t)
      const body = responses.shift() ?? { processed: 0, sent: 0, failed: 0, remaining: 0 }
      return { ok: true, json: async () => body } as Response
    })
    return { fetch, calls, deps: { fetch: fetch as unknown as typeof globalThis.fetch, sleep: async (ms: number) => { t += ms }, now: () => t } }
  }
  it('accumulates progress and stops when nothing remains', async () => {
    const w = mk([{ processed: 3, sent: 2, failed: 1, remaining: 2 }, { processed: 2, sent: 2, failed: 0, remaining: 0 }])
    const out = await pollCampaignProcess('c1', undefined, {}, w.deps)
    expect(out).toMatchObject({ sent: 4, failed: 1, remaining: 0, finished: true })
  })
  it('waits for a short scheduled retry, stops on a long one or a quota wait', async () => {
    const short = mk([
      { processed: 0, sent: 0, failed: 0, remaining: 1, nextAttemptAt: new Date(NOW + 5_000).toISOString() },
      { processed: 1, sent: 1, failed: 0, remaining: 0 },
    ])
    await pollCampaignProcess('c1', undefined, {}, short.deps)
    expect(short.calls[1]! - short.calls[0]!).toBe(5_000)

    const long = mk([{ processed: 0, sent: 0, failed: 0, remaining: 1, nextAttemptAt: new Date(NOW + 10 * 60_000).toISOString() }])
    expect((await pollCampaignProcess('c1', undefined, {}, long.deps)).finished).toBe(false)
    expect(long.fetch).toHaveBeenCalledTimes(1)

    const quota = mk([{ processed: 1, sent: 1, failed: 0, remaining: 5, waiting: { reason: 'DAILY_QUOTA', until: '2026-11-21T00:01:00.000Z' } }])
    expect((await pollCampaignProcess('c1', undefined, {}, quota.deps)).waiting?.reason).toBe('DAILY_QUOTA')
    expect(quota.fetch).toHaveBeenCalledTimes(1)
  })
  it('surfaces API errors (e.g. 403)', async () => {
    const fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'Forbidden' }) }) as Response)
    await expect(pollCampaignProcess('c1', undefined, {}, { fetch: fetch as never, sleep: async () => {}, now: () => NOW })).rejects.toThrow('Forbidden')
  })
})

describe('recovery plan for the 20/11 campaign (49 = 24 SENT + 25 FAILED)', () => {
  const RL = 'You have exceeded the rate limit, which is 10 requests per second.'
  const rows = [
    ...Array.from({ length: 24 }, (_, i) => ({ id: `sent${i}`, status: 'SENT', failedReason: null, resendEmailId: `e${i}`, email: `s${i}@x.com` })),
    ...Array.from({ length: 22 }, (_, i) => ({ id: `rl${i}`, status: 'FAILED', failedReason: RL, resendEmailId: null, email: `f${i}@x.com` })),
    { id: 'net', status: 'FAILED', failedReason: 'Unable to fetch data. The request could not be resolved.', resendEmailId: null, email: 'n@x.com' },
    { id: 'val', status: 'FAILED', failedReason: 'Invalid `to` field.', resendEmailId: null, email: 'bad' },
    { id: 'rlid', status: 'FAILED', failedReason: RL, resendEmailId: 'e-odd', email: 'o@x.com' },
  ]
  it('groups by reason and requeues only confirmed rate-limit rows without acceptance evidence', () => {
    const plan = planRecovery(rows, new Map([['rl0', 'Resend log has email e99']]))
    expect(plan.groups.RATE_LIMIT!.count).toBe(23)
    expect(plan.groups.NETWORK_OR_UNKNOWN!.count).toBe(1)
    expect(plan.groups.OTHER!.count).toBe(1)
    expect(plan.recover).toHaveLength(21) // 23 − rl0 (found in Resend log) − rlid (has resendEmailId)
    expect(plan.recover.some(id => id.startsWith('sent'))).toBe(false)
    expect(plan.recover).not.toContain('net')
    expect(plan.excludedWithEvidence.map(e => e.id).sort()).toEqual(['rl0', 'rlid'])
  })
  it('is idempotent: once requeued (no longer FAILED) a second plan is empty', () => {
    const after = rows.map(r => (r.id.startsWith('rl') && !r.resendEmailId ? { ...r, status: 'PENDING' } : r))
    expect(planRecovery(after).recover).toEqual([])
  })
  it('classifies the messages seen in production', () => {
    expect(classifyOldFailure(RL)).toBe('RATE_LIMIT')
    expect(classifyOldFailure('Too many requests. Please limit the number of requests per second.')).toBe('RATE_LIMIT')
    expect(classifyOldFailure('You have exceeded your daily email sending quota.')).toBe('DAILY_QUOTA')
    expect(classifyOldFailure(null)).toBe('NETWORK_OR_UNKNOWN')
  })
})
