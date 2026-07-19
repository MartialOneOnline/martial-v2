import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

export async function GET(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Bookings only carry a schoolId indirectly (via class.schoolId), so a
  // student in 2+ schools would otherwise see every school's bookings mixed
  // into one paginated list — see getActiveStudentContext() for the
  // resolution rules (cookie > single real context > ambiguous).
  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  if (studentContext.kind === 'none' && (await hasDashboardAccess(dbUser.id))) {
    // Staff-only account (no real STUDENT membership anywhere) — same guard
    // as GET/PATCH /api/my (myRouteStaffGuard.test.ts).
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const schoolId = studentContext.kind === 'ok' ? studentContext.schoolId : undefined

  const { searchParams } = new URL(req.url)
  const past = searchParams.get('past') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20

  const now = new Date()
  const where = {
    userId: dbUser.id,
    scheduledAt: past ? { lt: now } : { gte: now },
    ...(schoolId && { class: { schoolId } }),
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { scheduledAt: past ? 'desc' : 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, scheduledAt: true, status: true, attendedAt: true, amountPaid: true, currency: true,
        class: {
          select: {
            id: true, name: true, duration: true, level: true,
            school: { select: { name: true, slug: true, logoUrl: true } },
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ])

  return NextResponse.json({ bookings, total, pages: Math.ceil(total / limit) })
}
