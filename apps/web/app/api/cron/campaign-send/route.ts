import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processPendingCampaignRecipients } from '@/lib/services/campaigns'
import { recoverAllExpiredClaims } from '@/lib/services/campaignDelivery'

export const maxDuration = 60

// GET /api/cron/campaign-send[?dryRun=true]
// Triggered daily by Vercel Cron (see vercel.json), same CRON_SECRET auth as
// the other cron routes. This is NOT the primary delivery path — the
// composer sends interactively via /[id]/process right after creating a
// campaign. This cron only finishes campaigns left mid-send (browser closed,
// function crash, retries scheduled for later, quota waits) across all
// schools, across QUEUED/SENDING campaigns. Claims are atomic, so running at
// the same time as an interactive /process never sends a recipient twice.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === 'true'

  const pending = await prisma.campaign.findMany({
    where: { status: { in: ['QUEUED', 'SENDING'] } },
    select: { id: true },
  })

  if (dryRun) {
    return NextResponse.json({ campaigns: pending.length, dryRun: true })
  }

  const deadline = Date.now() + 50_000
  const recovered = await recoverAllExpiredClaims()
  let processed = 0
  let waiting: unknown = null
  for (const campaign of pending) {
    const budgetMs = deadline - Date.now()
    if (budgetMs < 20_000) break // leave the rest for the next run
    const result = await processPendingCampaignRecipients(campaign.id, { budgetMs, limit: 200 })
    processed += result.processed
    if (result.waiting) { waiting = result.waiting; break } // lane paused for every campaign
  }

  return NextResponse.json({ campaigns: pending.length, processed, recovered, waiting })
}
