import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'
import { getUserContexts } from '@/lib/auth/contexts'

export async function GET() {
  const dbUser = await getAuthUser()
  if (!dbUser) return NextResponse.json({ role: null }, { status: 401 })

  // Read last school context from cookie (hint only, not authorization)
  const cookieStore = await cookies()
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
