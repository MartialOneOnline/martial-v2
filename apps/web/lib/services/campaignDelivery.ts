import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/db'
import { getResend } from '@/lib/email/resend'
import { renderCampaignTokens, buildCampaignEmail, buildCampaignText, campaignFrom } from '@/lib/email/templates/campaign'
import { classifySendResponse, quotaUsed, type SendResponseLike } from '@/lib/email/resendOutcome'
import {
  BULK_LANE, bulkRateConfigFromEnv, bulkSpacingMs, nextUtcMidnight, prismaRateLimitStore,
  type BulkRateConfig, type Pause, type PauseReason, type RateLimitStore,
} from '@/lib/email/rateLimiter'

// Reliable campaign delivery.
//
// Every recipient row is a small durable job:
//   PENDING ──claim──▶ SENDING ──▶ SENT | FAILED | UNCERTAIN
//      ▲                  │
//      └── retry / wait ──┘   (or lease expiry after a crash)
//
// * Claiming is one atomic UPDATE … FOR UPDATE SKIP LOCKED, so /process and the
//   cron running at the same time can never take the same recipient.
// * The claim is a lease (claimToken + claimedUntil). Every write after the
//   send is guarded by the token; a worker that dies leaves the row SENDING
//   until the lease expires and recovery treats the outcome as unknown.
// * Every request carries Idempotency-Key campaign-recipient/<id>/<gen>. gen
//   only moves on after Resend *confirmed* it did not accept the email (429 rate
//   limit / quota). A lost response, timeout, 5xx or crash keeps the same key,
//   so the retry either gets the original response back or sends exactly once.
//   Resend keeps keys for 24h: past that window an unknown outcome becomes
//   UNCERTAIN for a person to check instead of being resent blindly.
// * Pacing goes through the shared limiter (lib/email/rateLimiter.ts); nothing
//   holds a transaction or row lock while waiting or calling Resend.

export type CampaignForSend = {
  id: string
  status: string
  subject: string
  bodyHtml: string
  language: string | null
  school: { name: string; email: string | null; logoUrl: string | null; language: string | null }
}

export type ClaimedRecipient = {
  id: string
  attempts: number // already includes this attempt
  idempotencyGen: number
  uncertainSince: Date | null
  email: string | null
  name: string | null
  belt: string | null
}

export type SettleData = {
  status: 'PENDING' | 'SENT' | 'FAILED' | 'UNCERTAIN'
  nextAttemptAt?: Date | null
  sentAt?: Date
  resendEmailId?: string
  failedReason?: string | null
  lastErrorCode?: string | null
  lastStatusCode?: number | null
  // undefined = keep as is
  uncertainSince?: Date | null
  refundAttempt?: boolean // the attempt didn't count (quota/config wait, never sent)
  bumpIdempotencyGen?: boolean
}

export type RecipientSummary = {
  pending: number
  sending: number
  sent: number
  failed: number
  uncertain: number
  skipped: number
  retryScheduled: number // PENDING rows that already had an attempt
  nextAttemptAt: Date | null
}

export interface CampaignDeliveryRepo {
  loadCampaign(campaignId: string): Promise<CampaignForSend | null>
  startSending(campaignId: string, now: Date): Promise<void>
  recoverExpiredClaims(campaignId: string | null, now: Date): Promise<number>
  claimNext(campaignId: string, token: string, now: Date, leaseMs: number): Promise<ClaimedRecipient | null>
  settle(recipientId: string, token: string, data: SettleData): Promise<boolean>
  summarize(campaignId: string): Promise<RecipientSummary>
  syncCounters(campaignId: string, summary: RecipientSummary): Promise<void>
  completeIfDone(campaignId: string, now: Date): Promise<boolean>
}

export type SendPayload = { from: string; to: string; subject: string; html: string; text: string; replyTo?: string }
export type SendFn = (payload: SendPayload, opts: { idempotencyKey: string; timeoutMs: number }) => Promise<SendResponseLike>

