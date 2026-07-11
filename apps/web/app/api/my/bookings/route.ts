import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.id }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
