import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { guardSuperadminUser } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'
import { getClientIp } from '@/lib/request-ip'

// POST /api/admin/schools/[id]/impersonate — generate a magic link to log in
// as the school's owner. Every attempt (success or failure) is written to
// ImpersonationLog; if that write fails, the login link is never returned.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardSuperadminUser(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const ipAddress = getClientIp(req)
  const userAgent = req.headers.get('user-agent')
  const reason = (await req.json().catch(() => ({})))?.reason || null

  const logBase = {
    actorId: auth.id,
    actorEmail: auth.email,
    schoolId: id,
    ipAddress,
    userAgent,
    reason,
  }

  const owner = await prisma.schoolMember.findFirst({
    where: { schoolId: id, role: 'OWNER', status: 'ACTIVE' },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!owner?.user.email) {
    await prisma.impersonationLog.create({
      data: { ...logBase, success: false, errorMessage: 'No active owner to log in as' },
    })
    return NextResponse.json({ error: 'This school has no active owner to log in as' }, { status: 400 })
  }

  const supabase = createAdminClient()
  type GenerateLinkResult = Awaited<ReturnType<typeof supabase.auth.admin.generateLink>>

  // Wrapped in try/catch (rather than trusting generateLink to always resolve
  // with an { error } field) so a thrown exception — e.g. a network failure
  // reaching Supabase — still lands in ImpersonationLog instead of skipping
  // the audit trail entirely.
  let data: GenerateLinkResult['data'] | null = null
  let errorMessage: string | null = null
  try {
    const result = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: owner.user.email,
      // Only hashed_token is used (see below) — the action_link itself is
      // never handed out, so this redirect is never actually followed.
      options: { redirectTo: `${APP_URL}/dashboard` },
    })
    data = result.data
    errorMessage = result.error?.message ?? null
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : 'Failed to generate login link'
  }

  // Not Supabase's own action_link: that one redirects back with the session
  // in the URL #hash (implicit flow), which the app's browser client (PKCE)
  // rejects — so the superadmin's existing session stayed in place and
  // /dashboard rendered "No school connected yet". /auth/impersonate instead
  // redeems the token server-side with verifyOtp, writes the owner's session
  // cookies and the currentSchoolId for this school, then goes to /dashboard.
  // Relative so it stays on whichever origin the admin is using.
  const hashedToken = data?.properties?.hashed_token
  const actionLink = hashedToken
    ? `/auth/impersonate?token_hash=${encodeURIComponent(hashedToken)}&school=${encodeURIComponent(id)}`
    : null
  const targetFields = { targetUserId: owner.user.id, targetEmail: owner.user.email }

  if (errorMessage || !actionLink) {
    await prisma.impersonationLog.create({
      data: { ...logBase, ...targetFields, success: false, errorMessage: errorMessage ?? 'Failed to generate login link' },
    })
    return NextResponse.json({ error: errorMessage ?? 'Failed to generate login link' }, { status: 500 })
  }

  try {
    await prisma.impersonationLog.create({
      data: { ...logBase, ...targetFields, success: true },
    })
  } catch {
    // Fail closed: don't hand out a working login link we can't account for.
    return NextResponse.json({ error: 'Failed to record impersonation audit log' }, { status: 500 })
  }

  return NextResponse.json({ actionLink })
}
