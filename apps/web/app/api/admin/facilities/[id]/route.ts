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

async function uniqueSlug(base: string, excludeId: string) {
  let slug = base || 'facility'
  let i = 2
  while (await prisma.facility.findFirst({ where: { slug, id: { not: excludeId } } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

// PATCH /api/admin/facilities/[id] — rename
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const { name, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const existing = await prisma.facility.findFirst({ where: { name: name.trim(), id: { not: id } } })
  if (existing) return NextResponse.json({ error: 'A facility with this name already exists' }, { status: 409 })

  const slug = await uniqueSlug(slugify(name.trim()), id)
  const facility = await prisma.facility.update({
    where: { id },
    data: { name: name.trim(), slug, ...(icon !== undefined && { icon: icon?.trim() || null }) },
  })

  return NextResponse.json({ facility })
}

// DELETE /api/admin/facilities/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const { id } = await params
  const schoolCount = await prisma.schoolFacility.count({ where: { facilityId: id } })
  if (schoolCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete — ${schoolCount} school(s) still use this facility` },
      { status: 409 },
    )
  }

  await prisma.facility.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
