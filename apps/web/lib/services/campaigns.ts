import { prisma } from '@/lib/db'
import { deliverCampaign, type DeliveryResult } from '@/lib/services/campaignDelivery'

export type ProcessResult = DeliveryResult

// Sends the next PENDING recipients of a campaign that are due. Paced by the
// shared Resend limiter, retried durably and idempotently — see
// lib/services/campaignDelivery.ts. Called interactively (the composer / the
// detail page poll /process) and from the campaign-send cron, which picks up
// sends left mid-way (browser closed, function timeout, quota wait).
export async function processPendingCampaignRecipients(
  campaignId: string,
  opts: { limit?: number; budgetMs?: number } = {},
): Promise<ProcessResult> {
  return deliverCampaign(campaignId, opts)
}

const CHURNED_STATUSES = ['ARCHIVED', 'INACTIVE', 'LEAD', 'FROZEN'] as const
const CONVERTED_STATUSES = new Set(['ACTIVE', 'PENDING'])
const MAX_LOOKBACK_MS = 120 * 24 * 60 * 60 * 1000 // bounds the scan regardless of any campaign's window

export type ConversionResult = { checked: number; converted: number }

// A recipient "converts" if they were churned (Archived/Inactive/Lead/Frozen)
// when the campaign was sent and their SchoolMember.status is now
// Active/Pending, detected within that campaign's conversionWindowDays.
// convertedAt is set once and never cleared, even if the member churns again
// later — it records that the campaign worked at the moment it was noticed,
// not a live "is this person still active" flag. There's no member-status
// audit log, so this is detection time, not the exact moment the status
// flipped — good enough for a directional "did this campaign work" signal.
export async function computeCampaignConversions({ dryRun = false }: { dryRun?: boolean } = {}): Promise<ConversionResult> {
  const cutoff = new Date(Date.now() - MAX_LOOKBACK_MS)

  const candidates = await prisma.campaignRecipient.findMany({
    where: {
      status: 'SENT',
      convertedAt: null,
      statusAtSend: { in: [...CHURNED_STATUSES] },
      sentAt: { gte: cutoff },
    },
    select: {
      id: true, campaignId: true, sentAt: true,
      campaign: { select: { conversionWindowDays: true } },
      schoolMember: { select: { status: true } },
    },
  })

  const now = Date.now()
  const convertedByCampaign: Record<string, number> = {}
  let converted = 0

  for (const r of candidates) {
    if (!r.sentAt) continue
    const deadline = r.sentAt.getTime() + r.campaign.conversionWindowDays * 24 * 60 * 60 * 1000
    if (now > deadline) continue // window elapsed — stop checking this one
    if (!CONVERTED_STATUSES.has(r.schoolMember.status)) continue

    converted++
    convertedByCampaign[r.campaignId] = (convertedByCampaign[r.campaignId] ?? 0) + 1
    if (!dryRun) {
      await prisma.campaignRecipient.update({ where: { id: r.id }, data: { convertedAt: new Date() } })
    }
  }

  if (!dryRun) {
    for (const [campaignId, count] of Object.entries(convertedByCampaign)) {
      await prisma.campaign.update({ where: { id: campaignId }, data: { convertedCount: { increment: count } } })
    }
  }

  return { checked: candidates.length, converted }
}
