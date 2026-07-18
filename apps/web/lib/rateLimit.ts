// In-memory, best-effort rate limiter — fine for a single Next.js server
// process, but each serverless instance has its own Map, so it does not
// enforce a hard global cap across multiple concurrent instances. That's an
// acceptable tradeoff for "reasonable" abuse throttling on a low-traffic
// auth endpoint; a shared store (Redis/Upstash) would be the upgrade if this
// ever needs to be airtight, but nothing like that exists in this repo yet.
const buckets = new Map<string, { count: number; resetAt: number }>()

// Returns true when `key` has exceeded `limit` requests within `windowMs`,
// and records the current request either way. Fixed-window (not sliding) —
// simple and sufficient for this use case.
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }

  bucket.count += 1
  return bucket.count > limit
}

// Test-only: clears all buckets so tests don't leak state into each other.
export function __resetRateLimitsForTests(): void {
  buckets.clear()
}
