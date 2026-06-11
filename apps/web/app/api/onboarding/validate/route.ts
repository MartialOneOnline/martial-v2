import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/onboarding/validate?token=xxx
// Returns invitation details if token is valid and not yet used
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  const invitation = await prisma.schoolInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
      country: true,
      activities: true,
      website: true,
      status: true,
    },
  })

  if (!invitation) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
  if (invitation.status === 'REGISTERED') return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  if (invitation.status === 'DECLINED') return NextResponse.json({ error: 'This invitation has been declined' }, { status: 410 })

  // Mark as opened if first time
  await prisma.schoolInvitation.updateMany({
    where: { token, status: { in: ['PENDING', 'SENT'] } },
    data: { status: 'OPENED', openedAt: new Date() },
  })

  return NextResponse.json(invitation)
}
