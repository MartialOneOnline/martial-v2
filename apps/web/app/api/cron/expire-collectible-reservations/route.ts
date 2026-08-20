import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { releaseExpiredReservations } from '@/lib/services/collectibles/reservation'

// GET /api/cron/expire-collectible-reservations
// Same auth pattern as /api/cron/expire-memberships — Vercel Cron sends
// "Authorization: Bearer <CRON_SECRET>" on scheduled invocations.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const released = await releaseExpiredReservations(prisma)
  return NextResponse.json({ released })
}
