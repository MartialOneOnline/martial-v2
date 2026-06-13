import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'
import { requireSchoolAccess } from './contexts'

// Resolves the authenticated user from Supabase session.
// Returns the Prisma User id, not the Supabase auth id.
export async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, role: true, email: true, name: true },
  })
  return dbUser ?? null
}

// Returns currentSchoolId from cookie, falling back to UserPreference if cookie is missing.
export async function getCurrentSchoolId(): Promise<string | null> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get('currentSchoolId')?.value ?? null
  if (fromCookie) return fromCookie

  // Fallback: read from UserPreference (handles cross-device / first login after claim)
  const user = await getAuthUser()
  if (!user) return null
  const pref = await prisma.userPreference.findUnique({
    where: { userId: user.id },
    select: { lastSchoolId: true },
  })
  return pref?.lastSchoolId ?? null
}

// Convenience: get auth user + validate school access in one call.
// Throws 'UNAUTHORIZED' or 'FORBIDDEN' — catch in route handler.
export async function requireDashboardAccess(schoolId?: string) {
  const user = await getAuthUser()
  if (!user) throw new Error('UNAUTHORIZED')

  if (user.role === 'SUPERADMIN') return { user, member: null }

  const sid = schoolId ?? (await getCurrentSchoolId())
  if (!sid) throw new Error('FORBIDDEN')

  const member = await requireSchoolAccess(user.id, sid)
  return { user, member }
}

// Guard for superadmin-only API routes.
// Returns null (authorized) or a NextResponse with 401/403 to return immediately.
// Usage:
//   const deny = await guardSuperadmin(req)
//   if (deny) return deny
export async function guardSuperadmin(
  req: NextRequest,
): Promise<NextResponse | null> {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cs) =>
          cs.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          ),
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return null
}
