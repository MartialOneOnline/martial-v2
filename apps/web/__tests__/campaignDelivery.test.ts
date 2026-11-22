/**
 * Reliable campaign delivery (lib/services/campaignDelivery.ts) against a
 * simulated Resend, a simulated recipients table and a virtual clock.
 *
 * Origin: campaign «Libre — 20/11/2026» of Roger Gracie Málaga — 49
 * recipients, 24 SENT and 25 FAILED with Resend's 429 "You have exceeded the
 * rate limit, which is 10 requests per second": CONCURRENCY=5 bounded parallel
 * sends but not requests per second, and every error was final.
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ prisma: {} }))

const { deliverCampaign, idempotencyKeyFor, backoffMs, DEFAULT_DELIVERY_CONFIG } = await import('@/lib/services/campaignDelivery')
const { BULK_LANE, nextUtcMidnight, bulkSpacingMs } = await import('@/lib/email/rateLimiter')
const { makeWorld, rateLimited } = await import('./helpers/campaignDeliverySim')

const emails = (n: number, prefix = 's') => Array.from({ length: n }, (_, i) => ({ email: `${prefix}${i}@example.com` }))

describe('shared pacing', () => {
  it('two campaigns on two workers share one lane: no two requests closer than the bulk spacing', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(15, 'a'))
    w.repo.addCampaign('B', 'school2', emails(15, 'b'))
    // Each deliverCampaign call is a separate "instance": own token, own lanes.
    await Promise.all([deliverCampaign('A', { budgetMs: 40_000 }, w.deps()), deliverCampaign('B', { budgetMs: 40_000 }, w.deps())])

    const slots = [...w.limiter.reservations].sort((a, b) => a - b)
    expect(slots).toHaveLength(30)
    const spacing = bulkSpacingMs({ teamRatePerSecond: 10, bulkShare: 0.5, dailyQuota: null, monthlyQuota: null, quotaReserve: 10 })
    expect(spacing).toBe(200) // 5 req/s for bulk, 5 req/s left for transactional
    for (let i = 1; i < slots.length; i++) expect(slots[i]! - slots[i - 1]!).toBeGreaterThanOrEqual(spacing)
    // No window of one second holds more than the bulk share.
    for (const s of slots) expect(slots.filter(x => x >= s && x < s + 1000).length).toBeLessThanOrEqual(5)
    expect(w.resend.delivered).toHaveLength(30)
  })

  it('a 429 pauses the lane for every worker until Retry-After', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(3, 'a'))
    w.resend.behaviour = ({ n }) => (n === 1 ? { type: 'error', res: rateLimited(5) } : { type: 'accept' })
    const start = w.clock.now()
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    // Requests after the 429 were not made before the 5s pause ended.
    const after = w.resend.calls.slice(1)
    expect(after.length).toBeGreaterThan(0)
    for (const c of after) expect(c.at).toBeGreaterThanOrEqual(start + 5_000)
  })
})

describe('claims', () => {
  it('/process and cron running together never send the same recipient twice', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(20))
    const [r1, r2] = await Promise.all([
      deliverCampaign('A', { budgetMs: 40_000 }, w.deps()),
      deliverCampaign('A', { budgetMs: 40_000, limit: 200 }, w.deps()),
    ])
    const perRecipient = new Map<string, number>()
    for (const c of w.resend.calls) perRecipient.set(c.to, (perRecipient.get(c.to) ?? 0) + 1)
    expect(perRecipient.size).toBe(20)
    expect([...perRecipient.values()].every(n => n === 1)).toBe(true)
    expect(r1.sent + r2.sent).toBe(20)
    expect(w.repo.campaigns.get('A')!.sentCount).toBe(20)
  })

  it('a settle with a stale token (lease taken over) is ignored', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    await w.repo.startSending('A')
    const claimed = await w.repo.claimNext('A', 'tok1', new Date(w.clock.now()), 1000)
    expect(claimed).not.toBeNull()
    expect(await w.repo.settle(claimed!.id, 'other-token', { status: 'FAILED' })).toBe(false)
    expect(w.repo.row(claimed!.id).status).toBe('SENDING')
  })
})

describe('retries', () => {
  it('429 then success: rescheduled with backoff ≥ Retry-After, new key generation, then SENT', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = ({ n }) => (n === 1 ? { type: 'error', res: rateLimited(30) } : { type: 'accept' })
    const t0 = w.clock.now()
    const first = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    const row = w.repo.rows[0]!
    expect(first.retrying).toBe(1)
    expect(row.status).toBe('PENDING')
    expect(row.nextAttemptAt! - t0).toBeGreaterThanOrEqual(30_000)
    expect(row.idempotencyGen).toBe(1) // confirmed non-acceptance → fresh key is safe
    expect(row.failedReason).toContain('rate limit')
    expect(first.remaining).toBe(1)
    expect(first.completed).toBe(false)

    w.clock.advance(31_000)
    const second = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(second.sent).toBe(1)
    expect(row.status).toBe('SENT')
    expect(row.failedReason).toBeNull()
    expect(w.resend.calls.map(c => c.key)).toEqual([idempotencyKeyFor(row.id, 0), idempotencyKeyFor(row.id, 1)])
    expect(w.repo.campaigns.get('A')!.status).toBe('COMPLETED')
  })

  it('retry not due yet → nothing is sent and nextAttemptAt is reported', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = () => ({ type: 'error', res: rateLimited(120) })
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    const calls = w.resend.calls.length
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.resend.calls.length).toBe(calls)
    expect(res.processed).toBe(0)
    expect(res.retryScheduled).toBe(1)
    expect(res.nextAttemptAt).not.toBeNull()
  })

  it('attempts exhausted on repeated 429 → FAILED with the reason', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = () => ({ type: 'error', res: rateLimited() })
    for (let i = 0; i < DEFAULT_DELIVERY_CONFIG.maxAttempts + 2; i++) {
      await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
      w.clock.advance(DEFAULT_DELIVERY_CONFIG.backoffCapMs + 1_000)
    }
    const row = w.repo.rows[0]!
    expect(w.resend.calls).toHaveLength(DEFAULT_DELIVERY_CONFIG.maxAttempts)
    expect(row.status).toBe('FAILED')
    expect(row.lastErrorCode).toBe('retries_exhausted')
    expect(row.failedReason).toContain('rate limit')
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', failedCount: 1, sentCount: 0 })
  })

  it('backoff grows, is capped and jittered', () => {
    const cfg = DEFAULT_DELIVERY_CONFIG
    expect(backoffMs(1, cfg, () => 0)).toBe(1_000)
    expect(backoffMs(1, cfg, () => 1)).toBe(2_000)
    expect(backoffMs(3, cfg, () => 1)).toBe(8_000)
    expect(backoffMs(30, cfg, () => 1)).toBe(cfg.backoffCapMs)
  })
})

describe('quotas', () => {
  it('daily quota: waits until 00:01 UTC without burning attempts, then resumes', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(3))
    let quotaHit = true
    w.resend.behaviour = () => quotaHit
      ? { type: 'error', res: { data: null, error: { name: 'daily_quota_exceeded', statusCode: 429, message: 'You have exceeded your daily email sending quota.' }, headers: {} } }
      : { type: 'accept' }
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    const midnight = nextUtcMidnight(w.clock.now())
    expect(res.waiting).toEqual({ reason: 'DAILY_QUOTA', until: new Date(midnight).toISOString() })
    expect(w.resend.calls).toHaveLength(1) // stopped after the first quota error, didn't hammer
    expect(w.repo.rows.every(r => r.status === 'PENDING' && r.attempts === 0)).toBe(true)
    expect(w.repo.rows[0]!.nextAttemptAt).toBe(midnight)
    expect(w.repo.campaigns.get('A')!.status).toBe('SENDING') // not COMPLETED: work is kept

    // Before the reset: nothing is attempted, even for rows never tried.
    w.clock.advance(60_000)
    const again = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(again.processed).toBe(0)
    expect(again.waiting?.reason).toBe('DAILY_QUOTA')
    expect(w.resend.calls).toHaveLength(1)

    quotaHit = false
    w.clock.t = midnight + 1
    const after = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(after.sent).toBe(3)
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', sentCount: 3, failedCount: 0 })
  })

  it('monthly quota pauses for a day and is probed again', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = ({ n }) => n === 1
      ? { type: 'error', res: { data: null, error: { name: 'monthly_quota_exceeded', statusCode: 429, message: 'You have exceeded your monthly email sending quota.' }, headers: {} } }
      : { type: 'accept' }
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(res.waiting?.reason).toBe('MONTHLY_QUOTA')
    w.clock.advance(DEFAULT_DELIVERY_CONFIG.monthlyPauseMs + 1)
    expect((await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())).sent).toBe(1)
  })

  it('configured quota reserve stops bulk sending before transactional mail is starved', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(6))
    let used = 85
    const send = w.resend.send
    const deps = w.deps({
      rate: { teamRatePerSecond: 10, bulkShare: 0.5, dailyQuota: 100, monthlyQuota: null, quotaReserve: 10 },
      send: async (p, o) => { const r = await send(p, o); return { ...r, headers: { 'x-resend-daily-quota': String(++used) } } },
    })
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, { ...deps, config: { ...deps.config, lanes: 1 } })
    expect(res.sent).toBe(5) // 86..90 sent; at 90 (= 100 − 10 reserve) the lane pauses
    expect(res.waiting?.reason).toBe('DAILY_QUOTA')
    expect(w.repo.rows.filter(r => r.status === 'PENDING')).toHaveLength(1)
  })

  it('API key problems pause everything instead of failing every recipient', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(4))
    w.resend.behaviour = () => ({ type: 'error', res: { data: null, error: { name: 'invalid_api_key', statusCode: 403, message: 'API key is invalid' }, headers: {} } })
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(res.waiting?.reason).toBe('CONFIG')
    expect(w.repo.rows.every(r => r.status === 'PENDING')).toBe(true)
  })
})

describe('definitive and uncertain outcomes', () => {
  it('validation rejection → FAILED once, with the provider message', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(2))
    w.resend.behaviour = ({ payload }) => payload.to === 's0@example.com'
      ? { type: 'error', res: { data: null, error: { name: 'validation_error', statusCode: 422, message: 'Invalid `to` field.' }, headers: {} } }
      : { type: 'accept' }
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.resend.calls.filter(c => c.to === 's0@example.com')).toHaveLength(1)
    expect(w.repo.rows[0]!).toMatchObject({ status: 'FAILED', failedReason: 'Invalid `to` field.', lastStatusCode: 422 })
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', sentCount: 1, failedCount: 1 })
  })

  it('response lost after acceptance → retried with the SAME key → one email, SENT', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = ({ n }) => (n === 1 ? { type: 'accept_then_lose' } : { type: 'accept' })
    const first = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    const row = w.repo.rows[0]!
    expect(first.retrying).toBe(1)
    expect(row.status).toBe('PENDING')
    expect(row.uncertainSince).not.toBeNull()
    expect(row.idempotencyGen).toBe(0)
    w.clock.advance(DEFAULT_DELIVERY_CONFIG.backoffCapMs)
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.resend.calls.map(c => c.key)).toEqual([idempotencyKeyFor(row.id, 0), idempotencyKeyFor(row.id, 0)])
    expect(w.resend.delivered).toHaveLength(1)
    expect(row).toMatchObject({ status: 'SENT', resendEmailId: w.resend.delivered[0]!.id, uncertainSince: null })
  })

  it('a later 429 after an unknown outcome keeps the key (the first request may have gone out)', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = ({ n }) => n === 1 ? { type: 'accept_then_lose' } : n === 2 ? { type: 'error', res: rateLimited(1) } : { type: 'accept' }
    for (let i = 0; i < 3; i++) { await deliverCampaign('A', { budgetMs: 40_000 }, w.deps()); w.clock.advance(DEFAULT_DELIVERY_CONFIG.backoffCapMs) }
    const row = w.repo.rows[0]!
    expect(new Set(w.resend.calls.map(c => c.key)).size).toBe(1)
    expect(w.resend.delivered).toHaveLength(1)
    expect(row.status).toBe('SENT')
  })

  it('unknown outcome past the idempotency window → UNCERTAIN, not resent', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = () => ({ type: 'accept_then_lose' })
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    w.clock.advance(DEFAULT_DELIVERY_CONFIG.idempotencyWindowMs + 1)
    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.resend.calls).toHaveLength(1)
    expect(res.uncertain).toBe(1)
    expect(w.repo.rows[0]!).toMatchObject({ status: 'UNCERTAIN', lastErrorCode: 'uncertain_window_expired' })
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', failedCount: 1 })
  })

  it('timeouts/5xx exhausting attempts end UNCERTAIN, never FAILED', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.resend.behaviour = () => ({ type: 'error', res: { data: null, error: { name: 'internal_server_error', statusCode: 500, message: 'boom' }, headers: {} } })
    for (let i = 0; i < DEFAULT_DELIVERY_CONFIG.maxAttempts + 1; i++) { await deliverCampaign('A', { budgetMs: 40_000 }, w.deps()); w.clock.advance(DEFAULT_DELIVERY_CONFIG.backoffCapMs + 1) }
    expect(w.repo.rows[0]!.status).toBe('UNCERTAIN')
    expect(new Set(w.resend.calls.map(c => c.key)).size).toBe(1)
  })

  it('409 invalid_idempotent_request → UNCERTAIN (never a blind resend with a new key)', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', [{ email: 's0@example.com', name: 'Ana' }])
    w.resend.behaviour = ({ n }) => (n === 1 ? { type: 'accept_then_lose' } : { type: 'accept' })
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    w.repo.rows[0]!.name = 'Ana María' // body changes between attempts
    w.clock.advance(DEFAULT_DELIVERY_CONFIG.backoffCapMs)
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.repo.rows[0]!.status).toBe('UNCERTAIN')
    expect(w.resend.delivered).toHaveLength(1)
  })

  it('DB failure saving SENT: not counted as rejected; lease expiry reconciles with the same key, one email', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(1))
    w.repo.settleFailures = 3
    w.repo.settleFailWhen = d => d.status === 'SENT'
    const first = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    const row = w.repo.rows[0]!
    expect(first.unsaved).toBe(1)
    expect(first.failed).toBe(0)
    expect(row.status).toBe('SENDING')
    expect(w.logs.some(l => l.includes('accepted but not saved'))).toBe(true)

    // Lease still valid: nobody touches it.
    expect((await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())).processed).toBe(0)

    w.clock.advance(DEFAULT_DELIVERY_CONFIG.leaseMs + 1)
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.resend.calls.map(c => c.key)).toEqual([idempotencyKeyFor(row.id, 0), idempotencyKeyFor(row.id, 0)])
    expect(w.resend.delivered).toHaveLength(1)
    expect(row.status).toBe('SENT')
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', sentCount: 1, failedCount: 0 })
  })

  it('worker killed mid-send (row left SENDING) is recovered and finished without duplicates', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(3))
    // The worker sends r0 and dies before writing the result (never resolves).
    w.repo.hangNextSettle = true
    void deliverCampaign('A', { budgetMs: 40_000, limit: 1 }, w.deps({ config: { ...DEFAULT_DELIVERY_CONFIG, lanes: 1 } }))
    for (let i = 0; i < 20; i++) await Promise.resolve()
    const r0 = w.repo.rows[0]!
    expect(r0.status).toBe('SENDING')
    expect(w.resend.delivered).toHaveLength(1)
    const c = { id: r0.id, email: r0.email }
    w.clock.advance(DEFAULT_DELIVERY_CONFIG.leaseMs + 1)

    const res = await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(res.completed).toBe(true)
    expect(w.repo.rows.every(r => r.status === 'SENT')).toBe(true)
    // r0 was retried with its original key (Resend replays), so still one email each.
    expect(w.resend.calls.filter(x => x.to === c.email).map(x => x.key)).toEqual([idempotencyKeyFor(c.id, 0), idempotencyKeyFor(c.id, 0)])
    expect(new Set(w.resend.delivered.map(d => d.to)).size).toBe(3)
    expect(w.resend.delivered).toHaveLength(3)
  })
})

describe('campaign state and counters', () => {
  it('counters are absolute: repeated runs never double count', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', [...emails(4), { email: null }])
    w.resend.behaviour = ({ payload }) => payload.to === 's3@example.com'
      ? { type: 'error', res: { data: null, error: { name: 'validation_error', statusCode: 422, message: 'bad' }, headers: {} } }
      : { type: 'accept' }
    for (let i = 0; i < 3; i++) await deliverCampaign('A', { budgetMs: 40_000 }, w.deps())
    expect(w.repo.campaigns.get('A')).toMatchObject({ status: 'COMPLETED', sentCount: 3, failedCount: 1 })
    expect(w.resend.calls).toHaveLength(4)
  })

  it('budget/limit leaves work PENDING for the next call (Vercel time limit)', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(10))
    const res = await deliverCampaign('A', { budgetMs: 40_000, limit: 4 }, w.deps())
    expect(res.sent).toBe(4)
    expect(res.remaining).toBe(6)
    expect(w.repo.campaigns.get('A')!.status).toBe('SENDING')
  })

  it('DRAFT and CANCELLED campaigns are never sent', async () => {
    const w = makeWorld()
    w.repo.addCampaign('D', 'school1', emails(2), 'DRAFT')
    w.repo.addCampaign('C', 'school1', emails(2), 'CANCELLED')
    await deliverCampaign('D', {}, w.deps())
    await deliverCampaign('C', {}, w.deps())
    expect(w.resend.calls).toHaveLength(0)
  })

  it('cancelling mid-send stops further claims', async () => {
    const w = makeWorld()
    w.repo.addCampaign('A', 'school1', emails(10))
    w.resend.behaviour = ({ n }) => { if (n === 2) w.repo.campaigns.get('A')!.status = 'CANCELLED'; return { type: 'accept' } }
    await deliverCampaign('A', { budgetMs: 40_000 }, w.deps({ config: { ...DEFAULT_DELIVERY_CONFIG, lanes: 1 } }))
    expect(w.resend.calls).toHaveLength(2)
    expect(w.repo.campaigns.get('A')!.status).toBe('CANCELLED')
  })

  it('the lane key is shared by every bulk sender', () => {
    expect(BULK_LANE).toBe('resend:bulk')
  })
})