export type DeliveryConfig = {
  lanes: number
  leaseMs: number
  requestTimeoutMs: number
  maxAttempts: number
  backoffBaseMs: number
  backoffCapMs: number
  idempotencyWindowMs: number
  rateLimitPauseMs: number // when a 429 carries no Retry-After
  monthlyPauseMs: number
  configPauseMs: number
  settleRetries: number
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryConfig = {
  lanes: 2,
  leaseMs: 120_000, // > Vercel maxDuration (60s): a live worker never loses its lease
  requestTimeoutMs: 15_000,
  maxAttempts: 6,
  backoffBaseMs: 2_000,
  backoffCapMs: 5 * 60_000,
  idempotencyWindowMs: 23 * 60 * 60_000, // Resend keeps keys 24h; one hour of margin
  rateLimitPauseMs: 1_000,
  monthlyPauseMs: 24 * 60 * 60_000, // reset date depends on the billing cycle — probe once a day
  configPauseMs: 60 * 60_000,
  settleRetries: 3,
}

export type DeliveryDeps = {
  repo: CampaignDeliveryRepo
  limiter: RateLimitStore
  send: SendFn
  now: () => number
  sleep: (ms: number) => Promise<void>
  random: () => number
  config: DeliveryConfig
  rate: BulkRateConfig
  log: (msg: string, extra?: Record<string, unknown>) => void
}

export type DeliveryResult = {
  processed: number // attempts made in this call
  sent: number
  failed: number
  uncertain: number
  retrying: number // attempts in this call that were rescheduled
  unsaved: number // accepted by Resend but the SENT write failed (recovered later with the same key)
  remaining: number // PENDING + SENDING after this call
  retryScheduled: number
  nextAttemptAt: string | null
  waiting: { reason: PauseReason; until: string } | null
  completed: boolean
  totals: RecipientSummary
}

const EMPTY_SUMMARY: RecipientSummary = { pending: 0, sending: 0, sent: 0, failed: 0, uncertain: 0, skipped: 0, retryScheduled: 0, nextAttemptAt: null }

export function idempotencyKeyFor(recipientId: string, gen: number): string {
  return `campaign-recipient/${recipientId}/${gen}`
}

// Exponential backoff with "equal jitter": half fixed, half random, so retries
// from many recipients spread out instead of returning together.
export function backoffMs(attempt: number, config: DeliveryConfig, random: () => number): number {
  const exp = Math.min(config.backoffCapMs, config.backoffBaseMs * 2 ** Math.max(0, attempt - 1))
  return Math.round(exp / 2 + random() * (exp / 2))
}

function truncate(s: string, n = 500) {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}

export async function deliverCampaign(
  campaignId: string,
  opts: { limit?: number; budgetMs?: number } = {},
  deps: DeliveryDeps = defaultDeliveryDeps(),
): Promise<DeliveryResult> {
  const { repo, limiter, config, now } = deps
  const limit = opts.limit ?? 40
  const deadline = now() + (opts.budgetMs ?? 40_000)

  const result: DeliveryResult = {
    processed: 0, sent: 0, failed: 0, uncertain: 0, retrying: 0, unsaved: 0,
    remaining: 0, retryScheduled: 0, nextAttemptAt: null, waiting: null, completed: false, totals: EMPTY_SUMMARY,
  }

  const campaign = await repo.loadCampaign(campaignId)
  // DRAFT must go through /queue first — never sent implicitly just because a
  // recipient row happens to be PENDING (e.g. right after an edit).
  if (!campaign || campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED' || campaign.status === 'DRAFT' || campaign.status === 'FAILED') {
    return result
  }
  if (campaign.status === 'QUEUED') await repo.startSending(campaignId, new Date(now()))

  const recovered = await repo.recoverExpiredClaims(campaignId, new Date(now()))
  if (recovered > 0) deps.log('[campaigns] recovered expired claims', { campaignId, recovered })

  const schoolName = campaign.school.name
  const from = campaignFrom(schoolName)
  const replyTo = campaign.school.email?.trim() || undefined
  const language = campaign.language || campaign.school.language
  const spacing = bulkSpacingMs(deps.rate)
  const token = randomUUID()

  let stop = false
  let budgetLeft = limit
  let waiting: Pause | null = null
  let localPauseUntil = 0

  const settle = async (id: string, data: SettleData) => {
    for (let i = 0; i < config.settleRetries; i++) {
      try {
        return await repo.settle(id, token, data)
      } catch (err) {
        deps.log('[campaigns] settle failed', { recipientId: id, status: data.status, attempt: i + 1, error: String(err) })
        if (i < config.settleRetries - 1) await deps.sleep(200 * (i + 1))
      }
    }
    return null // couldn't write; the lease will expire and recovery takes over
  }

  const pauseLane = async (untilMs: number, reason: PauseReason, detail: string) => {
    await limiter.pause(BULK_LANE, untilMs, reason, detail)
    localPauseUntil = Math.max(localPauseUntil, untilMs)
    if (reason !== 'RATE_LIMIT') {
      stop = true
      if (!waiting || waiting.until.getTime() < untilMs) waiting = { until: new Date(untilMs), reason, detail }
    }
  }

  const lane = async () => {
    while (!stop && budgetLeft > 0) {
      const maxWait = deadline - now() - config.requestTimeoutMs
      if (maxWait <= 0) return
      const claimed = await repo.claimNext(campaignId, token, new Date(now()), config.leaseMs)
      if (!claimed) return
      budgetLeft--

      // An unknown outcome can only be retried while Resend still remembers the key.
      if (claimed.uncertainSince && now() - claimed.uncertainSince.getTime() >= config.idempotencyWindowMs) {
        await settle(claimed.id, {
          status: 'UNCERTAIN',
          failedReason: 'Could not confirm whether Resend accepted this email, and its idempotency key has expired. Not resent automatically.',
          lastErrorCode: 'uncertain_window_expired',
          nextAttemptAt: null,
        })
        result.uncertain++
        continue
      }

      if (!claimed.email) {
        await settle(claimed.id, { status: 'FAILED', failedReason: 'No email address on file', lastErrorCode: 'no_email', nextAttemptAt: null, uncertainSince: null })
        result.failed++
        continue
      }

      const slot = await limiter.reserve(BULK_LANE, spacing, maxWait)
      if (!slot.ok) {
        // Don't hold the claim while the lane is paused or busy.
        await settle(claimed.id, {
          status: 'PENDING', refundAttempt: true,
          nextAttemptAt: slot.pause ? slot.pause.until : null,
        })
        if (slot.pause && slot.pause.reason !== 'RATE_LIMIT') {
          waiting = slot.pause
          stop = true
        }
        return
      }
      if (slot.waitMs > 0) await deps.sleep(slot.waitMs)
      // Another lane of this worker hit a quota or 429 while we waited for our
      // slot: give the recipient back instead of firing into the limit.
      if (stop || now() < localPauseUntil) {
        await settle(claimed.id, { status: 'PENDING', refundAttempt: true, nextAttemptAt: waiting ? (waiting as Pause).until : null })
        budgetLeft++
        if (stop) return
        continue
      }

      const tokens = { nombre: claimed.name ?? '', escuela: schoolName, cinturon: claimed.belt ?? undefined }
      const message = renderCampaignTokens(campaign.bodyHtml, tokens)
      const payload: SendPayload = {
        from,
        to: claimed.email,
        subject: renderCampaignTokens(campaign.subject, tokens),
        html: buildCampaignEmail({ schoolName, schoolLogoUrl: campaign.school.logoUrl, message, language }),
        text: buildCampaignText({ schoolName, message, language }),
        ...(replyTo ? { replyTo } : {}),
      }

      const attemptAt = now()
      let response: SendResponseLike
      try {
        response = await deps.send(payload, { idempotencyKey: idempotencyKeyFor(claimed.id, claimed.idempotencyGen), timeoutMs: config.requestTimeoutMs })
      } catch (err) {
        response = { data: null, error: { name: 'application_error', statusCode: null, message: err instanceof Error ? err.message : 'Unknown error' }, headers: null }
      }
      result.processed++
      const outcome = classifySendResponse(response, now())
      const t = now()

      switch (outcome.kind) {
        case 'accepted': {
          const ok = await settle(claimed.id, {
            status: 'SENT', sentAt: new Date(t), resendEmailId: outcome.id, nextAttemptAt: null,
            failedReason: null, lastErrorCode: null, lastStatusCode: null, uncertainSince: null,
          })
          if (ok === null) {
            result.unsaved++
            deps.log('[campaigns] accepted but not saved; will be reconciled with the same idempotency key', { recipientId: claimed.id, resendEmailId: outcome.id })
          } else {
            result.sent++
          }
          await checkQuotaReserve(response.headers ?? null)
          break
        }
        case 'rate_limited': {
          const waitMs = outcome.retryAfterMs ?? config.rateLimitPauseMs
          await pauseLane(t + waitMs, 'RATE_LIMIT', outcome.message)
          if (claimed.attempts >= config.maxAttempts) {
            const final = claimed.uncertainSince ? 'UNCERTAIN' : 'FAILED'
            await settle(claimed.id, {
              status: final, nextAttemptAt: null, failedReason: truncate(outcome.message),
              lastErrorCode: 'retries_exhausted', lastStatusCode: outcome.status,
            })
            if (final === 'FAILED') result.failed++
            else result.uncertain++
          } else {
            await settle(claimed.id, {
              status: 'PENDING', nextAttemptAt: new Date(t + Math.max(waitMs, backoffMs(claimed.attempts, config, deps.random))),
              failedReason: truncate(outcome.message), lastErrorCode: outcome.code, lastStatusCode: outcome.status,
              bumpIdempotencyGen: !claimed.uncertainSince,
            })
            result.retrying++
          }
          break
        }
        case 'quota':
        case 'config': {
          const untilMs = outcome.kind === 'quota'
            ? (outcome.scope === 'daily' ? nextUtcMidnight(t) : t + config.monthlyPauseMs)
            : t + config.configPauseMs
          const reason: PauseReason = outcome.kind === 'config' ? 'CONFIG' : outcome.scope === 'daily' ? 'DAILY_QUOTA' : 'MONTHLY_QUOTA'
          await pauseLane(untilMs, reason, outcome.message)
          // Confirmed not accepted and not the recipient's fault: wait, don't burn attempts.
          await settle(claimed.id, {
            status: 'PENDING', refundAttempt: true, nextAttemptAt: new Date(untilMs),
            failedReason: truncate(outcome.message), lastErrorCode: outcome.code, lastStatusCode: outcome.status,
            bumpIdempotencyGen: !claimed.uncertainSince,
          })
          result.retrying++
          break
        }
        case 'idempotency_conflict': {
          await settle(claimed.id, {
            status: 'UNCERTAIN', nextAttemptAt: null,
            failedReason: truncate(`An earlier request for this email exists with different content; it may already have been sent. ${outcome.message}`),
            lastErrorCode: outcome.code, lastStatusCode: outcome.status,
          })
          result.uncertain++
          break
        }
        case 'uncertain': {
          const since = claimed.uncertainSince ?? new Date(attemptAt)
          if (claimed.attempts >= config.maxAttempts) {
            await settle(claimed.id, {
              status: 'UNCERTAIN', nextAttemptAt: null, uncertainSince: since,
              failedReason: truncate(`Could not confirm whether Resend accepted this email. ${outcome.message}`),
              lastErrorCode: outcome.code, lastStatusCode: outcome.status,
            })
            result.uncertain++
          } else {
            await settle(claimed.id, {
              status: 'PENDING', uncertainSince: since,
              nextAttemptAt: new Date(t + Math.max(outcome.retryAfterMs ?? 0, backoffMs(claimed.attempts, config, deps.random))),
              failedReason: truncate(outcome.message), lastErrorCode: outcome.code, lastStatusCode: outcome.status,
            })
            result.retrying++
          }
          break
        }
        case 'permanent': {
          await settle(claimed.id, {
            status: 'FAILED', nextAttemptAt: null, failedReason: truncate(outcome.message),
            lastErrorCode: outcome.code, lastStatusCode: outcome.status,
          })
          result.failed++
          break
        }
      }
    }
  }

  // Opt-in: keep part of a known plan quota for transactional mail.
  const checkQuotaReserve = async (headers: Record<string, string> | null) => {
    const { dailyQuota, monthlyQuota, quotaReserve } = deps.rate
    const t = now()
    const daily = quotaUsed(headers, 'daily')
    if (dailyQuota && daily !== null && daily >= dailyQuota - quotaReserve) {
      await pauseLane(nextUtcMidnight(t), 'DAILY_QUOTA', `Daily quota reserve reached (${daily}/${dailyQuota}, ${quotaReserve} kept for transactional email)`)
    }
    const monthly = quotaUsed(headers, 'monthly')
    if (monthlyQuota && monthly !== null && monthly >= monthlyQuota - quotaReserve) {
      await pauseLane(t + config.monthlyPauseMs, 'MONTHLY_QUOTA', `Monthly quota reserve reached (${monthly}/${monthlyQuota}, ${quotaReserve} kept for transactional email)`)
    }
  }

  // Skip the work entirely while the lane is waiting on a quota/config pause.
  const pausedNow = await limiter.getPause(BULK_LANE)
  if (pausedNow && pausedNow.reason !== 'RATE_LIMIT' && pausedNow.until.getTime() > deadline) {
    waiting = pausedNow
  } else {
    await Promise.all(Array.from({ length: Math.max(1, config.lanes) }, () => lane()))
  }

  const summary = await repo.summarize(campaignId)
  await repo.syncCounters(campaignId, summary)
  const remaining = summary.pending + summary.sending
  result.completed = remaining === 0 ? await repo.completeIfDone(campaignId, new Date(now())) : false
  result.remaining = remaining
  result.retryScheduled = summary.retryScheduled
  result.nextAttemptAt = summary.nextAttemptAt ? summary.nextAttemptAt.toISOString() : null
  const w = waiting as Pause | null
  result.waiting = w ? { reason: w.reason, until: w.until.toISOString() } : null
  result.totals = summary
  return result
}

// ── Prisma repo ──────────────────────────────────────────────────────────────
// Timestamps are passed from the app clock as ISO strings and stored as UTC in
// TIMESTAMP(3) columns (same as Prisma's own DateTime handling).

const utc = (d: Date) => d.toISOString()

export const prismaCampaignDeliveryRepo: CampaignDeliveryRepo = {
  async loadCampaign(campaignId) {
    return prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true, status: true, subject: true, bodyHtml: true, language: true,
        school: { select: { name: true, email: true, logoUrl: true, language: true } },
      },
    })
  },

  async startSending(campaignId, now) {
    await prisma.campaign.updateMany({ where: { id: campaignId, status: 'QUEUED' }, data: { status: 'SENDING', sentAt: now } })
  },

  async recoverExpiredClaims(campaignId, now) {
    // The worker holding these died mid-attempt: the request may have been
    // accepted, so the retry must reuse the same idempotency key.
    const n = await prisma.$executeRaw`
      UPDATE "campaign_recipients"
      SET "status" = 'PENDING',
          "uncertainSince" = COALESCE("uncertainSince", "lastAttemptAt", (${utc(now)}::timestamptz AT TIME ZONE 'UTC')),
          "claimToken" = NULL, "claimedUntil" = NULL, "nextAttemptAt" = NULL,
          "lastErrorCode" = 'interrupted',
          "failedReason" = 'Interrupted before the result was saved; retrying with the same idempotency key'
      WHERE "status" = 'SENDING'
        AND "claimedUntil" < (${utc(now)}::timestamptz AT TIME ZONE 'UTC')
        AND (${campaignId}::text IS NULL OR "campaignId" = ${campaignId})
    `
    return Number(n)
  },

  async claimNext(campaignId, token, now, leaseMs) {
    const rows = await prisma.$queryRaw<{ id: string; attempts: number; idempotencyGen: number; uncertainSince: Date | null }[]>`
      UPDATE "campaign_recipients" r
      SET "status" = 'SENDING', "claimToken" = ${token},
          "claimedUntil" = (${utc(now)}::timestamptz AT TIME ZONE 'UTC') + (${Math.round(leaseMs)}::int * interval '1 millisecond'),
          "attempts" = r."attempts" + 1,
          "lastAttemptAt" = (${utc(now)}::timestamptz AT TIME ZONE 'UTC')
      WHERE r."id" = (
        SELECT r2."id" FROM "campaign_recipients" r2
        JOIN "campaigns" c ON c."id" = r2."campaignId"
        WHERE r2."campaignId" = ${campaignId}
          AND r2."status" = 'PENDING'
          AND c."status" = 'SENDING'
          AND (r2."nextAttemptAt" IS NULL OR r2."nextAttemptAt" <= (${utc(now)}::timestamptz AT TIME ZONE 'UTC'))
        ORDER BY r2."createdAt", r2."id"
        LIMIT 1
        FOR UPDATE OF r2 SKIP LOCKED
      )
      AND r."status" = 'PENDING'
      RETURNING r."id", r."attempts", r."idempotencyGen", r."uncertainSince"
    `
    const row = rows[0]
    if (!row) return null
    const detail = await prisma.campaignRecipient.findUnique({
      where: { id: row.id },
      select: { schoolMember: { select: { belt: true, user: { select: { name: true, email: true } } } } },
    })
    return {
      id: row.id,
      attempts: Number(row.attempts),
      idempotencyGen: Number(row.idempotencyGen),
      uncertainSince: row.uncertainSince ? new Date(row.uncertainSince) : null,
      email: detail?.schoolMember.user.email?.trim() || null,
      name: detail?.schoolMember.user.name ?? null,
      belt: detail?.schoolMember.belt ?? null,
    }
  },

  async settle(recipientId, token, data) {
    const res = await prisma.campaignRecipient.updateMany({
      where: { id: recipientId, claimToken: token, status: 'SENDING' },
      data: {
        status: data.status,
        claimToken: null,
        claimedUntil: null,
        ...(data.nextAttemptAt !== undefined ? { nextAttemptAt: data.nextAttemptAt } : {}),
        ...(data.sentAt ? { sentAt: data.sentAt } : {}),
        ...(data.resendEmailId ? { resendEmailId: data.resendEmailId } : {}),
        ...(data.failedReason !== undefined ? { failedReason: data.failedReason } : {}),
        ...(data.lastErrorCode !== undefined ? { lastErrorCode: data.lastErrorCode } : {}),
        ...(data.lastStatusCode !== undefined ? { lastStatusCode: data.lastStatusCode } : {}),
        ...(data.uncertainSince !== undefined ? { uncertainSince: data.uncertainSince } : {}),
        ...(data.refundAttempt ? { attempts: { decrement: 1 } } : {}),
        ...(data.bumpIdempotencyGen ? { idempotencyGen: { increment: 1 } } : {}),
      },
    })
    return res.count === 1
  },

  async summarize(campaignId) {
    const [groups, retry, next] = await Promise.all([
      prisma.campaignRecipient.groupBy({ by: ['status'], where: { campaignId }, _count: { _all: true } }),
      prisma.campaignRecipient.count({ where: { campaignId, status: 'PENDING', attempts: { gt: 0 } } }),
      prisma.campaignRecipient.aggregate({ where: { campaignId, status: 'PENDING' }, _min: { nextAttemptAt: true } }),
    ])
    const by = Object.fromEntries(groups.map(g => [g.status, g._count._all])) as Record<string, number>
    return {
      pending: by.PENDING ?? 0,
      sending: by.SENDING ?? 0,
      sent: by.SENT ?? 0,
      failed: by.FAILED ?? 0,
      uncertain: by.UNCERTAIN ?? 0,
      skipped: by.SKIPPED ?? 0,
      retryScheduled: retry,
      nextAttemptAt: next._min.nextAttemptAt ?? null,
    }
  },

  async syncCounters(campaignId, s) {
    // Absolute values from the rows: re-running never double counts.
    await prisma.campaign.update({ where: { id: campaignId }, data: { sentCount: s.sent, failedCount: s.failed + s.uncertain } })
  },

  async completeIfDone(campaignId, now) {
    const open = await prisma.campaignRecipient.count({ where: { campaignId, status: { in: ['PENDING', 'SENDING'] } } })
    if (open > 0) return false
    const res = await prisma.campaign.updateMany({ where: { id: campaignId, status: 'SENDING' }, data: { status: 'COMPLETED', completedAt: now } })
    return res.count === 1
  },
}

export const resendSend: SendFn = async (payload, { idempotencyKey, timeoutMs }) => {
  // resend@6 spreads request options into fetch(), so `signal` aborts a hung
  // request (it then comes back as application_error with no status → uncertain).
  const options = { idempotencyKey, signal: AbortSignal.timeout(timeoutMs) } as { idempotencyKey: string }
  return getResend().emails.send(payload, options)
}

export function defaultDeliveryDeps(): DeliveryDeps {
  return {
    repo: prismaCampaignDeliveryRepo,
    limiter: prismaRateLimitStore,
    send: resendSend,
    now: () => Date.now(),
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    random: Math.random,
    config: DEFAULT_DELIVERY_CONFIG,
    rate: bulkRateConfigFromEnv(),
    log: (msg, extra) => console.error(msg, extra ?? {}),
  }
}

// Recover every campaign's abandoned claims (cron).
export async function recoverAllExpiredClaims(deps: Pick<DeliveryDeps, 'repo' | 'now'> = defaultDeliveryDeps()) {
  return deps.repo.recoverExpiredClaims(null, new Date(deps.now()))
}
