import { prisma } from '@/lib/db'

// Shared pacing for bulk email through Resend.
//
// Resend's limit is per team (all API keys, all serverless instances), so a
// per-process counter can't enforce it. Each lane is one row in
// email_rate_limits: a worker reserves its next request slot with a single
// atomic UPSERT (no transaction or row lock is held while it waits or calls the
// provider) and sleeps until that slot. A 429 or quota response pauses the lane
// for every worker until the time Resend gave us.
//
// Bulk senders get only a share of the team rate, so transactional mail
// (invites, password resets, receipts…), which is sent directly, keeps room.

export const BULK_LANE = 'resend:bulk'

export type PauseReason = 'RATE_LIMIT' | 'DAILY_QUOTA' | 'MONTHLY_QUOTA' | 'CONFIG'

export type Pause = { until: Date; reason: PauseReason; detail: string | null }

export type Reservation =
  | { ok: true; waitMs: number }
  | { ok: false; pause: Pause | null; waitMs: number } // slot (or pause) is beyond maxWaitMs

export interface RateLimitStore {
  // Atomically take the next slot of `key` spaced `spacingMs` after the
  // previous one, but only if it starts within `maxWaitMs`.
  reserve(key: string, spacingMs: number, maxWaitMs: number): Promise<Reservation>
  // Extend (never shorten) the lane's pause.
  pause(key: string, untilMs: number, reason: PauseReason, detail: string | null): Promise<void>
  getPause(key: string): Promise<Pause | null>
}

export type BulkRateConfig = {
  // Team limit in requests/second (Resend default 10; can be raised on request).
  teamRatePerSecond: number
  // Fraction of the team rate bulk senders may use.
  bulkShare: number
  // Optional plan quotas — Resend reports only the *used* count, and only the
  // daily one on free plans, so these are opt-in and never assumed.
  dailyQuota: number | null
  monthlyQuota: number | null
  // Emails left untouched for transactional mail when a quota is known.
  quotaReserve: number
}

