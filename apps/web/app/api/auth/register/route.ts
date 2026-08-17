import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { APP_URL } from '@/lib/email/resend'
import { sendConfirmEmail } from '@/lib/email/sendConfirmEmail'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'

// POST /api/auth/register — single entry point for self-serve signup.
//
// Creates a Supabase Auth user AND the matching Prisma domain record(s) as
// one logical operation. The old RegisterModal called supabase.auth.signUp()
// straight from the browser, which left Supabase-only "orphan" accounts with
// no User row whenever the caller closed the tab or the Prisma insert never
// ran. This endpoint never lets that happen: if Prisma fails after Supabase
// succeeded, the Supabase user is deleted again (or the request is rejected
// as EMAIL_ALREADY_EXISTS if it can't be, so we never silently drop it).
//
// The Supabase user is created unconfirmed and a confirmation link is
// emailed via Resend (same generateLink+custom-template pattern as the
// member-invite flow) — the client never auto-signs-in here. See
// /auth/confirm for the redemption page and proxy.ts for the access gate.
//
// Registration itself only ever collects name + email + password, for both
// account types — a School/Academy signup gets the same STUDENT-role Prisma
// row a fresh OAuth sign-up gets (see resolveDbUser in lib/auth/server.ts)
// and is routed to /onboarding/school to create the actual School record
// and flip its own role to SCHOOL_OWNER, exactly like the OAuth path
// already does via SocialAuthButtons' redirectPath. That keeps this route
// as the single place a Prisma User gets provisioned for password signups,
// without also making it responsible for School creation.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

type AccountType = 'student' | 'school'

type RegisterBody = {
  accountType?: AccountType
  fullName?: string
  email?: string
  password?: string
  redirect?: string
  lang?: string
}

type ErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_PASSWORD'
  | 'INVALID_EMAIL'
  | 'MISSING_REQUIRED_FIELDS'
  | 'SUPABASE_CREATE_FAILED'
  | 'PRISMA_CREATE_FAILED'
  | 'UNKNOWN_ERROR'

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status })
}

// Generates a one-time confirmation link (verifying it also flips
// email_confirmed_at, same mechanism the member-invite flow relies on for
// existing users — see app/api/dashboard/members/invite/route.ts) and emails
// it via Resend. Best-effort in the sense that the Prisma rows are already
// committed by the time this runs, so a Resend/Supabase hiccup here must
// never fail the whole request or roll back the account — but the caller
// DOES need the real outcome (returned as `sent`) so the response can be
// honest about whether an email actually went out, instead of blindly
// claiming success. See app/register/page.tsx's use of `emailSent` and the
// resend-confirmation route for the recovery path.
async function sendConfirmationLink(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  fullName: string,
  redirect: string | undefined,
  lang: string | undefined,
): Promise<{ sent: boolean }> {
  try {
    const redirectTo = redirect
      ? `${APP_URL}/auth/confirm?redirect=${encodeURIComponent(redirect)}`
      : `${APP_URL}/auth/confirm`
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo },
    })
    const confirmUrl = data?.properties?.action_link
    if (error || !confirmUrl) {
      console.error('[register] generateLink failed:', error)
      return { sent: false }
    }
    const result = await sendConfirmEmail({ recipientEmail: email, name: fullName, confirmUrl, lang })
    return { sent: result.success }
  } catch (err) {
    console.error('[register] sendConfirmationLink failed:', err)
    return { sent: false }
  }
}

