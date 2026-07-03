import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
}

// PATCH /api/admin/disciplines/[id] — rename / re-slug a discipline
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const existing = await prisma.discipline.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, slug } = await req.json()
  const data: { name?: string; slug?: string } = {}

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    data.name = name.trim()
  }
  if (slug !== undefined) {
    const finalSlug = slugify(slug)
    if (!finalSlug) return NextResponse.json({ error: 'Could not derive a valid slug' }, { status: 400 })
    data.slug = finalSlug
  }

  if (data.name || data.slug) {
    const conflict = await prisma.discipline.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(data.name ? [{ name: data.name }] : []),
          ...(data.slug ? [{ slug: data.slug }] : []),
        ],
      },
    })
    if (conflict) return NextResponse.json({ error: 'A discipline with that name or slug already exists' }, { status: 409 })
  }

  const discipline = await prisma.discipline.update({ where: { id }, data })
  return NextResponse.json({ discipline })
}

// DELETE /api/admin/disciplines/[id] — remove a discipline not currently in use
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(_req)
  if (deny) return deny

  const { id } = await params
  const existing = await prisma.discipline.findUnique({
    where: { id },
    select: { id: true, _count: { select: { schools: true, classes: true } } },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (existing._count.schools > 0 || existing._count.classes > 0) {
    return NextResponse.json({
      error: `Cannot delete: in use by ${existing._count.schools} school(s) and ${existing._count.classes} class(es)`,
    }, { status: 409 })
  }

  await prisma.discipline.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
