import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { hasDashboardAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

export async function GET(req: NextRequest) {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // A student in 2+ schools would otherwise see every school's transaction
  // history mixed into one paginated list — see getActiveStudentContext().
  const studentContext = await getActiveStudentContext(dbUser.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  if (studentContext.kind === 'none' && (await hasDashboardAccess(dbUser.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const schoolId = studentContext.kind === 'ok' ? studentContext.schoolId : undefined

  const page = parseInt(new URL(req.url).searchParams.get('page') || '1')
  const limit = 20

  const where = { userId: dbUser.id, ...(schoolId && { schoolId }) }
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, amount: true, currency: true, description: true,
        date: true, type: true, category: true,
        school: { select: { name: true, slug: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total, pages: Math.ceil(total / limit) })
}
