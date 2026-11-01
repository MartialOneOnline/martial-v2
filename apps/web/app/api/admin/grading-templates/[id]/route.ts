import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'
import { parseTemplateMeta } from '@/lib/grading/templateMeta'
import { parseTemplateRanks } from '@/lib/grading/templates'

type Ctx = { params: Promise<{ id: string }> }

// GET /api/admin/grading-templates/[id]
export async function GET(req: NextRequest, { params }: Ctx) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  const { id } = await params
  const template = await prisma.gradingTemplate.findUnique({
    where: { id }, include: { _count: { select: { systems: true } } },
  })
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ template })
}

// PATCH /api/admin/grading-templates/[id] — edit name/activity/description/published and/or the whole ranks list.
// Schools that already copied the template keep their own copy unchanged.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  const { id } = await params
  const existing = await prisma.gradingTemplate.findUnique({ where: { id }, select: { id: true, ranks: true, isPublished: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const meta = parseTemplateMeta(body, { requireName: false })
  if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 })
  let ranks: object[] | undefined
  if (body.ranks !== undefined) {
    const parsed = parseTemplateRanks(body.ranks)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    ranks = parsed.ranks as object[]
  }

  const willPublish = meta.value.isPublished ?? existing.isPublished
  const rankCount = ranks ? ranks.length : (Array.isArray(existing.ranks) ? existing.ranks.length : 0)
  if (willPublish && rankCount === 0) {
    return NextResponse.json({ error: 'Add at least one rank before publishing' }, { status: 400 })
  }

  const template = await prisma.gradingTemplate.update({
    where: { id },
    data: { ...meta.value, ...(ranks && { ranks }) },
    include: { _count: { select: { systems: true } } },
  })
  return NextResponse.json({ template })
}

// DELETE /api/admin/grading-templates/[id] — school copies stay (their templateId is cleared)
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny
  const { id } = await params
  const existing = await prisma.gradingTemplate.findUnique({ where: { id }, select: { id: true } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await prisma.gradingTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
