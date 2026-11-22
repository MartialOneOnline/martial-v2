import type { Translations } from './i18n/translations'

// Shared user-facing labels for campaign delivery states (detail, list, composer).

export type RecipientStatusKey = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'UNCERTAIN' | 'SKIPPED'

export function formatWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function campaignWaitMessage(t: Translations, waiting: { reason: string; until: string }): string {
  const time = formatWhen(waiting.until)
  const tpl = waiting.reason === 'DAILY_QUOTA' ? t.campaigns.waitDailyQuota
    : waiting.reason === 'MONTHLY_QUOTA' ? t.campaigns.waitMonthlyQuota
    : t.campaigns.waitConfig
  return tpl.replace('{time}', time)
}

export function recipientStatusLabel(t: Translations, status: RecipientStatusKey, attempts: number): string {
  switch (status) {
    case 'PENDING': return attempts > 0 ? t.campaigns.recipientRetrying : t.common.pending
    case 'SENDING': return t.campaigns.recipientSending
    case 'SENT': return t.campaigns.recipientSent
    case 'FAILED': return t.campaigns.recipientFailed
    case 'UNCERTAIN': return t.campaigns.recipientUncertain
    case 'SKIPPED': return t.campaigns.noEmailWarning
  }
}

export const RECIPIENT_STATUS_COLOR: Record<RecipientStatusKey, string> = {
  PENDING: '#2563EB',
  SENDING: '#2563EB',
  SENT: '#16A34A',
  FAILED: '#DC2626',
  UNCERTAIN: '#B45309',
  SKIPPED: '#9CA3AF',
}

// "Completed with errors" is derived: status COMPLETED and some recipient
// ended FAILED/UNCERTAIN (failedCount counts both).
export function campaignStatusLabel(t: Translations, status: string, failedCount: number): string {
  switch (status) {
    case 'DRAFT': return t.campaigns.statusDraft
    case 'QUEUED': return t.campaigns.statusQueued
    case 'SENDING': return t.campaigns.statusSending
    case 'COMPLETED': return failedCount > 0 ? t.campaigns.statusCompletedWithErrors : t.common.completed
    case 'FAILED': return t.common.failed
    case 'CANCELLED': return t.common.cancelled
    default: return status
  }
}
