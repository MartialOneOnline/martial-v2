import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true },
  })

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ profile })
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, avatarUrl } = body

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(name      !== undefined && { name:      name?.trim()      || null }),
      ...(phone     !== undefined && { phone:     phone?.trim()     || null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl?.trim() || null }),
    },
    select: { id: true, name: true, email: true, phone: true, avatarUrl: true },
  })

  return NextResponse.json({ profile: updated })
}
