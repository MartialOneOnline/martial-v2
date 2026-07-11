import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getSchoolModules } from '@/lib/school-modules'
import { hasDashboardAccess, hasStudentAccess } from '@/lib/auth/contexts'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { supabaseAuthId: authUser.id },
    select: {
      id: true, name: true, email: true, phone: true,
      avatarUrl: true, dateOfBirth: true, role: true,
      memberships: {
        where: { status: { in: ['ACTIVE', 'PENDING', 'PAUSED'] } },
        orderBy: { startDate: 'desc' },
        take: 3,
        select: {
          id: true, planName: true, price: true, currency: true,
          status: true, startDate: true, endDate: true,
          classesUsed: true, paymentMethod: true,
          school: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, city: true, modules: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
      bookings: {
        where: { scheduledAt: { gte: new Date() } },
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
      schoolMembers: {
        where: { status: { in: ['ACTIVE', 'LEAD', 'FROZEN'] }, role: 'STUDENT' },
        select: {
          id: true, belt: true, beltDegree: true, beltDate: true, role: true, status: true,
          school: {
            select: {
              id: true, name: true, slug: true, logoUrl: true, modules: true,
              _count: { select: { gradingSystems: { where: { isActive: true } } } },
            },
          },
        },
      },
      gradings: {
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

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Staff-only accounts (no real STUDENT enrollment anywhere) don't belong
  // in the student portal — mirrors the redirect in app/my/layout.tsx.
  // schoolMembers is already filtered to role: 'STUDENT' above, so an empty
  // list here means "no student membership".
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
    select: { id: true },
  })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

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
