import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { processPendingCampaignRecipients } from '@/lib/services/campaigns'

export const maxDuration = 60

// GET /api/cron/campaign-send[?dryRun=true]
// Triggered daily by Vercel Cron (see vercel.json), same CRON_SECRET auth as
// the other cron routes. This is NOT the primary delivery path — the
// composer sends interactively via /[id]/process right after creating a
// campaign. This cron only finishes campaigns left mid-send (browser closed,
// function crash) across all schools, across QUEUED/SENDING campaigns.
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

  let processed = 0
  for (const campaign of pending) {
    const result = await processPendingCampaignRecipients(campaign.id)
    processed += result.processed
  }

  return NextResponse.json({ campaigns: pending.length, processed })
}
