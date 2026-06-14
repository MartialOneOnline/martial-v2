import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params

  // Find the most recent scheduled occurrence for this class (today or future)
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86400000)

  const bookings = await prisma.booking.findMany({
    where: {
      schoolId,
      classId,
      scheduledAt: { gte: startOfDay, lt: endOfDay },
      status: { not: 'CANCELLED' },
    },
    include: {
      user: { select: { name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return NextResponse.json({
    bookings: bookings.map(b => ({
      id:        b.id,
      name:      b.user?.name ?? '—',
      avatarUrl: b.user?.avatarUrl ?? null,
      status:    b.status,
    })),
  })
}
