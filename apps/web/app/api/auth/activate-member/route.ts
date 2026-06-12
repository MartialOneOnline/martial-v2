import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// POST /api/auth/activate-member — called after invite link is clicked
// Sets all PENDING memberships for this user to ACTIVE
export async function POST() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.schoolMember.updateMany({
    where: { userId: user.id, status: 'PENDING' },
    data: { status: 'ACTIVE' },
  })

  return NextResponse.json({ ok: true })
}
