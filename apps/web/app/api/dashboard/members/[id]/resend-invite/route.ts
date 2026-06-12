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

// POST /api/dashboard/members/[id]/resend-invite
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params

  const member = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    select: { id: true, user: { select: { id: true, email: true, name: true } } },
  })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, city: true, country: true, language: true },
  })

  const supabase = getAdminSupabase()

  // Try invite link first, fall back to magic link
  let inviteUrl: string | undefined
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: member.user.email,
    options: { redirectTo: `${APP_URL}/auth/accept-invite` },
  })

  if (!linkError && linkData?.properties?.action_link) {
    inviteUrl = linkData.properties.action_link
  } else {
    const { data: magicData } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: member.user.email,
      options: { redirectTo: `${APP_URL}/auth/accept-invite` },
    })
    inviteUrl = magicData?.properties?.action_link
  }

  if (!inviteUrl) return NextResponse.json({ error: 'Could not generate invite link' }, { status: 500 })

  const lang = detectLang(school?.language ?? school?.country)
  const html = buildInviteStudentEmail({
    studentName: member.user.name,
    schoolName: school?.name ?? 'Your school',
    schoolCity: school?.city,
    inviteUrl,
    lang,
  })

  try {
    await getResend().emails.send({
      from: FROM,
      to: member.user.email,
      subject: getInviteSubject(school?.name ?? 'Your school', lang),
      html,
    })
  } catch (err) {
    console.error('[resend-invite] Resend error:', err)
  }

  return NextResponse.json({ ok: true })
}
