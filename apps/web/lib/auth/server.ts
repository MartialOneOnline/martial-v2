import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'
import { requireSchoolAccess } from './contexts'

// Resolves the authenticated user from Supabase session.
// Returns the Prisma User id, not the Supabase auth id.
export async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

// Returns currentSchoolId from cookie (context hint — always validate with requireSchoolAccess).
export async function getCurrentSchoolId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('currentSchoolId')?.value ?? null
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
