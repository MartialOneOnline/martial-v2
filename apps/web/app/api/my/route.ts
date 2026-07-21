import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getSchoolModules } from '@/lib/school-modules'
import { hasDashboardAccess, hasStudentAccess } from '@/lib/auth/contexts'
import { getActiveStudentContext } from '@/lib/auth/activeContextCookie'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUserId = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true },
  })
  if (!dbUserId) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // A student in 2+ schools with no (or no matching) martial_active_context
  // cookie can't be served without silently mixing schools — see
  // getActiveStudentContext(). 'none'/'ok' are resolved below, alongside the
  // pre-existing staff-only guard.
  const studentContext = await getActiveStudentContext(dbUserId.id)
  if (studentContext.kind === 'ambiguous') {
    return NextResponse.json({ error: 'student_context_required' }, { status: 409 })
  }
  // undefined = don't filter by school. Safe for 'none': a user with zero
  // real STUDENT memberships has no Membership/Booking/Grading rows to leak
  // across schools in the first place (and the staff-only 403 check below
  // still applies).
  const schoolId = studentContext.kind === 'ok' ? studentContext.schoolId : undefined

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: {
      id: true, name: true, email: true, phone: true,
      avatarUrl: true, dateOfBirth: true, role: true, deletedAt: true,
      memberships: {
        where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] }, ...(schoolId && { schoolId }) },
        orderBy: { startDate: 'desc' },
        take: 3,
        select: {
          id: true, planName: true, price: true, currency: true,
          status: true, startDate: true, endDate: true,
          classesUsed: true, paymentMethod: true,
          school: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, modules: true,
              email: true, phone: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
      bookings: {
        where: { scheduledAt: { gte: new Date() }, ...(schoolId && { class: { schoolId } }) },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
        select: {
          id: true, scheduledAt: true, status: true,
          class: {
            select: {
              id: true, name: true, duration: true,
              school: { select: { name: true, slug: true } },
            },
          },
        },
      },
      // STUDENT-role only — a staff-facing SchoolMember (OWNER, ADMIN, ...)
      // exists purely to grant dashboard permissions and never represents a
      // real student profile. Mixing it in here would let a staff-only
      // account render as a (fake, empty) student. See hasStudentAccess().
      // Also scoped to the active student school when there is more than
      // one — a dual-school student's belt/status here must match whichever
      // school schoolId (memberships/bookings above) is scoped to.
      schoolMembers: {
        where: { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT', ...(schoolId && { schoolId }) },
        select: {
          id: true, belt: true, beltDegree: true, beltDate: true, role: true, status: true,
          school: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, modules: true,
              email: true, phone: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
      gradings: {
        where: { ...(schoolId && { schoolId }) },
        orderBy: { gradedAt: 'desc' },
        take: 10,
        select: {
          id: true, fromBelt: true, toBelt: true,
          toDegree: true, gradedAt: true, notes: true,
          school: { select: { name: true } },
          promotedBy: { select: { name: true } },
        },
      },
    },
  })

  if (!user || user.deletedAt) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Staff-only accounts (no real STUDENT enrollment anywhere) don't belong
  // in the student portal — mirrors the redirect in app/my/layout.tsx.
  // schoolMembers is already filtered to role: 'STUDENT' above, so an empty
  // list here means "no student membership" (at the active school, or
  // anywhere, when studentContext.kind is 'none').
  if (user.schoolMembers.length === 0 && (await hasDashboardAccess(user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const memberships = user.memberships.map(m => {
    const { _count, ...school } = m.school ?? {}
    return {
      ...m,
      school: m.school && { ...school, modules: getSchoolModules(m.school.modules), hasGrading: (_count?.gradingSystems ?? 0) > 0 },
    }
  })

  const schoolMembers = user.schoolMembers.map(sm => {
    const { _count, ...school } = sm.school ?? {}
    return {
      ...sm,
      school: sm.school && { ...school, modules: getSchoolModules(sm.school.modules), hasGrading: (_count?.gradingSystems ?? 0) > 0 },
    }
  })

  return NextResponse.json({ user: { ...user, memberships, schoolMembers } })
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: { id: true, deletedAt: true },
  })
  if (!dbUser || dbUser.deletedAt) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Same staff-only guard as GET — see hasStudentAccess() for rationale.
  if ((await hasDashboardAccess(dbUser.id)) && !(await hasStudentAccess(dbUser.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, phone, dateOfBirth, avatarUrl } = body

  const updated = await prisma.user.update({
    where: { supabaseAuthId: authUser.id },
    data: {
      ...(name      !== undefined && { name: name || null }),
      ...(phone     !== undefined && { phone: phone || null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
      ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || null }),
    },
    select: { id: true, name: true, phone: true, dateOfBirth: true, avatarUrl: true },
  })

  return NextResponse.json({ user: updated })
}
