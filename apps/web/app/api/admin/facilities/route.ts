import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
}

async function uniqueSlug(base: string) {
  let slug = base || 'facility'
  let i = 2
  while (await prisma.facility.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

// GET /api/admin/facilities — master catalog with usage counts
export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const facilities = await prisma.facility.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { schools: true } } },
  })

  return NextResponse.json({
    facilities: facilities.map(f => ({ id: f.id, name: f.name, slug: f.slug, icon: f.icon, schoolCount: f._count.schools })),
  })
}

// POST /api/admin/facilities
export async function POST(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { name, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const existing = await prisma.facility.findUnique({ where: { name: name.trim() } })
  if (existing) return NextResponse.json({ error: 'A facility with this name already exists' }, { status: 409 })

  const slug = await uniqueSlug(slugify(name.trim()))
  const facility = await prisma.facility.create({ data: { name: name.trim(), slug, icon: icon?.trim() || null } })

  return NextResponse.json({ facility }, { status: 201 })
}
