import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin, guardSuperadminUser } from '@/lib/auth/server'
import { parseTemplateMeta } from '@/lib/grading/templateMeta'
import { parseTemplateRanks } from '@/lib/grading/templates'

// GET /api/admin/grading-templates — every template, with how many school systems were copied from it
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const templates = await prisma.gradingTemplate.findMany({
    include: { _count: { select: { systems: true } } },
    orderBy: [{ activity: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ templates })
}

// POST /api/admin/grading-templates — create a template
export async function POST(req: NextRequest) {
  const admin = await guardSuperadminUser(req)
  if (admin instanceof NextResponse) return admin

  const body = await req.json().catch(() => ({}))
  const meta = parseTemplateMeta(body, { requireName: true })
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 })
  const ranks = parseTemplateRanks(body.ranks ?? [])
  if (!ranks.ok) return NextResponse.json({ error: ranks.error }, { status: 400 })
  if (meta.value.isPublished && ranks.ranks.length === 0) {
    return NextResponse.json({ error: 'Add at least one rank before publishing' }, { status: 400 })
  }

  const template = await prisma.gradingTemplate.create({
    data: { ...meta.value, name: meta.value.name!, ranks: ranks.ranks as object[], createdById: admin.id },
    include: { _count: { select: { systems: true } } },
  })
  return NextResponse.json({ template }, { status: 201 })
}
