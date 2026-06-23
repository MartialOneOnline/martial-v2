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
      address: true,
      postcode: true,
      logoUrl: true,
      coverUrl: true,
      email: true,
      phone: true,
      website: true,
      description: true,
      tagline: true,
      instagram: true,
      facebook: true,
      youtube: true,
      tiktok: true,
      language: true,
      defaultBookingSettings: true,
      cancelPolicy: true,
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
  const { language, name, phone, email, website, instagram, facebook, youtube, tiktok,
          description, tagline, address, postcode, city, country, logoUrl,
          defaultBookingSettings, cancelPolicy } = body

  const VALID_LANGS = ['en', 'es', 'pt', 'fr']
  const VALID_CANCEL_POLICIES = ['IMMEDIATE', 'UNTIL_END_OF_PERIOD']

  const updated = await prisma.school.update({
    where: { id: schoolId },
    data: {
      ...(language    !== undefined && VALID_LANGS.includes(language) && { language }),
      ...(name        !== undefined && { name: name.trim() }),
      ...(phone       !== undefined && { phone:       phone?.trim()       || null }),
      ...(email       !== undefined && { email:       email?.trim()       || null }),
      ...(website     !== undefined && { website:     website?.trim()     || null }),
      ...(instagram   !== undefined && { instagram:   instagram?.trim()   || null }),
      ...(facebook    !== undefined && { facebook:    facebook?.trim()    || null }),
      ...(youtube     !== undefined && { youtube:     youtube?.trim()     || null }),
      ...(tiktok      !== undefined && { tiktok:      tiktok?.trim()      || null }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(tagline     !== undefined && { tagline:     tagline?.trim()     || null }),
      ...(address     !== undefined && { address:     address?.trim()     || null }),
      ...(postcode    !== undefined && { postcode:    postcode?.trim()    || null }),
      ...(city        !== undefined && { city:        city?.trim()        || null }),
      ...(country     !== undefined && { country:     country?.trim()     || null }),
      ...(logoUrl                !== undefined && { logoUrl: logoUrl?.trim() || null }),
      ...(defaultBookingSettings !== undefined && { defaultBookingSettings }),
      ...(cancelPolicy !== undefined && VALID_CANCEL_POLICIES.includes(cancelPolicy) && { cancelPolicy }),
    },
    select: { id: true, language: true, name: true, cancelPolicy: true },
  })

  return NextResponse.json({ school: updated })
}
