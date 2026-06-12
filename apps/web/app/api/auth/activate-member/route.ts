import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'

// POST /api/auth/activate-member — called after invite link is clicked
// Sets all PENDING memberships for this user to LEAD
export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Find by supabaseAuthId first, fall back to email for invited users
  let dbUser = await prisma.user.findFirst({
    where: { supabaseAuthId: authUser.id },
    select: { id: true },
  })

  if (!dbUser) {
    dbUser = await prisma.user.findUnique({
      where: { email: authUser.email },
      select: { id: true },
    })
  }

  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Link supabaseAuthId if missing
  await prisma.user.update({
    where: { id: dbUser.id },
    data: { supabaseAuthId: authUser.id },
  })

  await prisma.schoolMember.updateMany({
    where: { userId: dbUser.id, status: 'PENDING' },
    data: { status: 'LEAD' },
  })

  // Determine redirect based on highest role
  const membership = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'asc' },
    select: { role: true },
  })
  const isSchool = membership && ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(membership.role)
  return NextResponse.json({ ok: true, redirect: isSchool ? '/dashboard' : '/my' })
}
