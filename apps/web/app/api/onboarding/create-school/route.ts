import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser } from '@/lib/auth/server'

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 80)
}

// POST /api/onboarding/create-school — lets an already-authenticated user
// (typically a fresh OAuth sign-up, which never gets a school the way
// password /register's school branch does in the same request) create their
// own school and become its OWNER. Mirrors that branch's School/SchoolMember
// creation, minus the Supabase-user step since a session already exists here.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existingOwnership = await prisma.schoolMember.findFirst({
    where: { userId: user.id, role: 'OWNER' },
    select: { id: true },
  })
  if (existingOwnership) {
    return NextResponse.json({ error: 'You already own a school' }, { status: 409 })
  }

  const body = await req.json().catch(() => null) as { name?: string; city?: string; country?: string } | null
  const name = body?.name?.trim() ?? ''
  const city = body?.city?.trim() ?? ''
  const country = body?.country?.trim() ?? ''
  if (!name || !city || !country) {
    return NextResponse.json({ error: 'School name, city and country are required.' }, { status: 400 })
  }

  try {
    const school = await prisma.$transaction(async tx => {
      const baseSlug = slugify(`${name} ${city}`) || slugify(name) || 'school'
      let slug = baseSlug
      let i = 2
      while (await tx.school.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${baseSlug}-${i++}`
      }

      const school = await tx.school.create({
        data: {
          name, slug, city, country,
          status: 'CLAIMED',
          source: 'SELF_REGISTERED',
          claimedById: user.id,
          claimedAt: new Date(),
        },
      })

      await tx.schoolMember.create({
        data: { userId: user.id, schoolId: school.id, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() },
      })

      if (user.role !== 'SCHOOL_OWNER') {
        await tx.user.update({ where: { id: user.id }, data: { role: 'SCHOOL_OWNER' } })
      }

      return school
    })

    return NextResponse.json({ ok: true, schoolId: school.id })
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'A school with a very similar name was just registered. Please try again.' }, { status: 409 })
    }
    console.error('[onboarding/create-school] failed:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