function envNumber(name: string): number | null {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function bulkRateConfigFromEnv(): BulkRateConfig {
  const share = envNumber('RESEND_BULK_SHARE')
  return {
    teamRatePerSecond: envNumber('RESEND_RATE_LIMIT_PER_SECOND') ?? 10,
    bulkShare: share !== null && share <= 1 ? share : 0.5,
    dailyQuota: envNumber('RESEND_DAILY_QUOTA'),
    monthlyQuota: envNumber('RESEND_MONTHLY_QUOTA'),
    quotaReserve: envNumber('RESEND_QUOTA_RESERVE') ?? 10,
  }
}

export function bulkSpacingMs(config: BulkRateConfig): number {
  const perSecond = Math.max(0.1, config.teamRatePerSecond * config.bulkShare)
  return Math.ceil(1000 / perSecond)
}

// Next 00:00 UTC (Resend's daily quota is a UTC calendar day), plus a minute.
export function nextUtcMidnight(nowMs: number): number {
  const d = new Date(nowMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 1, 0)
}

// ── Postgres store ───────────────────────────────────────────────────────────
// Timestamps are TIMESTAMP(3) without zone holding UTC, like every Prisma
// DateTime here, hence `clock_timestamp() AT TIME ZONE 'UTC'`. The database
// clock is the single clock all instances share.

type ReserveRow = { reserved: boolean; wait_ms: number; paused_until: Date | null; pause_reason: string | null; pause_detail: string | null }

export const prismaRateLimitStore: RateLimitStore = {
  async reserve(key, spacingMs, maxWaitMs) {
    const spacing = Math.max(1, Math.round(spacingMs))
    const maxWait = Math.max(0, Math.round(maxWaitMs))
    // The CTE computes the candidate slot from the locked-free current row;
    // the UPSERT only moves next_slot_at forward when the slot fits.
    const rows = await prisma.$queryRaw<ReserveRow[]>`
      WITH now_utc AS (SELECT (clock_timestamp() AT TIME ZONE 'UTC') AS t),
      upsert AS (
        INSERT INTO "email_rate_limits" ("key", "nextSlotAt", "updatedAt")
        SELECT ${key}, now_utc.t + (${spacing}::int * interval '1 millisecond'), now_utc.t FROM now_utc
        ON CONFLICT ("key") DO UPDATE
          SET "nextSlotAt" = GREATEST("email_rate_limits"."nextSlotAt", (SELECT t FROM now_utc), COALESCE("email_rate_limits"."pausedUntil", (SELECT t FROM now_utc)))
                             + (${spacing}::int * interval '1 millisecond'),
              "updatedAt" = (SELECT t FROM now_utc)
          WHERE GREATEST("email_rate_limits"."nextSlotAt", (SELECT t FROM now_utc), COALESCE("email_rate_limits"."pausedUntil", (SELECT t FROM now_utc)))
                <= (SELECT t FROM now_utc) + (${maxWait}::int * interval '1 millisecond')
        RETURNING "nextSlotAt"
      )
      SELECT
        true AS reserved,
        GREATEST(0, EXTRACT(EPOCH FROM (u."nextSlotAt" - (${spacing}::int * interval '1 millisecond') - (SELECT t FROM now_utc))) * 1000)::float8 AS wait_ms,
        NULL::timestamp AS paused_until, NULL::text AS pause_reason, NULL::text AS pause_detail
      FROM upsert u
      UNION ALL
      SELECT
        false AS reserved,
        GREATEST(0, EXTRACT(EPOCH FROM (GREATEST(l."nextSlotAt", COALESCE(l."pausedUntil", l."nextSlotAt")) - (SELECT t FROM now_utc))) * 1000)::float8 AS wait_ms,
        CASE WHEN l."pausedUntil" > (SELECT t FROM now_utc) THEN l."pausedUntil" END AS paused_until,
        CASE WHEN l."pausedUntil" > (SELECT t FROM now_utc) THEN l."pauseReason" END AS pause_reason,
        CASE WHEN l."pausedUntil" > (SELECT t FROM now_utc) THEN l."pauseDetail" END AS pause_detail
      FROM "email_rate_limits" l
      WHERE l."key" = ${key} AND NOT EXISTS (SELECT 1 FROM upsert)
    `
    const row = rows[0]
    if (!row) return { ok: false, pause: null, waitMs: maxWait } // lost a race on first insert; try again later
    if (row.reserved) return { ok: true, waitMs: Number(row.wait_ms) }
    return {
      ok: false,
      waitMs: Number(row.wait_ms),
      pause: row.paused_until && row.pause_reason
        ? { until: new Date(row.paused_until), reason: row.pause_reason as PauseReason, detail: row.pause_detail }
        : null,
    }
  },

  async pause(key, untilMs, reason, detail) {
    const until = new Date(untilMs).toISOString()
    // Keep the later pause; when it extends, the latest reason wins.
    await prisma.$executeRaw`
      INSERT INTO "email_rate_limits" ("key", "nextSlotAt", "pausedUntil", "pauseReason", "pauseDetail", "updatedAt")
      VALUES (${key}, (clock_timestamp() AT TIME ZONE 'UTC'), (${until}::timestamptz AT TIME ZONE 'UTC'), ${reason}, ${detail}, (clock_timestamp() AT TIME ZONE 'UTC'))
      ON CONFLICT ("key") DO UPDATE
        SET "pausedUntil" = EXCLUDED."pausedUntil", "pauseReason" = EXCLUDED."pauseReason",
            "pauseDetail" = EXCLUDED."pauseDetail", "updatedAt" = EXCLUDED."updatedAt"
        WHERE "email_rate_limits"."pausedUntil" IS NULL OR "email_rate_limits"."pausedUntil" < EXCLUDED."pausedUntil"
    `
  },

  async getPause(key) {
    const rows = await prisma.$queryRaw<{ paused_until: Date; pause_reason: string; pause_detail: string | null }[]>`
      SELECT "pausedUntil" AS paused_until, "pauseReason" AS pause_reason, "pauseDetail" AS pause_detail
      FROM "email_rate_limits"
      WHERE "key" = ${key} AND "pausedUntil" > (clock_timestamp() AT TIME ZONE 'UTC') AND "pauseReason" IS NOT NULL
    `
    const row = rows[0]
    return row ? { until: new Date(row.paused_until), reason: row.pause_reason as PauseReason, detail: row.pause_detail } : null
  },
}

// ── In-memory store (tests / simulated clock) ───────────────────────────────
// Same semantics as the Postgres store; every method is synchronous inside so
// concurrent callers sharing one instance behave like workers sharing the row.

export function createMemoryRateLimitStore(now: () => number): RateLimitStore & { reservations: number[] } {
  const lanes = new Map<string, { nextSlotAt: number; pause: Pause | null }>()
  const reservations: number[] = []
  const lane = (key: string) => {
    let l = lanes.get(key)
    if (!l) { l = { nextSlotAt: now(), pause: null }; lanes.set(key, l) }
    return l
  }
  return {
    reservations,
    async reserve(key, spacingMs, maxWaitMs) {
      const l = lane(key)
      const t = now()
      const pausedUntil = l.pause && l.pause.until.getTime() > t ? l.pause.until.getTime() : t
      const slot = Math.max(l.nextSlotAt, t, pausedUntil)
      if (slot > t + maxWaitMs) {
        return { ok: false, waitMs: slot - t, pause: pausedUntil > t ? l.pause : null }
      }
      l.nextSlotAt = slot + spacingMs
      reservations.push(slot)
      return { ok: true, waitMs: slot - t }
    },
    async pause(key, untilMs, reason, detail) {
      const l = lane(key)
      if (!l.pause || l.pause.until.getTime() < untilMs) l.pause = { until: new Date(untilMs), reason, detail }
    },
    async getPause(key) {
      const l = lanes.get(key)
      return l?.pause && l.pause.until.getTime() > now() ? l.pause : null
    },
  }
}
