import { NextRequest } from 'next/server'
import { buildInviteSchoolEmail } from '@/lib/email/templates/inviteSchool'
import { guardSuperadmin } from '@/lib/auth/server'

export async function GET(req: NextRequest) {
  const deny = await guardSuperadmin(req)
  if (deny) return deny

  const html = buildInviteSchoolEmail({
    schoolName: 'Roger Gracie Málaga',
    inviteUrl: '#',
    city: 'Málaga',
    country: 'Spain',
    address: 'Calle Compositor Lehmberg Ruiz 7, Málaga',
    website: 'https://rogergracie.com',
    googleRating: 4.9,
    googleReviews: 187,
  })

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
