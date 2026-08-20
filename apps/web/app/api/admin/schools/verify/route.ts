import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  // UNDER_REVIEW = finished the Getting Started checklist, ready to review.
  // CLAIMED = owner signed up but hasn't (or won't) finish it — e.g. a school
  // linked to an owner outside the self-serve flow, or one that's just slow.
  // Both land here so a school never sits invisible waiting on a checklist
  // step it may never complete; sorted with UNDER_REVIEW first since those
  // are the most actionable.
  const schools = await prisma.school.findMany({
    where: { status: { in: ['UNDER_REVIEW', 'CLAIMED'] } },
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
  schools.sort((a, b) => (a.status === b.status ? 0 : a.status === 'UNDER_REVIEW' ? -1 : 1))
  return NextResponse.json({ schools })
}

export async function PATCH(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

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
