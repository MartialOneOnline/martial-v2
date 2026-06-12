import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildInviteStudentEmail, detectLang, getInviteSubject } from '@/lib/email/templates/inviteStudent'

function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Supabase service key not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/dashboard/members/invite — send custom Resend email + create PENDING member
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(member.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { email, name } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

  // Load school for name, city, country (to determine email language)
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, city: true, country: true, language: true },
  })

  // Check if already a member
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    const existingMember = await prisma.schoolMember.findFirst({
      where: { userId: existingUser.id, schoolId },
    })
    if (existingMember) {
      return NextResponse.json({ error: 'This person is already a member of this school' }, { status: 409 })
    }
  }

  // Generate invite link via Supabase (does NOT send email — we handle that)
  const supabase = getAdminSupabase()
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: { redirectTo: `${APP_URL}/auth/accept-invite` },
  })

  if (linkError) {
    // User may already exist in auth — fall back to magic link
    const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo: `${APP_URL}/auth/accept-invite` },
    })
    if (magicError || !magicData?.properties?.action_link) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }
    // continue with magic link
    Object.assign(linkData ?? {}, magicData)
  }

  const inviteUrl = (linkData as { properties?: { action_link?: string } })?.properties?.action_link
  if (!inviteUrl) {
    return NextResponse.json({ error: 'Could not generate invite link' }, { status: 500 })
  }

  // Upsert user record
  const dbUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: name?.trim() ? { name: name.trim() } : {},
    create: {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      role: 'STUDENT',
    },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  // Create school member as PENDING
  const schoolMember = await prisma.schoolMember.create({
    data: {
      userId: dbUser.id,
      schoolId,
      role: 'STUDENT',
      belt: 'Blanco',
      beltDegree: 0,
      status: 'PENDING',
    },
    select: {
      id: true, belt: true, beltDegree: true, status: true, role: true, joinedAt: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  // Send email via Resend with our custom template
  const lang = detectLang(school?.language ?? school?.country)
  const html = buildInviteStudentEmail({
    studentName: dbUser.name,
    schoolName: school?.name ?? 'Your school',
    schoolCity: school?.city,
    inviteUrl,
    lang,
  })

  try {
    await getResend().emails.send({
      from: FROM,
      to: normalizedEmail,
      subject: getInviteSubject(school?.name ?? 'Your school', lang),
      html,
    })
  } catch (emailErr) {
    console.error('[invite] Resend error:', emailErr)
  }

  return NextResponse.json({
    member: {
      id: schoolMember.id,
      name: schoolMember.user.name ?? schoolMember.user.email,
      email: schoolMember.user.email,
      avatarUrl: schoolMember.user.avatarUrl ?? null,
      belt: schoolMember.belt ?? 'Blanco',
      beltDegree: schoolMember.beltDegree ?? 0,
      status: schoolMember.status,
      role: schoolMember.role,
      joinedAt: schoolMember.joinedAt?.toISOString() ?? null,
    },
  }, { status: 201 })
}
