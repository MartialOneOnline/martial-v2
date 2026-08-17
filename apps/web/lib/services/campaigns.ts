import { prisma } from '@/lib/db'
import { getResend, FROM } from '@/lib/email/resend'
import { renderCampaignTokens, buildCampaignEmail } from '@/lib/email/templates/campaign'

const CONCURRENCY = 5

async function runInChunks<T>(items: T[], size: number, worker: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(worker))
  }
}

export type ProcessResult = { processed: number; sent: number; failed: number; remaining: number }

// Sends up to `limit` PENDING recipients of a campaign, with bounded
// concurrency (unlike leads/bulk-email's unbounded Promise.all, which isn't
// safe at the scale a reactivation campaign runs at — hundreds of recipients
// would blow past Resend's rate limit and the route's own timeout). Called
// both interactively (composer polls this after creating the campaign) and
// from the campaign-send cron as a safety net for sends left mid-way.
export async function processPendingCampaignRecipients(campaignId: string, limit = 40): Promise<ProcessResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, status: true, subject: true, bodyHtml: true, school: { select: { name: true } } },
  })
  // DRAFT must go through /queue first — never sent implicitly just because
  // a recipient row happens to be PENDING (e.g. right after an edit).
  if (!campaign || campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED' || campaign.status === 'DRAFT') {
    return { processed: 0, sent: 0, failed: 0, remaining: 0 }
  }

  if (campaign.status === 'QUEUED') {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'SENDING', sentAt: new Date() } })
  }

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId, status: 'PENDING' },
    take: limit,
    include: {
      schoolMember: {
        select: { belt: true, user: { select: { name: true, email: true } } },
      },
    },
  })

  let sent = 0
  let failed = 0
  const resend = getResend()
  const schoolName = campaign.school.name

  await runInChunks(recipients, CONCURRENCY, async recipient => {
    const email = recipient.schoolMember.user.email
    const studentName = recipient.schoolMember.user.name
    const tokens = { nombre: studentName ?? '', escuela: schoolName, cinturon: recipient.schoolMember.belt ?? undefined }
    const message = renderCampaignTokens(campaign.bodyHtml, tokens)
    const subject = renderCampaignTokens(campaign.subject, tokens)
    const html = buildCampaignEmail({ studentName, schoolName, message })

    try {
      const { data, error } = await resend.emails.send({ from: FROM, to: email, subject, html })
      if (error) {
        failed++
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'FAILED', failedReason: error.message, sentAt: new Date() },
        })
        return
      }
      sent++
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'SENT', sentAt: new Date(), resendEmailId: data?.id },
      })
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'FAILED', failedReason: msg, sentAt: new Date() },
      })
    }
  })

  if (sent > 0 || failed > 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: { increment: sent }, failedCount: { increment: failed } },
    })
  }

  const remaining = await prisma.campaignRecipient.count({ where: { campaignId, status: 'PENDING' } })
  if (remaining === 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED', completedAt: new Date() } })
  }

  return { processed: recipients.length, sent, failed, remaining }
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
