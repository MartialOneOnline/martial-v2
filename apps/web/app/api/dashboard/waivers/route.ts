import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission, type Permission } from '@/lib/auth/permissions'

const WAIVER_EXPIRY_DAYS = 365

async function authorise(permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!hasPermission(member.role, permission)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

function statusFor(signedAt: Date | null): 'Signed' | 'Pending' | 'Expired' {
  if (!signedAt) return 'Pending'
  const ageMs = Date.now() - signedAt.getTime()
  return ageMs > WAIVER_EXPIRY_DAYS * 24 * 60 * 60 * 1000 ? 'Expired' : 'Signed'
}

// GET /api/dashboard/waivers — list sent/signed waivers + school members eligible to receive one
export async function GET() {
  const auth = await authorise('school.waivers.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [sends, schoolMembers] = await Promise.all([
    prisma.userWaiver.findMany({
      where: { waiver: { schoolId: auth.schoolId } },
      include: {
        waiver: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.schoolMember.findMany({
      where: { schoolId: auth.schoolId, status: 'ACTIVE' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { user: { name: 'asc' } },
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
    status: statusFor(s.signedAt),
  }))

  const members = schoolMembers.map(m => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl ?? null,
  }))

  return NextResponse.json({ waivers, members })
}

// POST /api/dashboard/waivers — send a waiver to a member for signature
export async function POST(req: NextRequest) {
  const auth = await authorise('school.waivers.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const { userId, waiverType, content, notes } = body

  if (!userId) return NextResponse.json({ error: 'Member is required' }, { status: 400 })
  if (!waiverType?.trim()) return NextResponse.json({ error: 'Waiver type is required' }, { status: 400 })
  if (!content?.trim()) return NextResponse.json({ error: 'Waiver content is required' }, { status: 400 })

  const schoolMember = await prisma.schoolMember.findFirst({ where: { schoolId: auth.schoolId, userId } })
  if (!schoolMember) return NextResponse.json({ error: 'This person is not a member of this school' }, { status: 400 })

  const waiver = await prisma.waiver.upsert({
    where: { schoolId_title: { schoolId: auth.schoolId, title: waiverType.trim() } },
    update: { content: content.trim(), isActive: true },
    create: { schoolId: auth.schoolId, title: waiverType.trim(), content: content.trim() },
  })

  const userWaiver = await prisma.userWaiver.upsert({
    where: { waiverId_userId: { waiverId: waiver.id, userId } },
    update: { notes: notes?.trim() || null },
    create: { waiverId: waiver.id, userId, notes: notes?.trim() || null },
    include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
  })

  return NextResponse.json({
    waiver: {
      id: userWaiver.id,
      name: userWaiver.user.name ?? userWaiver.user.email,
      email: userWaiver.user.email,
      avatarUrl: userWaiver.user.avatarUrl ?? null,
      type: waiver.title,
      signedDate: userWaiver.signedAt?.toISOString().slice(0, 10) ?? '',
      expiryDate: '',
      status: statusFor(userWaiver.signedAt),
    },
  }, { status: 201 })
}
