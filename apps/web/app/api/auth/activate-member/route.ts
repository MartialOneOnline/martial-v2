import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/db'
import { sendWelcomeStudentEmail } from '@/lib/email/sendEmails'

// POST /api/auth/activate-member — called after invite link is clicked
//
// Body: { schoolId?: string } — the school whose invite is being accepted,
// threaded through from members/invite or resend-invite via the
// ?schoolId= query param on the Supabase redirectTo (see accept-invite and
// set-password pages). It's client-supplied, so it is never trusted blindly:
// it must correspond to a real SchoolMember of the authenticated user (any
// status) or the request is rejected outright — no fallback, no guessing,
// it can never touch another user's data.
//
// schoolId provided:
//   - no SchoolMember at all for (user, schoolId) -> 404, nothing touched.
//   - status PENDING -> activate it -> LEAD, redirect from it.
//   - any other status (LEAD/ACTIVE/...) -> idempotent repeat-visit (e.g. the
//     invite link was already used before, or clicked twice) -> no mutation,
//     200, redirect from it.
//
// Legacy callers (no schoolId — links sent before this field existed, or
// cases where Supabase's own redirect fallback drops query params, see the
// homepage-hash rescue script in app/layout.tsx), disambiguated from the
// user's own memberships:
//   - exactly one PENDING -> activate it, unambiguous.
//   - two or more PENDING -> ambiguous, refuse to guess: 409, activates
//     nothing; the caller must resend a schoolId-scoped link.
//   - zero PENDING, zero memberships at all -> genuinely broken state, 404.
//   - zero PENDING, exactly one other membership -> not ambiguous (only one
//     candidate exists) -> redirect from it, no mutation.
//   - zero PENDING, two or more other memberships -> deliberately does NOT
//     guess which school to redirect to (no mutation is at stake here, but
//     picking one silently was exactly the kind of undocumented behavior
//     this endpoint had before) -> flat, documented, tested default: '/my'.
export async function POST(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let requestedSchoolId: string | null = null
  try {
    const body = await req.json()
    if (body && typeof body.schoolId === 'string' && body.schoolId) requestedSchoolId = body.schoolId
  } catch { /* no/invalid body — legacy caller */ }

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

  const membershipSelect = {
    status: true,
    role: true,
    school: { select: { name: true, city: true, language: true } },
  } as const

  function redirectFor(role: string): string {
    return ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(role) ? '/dashboard' : '/my'
  }

  let targetSchoolId: string

  if (requestedSchoolId) {
    // Client-supplied — must correspond to a real membership of this user, or
    // we refuse outright. No fallback, no guessing.
    const existingMembership = await prisma.schoolMember.findFirst({
      where: { userId: dbUser.id, schoolId: requestedSchoolId },
      select: membershipSelect,
    })
    if (!existingMembership) {
      return NextResponse.json(
        { error: 'No membership found for this school.', code: 'INVITATION_NOT_FOUND' },
        { status: 404 }
      )
    }
    if (existingMembership.status !== 'PENDING') {
      // Idempotent repeat-visit — already activated, nothing to do.
      return NextResponse.json({ ok: true, redirect: redirectFor(existingMembership.role) })
    }
    targetSchoolId = requestedSchoolId
  } else {
    // Legacy caller — disambiguate from the user's own PENDING memberships.
    const pendingMembers = await prisma.schoolMember.findMany({
      where: { userId: dbUser.id, status: 'PENDING' },
      select: { schoolId: true },
    })

    if (pendingMembers.length > 1) {
      // Ambiguous — never guess which one the user meant. Activate nothing.
      return NextResponse.json(
        { error: 'Multiple pending invitations found; cannot determine which one to activate.', code: 'AMBIGUOUS_INVITATION' },
        { status: 409 }
      )
    }

    if (pendingMembers.length === 1) {
      targetSchoolId = pendingMembers[0]!.schoolId
    } else {
      // Nothing PENDING — either a broken state or a normal repeat visit.
      const otherMemberships = await prisma.schoolMember.findMany({
        where: { userId: dbUser.id },
        select: membershipSelect,
      })

      if (otherMemberships.length === 0) {
        return NextResponse.json(
          { error: 'No school membership found for this account.', code: 'NO_MEMBERSHIP' },
          { status: 404 }
        )
      }
      if (otherMemberships.length === 1) {
        // Only one candidate — not ambiguous, no guessing involved.
        return NextResponse.json({ ok: true, redirect: redirectFor(otherMemberships[0]!.role) })
      }
      // Two or more existing memberships, none PENDING — deliberately flat,
      // documented default rather than silently picking one.
      return NextResponse.json({ ok: true, redirect: '/my' })
    }
  }

  await prisma.schoolMember.updateMany({
    where: { userId: dbUser.id, schoolId: targetSchoolId, status: 'PENDING' },
    data: { status: 'LEAD' },
  })

  const membership = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: targetSchoolId },
    select: { role: true, school: { select: { name: true, city: true, language: true } } },
  })
  const isSchool = membership && ['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(membership.role)

  // Send welcome email to students only (not staff)
  if (!isSchool && membership?.school) {
    const fullUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { name: true, email: true },
    })
    if (fullUser?.email) {
      sendWelcomeStudentEmail({
        to: fullUser.email,
        studentName: fullUser.name,
        schoolName: membership.school.name,
        schoolCity: membership.school.city,
        lang: membership.school.language,
      }).catch(err => console.error('[activate-member] welcome email failed:', err))
    }
  }

  return NextResponse.json({ ok: true, redirect: isSchool ? '/dashboard' : '/my' })
}
