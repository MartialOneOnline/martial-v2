import { NextRequest } from 'next/server'
import { buildInviteSchoolEmail } from '@/lib/email/templates/inviteSchool'
import { buildInviteStudentEmail } from '@/lib/email/templates/inviteStudent'
import { buildWelcomeStudentEmail } from '@/lib/email/templates/welcomeStudent'
import { buildTrialConfirmedEmail } from '@/lib/email/templates/trialConfirmed'
import { buildMembershipReceiptEmail } from '@/lib/email/templates/membershipReceipt'
import { guardSuperadmin } from '@/lib/auth/server'

const SCHOOL = 'Roger Gracie Málaga'
const CITY   = 'Málaga'
const LANG   = 'es'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const template = new URL(req.url).searchParams.get('template') ?? 'invite-school'
  const lang     = (new URL(req.url).searchParams.get('lang') ?? LANG) as 'en' | 'es' | 'pt' | 'fr'

  let html: string

  switch (template) {
    case 'invite-school':
      html = buildInviteSchoolEmail({
        schoolName: SCHOOL, inviteUrl: '#', city: CITY, country: 'Spain',
        address: 'Calle Compositor Lehmberg Ruiz 7, Málaga',
        website: 'https://rogergracie.com', googleRating: 4.9, googleReviews: 187,
        logoUrl: '/martial-logo.png', bannerUrl: '/roger-gracie-malaga.jpg',
      })
      break

    case 'invite-student':
      html = buildInviteStudentEmail({
        studentName: 'Carlos López', schoolName: SCHOOL, schoolCity: CITY,
        inviteUrl: '#', lang,
      })
      break

    case 'welcome-student':
      html = buildWelcomeStudentEmail({
        studentName: 'Carlos López', schoolName: SCHOOL, schoolCity: CITY,
        dashboardUrl: '#', lang,
      })
      break

    case 'trial-confirmed':
      html = buildTrialConfirmedEmail({
        studentName: 'Carlos López', schoolName: SCHOOL, schoolCity: CITY,
        className: 'BJJ Fundamentals', scheduledAt: new Date(Date.now() + 86400000 * 2),
        location: 'Calle Compositor Lehmberg Ruiz 7, Málaga',
        bookingUrl: '#', lang,
      })
      break

    case 'membership-receipt':
      html = buildMembershipReceiptEmail({
        studentName: 'Carlos López', schoolName: SCHOOL, schoolCity: CITY,
        planName: 'Membresía Mensual BJJ', amount: 65, currency: 'EUR',
        paymentMethod: 'CASH', startDate: new Date(),
        endDate: new Date(Date.now() + 86400000 * 30),
        membershipId: 'cm_abc123xyz', dashboardUrl: '#', lang,
      })
      break

    default:
      return new Response(`Unknown template: ${template}. Available: invite-school, invite-student, welcome-student, trial-confirmed, membership-receipt`, { status: 400 })
  }

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
