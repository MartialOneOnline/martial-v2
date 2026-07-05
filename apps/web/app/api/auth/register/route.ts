import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'

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
// Email confirmation is intentionally skipped (email_confirm: true), same
// as the school-invitation onboarding flow — see AUTO_CONFIRM_EMAIL below.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

// Self-serve accounts are confirmed immediately so the client can sign in
// right after this call returns. Flip to false (and build a real "confirm
// your email" landing page) if spam/fake signups become a problem — the
// requiresEmailConfirmation branch below already exists for that case.
const AUTO_CONFIRM_EMAIL = true

type AccountType = 'student' | 'school'

type RegisterBody = {
  accountType?: AccountType
  fullName?: string
  email?: string
  password?: string
  phone?: string
  school?: {
    name?: string
    city?: string
    country?: string
    disciplines?: string[]
  }
}

type ErrorCode =
  | 'EMAIL_ALREADY_EXISTS'
  | 'INVALID_PASSWORD'
  | 'INVALID_EMAIL'
  | 'MISSING_REQUIRED_FIELDS'
  | 'SCHOOL_SLUG_CONFLICT'
  | 'SUPABASE_CREATE_FAILED'
  | 'PRISMA_CREATE_FAILED'
  | 'UNKNOWN_ERROR'

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message }, { status })
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-')
    .substring(0, 80)
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
  const phone = body.phone?.trim() || null

  if (!fullName || !email || !password) {
    return errorResponse('MISSING_REQUIRED_FIELDS', 'Please fill in all required fields.', 400)
  }
  if (!EMAIL_RE.test(email)) {
    return errorResponse('INVALID_EMAIL', 'Please provide a valid email address.', 400)
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return errorResponse('INVALID_PASSWORD', 'Password must be at least 8 characters.', 400)
  }

  // School-specific validation + discipline lookup
  const schoolName = body.school?.name?.trim() ?? ''
  const schoolCity = body.school?.city?.trim() ?? ''
  const schoolCountry = body.school?.country?.trim() ?? ''
  const requestedDisciplines = Array.isArray(body.school?.disciplines)
    ? body.school!.disciplines!.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : []

  let validDisciplineSlugs: string[] = []
  if (accountType === 'school') {
    if (!schoolName || !schoolCity || !schoolCountry) {
      return errorResponse('MISSING_REQUIRED_FIELDS', 'School name, city and country are required.', 400)
    }
    if (requestedDisciplines.length === 0) {
      return errorResponse('MISSING_REQUIRED_FIELDS', 'Please select at least one discipline.', 400)
    }
    const found = await prisma.discipline.findMany({
      where: { slug: { in: requestedDisciplines } },
      select: { slug: true },
    })
    validDisciplineSlugs = found.map(d => d.slug)
    if (validDisciplineSlugs.length === 0) {
      return errorResponse('MISSING_REQUIRED_FIELDS', 'Please select at least one valid discipline.', 400)
    }
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
    email_confirm: AUTO_CONFIRM_EMAIL,
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

  // 2. Create the Prisma domain record(s). Roll back the Supabase user if
  //    this fails and it was newly created this request — never leave an
  //    orphan behind.
  try {
    if (accountType === 'student') {
      await prisma.user.create({
        data: {
          email,
          name: fullName,
          phone,
          role: 'STUDENT',
          supabaseAuthId: authId,
        },
      })

      return NextResponse.json({
        ok: true,
        requiresEmailConfirmation: !AUTO_CONFIRM_EMAIL,
        accountType,
        redirectTo: AUTO_CONFIRM_EMAIL ? '/my' : '/login',
      })
    }

    // School registration — user, school, membership all-or-nothing.
    const { school } = await prisma.$transaction(async tx => {
      const user = await tx.user.create({
        data: {
          email,
          name: fullName,
          phone,
          role: 'SCHOOL_OWNER',
          supabaseAuthId: authId,
        },
      })

      const baseSlug = slugify(`${schoolName} ${schoolCity}`) || slugify(schoolName) || 'school'
      let slug = baseSlug
      let i = 2
      while (await tx.school.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${baseSlug}-${i++}`
      }

      const school = await tx.school.create({
        data: {
          name: schoolName,
          slug,
          city: schoolCity,
          country: schoolCountry,
          status: 'CLAIMED',
          source: 'SELF_REGISTERED',
          claimedById: user.id,
          claimedAt: new Date(),
          disciplines: {
            create: validDisciplineSlugs.map(slug => ({
              discipline: { connect: { slug } },
            })),
          },
        },
      })

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

    return NextResponse.json({
      ok: true,
      requiresEmailConfirmation: !AUTO_CONFIRM_EMAIL,
      accountType,
      redirectTo: AUTO_CONFIRM_EMAIL ? '/dashboard' : '/login',
      schoolId: school.id,
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
      if (target.includes('slug')) {
        return errorResponse('SCHOOL_SLUG_CONFLICT', 'A school with a very similar name was just registered. Please try again.', 409)
      }
    }

    console.error('[register] Prisma create failed:', err)
    return errorResponse('PRISMA_CREATE_FAILED', 'We couldn’t finish creating your account. Please try again in a moment.', 500)
  }
}
