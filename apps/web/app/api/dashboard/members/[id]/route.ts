import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// PATCH /api/dashboard/members/[id] — update status, belt, or beltDegree
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { id } = await params
  const body = await req.json()
  const { status, belt, beltDegree, notes } = body

  // Verify the member belongs to this school
  const existing = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
  })
  if (!existing) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const updated = await prisma.schoolMember.update({
    where: { id },
    data: {
      ...(status !== undefined && { status }),
      ...(belt !== undefined && { belt }),
      ...(beltDegree !== undefined && { beltDegree }),
      ...(notes !== undefined && { notes }),
    },
    select: { id: true, status: true, belt: true, beltDegree: true },
  })

  return NextResponse.json({ member: updated })
}
