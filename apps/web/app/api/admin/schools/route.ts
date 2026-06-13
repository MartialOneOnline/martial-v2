import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadmin } from '@/lib/auth/server'

// POST /api/admin/schools — create school directly (manual add)
export async function POST(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const body = await req.json()
  const {
    name, email, phone, website,
    address, postcode, city, country,
    instagram, facebook, youtube, tiktok,
    description, tagline,
    logoUrl, coverUrl,
    status, disciplines,
    foundedYear, priceFrom, hasFreeTrialCls,
  } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
  }

  // Generate unique slug
  const baseSlug = `${name} ${city || ''}`
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 80)

  let slug = baseSlug
  let i = 2
  while (await prisma.school.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${i++}`
  }

  const school = await prisma.school.create({
    data: {
      slug,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      website: website?.trim() || null,
      address: address?.trim() || null,
      postcode: postcode?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      instagram: instagram?.trim() || null,
      facebook: facebook?.trim() || null,
      youtube: youtube?.trim() || null,
      tiktok: tiktok?.trim() || null,
      description: description?.trim() || null,
      tagline: tagline?.trim() || null,
      logoUrl: logoUrl || null,
      coverUrl: coverUrl || null,
      status: status || 'UNVERIFIED',
      source: 'SELF_REGISTERED',
      foundedYear: foundedYear ? parseInt(foundedYear) : null,
      priceFrom: priceFrom ? parseFloat(priceFrom) : null,
      hasFreeTrialCls: hasFreeTrialCls || false,
      disciplines: disciplines?.length ? {
        create: (disciplines as string[]).map((dslug: string) => ({
          discipline: { connect: { slug: dslug } },
        })),
      } : undefined,
    },
  })

  return NextResponse.json({ success: true, school })
}
