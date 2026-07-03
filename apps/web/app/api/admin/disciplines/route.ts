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

// GET /api/admin/disciplines — catalog with usage counts
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const disciplines = await prisma.discipline.findMany({
    select: {
      id: true, name: true, slug: true,
      _count: { select: { schools: true, classes: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ disciplines })
}

// POST /api/admin/disciplines — create a new discipline
export async function POST(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { name, slug } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const finalSlug = (slug?.trim() ? slugify(slug) : slugify(name)) || null
  if (!finalSlug) {
    return NextResponse.json({ error: 'Could not derive a valid slug from that name' }, { status: 400 })
  }

  const existing = await prisma.discipline.findFirst({
    where: { OR: [{ name: name.trim() }, { slug: finalSlug }] },
  })
  if (existing) {
    return NextResponse.json({ error: 'A discipline with that name or slug already exists' }, { status: 409 })
  }

  const discipline = await prisma.discipline.create({
    data: { name: name.trim(), slug: finalSlug },
  })

  return NextResponse.json({ discipline }, { status: 201 })
}
