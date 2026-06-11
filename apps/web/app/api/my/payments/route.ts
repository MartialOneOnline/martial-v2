import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.id }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const page = parseInt(new URL(req.url).searchParams.get('page') || '1')
  const limit = 20

  const where = { userId: dbUser.id }
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
