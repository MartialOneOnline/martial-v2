import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const requests = await prisma.claimRequest.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ requests })
}

export async function PATCH(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id, action } = await req.json()
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })

  const status = action === 'resolve' ? 'RESOLVED' : action === 'dismiss' ? 'DISMISSED' : null
  if (!status) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const request = await prisma.claimRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  })
  return NextResponse.json({ request })
}
