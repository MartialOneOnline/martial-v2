import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission, type Permission } from '@/lib/auth/permissions'

async function authorise(permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, permission)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// GET /api/dashboard/staff — list staff (Instructor rows) + school members eligible to be added as staff
export async function GET() {
  const auth = await authorise('school.staff.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [instructors, schoolMembers] = await Promise.all([
    prisma.instructor.findMany({
      where: { schoolId: auth.schoolId },
      include: { classes: { select: { name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.schoolMember.findMany({
      where: { schoolId: auth.schoolId, status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
  ])

  // Instructor.userId is a plain unique scalar (not a Prisma relation), so
  // fetch the linked Users separately and merge in JS.
  const linkedUserIds = instructors.map(i => i.userId).filter((id): id is string => !!id)
  const linkedUsers = linkedUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: linkedUserIds } }, select: { id: true, email: true, avatarUrl: true } })
    : []
  const userById = Object.fromEntries(linkedUsers.map(u => [u.id, u]))

  const staff = instructors.map(i => {
    const u = i.userId ? userById[i.userId] : undefined
    return {
      id: i.id,
      userId: i.userId,
      name: i.name,
      email: u?.email ?? '',
      avatarUrl: u?.avatarUrl ?? i.photoUrl ?? null,
      role: i.role,
      belt: i.belt ?? '',
      classes: i.classes.map(c => c.name),
      salary: i.salary,
      since: i.startDate?.toISOString() ?? i.createdAt.toISOString(),
      status: i.isActive ? 'Active' : 'Inactive',
      notes: i.notes ?? '',
    }
  })

  // Candidate members for the "Add Staff" picker: active school members not already staff.
  const staffedUserIds = new Set(instructors.map(i => i.userId).filter(Boolean))
  const members = schoolMembers
    .filter(m => !staffedUserIds.has(m.userId))
    .map(m => ({
      id: m.user.id,
      name: m.user.name ?? m.user.email,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
    }))

  return NextResponse.json({ staff, members })
}

// POST /api/dashboard/staff — promote an existing school member to staff (creates an Instructor row)
export async function POST(req: NextRequest) {
  const auth = await authorise('school.staff.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { userId, role, belt, salary, startDate, notes } = body

  if (!userId) return NextResponse.json({ error: 'Member is required' }, { status: 400 })
  if (!role?.trim()) return NextResponse.json({ error: 'Role is required' }, { status: 400 })

  const schoolMember = await prisma.schoolMember.findFirst({
    where: { schoolId: auth.schoolId, userId },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  })
  if (!schoolMember) return NextResponse.json({ error: 'This person is not a member of this school' }, { status: 400 })

  const existing = await prisma.instructor.findUnique({ where: { userId } })
  if (existing) {
    return NextResponse.json({
      error: existing.schoolId === auth.schoolId ? 'This member is already staff' : 'This member is already staff at another school',
    }, { status: 409 })
  }

  const instructor = await prisma.instructor.create({
    data: {
      schoolId: auth.schoolId,
      userId,
      name: schoolMember.user.name ?? schoolMember.user.email,
      role: role.trim(),
      belt: belt?.trim() || null,
      salary: salary !== undefined && salary !== '' ? Number(salary) : null,
      startDate: startDate ? new Date(startDate) : null,
      notes: notes?.trim() || null,
      isHead: role.trim() === 'Head Instructor',
    },
  })

  return NextResponse.json({
    staff: {
      id: instructor.id,
      userId: instructor.userId,
      name: instructor.name,
      email: schoolMember.user.email,
      avatarUrl: schoolMember.user.avatarUrl ?? null,
      role: instructor.role,
      belt: instructor.belt ?? '',
      classes: [] as string[],
      salary: instructor.salary,
      since: instructor.startDate?.toISOString() ?? instructor.createdAt.toISOString(),
      status: instructor.isActive ? 'Active' : 'Inactive',
      notes: instructor.notes ?? '',
    },
  }, { status: 201 })
}
