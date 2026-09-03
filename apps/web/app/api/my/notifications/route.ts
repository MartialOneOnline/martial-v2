import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

// Student-facing counterpart to /api/dashboard/notifications. Simpler than the
// staff version: a student only ever sees notifications addressed to them
// personally (recipientUserId = their own id), never a school-wide broadcast
// (those are staff announcements — see lib/notifications/create.ts, every
// factory there targets a school's dashboard, not a student). No notification
// factory creates student-targeted rows yet, so this legitimately returns an
// empty list today; it's wired to real data so it picks up new notification
// types (e.g. "your grading was recorded") the moment a caller starts creating
// them, without another route needing to be written.

// GET /api/my/notifications
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const before = searchParams.get('before')

  const where = {
    recipientUserId: user.id,
    ...(before && { createdAt: { lt: new Date(before) } }),
  }

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
    prisma.notification.count({ where: { recipientUserId: user.id, read: false } }),
  ])

  return NextResponse.json({ notifications, unread, hasMore: notifications.length === limit })
}

// PATCH /api/my/notifications — { id } marks one as read, {} marks all as read
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id } = body

  if (id) {
    await prisma.notification.updateMany({ where: { id, recipientUserId: user.id }, data: { read: true } })
  } else {
    await prisma.notification.updateMany({ where: { recipientUserId: user.id, read: false }, data: { read: true } })
  }

  return NextResponse.json({ ok: true })
}
