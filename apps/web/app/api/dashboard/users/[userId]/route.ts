import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

// PATCH /api/dashboard/users/[userId] — update user profile fields (name, phone, dateOfBirth)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.members.update')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { userId } = await params
  const body = await req.json()
  const { name, phone, dateOfBirth } = body

  // Verify the user belongs to this school before editing
  const memberCheck = await prisma.schoolMember.findFirst({
    where: { userId, schoolId },
  })
  if (!memberCheck) return NextResponse.json({ error: 'User not found in this school' }, { status: 404 })

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name: name?.trim() || undefined }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
    },
    select: { id: true, name: true, phone: true, dateOfBirth: true },
  })

  return NextResponse.json({ user: updated })
}
