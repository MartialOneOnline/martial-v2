import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission } from '@/lib/auth/permissions'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildInviteStaffEmail, getStaffInviteSubject } from '@/lib/email/templates/inviteStaff'
import { detectLang } from '@/lib/email/templates/inviteStudent'
import type { SchoolMemberRole } from '@/lib/prisma-client/enums'

function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('Supabase service key not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const MEMBER_ROLE_FOR: Record<string, SchoolMemberRole> = {
  'Head Instructor': 'INSTRUCTOR',
  'Instructor': 'INSTRUCTOR',
  'Assistant': 'ASSISTANT_INSTRUCTOR',
  'Admin': 'ADMIN',
  'Receptionist': 'RECEPTIONIST',
}

// POST /api/dashboard/staff/invite — invite someone who isn't a school member
// yet as staff: creates a User + PENDING SchoolMember + Instructor row, and
// emails them an activation link so they can log into the dashboard.
export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return NextResponse.json({ error: 'No school context' }, { status: 400 })

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, 'school.staff.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { name, email, role, belt, salary, startDate, notes, lang: bodyLang } = await req.json()

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!role?.trim()) return NextResponse.json({ error: 'Role is required' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()
  const memberRole = MEMBER_ROLE_FOR[role.trim()] ?? 'INSTRUCTOR'

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existingUser) {
    const existingMember = await prisma.schoolMember.findFirst({ where: { userId: existingUser.id, schoolId } })
    if (existingMember) return NextResponse.json({ error: 'This person is already a member of this school' }, { status: 409 })
    const existingInstructor = await prisma.instructor.findUnique({ where: { userId: existingUser.id } })
    if (existingInstructor) return NextResponse.json({ error: 'This person is already staff at another school' }, { status: 409 })
  }

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, city: true, country: true, language: true },
  })

  // Generate invite link via Supabase (does NOT send email — we handle that)
  const redirectTo = `${APP_URL}/auth/accept-invite?schoolId=${encodeURIComponent(schoolId)}`
  const supabase = getAdminSupabase()
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: normalizedEmail,
    options: { redirectTo },
  })

  let finalLinkData = linkData
  if (linkError) {
    const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
      options: { redirectTo },
    })
    if (magicError || !magicData?.properties?.action_link) {
      return NextResponse.json({ error: linkError.message }, { status: 400 })
    }
    finalLinkData = magicData
  }

  const inviteUrl = finalLinkData?.properties?.action_link
  if (!inviteUrl) return NextResponse.json({ error: 'Could not generate invite link' }, { status: 500 })

  const dbUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { name: name.trim() },
    create: { email: normalizedEmail, name: name.trim(), role: 'INSTRUCTOR' },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })

  await prisma.schoolMember.create({
    data: { userId: dbUser.id, schoolId, role: memberRole, status: 'PENDING' },
  })

  const instructor = await prisma.instructor.create({
    data: {
      schoolId,
      userId: dbUser.id,
      name: dbUser.name ?? dbUser.email,
      role: role.trim(),
      belt: belt?.trim() || null,
      salary: salary !== undefined && salary !== '' ? Number(salary) : null,
      startDate: startDate ? new Date(startDate) : null,
      notes: notes?.trim() || null,
      isHead: role.trim() === 'Head Instructor',
    },
  })

  const VALID_LANGS = ['en', 'es', 'pt', 'fr']
  const lang = detectLang(
    (bodyLang && VALID_LANGS.includes(bodyLang) ? bodyLang : null) ?? school?.language ?? school?.country
  )
  const html = buildInviteStaffEmail({
    staffName: dbUser.name,
    staffRole: role.trim(),
    schoolName: school?.name ?? 'Your school',
    schoolCity: school?.city,
    inviteUrl,
    lang,
  })

  try {
    await getResend().emails.send({
      from: FROM,
      to: normalizedEmail,
      subject: getStaffInviteSubject(school?.name ?? 'Your school', lang),
      html,
    })
  } catch (emailErr) {
    console.error('[staff invite] Resend error:', emailErr)
  }

  return NextResponse.json({
    staff: {
      id: instructor.id,
      userId: instructor.userId,
      name: instructor.name,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl ?? null,
      role: instructor.role,
      belt: instructor.belt ?? '',
      classes: [] as string[],
      salary: instructor.salary,
      since: instructor.startDate?.toISOString() ?? instructor.createdAt.toISOString(),
      status: instructor.isActive ? 'Active' : 'Inactive',
      notes: instructor.notes ?? '',
    },
  }, { status: 201 })
}
