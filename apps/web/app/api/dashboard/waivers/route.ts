import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { authoriseWaivers } from './_authorise'
import { sendWaiverRequestEmail } from '@/lib/email/sendEmails'

const WAIVER_EXPIRY_DAYS = 365

function statusFor(userWaiver: { signedAt: Date | null; revokedAt: Date | null }): 'Signed' | 'Pending' | 'Expired' {
  if (!userWaiver.signedAt || userWaiver.revokedAt) return 'Pending'
  const ageMs = Date.now() - userWaiver.signedAt.getTime()
  return ageMs > WAIVER_EXPIRY_DAYS * 24 * 60 * 60 * 1000 ? 'Expired' : 'Signed'
}

// GET /api/dashboard/waivers — sent/signed waivers + active members + active templates
export async function GET() {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [sends, schoolMembers, templates] = await Promise.all([
    prisma.userWaiver.findMany({
      where: { waiver: { schoolId: auth.schoolId } },
      include: {
        waiver: { select: { id: true, title: true, content: true } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.schoolMember.findMany({
      where: { schoolId: auth.schoolId, status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { user: { name: 'asc' } },
    }),
    prisma.waiver.findMany({
      where: { schoolId: auth.schoolId, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
  ])

  const waivers = sends.map(s => ({
    id: s.id,
    name: s.user.name ?? s.user.email,
    email: s.user.email,
    avatarUrl: s.user.avatarUrl ?? null,
    type: s.waiver.title,
    signedDate: s.signedAt?.toISOString().slice(0, 10) ?? '',
    expiryDate: s.signedAt ? new Date(s.signedAt.getTime() + WAIVER_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : '',
    status: statusFor(s),
    sentVia: s.sentVia,
    hasPdf: !!s.pdfPath,
    revoked: !!s.revokedAt,
    content: s.contentSnapshot ?? s.waiver.content,
    signature: s.signature,
    ipAddress: s.ipAddress,
    signedVersion: s.signedVersion,
    notes: s.notes,
  }))

  const members = schoolMembers.map(m => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl ?? null,
  }))

  return NextResponse.json({ waivers, members, templates })
}

// POST /api/dashboard/waivers — send an existing template to a member for signature
export async function POST(req: NextRequest) {
  const auth = await authoriseWaivers()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { userId, templateId, notes } = body

  if (!userId) return NextResponse.json({ error: 'Member is required' }, { status: 400 })
  if (!templateId) return NextResponse.json({ error: 'Waiver template is required' }, { status: 400 })

  const [schoolMember, template] = await Promise.all([
    prisma.schoolMember.findFirst({ where: { schoolId: auth.schoolId, userId } }),
    prisma.waiver.findUnique({ where: { id: templateId } }),
  ])
  if (!schoolMember) return NextResponse.json({ error: 'This person is not a member of this school' }, { status: 400 })
  if (!template || template.schoolId !== auth.schoolId || !template.isActive) {
    return NextResponse.json({ error: 'Waiver template not found' }, { status: 404 })
  }

  const userWaiver = await prisma.userWaiver.upsert({
    where: { waiverId_userId: { waiverId: template.id, userId } },
    update: { notes: notes?.trim() || null, revokedAt: null },
    create: { waiverId: template.id, userId, notes: notes?.trim() || null },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      waiver: { select: { title: true } },
    },
  })

  const school = await prisma.school.findUnique({ where: { id: auth.schoolId }, select: { name: true, city: true, language: true } })
  if (school && userWaiver.user.email) {
    sendWaiverRequestEmail({
      to: userWaiver.user.email,
      studentName: userWaiver.user.name,
      schoolName: school.name,
      schoolCity: school.city,
      waiverTitle: template.title,
      lang: school.language,
    }).catch(err => console.error('[waivers] request email failed:', err))
  }

  return NextResponse.json({
    waiver: {
      id: userWaiver.id,
      name: userWaiver.user.name ?? userWaiver.user.email,
      email: userWaiver.user.email,
      avatarUrl: userWaiver.user.avatarUrl ?? null,
      type: userWaiver.waiver.title,
      signedDate: userWaiver.signedAt?.toISOString().slice(0, 10) ?? '',
      expiryDate: '',
      status: statusFor(userWaiver),
      sentVia: userWaiver.sentVia,
      hasPdf: !!userWaiver.pdfPath,
      revoked: false,
    },
  }, { status: 201 })
}
