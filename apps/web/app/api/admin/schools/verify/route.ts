import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const schools = await prisma.school.findMany({
    where: { status: 'CLAIMED' },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true, name: true, slug: true, status: true, source: true,
      city: true, country: true, email: true, phone: true, website: true,
      instagram: true, description: true, logoUrl: true,
      createdAt: true, updatedAt: true,
      _count: { select: { members: true } },
      invitations: { select: { id: true, sentAt: true, registeredAt: true } },
    },
  })
  return NextResponse.json({ schools })
}

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })

  const status = action === 'verify' ? 'VERIFIED' : action === 'suspend' ? 'SUSPENDED' : null
  if (!status) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const school = await prisma.school.update({
    where: { id },
    data: { status: status as 'VERIFIED' | 'SUSPENDED' },
    select: { id: true, name: true, status: true },
  })
  return NextResponse.json({ school })
}
