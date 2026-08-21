import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../_authorise'

// GET /api/dashboard/waivers/templates — list this school's waiver templates
export async function GET() {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const templates = await prisma.waiver.findMany({
    where: { schoolId: auth.schoolId },
    include: { _count: { select: { signedBy: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    templates: templates.map(w => ({
      id: w.id,
      title: w.title,
      content: w.content,
      version: w.version,
      isActive: w.isActive,
      signedCount: w._count.signedBy,
    })),
  })
}

// POST /api/dashboard/waivers/templates — create a new waiver template
export async function POST(req: NextRequest) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { title, content } = await req.json()
  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Content is required' }, { status: 400 })

  try {
    const waiver = await prisma.waiver.create({
      data: { schoolId: auth.schoolId, title: title.trim(), content: content.trim() },
    })
    return NextResponse.json({ template: { id: waiver.id, title: waiver.title, content: waiver.content, version: waiver.version, isActive: waiver.isActive, signedCount: 0 } }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'A waiver template with this title already exists' }, { status: 409 })
  }
}
