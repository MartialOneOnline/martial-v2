import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

// GET /api/dashboard/school — returns active school data for dashboard
export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // SUPERADMIN can pass ?schoolId= query param
  const { searchParams } = new URL(req.url)
  const schoolId = searchParams.get('schoolId') ?? (await getCurrentSchoolId())

  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  // Validate access (SUPERADMIN bypasses membership check)
  if (user.role !== 'SUPERADMIN') {
    try {
      await requireSchoolAccess(user.id, schoolId)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      city: true,
      country: true,
      logoUrl: true,
      email: true,
      phone: true,
      website: true,
      instagram: true,
      stripeAccountId: true,
    },
  })

  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  return NextResponse.json({ school })
}

// PATCH /api/dashboard/school — update school settings (language, etc.)
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { language, name, phone, email, website, instagram } = body

  const VALID_LANGS = ['en', 'es', 'pt', 'fr']

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(language !== undefined && VALID_LANGS.includes(language) && { language }),
      ...(name !== undefined && { name: name.trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(email !== undefined && { email: email?.trim() || null }),
      ...(website !== undefined && { website: website?.trim() || null }),
      ...(instagram !== undefined && { instagram: instagram?.trim() || null }),
    },
    select: { id: true, language: true, name: true },
  })

  return NextResponse.json({ school: updated })
}
