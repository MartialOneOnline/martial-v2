import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

// POST /api/onboarding/complete
// Creates Supabase auth user + User record + School record, marks invitation REGISTERED
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    token,
    // Account
    ownerName,
    email,
    password,
    // School info
    schoolName,
    phone,
    address,
    postcode,
    city,
    country,
    website,
    instagram,
    facebook,
    // Disciplines (array of slug strings)
    disciplines,
    // Profile
    description,
    tagline,
  } = body

  if (!token || !ownerName || !email || !password || !schoolName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Validate token
  const invitation = await prisma.schoolInvitation.findUnique({ where: { token } })
  if (!invitation) return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
  if (invitation.status === 'REGISTERED') return NextResponse.json({ error: 'Already registered' }, { status: 410 })

  // 2. Create Supabase auth user
  const supabase = getSupabase()
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: ownerName },
  })
  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Failed to create account' }, { status: 400 })
  }
  const authId = authData.user.id

  try {
    // 3. Create User + School in a transaction
    const { school } = await prisma.$transaction(async tx => {
      // Create User record
      const user = await tx.user.create({
        data: {
          id: authId,
          name: ownerName,
          email: email.toLowerCase().trim(),
          role: 'SCHOOL_OWNER',
        },
      })

      // Generate slug from school name + city
      const baseSlug = `${schoolName} ${city || ''}`
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '').trim()
        .replace(/\s+/g, '-').replace(/-+/g, '-')
        .substring(0, 80)

      // Ensure unique slug
      let slug = baseSlug
      let i = 2
      while (await tx.school.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${i++}`
      }

      // Create School
      const school = await tx.school.create({
        data: {
          slug,
          name: schoolName,
          email: email.toLowerCase().trim(),
          phone: phone || null,
          address: address || null,
          postcode: postcode || null,
          city: city || null,
          country: country || 'ES',
          website: website || null,
          instagram: instagram || null,
          facebook: facebook || null,
          description: description || null,
          tagline: tagline || null,
          status: 'CLAIMED',
          source: 'SELF_REGISTERED',
          claimedById: user.id,
          claimedAt: new Date(),
          // Connect disciplines
          disciplines: disciplines?.length ? {
            create: (disciplines as string[]).map((dslug: string) => ({
              discipline: { connect: { slug: dslug } },
            })),
          } : undefined,
        },
      })

      // Add owner as staff member
      await tx.schoolMember.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          role: 'OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      })

      return { user, school }
    })

    // 4. Mark invitation as REGISTERED
    await prisma.schoolInvitation.update({
      where: { token },
      data: {
        status: 'REGISTERED',
        registeredAt: new Date(),
        schoolId: school.id,
      },
    })

    return NextResponse.json({ success: true, schoolSlug: school.slug })
  } catch (err: any) {
    // Rollback: delete Supabase auth user if DB failed
    await supabase.auth.admin.deleteUser(authId)
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 })
  }
}
