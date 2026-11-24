// Simulated world for campaign delivery tests: an in-memory recipients table
// with the same claim/settle semantics as the Postgres repo, a fake Resend
// that honours Idempotency-Key for 24h, a shared limiter store and a virtual
// clock. No network, no database, no real email.
import type {
  CampaignDeliveryRepo, CampaignForSend, ClaimedRecipient, DeliveryDeps, RecipientSummary, SendFn, SendPayload, SettleData,
} from '@/lib/services/campaignDelivery'
import { DEFAULT_DELIVERY_CONFIG } from '@/lib/services/campaignDelivery'
import { createMemoryRateLimitStore } from '@/lib/email/rateLimiter'
import type { SendResponseLike } from '@/lib/email/resendOutcome'

export type Row = {
  id: string
  campaignId: string
  status: 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'UNCERTAIN' | 'SKIPPED'
  email: string | null
  name: string | null
  attempts: number
  idempotencyGen: number
  uncertainSince: number | null
  nextAttemptAt: number | null
  lastAttemptAt: number | null
  claimToken: string | null
  claimedUntil: number | null
  sentAt: number | null
  resendEmailId: string | null
  failedReason: string | null
  lastErrorCode: string | null
  lastStatusCode: number | null
  createdAt: number
}

export type Campaign = CampaignForSend & { schoolId: string; sentCount: number; failedCount: number; completedAt: number | null }

export class Clock {
  t = Date.UTC(2026, 10, 20, 18, 0, 0)
  now = () => this.t
  sleep = async (ms: number) => { this.t += Math.max(0, ms); await Promise.resolve() }
  advance(ms: number) { this.t += ms }
}

export class MemoryRepo implements CampaignDeliveryRepo {
  campaigns = new Map<string, Campaign>()
  rows: Row[] = []
  settleFailures = 0 // next N settle() calls throw (simulated DB outage)
  settleFailWhen: (data: SettleData) => boolean = () => true
  hangNextSettle = false // simulate the function being killed right after the send
  claims = 0
  constructor(private clock: Clock) {}

  addCampaign(id: string, schoolId: string, recipients: { email: string | null; name?: string }[], status = 'QUEUED') {
    this.campaigns.set(id, {
      id, schoolId, status, subject: 'Hola {{nombre}}', bodyHtml: '<p>Hola {{nombre}}</p>', language: 'es',
      school: { name: `School ${schoolId}`, email: null, logoUrl: null, language: 'es' },
      sentCount: 0, failedCount: 0, completedAt: null,
    })
    recipients.forEach((r, i) => this.rows.push({
      id: `${id}-r${i}`, campaignId: id, status: r.email ? 'PENDING' : 'SKIPPED', email: r.email, name: r.name ?? `Student ${i}`,
      attempts: 0, idempotencyGen: 0, uncertainSince: null, nextAttemptAt: null, lastAttemptAt: null,
      claimToken: null, claimedUntil: null, sentAt: null, resendEmailId: null, failedReason: null,
      lastErrorCode: null, lastStatusCode: null, createdAt: i,
    }))
  }

  row(id: string) { return this.rows.find(r => r.id === id)! }

  async loadCampaign(id: string) { const c = this.campaigns.get(id); return c ? { ...c } : null }

  async startSending(id: string) {
    const c = this.campaigns.get(id)
    if (c && c.status === 'QUEUED') c.status = 'SENDING'
  }

  async recoverExpiredClaims(campaignId: string | null, now: Date) {
    let n = 0
    for (const r of this.rows) {
      if (r.status === 'SENDING' && r.claimedUntil !== null && r.claimedUntil < now.getTime() && (!campaignId || r.campaignId === campaignId)) {
        r.status = 'PENDING'
        r.uncertainSince = r.uncertainSince ?? r.lastAttemptAt ?? now.getTime()
        r.claimToken = null; r.claimedUntil = null; r.nextAttemptAt = null
        r.lastErrorCode = 'interrupted'
        n++
      }
    }
    return n
  }

  // Synchronous body: as atomic as the single UPDATE … SKIP LOCKED.
  async claimNext(campaignId: string, token: string, now: Date, leaseMs: number): Promise<ClaimedRecipient | null> {
    const c = this.campaigns.get(campaignId)
    if (!c || c.status !== 'SENDING') return null
    const t = now.getTime()
    const r = this.rows
      .filter(x => x.campaignId === campaignId && x.status === 'PENDING' && (x.nextAttemptAt === null || x.nextAttemptAt <= t))
      .sort((a, b) => a.createdAt - b.createdAt)[0]
    if (!r) return null
    r.status = 'SENDING'; r.claimToken = token; r.claimedUntil = t + leaseMs; r.attempts++; r.lastAttemptAt = t
    this.claims++
    return {
      id: r.id, attempts: r.attempts, idempotencyGen: r.idempotencyGen,
      uncertainSince: r.uncertainSince !== null ? new Date(r.uncertainSince) : null,
      email: r.email, name: r.name, belt: null,
    }
  }

