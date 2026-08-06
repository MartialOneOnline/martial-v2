import { NextRequest, NextResponse } from 'next/server'
import { expireLapsedMemberships } from '@/lib/services/membership'

// GET /api/cron/expire-memberships
// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// sends "Authorization: Bearer <CRON_SECRET>" on scheduled invocations —
// any other caller is rejected.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await expireLapsedMemberships()
  return NextResponse.json(result)
}
