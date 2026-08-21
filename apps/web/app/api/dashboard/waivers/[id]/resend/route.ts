import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from '../../_authorise'
import { sendWaiverRequestEmail } from '@/lib/email/sendEmails'

// POST /api/dashboard/waivers/[id]/resend — re-fire the request email for a
// waiver that's still pending (or was revoked and needs a fresh nudge).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const userWaiver = await prisma.userWaiver.findUnique({
    where: { id },
    include: {
      waiver: { select: { schoolId: true, title: true } },
      user: { select: { name: true, email: true } },
    },
  })
  if (!userWaiver || userWaiver.waiver.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!userWaiver.user.email) {
    return NextResponse.json({ error: 'This member has no email on file' }, { status: 400 })
  }

  const school = await prisma.school.findUnique({ where: { id: auth.schoolId }, select: { name: true, city: true, language: true } })
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 })

  const result = await sendWaiverRequestEmail({
    to: userWaiver.user.email,
    studentName: userWaiver.user.name,
    schoolName: school.name,
    schoolCity: school.city,
    waiverTitle: userWaiver.waiver.title,
    lang: school.language,
  })
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ success: true })
}