  async settle(id: string, token: string, d: SettleData) {
    if (this.hangNextSettle) { this.hangNextSettle = false; return new Promise<boolean>(() => {}) }
    if (this.settleFailures > 0 && this.settleFailWhen(d)) { this.settleFailures--; throw new Error('db down') }
    const r = this.rows.find(x => x.id === id)
    if (!r || r.claimToken !== token || r.status !== 'SENDING') return false
    r.status = d.status; r.claimToken = null; r.claimedUntil = null
    if (d.nextAttemptAt !== undefined) r.nextAttemptAt = d.nextAttemptAt ? d.nextAttemptAt.getTime() : null
    if (d.sentAt) r.sentAt = d.sentAt.getTime()
    if (d.resendEmailId) r.resendEmailId = d.resendEmailId
    if (d.failedReason !== undefined) r.failedReason = d.failedReason
    if (d.lastErrorCode !== undefined) r.lastErrorCode = d.lastErrorCode
    if (d.lastStatusCode !== undefined) r.lastStatusCode = d.lastStatusCode
    if (d.uncertainSince !== undefined) r.uncertainSince = d.uncertainSince ? d.uncertainSince.getTime() : null
    if (d.refundAttempt) r.attempts--
    if (d.bumpIdempotencyGen) r.idempotencyGen++
    return true
  }

  async summarize(campaignId: string): Promise<RecipientSummary> {
    const rs = this.rows.filter(r => r.campaignId === campaignId)
    const c = (s: Row['status']) => rs.filter(r => r.status === s).length
    const pend = rs.filter(r => r.status === 'PENDING')
    const next = pend.map(r => r.nextAttemptAt).filter((x): x is number => x !== null).sort((a, b) => a - b)[0]
    return {
      pending: c('PENDING'), sending: c('SENDING'), sent: c('SENT'), failed: c('FAILED'), uncertain: c('UNCERTAIN'), skipped: c('SKIPPED'),
      retryScheduled: pend.filter(r => r.attempts > 0).length,
      nextAttemptAt: next !== undefined ? new Date(next) : null,
    }
  }

  async syncCounters(campaignId: string, s: RecipientSummary) {
    const c = this.campaigns.get(campaignId)!
    c.sentCount = s.sent
    c.failedCount = s.failed + s.uncertain
  }

  async completeIfDone(campaignId: string) {
    const open = this.rows.some(r => r.campaignId === campaignId && (r.status === 'PENDING' || r.status === 'SENDING'))
    const c = this.campaigns.get(campaignId)!
    if (open || c.status !== 'SENDING') return false
    c.status = 'COMPLETED'; c.completedAt = this.clock.now()
    return true
  }
}

type Behaviour = (call: { payload: SendPayload; key: string; n: number }) =>
  | { type: 'accept' }
  | { type: 'accept_then_lose' } // Resend accepts, the response never arrives
  | { type: 'error'; res: SendResponseLike }

// Fake Resend: idempotency keys remembered for 24h (same key + same body →
// original response, no new email; different body → 409).
export class FakeResend {
  delivered: { to: string; key: string; at: number; id: string }[] = []
  calls: { to: string; key: string; at: number }[] = []
  private keys = new Map<string, { body: string; id: string; at: number }>()
  private seq = 0
  behaviour: Behaviour = () => ({ type: 'accept' })
  constructor(private clock: Clock) {}

  send: SendFn = async (payload, { idempotencyKey }) => {
    const at = this.clock.now()
    this.calls.push({ to: payload.to, key: idempotencyKey, at })
    const b = this.behaviour({ payload, key: idempotencyKey, n: this.calls.length })
    if (b.type === 'error') return b.res
    const body = JSON.stringify(payload)
    const prev = this.keys.get(idempotencyKey)
    let id: string
    if (prev && at - prev.at < 24 * 3600_000) {
      if (prev.body !== body) {
        return { data: null, error: { name: 'invalid_idempotent_request', statusCode: 409, message: 'Same idempotency key used with a different request payload' }, headers: {} }
      }
      id = prev.id
    } else {
      id = `email_${++this.seq}`
      this.keys.set(idempotencyKey, { body, id, at })
      this.delivered.push({ to: payload.to, key: idempotencyKey, at, id })
    }
    if (b.type === 'accept_then_lose') {
      return { data: null, error: { name: 'application_error', statusCode: null, message: 'Unable to fetch data. The request could not be resolved.' }, headers: null }
    }
    return { data: { id }, error: null, headers: {} }
  }
}

export const rateLimited = (retryAfterSec?: number): SendResponseLike => ({
  data: null,
  error: { name: 'rate_limit_exceeded', statusCode: 429, message: 'You have exceeded the rate limit, which is 10 requests per second.' },
  headers: retryAfterSec !== undefined ? { 'retry-after': String(retryAfterSec) } : {},
})

export function makeWorld() {
  const clock = new Clock()
  const repo = new MemoryRepo(clock)
  const resend = new FakeResend(clock)
  const limiter = createMemoryRateLimitStore(clock.now)
  const logs: string[] = []
  const deps = (over: Partial<DeliveryDeps> = {}): DeliveryDeps => ({
    repo, limiter, send: resend.send, now: clock.now, sleep: clock.sleep, random: () => 0.5,
    config: DEFAULT_DELIVERY_CONFIG,
    rate: { teamRatePerSecond: 10, bulkShare: 0.5, dailyQuota: null, monthlyQuota: null, quotaReserve: 10 },
    log: msg => { logs.push(msg) },
    ...over,
  })
  return { clock, repo, resend, limiter, deps, logs }
}
