import { NextRequest, NextResponse } from 'next/server'
import { syncTrials } from '@/lib/services/trial'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { staffCan } from '@/lib/auth/customRoles'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!(await staffCan(member, 'school.bookings.manage', ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR'])))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id: classId } = await params
  const body = await req.json().catch(() => ({}))
  const dateParam: string | undefined = body.date

  const base = dateParam ? new Date(dateParam) : new Date()
  const startOfDay = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const endOfDay   = new Date(startOfDay.getTime() + 86_400_000)

  const where = {
    classId,
    class: { schoolId },
    scheduledAt: { gte: startOfDay, lt: endOfDay },
    status: 'CONFIRMED' as const,
  }
  const attendees = await prisma.booking.findMany({ where, select: { userId: true } })
  const { count } = await prisma.booking.updateMany({
    where,
    data: { status: 'COMPLETED', attendedAt: new Date() },
  })
  // First class of a free trial starts its days (lib/services/trial.ts)
  await syncTrials(attendees.map(a => a.userId), schoolId)

  return NextResponse.json({ updated: count })
}
