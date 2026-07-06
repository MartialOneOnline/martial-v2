import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Security note (audit 2026-07-06, mitigated not fully resolved): this
// endpoint still trusts nothing but the SchoolInvitation `id` (a cuid) in the
// URL — there is no Supabase-signed token involved, unlike the student invite
// flow. The mitigations below close the two account-takeover vectors (silent
// password/role overwrite of a pre-existing account) and add a time-based
// expiry using the existing `createdAt` field (no migration). They do NOT
// make the `id` itself any harder to guess/reuse than before — see the
// audit follow-up for the bigger fix (switching to the unused `token` column).
const CLAIM_INVITATION_TTL_DAYS = 30

function isExpired(invitation: { createdAt: Date }): boolean {
  const ageMs = Date.now() - invitation.createdAt.getTime()
  return ageMs > CLAIM_INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000
}

// GET /api/claim/[id] — fetch invitation + linked school data
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const invitation = await prisma.schoolInvitation.findUnique({
    where: { id },
    include: {
      school: {
        select: {
          id: true, name: true, slug: true, city: true, country: true,
          address: true, description: true, logoUrl: true, instagram: true,
          website: true, status: true,
        },
      },
    },
  })

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (invitation.status === 'REGISTERED') {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 410 })
  }
  if (isExpired(invitation)) {
    return NextResponse.json({ error: 'This invitation link has expired' }, { status: 410 })
  }

  // Mark as opened
  if (invitation.status === 'SENT') {
    await prisma.schoolInvitation.update({
      where: { id },
      data: { status: 'OPENED', openedAt: new Date() },
    })
  }

  return NextResponse.json({
    id: invitation.id,
    name: invitation.name,
    email: invitation.email,
    city: invitation.city,
    country: invitation.country,
    activities: invitation.activities,
    website: invitation.website,
    status: invitation.status,
    school: invitation.school ?? null,
  })
}

// POST /api/claim/[id] — complete claim: register or link existing user as school OWNER
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { name, password } = await req.json()

  const invitation = await prisma.schoolInvitation.findUnique({
    where: { id },
    include: { school: { select: { id: true, name: true } } },
  })

  if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  if (invitation.status === 'REGISTERED') {
    return NextResponse.json({ error: 'Already claimed' }, { status: 410 })
  }
  if (isExpired(invitation)) {
    return NextResponse.json({ error: 'This invitation link has expired' }, { status: 410 })
  }
  if (!invitation.email) return NextResponse.json({ error: 'No email on invitation' }, { status: 400 })

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // 1. Create the Supabase Auth user. If one already exists for this email,
  //    do NOT touch it — we have no proof the caller owns that account, and
  //    overwriting its password would hand it over to whoever has this link.
  const { data: existingAuth } = await supabase.auth.admin.listUsers()
  const existing = existingAuth?.users?.find(u => u.email === invitation.email)

  if (existing) {
    return NextResponse.json({
      error: 'An account with this email already exists. Log in and contact support to link your school, or use "forgot password" if needed.',
    }, { status: 409 })
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create auth user' }, { status: 500 })
  }
  const supabaseId = data.user.id

  // 2. Upsert Prisma User. supabaseId is always freshly created above, so the
  //    supabaseAuthId lookup below never matches an existing row — this only
  //    finds a pre-existing Prisma User by email (e.g. someone already a
  //    STUDENT elsewhere). In that case, never touch their global role — the
  //    school-level OWNER grant happens via SchoolMember below, which is what
  //    school-scoped authorization actually checks.
  let user = await prisma.user.findFirst({ where: { supabaseAuthId: supabaseId } })
  if (!user) {
    user = await prisma.user.findFirst({ where: { email: invitation.email } })
  }

  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { supabaseAuthId: supabaseId, name: name || user.name },
    })
  } else {
    user = await prisma.user.create({
      data: {
        supabaseAuthId: supabaseId,
        email: invitation.email,
        name: name || invitation.name,
        role: 'SCHOOL_OWNER',
      },
    })
  }

  // 3. Find or create the School
  let schoolId = invitation.schoolId

  if (!schoolId) {
    // Create new school from invitation data
    const slug = invitation.name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    // Ensure unique slug
    let finalSlug = slug
    let attempt = 0
    while (await prisma.school.findFirst({ where: { slug: finalSlug } })) {
      attempt++
      finalSlug = `${slug}-${attempt}`
    }

    const school = await prisma.school.create({
      data: {
        name: invitation.name,
        slug: finalSlug,
        city: invitation.city,
        country: invitation.country,
        website: invitation.website,
        status: 'CLAIMED',
        source: 'SELF_REGISTERED',
      },
    })
    schoolId = school.id

    // Link invitation to school
    await prisma.schoolInvitation.update({ where: { id }, data: { schoolId } })
  } else {
    // Mark existing school as CLAIMED
    await prisma.school.update({
      where: { id: schoolId },
      data: { status: 'CLAIMED' },
    })
  }

  // 4. Add user as OWNER of the school (upsert)
  await prisma.schoolMember.upsert({
    where: { schoolId_userId: { schoolId, userId: user.id } },
    update: { role: 'OWNER', status: 'ACTIVE' },
    create: { schoolId, userId: user.id, role: 'OWNER', status: 'ACTIVE' },
  })

  // 5. Update UserPreference with this school as default
  await prisma.userPreference.upsert({
    where: { userId: user.id },
    update: { lastSchoolId: schoolId },
    create: { userId: user.id, lastSchoolId: schoolId },
  })

  // 6. Mark invitation as REGISTERED
  await prisma.schoolInvitation.update({
    where: { id },
    data: { status: 'REGISTERED', registeredAt: new Date() },
  })

  return NextResponse.json({ ok: true, schoolId, email: invitation.email })
}
