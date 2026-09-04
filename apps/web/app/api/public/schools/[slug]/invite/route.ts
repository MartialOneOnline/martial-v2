import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend, FROM, APP_URL } from '@/lib/email/resend'
import { buildInviteStudentEmail, detectLang, getInviteSubject } from '@/lib/email/templates/inviteStudent'
import { assignPlan } from '@/lib/services/membership'
import { PaymentMethod, LeadSource, LeadStatus } from '@/lib/prisma-client/enums'
import { upsertProspectLead } from '@/lib/leads'

const VALID_LANGS = ['en', 'es', 'pt', 'fr']
const VALID_GENDERS = ['MALE', 'FEMALE']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/public/schools/[slug]/invite
// Public endpoint — no auth required. Used by a school's own marketing
// website (e.g. a "book a trial class" form) to create a PENDING member
// and send them the same account-invite email an admin would send from
// Dashboard > Users > Invite User, so they can accept and pick a day
// via the school's public booking flow. Mirrors
// /api/dashboard/members/invite but scoped to one school by slug instead
// of the caller's session, and requires phone + gender up front since
// there's no admin around afterwards to chase missing details.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const school = await prisma.school.findUnique({
    where: { slug },
    select: { id: true, name: true, city: true, country: true, language: true, status: true },
  })
  if (!school || ['SUSPENDED', 'ARCHIVED'].includes(school.status))
    return NextResponse.json({ success: false, message: 'School not found' }, { status: 404 })

  const body = await req.json().catch(() => null) as {
    name?: string; email?: string; phone?: string; gender?: string; language?: string
  } | null
  if (!body) return NextResponse.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })

  const name = body.name?.trim()
  const email = body.email?.trim().toLowerCase()
  const phone = body.phone?.trim()
  const gender = body.gender?.trim().toUpperCase()

  const errors: Record<string, string[]> = {}
  if (!name) errors.name = ['The name field is required.']
  if (!email || !EMAIL_RE.test(email)) errors.email = ['A valid email is required.']
  if (!phone) errors.phone = ['The phone field is required.']
  if (!gender || !VALID_GENDERS.includes(gender)) errors.gender = ['The gender field is required (male or female).']
  if (Object.keys(errors).length)
    return NextResponse.json({ success: false, message: 'Validation failed', errors }, { status: 400 })

  // Generate invite link via Supabase (does NOT send email — we handle that)
  const redirectTo = `${APP_URL}/auth/accept-invite?schoolId=${encodeURIComponent(school.id)}`
  const supabase = createAdminClient()
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: email!,
    options: { redirectTo },
  })

  let inviteUrl = linkData?.properties?.action_link
  if (linkError || !inviteUrl) {
    // User may already exist in auth — fall back to magic link
    const { data: magicData, error: magicError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email!,
      options: { redirectTo },
    })
    inviteUrl = magicData?.properties?.action_link
    if (magicError || !inviteUrl)
      return NextResponse.json({ success: false, message: linkError?.message ?? magicError?.message ?? 'Could not generate invite link' }, { status: 500 })
  }

  // Upsert user record
  const dbUser = await prisma.user.upsert({
    where: { email: email! },
    update: { name, phone, gender: gender as 'MALE' | 'FEMALE' },
    create: { email: email!, name, phone, gender: gender as 'MALE' | 'FEMALE', role: 'STUDENT' },
    select: { id: true, name: true, email: true },
  })

  // Reuse the existing member row (any status) instead of creating a duplicate
  const schoolMember = await prisma.schoolMember.findFirst({
    where: { userId: dbUser.id, schoolId: school.id },
    select: { id: true },
  }) ?? await prisma.schoolMember.create({
    data: { userId: dbUser.id, schoolId: school.id, role: 'STUDENT', belt: 'Blanco', beltDegree: 0, status: 'PENDING' },
    select: { id: true },
  })

  upsertProspectLead(school.id, email!, dbUser.name, {
    source: LeadSource.WEBSITE,
    status: LeadStatus.INVITED,
  }).catch(err => console.error('[public invite] lead upsert failed:', err))

  // Enroll into the school's trial plan right away, so the person has
  // trial class access as soon as they accept the invite. Not filtered by
  // isPublic — that flag governs the pricing page checkout, not eligibility
  // for an admin/invite-granted trial (schools commonly keep their trial
  // plan unlisted there). If a school has more than one active TRIAL plan,
  // the lowest sortOrder wins.
  let trialAssigned = false
  const trialPlan = await prisma.membershipPlan.findFirst({
    where: { schoolId: school.id, planType: 'TRIAL', isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  })
  if (trialPlan) {
    try {
      await assignPlan({
        schoolMemberId: schoolMember.id,
        schoolId: school.id,
        planId: trialPlan.id,
        paymentMethod: PaymentMethod.CASH,
        notes: 'Assigned via website lead form',
        activateMember: false,
      })
      trialAssigned = true
    } catch (err) {
      console.error('[public invite] trial plan assignment failed:', err)
    }
  }

  const lang = detectLang(
    (body.language && VALID_LANGS.includes(body.language) ? body.language : null) ?? school.language ?? school.country
  )
  const html = buildInviteStudentEmail({
    studentName: dbUser.name,
    schoolName: school.name,
    schoolCity: school.city,
    inviteUrl,
    lang,
  })

  try {
    await getResend().emails.send({
      from: FROM,
      to: email!,
      subject: getInviteSubject(school.name, lang),
      html,
    })
  } catch (emailErr) {
    console.error('[public invite] Resend error:', emailErr)
  }

  return NextResponse.json({ success: true, message: 'Lead created successfully', trialAssigned }, { status: 201 })
}
