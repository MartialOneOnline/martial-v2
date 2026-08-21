import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, type Permission } from '@/lib/auth/permissions'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

// Only OWNER/ADMIN may view or manage custom staff roles — granting
// permissions is an owner-level action, same tier as Billing/Modules.
async function authorise() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!(await memberHasPermission(member, 'school.settings.manage'))) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

// The 7 base roles are never stored in the DB — they're hardcoded in
// permissions.ts. Surfaced here as read-only rows alongside the school's
// custom StaffRole rows, so the Settings UI can show one combined list.
const BASE_ROLES: SchoolMemberRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'INSTRUCTOR', 'ASSISTANT_INSTRUCTOR', 'RECEPTIONIST', 'STUDENT']
const BASE_ROLE_LABELS: Record<SchoolMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  INSTRUCTOR: 'Instructor',
  ASSISTANT_INSTRUCTOR: 'Assistant Instructor',
  RECEPTIONIST: 'Receptionist',
  STUDENT: 'Student',
  CUSTOM: 'Custom',
}

// GET /api/dashboard/staff-roles — list base roles (read-only) + this school's custom roles
export async function GET() {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const customRoles = await prisma.staffRole.findMany({
    where: { schoolId: auth.schoolId },
    include: { _count: { select: { members: true } } },
    orderBy: { name: 'asc' },
  })

  const baseRoles = BASE_ROLES.map(role => ({
    id: role,
    name: BASE_ROLE_LABELS[role],
    isCustom: false,
    permissions: ROLE_PERMISSIONS[role],
    memberCount: null as number | null,
  }))

  const custom = customRoles.map(r => ({
    id: r.id,
    name: r.name,
    isCustom: true,
    permissions: Array.isArray(r.permissions) ? (r.permissions as Permission[]) : [],
    memberCount: r._count.members,
  }))

  return NextResponse.json({ roles: [...baseRoles, ...custom], allPermissions: ALL_PERMISSIONS })
}

// POST /api/dashboard/staff-roles — create a custom role
export async function POST(req: NextRequest) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { name, permissions } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (BASE_ROLES.includes(name.trim().toUpperCase().replace(/ /g, '_') as SchoolMemberRole)) {
    return NextResponse.json({ error: 'This name is reserved for a built-in role' }, { status: 400 })
  }

  const granted: Permission[] = Array.isArray(permissions)
    ? permissions.filter((p): p is Permission => ALL_PERMISSIONS.includes(p))
    : []

  const existing = await prisma.staffRole.findFirst({ where: { schoolId: auth.schoolId, name: name.trim() } })
  if (existing) return NextResponse.json({ error: 'A role with this name already exists' }, { status: 409 })

  const role = await prisma.staffRole.create({
    data: { schoolId: auth.schoolId, name: name.trim(), permissions: granted },
  })

  return NextResponse.json({
    role: { id: role.id, name: role.name, isCustom: true, permissions: granted, memberCount: 0 },
  }, { status: 201 })
}
