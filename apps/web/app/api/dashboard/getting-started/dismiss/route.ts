import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// POST /api/dashboard/getting-started/dismiss — hide the dashboard's
// "Getting Started" checklist for this user, permanently (until they ask
// support to reset it — no un-dismiss endpoint exists).
export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.userPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, gettingStartedDismissedAt: new Date() },
    update: { gettingStartedDismissedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
