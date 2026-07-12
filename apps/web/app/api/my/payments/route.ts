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
