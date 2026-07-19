import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Find the school first — a nonexistent/archived/suspended school 404s
  // regardless of auth state, so this can't be used to probe school status
  // by an unauthenticated caller (who previously always got a 200 here).
  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, hasFreeTrialCls: true, status: true },
  })

  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status))
    return NextResponse.json({ error: 'School not found' }, { status: 404 })

  // Get current user from Supabase session
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ authenticated: false })
  }

  // Find user in V2 DB
  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: user.id },
    select: { id: true, deletedAt: true },
  })

  // A self-deleted (anonymized) account keeps its supabaseAuthId link until a
  // successful DELETE /api/my/account clears it. Its SchoolMember rows are
  // deliberately retained (school business records — see the PII retention
  // policy in DELETE /api/my/account), but a still-live Supabase session for
  // that identity shouldn't be able to read them back out — same as
  // returning as if it had no V2 account at all.
  if (!dbUser || dbUser.deletedAt) {
    return NextResponse.json({ authenticated: true, hasMembership: false, memberStatus: null, schoolId: school.id, hasFreeTrialCls: school.hasFreeTrialCls })
  }

  // Any existing SchoolMember row, regardless of status — lets callers (e.g. the
  // /join page) tell "not a member yet" apart from "already has a pending/lead
  // request", instead of only learning that on a 409 from a submit attempt.
  const member = await prisma.schoolMember.findFirst({
    where: { schoolId: school.id, userId: dbUser.id },
  })

  return NextResponse.json({
    authenticated: true,
    hasMembership: member?.status === 'ACTIVE',
    membershipRole: member?.role ?? null,
    memberStatus: member?.status ?? null,
    schoolId: school.id,
    userId: dbUser.id,
    hasFreeTrialCls: school.hasFreeTrialCls,
  })
}
