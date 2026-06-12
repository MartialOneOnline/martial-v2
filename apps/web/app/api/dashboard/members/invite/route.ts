import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Supabase service key not configured')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// POST /api/dashboard/members/invite — send email invite + create PENDING member
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

  const { email } = await req.json()
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const normalizedEmail = email.trim().toLowerCase()

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

  // Send Supabase invite email
  const supabase = getAdminSupabase()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.martial.one'
  const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    normalizedEmail,
    { redirectTo: `${baseUrl}/auth/accept-invite` }
  )

  if (inviteError) {
    // If user already exists in auth but not in our DB, continue
    if (!inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 })
    }
  }

  // Upsert user record
  const dbUser = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {},
    create: {
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: 'STUDENT',
      ...(inviteData?.user?.id ? { id: inviteData.user.id } : {}),
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
