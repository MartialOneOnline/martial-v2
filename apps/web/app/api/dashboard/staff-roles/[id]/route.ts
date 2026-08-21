import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { ALL_PERMISSIONS, type Permission } from '@/lib/auth/permissions'

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

// PATCH /api/dashboard/staff-roles/[id] — rename a custom role and/or change its permissions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.staffRole.findUnique({ where: { id } })
  if (!existing || existing.schoolId !== auth.schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, permissions } = body

  const data: { name?: string; permissions?: Permission[] } = {}
  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    data.name = name.trim()
  }
  if (permissions !== undefined) {
    data.permissions = Array.isArray(permissions) ? permissions.filter((p): p is Permission => ALL_PERMISSIONS.includes(p)) : []
  }

  const role = await prisma.staffRole.update({ where: { id }, data })

  return NextResponse.json({
    role: { id: role.id, name: role.name, isCustom: true, permissions: role.permissions as Permission[] },
  })
}

// DELETE /api/dashboard/staff-roles/[id] — remove a custom role
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorise()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const existing = await prisma.staffRole.findUnique({ where: { id }, include: { _count: { select: { members: true } } } })
  if (!existing || existing.schoolId !== auth.schoolId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing._count.members > 0) {
    return NextResponse.json({ error: `Reassign the ${existing._count.members} member(s) using this role before deleting it` }, { status: 409 })
  }

  await prisma.staffRole.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
