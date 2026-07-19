import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { notifySelfJoinRequest } from '@/lib/notifications/create'

// POST /api/schools/[slug]/join — logged-in user confirms "Join this school".
// Creates a SchoolMember (status LEAD) directly, tied to their account — unlike
// the public /api/public/schools/[slug]/lead endpoint, which only creates a Lead
// record for anonymous visitors and requires no auth.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })
  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status))
    return NextResponse.json({ error: 'School not found' }, { status: 404 })

  let dbUser = await prisma.user.findUnique({ where: { supabaseAuthId: authUser.id } })
  // A self-deleted (anonymized) account keeps its supabaseAuthId link until a
  // successful DELETE /api/my/account clears it — a still-live Supabase
  // session must not be able to re-activate that identity by joining a
  // school under it. Mirrors the same gate on /api/memberships/trial.
  if (dbUser?.deletedAt) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: authUser.email!,
        supabaseAuthId: authUser.id,
        name: authUser.user_metadata?.full_name ?? null,
      },
    })
  }

  const existing = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: school.id },
    select: { status: true },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'Already associated with this school', status: existing.status },
      { status: 409 },
    )
  }

  // No dedicated "source" column on SchoolMember (would need a schema migration) —
  // record provenance in notes so it reads the same as other admin-facing entries.
  try {
    await prisma.schoolMember.create({
      data: {
        schoolId: school.id,
        userId: dbUser.id,
        role: 'STUDENT',
        status: 'LEAD',
        notes: 'Self-requested via "Join this school" (SELF_REQUEST)',
      },
    })
  } catch (err: unknown) {
    // A double-click / two tabs can both pass the findFirst check above before
    // either commits — the (schoolId, userId) unique constraint catches the
    // second create. Report it the same way as the upfront check, not a 500.
    if ((err as { code?: string }).code === 'P2002') {
      const raceLoser = await prisma.schoolMember.findFirst({
        where: { userId: dbUser.id, schoolId: school.id },
        select: { status: true },
      })
      return NextResponse.json(
        { error: 'Already associated with this school', status: raceLoser?.status ?? null },
        { status: 409 },
      )
    }
    throw err
  }

  notifySelfJoinRequest(school.id, dbUser.name ?? dbUser.email)

  return NextResponse.json({ success: true })
}
