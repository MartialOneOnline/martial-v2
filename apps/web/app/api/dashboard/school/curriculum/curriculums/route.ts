import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess, DASHBOARD_ROLES } from '@/lib/auth/contexts'

async function requireStaffSchoolId(userId: string, role: string) {
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return null
  if (role !== 'SUPERADMIN') {
    const member = await requireSchoolAccess(userId, schoolId).catch(() => null)
    if (!member || !DASHBOARD_ROLES.includes(member.role)) return null
  }
  return schoolId
}

// GET /api/dashboard/school/curriculum/curriculums
// Named containers a school defines itself — "White Belt", "Leandro Lo
// Program" — not a fixed belt enum. Each has its own Lessons underneath.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const curriculums = await prisma.curriculum.findMany({
    where: { schoolId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { lessons: true } } },
  })
  return NextResponse.json({ curriculums })
}

// POST /api/dashboard/school/curriculum/curriculums
// Body: { name, description? }
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await requireStaffSchoolId(user.id, user.role)
  if (!schoolId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : null
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const curriculum = await prisma.curriculum.create({ data: { schoolId, name, description } })
  return NextResponse.json({ curriculum: { ...curriculum, _count: { lessons: 0 } } })
}
