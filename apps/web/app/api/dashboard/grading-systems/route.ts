import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { beltRanksFromTemplate, readTemplateRanks } from '@/lib/grading/templates'

async function auth() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(m, 'school.gradings.manage')) return { error: 'Forbidden', status: 403 as const }
    } catch { return { error: 'Forbidden', status: 403 as const } }
  }
  return { schoolId }
}

// GET /api/dashboard/grading-systems
export async function GET() {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const [systems, classes] = await Promise.all([
    prisma.gradingSystem.findMany({
      where: { schoolId: a.schoolId, isActive: true },
      include: { ranks: { orderBy: { order: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    }),
    // For "which classes count" — active classes, plus inactive ones a belt still uses
    prisma.class.findMany({
      where: { schoolId: a.schoolId },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
  ])
  const used = new Set(systems.flatMap(s => s.ranks.flatMap(r => r.classTypeIds)))

  return NextResponse.json({
    systems,
    classes: classes.filter(c => c.isActive || used.has(c.id)).map(c => ({ id: c.id, name: c.name, isActive: c.isActive })),
  })
}

// POST /api/dashboard/grading-systems
// { name, activity?, isDefault? } — an empty system
// { templateId, name?, isDefault? } — the school's own copy of a published template
export async function POST(req: NextRequest) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const body = await req.json().catch(() => ({}))
  if (body.templateId) return createFromTemplate(a.schoolId, body)

  const { name, activity, isDefault } = body
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

async function createFromTemplate(
  schoolId: string,
  body: { templateId: unknown; name?: unknown; isDefault?: unknown },
) {
  if (typeof body.templateId !== 'string') return NextResponse.json({ error: 'templateId required' }, { status: 400 })
  const template = await prisma.gradingTemplate.findFirst({
    where: { id: body.templateId, isPublished: true },
    select: { id: true, name: true, activity: true, ranks: true },
  })
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  const ranks = readTemplateRanks(template.ranks)
  if (!ranks.length) return NextResponse.json({ error: 'Template has no ranks' }, { status: 400 })

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : template.name
  const system = await prisma.$transaction(async tx => {
    // Lock this school's row first: two simultaneous copies (double click,
    // two tabs) then run one after the other, so only the first one sees
    // "no systems yet" and becomes the default (Project Audit PR #39 P2).
    await tx.$queryRaw`SELECT id FROM "schools" WHERE id = ${schoolId} FOR UPDATE`
    // First system of the school becomes the default, like a new empty one
    const existing = await tx.gradingSystem.count({ where: { schoolId, isActive: true } })
    const isDefault = body.isDefault === true || existing === 0
    if (isDefault) await tx.gradingSystem.updateMany({ where: { schoolId }, data: { isDefault: false } })
    const created = await tx.gradingSystem.create({
      data: { schoolId, name, activity: template.activity, isDefault, templateId: template.id },
    })
    await tx.beltRank.createMany({ data: beltRanksFromTemplate(ranks, created.id) })
    return tx.gradingSystem.findUniqueOrThrow({
      where: { id: created.id },
      include: { ranks: { orderBy: { order: 'asc' } } },
    })
  })
  return NextResponse.json({ system }, { status: 201 })
}
