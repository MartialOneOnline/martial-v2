// Client-side driver for POST /api/dashboard/campaigns/[id]/process.
//
// The server does the pacing and retries; this loop only decides when to call
// again. It waits for short scheduled retries (a rate-limit backoff) and stops
// on long waits (quota, config) — the work is durable in the database and the
// campaign-send cron resumes it, so closing the browser loses nothing.

export type ProcessResponse = {
  processed: number
  sent: number
  failed: number
  uncertain?: number
  remaining: number
  nextAttemptAt?: string | null
  waiting?: { reason: string; until: string } | null
  completed?: boolean
  totals?: { sent: number; failed: number; uncertain: number; pending: number; sending: number; retryScheduled: number }
}

export type PollOutcome = {
  sent: number
  failed: number
  uncertain: number
  remaining: number
  waiting: { reason: string; until: string } | null
  nextAttemptAt: string | null
  finished: boolean // nothing left to send
}

type Deps = {
  fetch: typeof fetch
  sleep: (ms: number) => Promise<void>
  now: () => number
}

const defaultDeps: Deps = {
  fetch: (...args) => fetch(...args),
  sleep: ms => new Promise(r => setTimeout(r, ms)),
  now: () => Date.now(),
}

export async function pollCampaignProcess(
  campaignId: string,
  onProgress: (p: PollOutcome) => void = () => {},
  opts: { maxIdleWaitMs?: number; maxCalls?: number } = {},
  deps: Deps = defaultDeps,
): Promise<PollOutcome> {
  const maxIdleWaitMs = opts.maxIdleWaitMs ?? 60_000
  const maxCalls = opts.maxCalls ?? 500
  const out: PollOutcome = { sent: 0, failed: 0, uncertain: 0, remaining: 0, waiting: null, nextAttemptAt: null, finished: false }

  for (let call = 0; call < maxCalls; call++) {
    const res = await deps.fetch(`/api/dashboard/campaigns/${campaignId}/process`, { method: 'POST' })
    const data = (await res.json().catch(() => ({}))) as Partial<ProcessResponse> & { error?: string }
    if (!res.ok) throw new Error(data.error || 'Failed to send')

    out.sent += data.sent ?? 0
    out.failed += data.failed ?? 0
    out.uncertain += data.uncertain ?? 0
    out.remaining = data.remaining ?? 0
    out.waiting = data.waiting ?? null
    out.nextAttemptAt = data.nextAttemptAt ?? null
    out.finished = out.remaining === 0
    onProgress({ ...out })

    if (out.finished || out.waiting) return out

    if ((data.processed ?? 0) === 0) {
      // Nothing was due: wait for the next scheduled retry if it's soon.
      const at = out.nextAttemptAt ? Date.parse(out.nextAttemptAt) : NaN
      const wait = Number.isFinite(at) ? at - deps.now() : 1_000
      if (wait > maxIdleWaitMs) return out
      await deps.sleep(Math.max(500, wait))
    } else {
      await deps.sleep(250)
    }
  }
  return out
}
