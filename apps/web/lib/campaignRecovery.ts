// Recovery of recipients that the old sender marked FAILED after a Resend
// 429 rate-limit response (before reliable delivery existed). Pure planning
// logic; scripts/recover-campaign-rate-limited.ts does the I/O.
//
// Only a confirmed rate-limit rejection is requeued: Resend rejects those
// before processing, so the email was never accepted. Anything else (quota,
// network/unknown, validation) is reported and left untouched.

export type OldFailedRow = {
  id: string
  status: string
  failedReason: string | null
  resendEmailId: string | null
  email: string | null
}

export type ReasonGroup = 'RATE_LIMIT' | 'DAILY_QUOTA' | 'MONTHLY_QUOTA' | 'NETWORK_OR_UNKNOWN' | 'OTHER'

export function classifyOldFailure(reason: string | null): ReasonGroup {
  const r = (reason ?? '').toLowerCase()
  if (r.includes('daily') && r.includes('quota')) return 'DAILY_QUOTA'
  if (r.includes('monthly') && r.includes('quota')) return 'MONTHLY_QUOTA'
  if (r.includes('rate limit') || r.includes('too many requests') || r.includes('requests per second')) return 'RATE_LIMIT'
  if (!r || r.includes('unable to fetch') || r.includes('could not be resolved') || r.includes('timeout') || r.includes('aborted')
    || r.includes('internal server error') || r === 'unknown error') return 'NETWORK_OR_UNKNOWN'
  return 'OTHER'
}

export type RecoveryPlan = {
  groups: Record<string, { count: number; sampleReason: string | null; ids: string[] }>
  recover: string[] // FAILED, confirmed rate limit, no acceptance evidence
  excludedWithEvidence: { id: string; why: string }[]
}

// `accepted` = recipient ids for which some evidence of acceptance exists
// (a resendEmailId, or a matching email found in Resend's log).
export function planRecovery(rows: OldFailedRow[], accepted: Map<string, string> = new Map()): RecoveryPlan {
  const plan: RecoveryPlan = { groups: {}, recover: [], excludedWithEvidence: [] }
  for (const row of rows) {
    if (row.status !== 'FAILED') continue
    const group = classifyOldFailure(row.failedReason)
    const g = (plan.groups[group] ??= { count: 0, sampleReason: row.failedReason, ids: [] })
    g.count++
    g.ids.push(row.id)
    if (group !== 'RATE_LIMIT') continue
    if (row.resendEmailId) { plan.excludedWithEvidence.push({ id: row.id, why: `resendEmailId ${row.resendEmailId}` }); continue }
    const ev = accepted.get(row.id)
    if (ev) { plan.excludedWithEvidence.push({ id: row.id, why: ev }); continue }
    if (!row.email) { plan.excludedWithEvidence.push({ id: row.id, why: 'no email on file' }); continue }
    plan.recover.push(row.id)
  }
  return plan
}