export async function POST(req: NextRequest) {
  let body: RegisterBody
  try {
    body = await req.json()
  } catch {
    return errorResponse('MISSING_REQUIRED_FIELDS', 'Invalid request body.', 400)
  }

  const accountType = body.accountType
  if (accountType !== 'student' && accountType !== 'school') {
    return errorResponse('MISSING_REQUIRED_FIELDS', 'Please choose an account type.', 400)
  }

  const fullName = body.fullName?.trim() ?? ''
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  // Never trust the client's own safeRedirect() call — re-sanitize server-side.
  // A School/Academy signup always lands on /onboarding/school to create its
  // School record next, regardless of whatever redirect the caller passed —
  // same rule SocialAuthButtons applies for the OAuth equivalent of this flow.
  const redirect = accountType === 'school' ? '/onboarding/school' : safeConfirmRedirect(body.redirect)
  const lang = body.lang

  if (!fullName || !email || !password) {
    return errorResponse('MISSING_REQUIRED_FIELDS', 'Please fill in all required fields.', 400)
  }
  if (!EMAIL_RE.test(email)) {
    return errorResponse('INVALID_EMAIL', 'Please provide a valid email address.', 400)
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse('INVALID_PASSWORD', 'Password must be at least 8 characters.', 400)
  }

  // Reject known emails up front — the real uniqueness guard is still the
  // Supabase/Prisma unique constraints below, this just gives a fast,
  // friendly error for the common case instead of a round-trip failure.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existingUser) {
    return errorResponse('EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Log in instead.', 409)
  }

  const admin = createAdminClient()

  // 1. Create the Supabase Auth user (or, if one already exists for this
  //    email with no matching Prisma row — an orphan left by the old
  //    RegisterModal bug — verify the caller owns it and heal instead of
  //    blocking them forever).
  let authId: string
  let isNewSupabaseUser: boolean
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name: fullName },
  })

  if (createErr || !created.user) {
    const alreadyExists = /already registered|already exists/i.test(createErr?.message ?? '')
    if (!alreadyExists) {
      const isPasswordError = /password/i.test(createErr?.message ?? '')
      if (isPasswordError) {
        return errorResponse('INVALID_PASSWORD', createErr!.message, 400)
      }
      console.error('[register] Supabase createUser failed:', createErr)
      return errorResponse('SUPABASE_CREATE_FAILED', 'Something went wrong creating your account. Please try again.', 500)
    }

    // Orphan-heal path: prove ownership with the password just submitted.
    // Note: if the Supabase project's "Confirm email" toggle is ever turned
    // on, a genuinely-unconfirmed legacy orphan's signInWithPassword below
    // would itself fail with "Email not confirmed" — that still surfaces as
    // the EMAIL_ALREADY_EXISTS response below, which remains a reasonable
    // (if imprecise) outcome for this rare case.
    const anon = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
    const { data: signInData, error: signInErr } = await anon.auth.signInWithPassword({ email, password })
    if (signInErr || !signInData.user) {
      return errorResponse('EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Log in instead.', 409)
    }
    authId = signInData.user.id
    isNewSupabaseUser = false
  } else {
    authId = created.user.id
    isNewSupabaseUser = true
  }

  // 2. Create the Prisma domain record. Both account types get the same
  //    STUDENT-role row here — a School/Academy signup only becomes
  //    SCHOOL_OWNER once /onboarding/school creates the actual School (see
  //    POST /api/onboarding/create-school), exactly like a fresh OAuth
  //    sign-up. Roll back the Supabase user if this fails and it was newly
  //    created this request — never leave an orphan behind.
  try {
    await prisma.user.create({
      data: {
        email,
        name: fullName,
        role: 'STUDENT',
        supabaseAuthId: authId,
      },
    })

    const { sent } = await sendConfirmationLink(admin, email, fullName, redirect, lang)

    return NextResponse.json({
      ok: true,
      requiresEmailConfirmation: true,
      emailSent: sent,
      accountType,
    })
  } catch (err: any) {
    if (isNewSupabaseUser) {
      const { error: deleteErr } = await admin.auth.admin.deleteUser(authId)
      if (deleteErr) {
        console.error('[register] failed to roll back orphaned Supabase user — needs manual cleanup:', { authId, email, deleteErr })
      }
    }

    if (err?.code === 'P2002') {
      const target = String(err.meta?.target ?? '')
      if (target.includes('email')) {
        return errorResponse('EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Log in instead.', 409)
      }
    }

    console.error('[register] Prisma create failed:', err)
    return errorResponse('PRISMA_CREATE_FAILED', 'We couldn’t finish creating your account. Please try again in a moment.', 500)
  }
}
