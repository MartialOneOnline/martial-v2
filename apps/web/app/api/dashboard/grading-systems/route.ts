import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'

async function auth() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(m.role, 'school.gradings.manage')) return { error: 'Forbidden', status: 403 as const }
    } catch { return { error: 'Forbidden', status: 403 as const } }
  }
  return { schoolId }
}

// GET /api/dashboard/grading-systems
export async function GET() {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const systems = await prisma.gradingSystem.findMany({
    where: { schoolId: a.schoolId, isActive: true },
    include: { ranks: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({ systems })
}

// POST /api/dashboard/grading-systems
export async function POST(req: NextRequest) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { name, activity, isDefault } = await req.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // If setting as default, unset others
  if (isDefault) {
    await prisma.gradingSystem.updateMany({
      where: { schoolId: a.schoolId },
      data: { isDefault: false },
    })
  }

  const system = await prisma.gradingSystem.create({
    data: { schoolId: a.schoolId, name, activity: activity ?? null, isDefault: isDefault ?? false },
    include: { ranks: true },
  })

  return NextResponse.json({ system }, { status: 201 })
}
