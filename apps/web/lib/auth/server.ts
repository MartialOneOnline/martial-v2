import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'
import { requireSchoolAccess, DASHBOARD_ROLES } from './contexts'

type SupabaseAuthUser = {
  id: string
  email?: string | null
  app_metadata?: { provider?: string | null } | null
  user_metadata?: Record<string, unknown> | null
}

const DB_USER_SELECT = { id: true, role: true, email: true, name: true, deletedAt: true } as const

// Google/Apple/Microsoft sign-ups create the Supabase auth user directly —
// unlike /api/auth/register's password path, nothing ever inserts the
// matching Prisma row for them. resolveDbUser() provisions it below instead.
const OAUTH_PROVIDERS = new Set(['google', 'apple', 'azure'])

function readOAuthName(metadata: SupabaseAuthUser['user_metadata'], email: string): string {
  const raw = metadata?.full_name ?? metadata?.name
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return email.split('@')[0] || email
}

// Resolves the Prisma User for a given Supabase auth user (by supabaseAuthId,
// falling back to linking by email if the link hasn't been made yet).
// Shared by getAuthUser() (cookie-based) and any route that verifies a
// Supabase access token directly (e.g. /api/auth/login-event).
export async function resolveDbUser(supabaseUser: SupabaseAuthUser) {
  let dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: supabaseUser.id },
    select: DB_USER_SELECT,
  })

  // Fallback: link by email if supabaseAuthId not set yet
  if (!dbUser && supabaseUser.email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: supabaseUser.email },
      select: DB_USER_SELECT,
    })
    if (byEmail) {
      await prisma.user.update({
        where: { id: byEmail.id },
        data: { supabaseAuthId: supabaseUser.id },
      })
      dbUser = byEmail
    }
  }

  // First-time OAuth sign-in: a valid Supabase session exists but no Prisma
  // row does yet. Provision one here — the single place every authenticated
  // request resolves through — with the same default role self-serve
  // student registration uses.
  if (!dbUser && supabaseUser.email && OAUTH_PROVIDERS.has(supabaseUser.app_metadata?.provider ?? '')) {
    const email = supabaseUser.email
    try {
      dbUser = await prisma.user.create({
        data: {
          email,
          name: readOAuthName(supabaseUser.user_metadata, email),
          role: 'STUDENT',
          supabaseAuthId: supabaseUser.id,
        },
        select: DB_USER_SELECT,
      })
    } catch (err: any) {
      // Lost a race against a concurrent request provisioning the same
      // email — re-fetch and link instead of failing the sign-in.
      if (err?.code !== 'P2002') throw err
      const byEmail = await prisma.user.findUnique({ where: { email }, select: DB_USER_SELECT })
      if (byEmail) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { supabaseAuthId: supabaseUser.id } })
        dbUser = byEmail
      }
    }
  }

  // A self-deleted (anonymized) account must never be treated as
  // authenticated again, even if its Supabase auth user still exists
  // (e.g. the admin deleteUser call in /api/my/account failed and the
  // session cookie is technically still valid) — see DELETE /api/my/account.
  if (dbUser?.deletedAt) return null

  return dbUser ?? null
}

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

  return resolveDbUser(user)
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
// Beyond requireSchoolAccess()'s ACTIVE-status check, this also enforces that
// the member's role is staff-facing (DASHBOARD_ROLES) — a STUDENT with an
// ACTIVE SchoolMember row must not read /api/dashboard/** report/billing data
// just because they belong to the school.
export async function requireDashboardAccess(schoolId?: string) {
  const user = await getAuthUser()
  if (!user) throw new Error('UNAUTHORIZED')

  if (user.role === 'SUPERADMIN') return { user, member: null }

  const sid = schoolId ?? (await getCurrentSchoolId())
  if (!sid) throw new Error('FORBIDDEN')

  const member = await requireSchoolAccess(user.id, sid)
  if (!DASHBOARD_ROLES.includes(member.role)) throw new Error('FORBIDDEN')
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

// Same guard as guardSuperadmin, but also returns the caller's own id/email —
// needed for routes that re-verify the admin's password before a destructive
// action (e.g. permanently deleting a school), or that must attribute an
// action to the acting superadmin (e.g. impersonation audit log).
export async function guardSuperadminUser(
  req: NextRequest,
): Promise<{ id: string; email: string } | NextResponse> {
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

  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return { id: dbUser.id, email: user.email }
}
