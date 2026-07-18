import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getUserContexts } from '@/lib/auth/contexts'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ role: null }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, role: true, name: true, email: true },
  })
  if (!dbUser) return NextResponse.json({ role: null }, { status: 401 })

  // Read last school context from cookie (hint only, not authorization)
  const lastSchoolId = cookieStore.get('currentSchoolId')?.value ?? null

  // Get preference from DB as fallback (cross-device persistence)
  const pref = await prisma.userPreference.findUnique({
    where: { userId: dbUser.id },
    select: { lastSchoolId: true, gettingStartedDismissedAt: true },
  })

  const contexts = await getUserContexts(dbUser.id, lastSchoolId ?? pref?.lastSchoolId)

  return NextResponse.json({
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      globalRole: dbUser.role,
      gettingStartedDismissedAt: pref?.gettingStartedDismissedAt ?? null,
    },
    contexts,
  })
}
