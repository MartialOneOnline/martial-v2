import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'MANAGER'].includes(member.role))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params
  const body = await req.json().catch(() => ({}))
  const dateParam: string | undefined = body.date

  const cls = await prisma.class.findFirst({ where: { id: classId, schoolId }, select: { id: true } })
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const dateKey = dateParam ?? new Date().toISOString().slice(0, 10)
  const occurrenceDate = new Date(`${dateKey}T00:00:00.000Z`)

  // Reactivating only lifts the block on new bookings for this date —
  // bookings that were already cancelled when "Cancel Class" ran stay
  // cancelled; students who want back in need to rebook.
  await prisma.classCancellation.deleteMany({ where: { classId, date: occurrenceDate } })

  return NextResponse.json({ reactivated: true })
}
