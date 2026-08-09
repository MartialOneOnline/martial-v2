import { NextRequest, NextResponse } from 'next/server'
import { expireLapsedMemberships, generateDueRenewalPayments } from '@/lib/services/membership'

// GET /api/cron/expire-memberships[?dryRun=true]
// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// sends "Authorization: Bearer <CRON_SECRET>" on scheduled invocations —
// any other caller is rejected. The schedule itself never passes dryRun,
// so the live cron always applies writes; ?dryRun=true is for manually
// previewing the blast radius (who'd be affected) before/without writing.
//
// Also generates pending cash-renewal payments for memberships that just hit
// their endDate, respecting the same dryRun flag (no writes during preview).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === 'true'
  const [renewals, expiry] = await Promise.all([
    dryRun ? Promise.resolve({ createdCount: 0 }) : generateDueRenewalPayments(),
    expireLapsedMemberships({ dryRun }),
  ])
  return NextResponse.json({ ...expiry, ...renewals })
}
