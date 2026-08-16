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
  if (!campaign || campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
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
