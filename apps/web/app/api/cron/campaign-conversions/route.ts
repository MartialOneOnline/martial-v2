import { NextRequest, NextResponse } from 'next/server'
import { computeCampaignConversions } from '@/lib/services/campaigns'

// GET /api/cron/campaign-conversions[?dryRun=true]
// Triggered daily by Vercel Cron (see vercel.json), same CRON_SECRET auth as
// the other cron routes. Scans SENT recipients across all schools for a
// status flip back to Active/Pending within their campaign's conversion
// window, and bumps Campaign.convertedCount — this is what makes "Convertidos"
// in the Campañas list mean something instead of always reading 0.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === 'true'
  const result = await computeCampaignConversions({ dryRun })
  return NextResponse.json(result)
}
