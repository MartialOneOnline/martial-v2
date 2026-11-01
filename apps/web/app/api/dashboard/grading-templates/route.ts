import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { readTemplateRanks } from '@/lib/grading/templates'

// GET /api/dashboard/grading-templates — published platform templates a school can copy.
// Same permission as editing the school's grading systems.
export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school' }, { status: 400 })
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(m, 'school.gradings.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const rows = await prisma.gradingTemplate.findMany({
    where: { isPublished: true },
    select: { id: true, name: true, activity: true, description: true, ranks: true },
    orderBy: [{ activity: 'asc' }, { name: 'asc' }],
  })
  const templates = rows
    .map(t => ({ ...t, ranks: readTemplateRanks(t.ranks).map(r => ({ name: r.name, color: r.color, maxDegrees: r.maxDegrees })) }))
    .filter(t => t.ranks.length > 0)
  return NextResponse.json({ templates })
}
