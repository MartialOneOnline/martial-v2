import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { hasPermission, type Permission } from '@/lib/auth/permissions'
import { notifyNewLead } from '@/lib/notifications/create'

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
  return { schoolId }
}

// GET /api/dashboard/leads
export async function GET(req: NextRequest) {
  const auth = await authorise('school.leads.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status') // NEW|CONTACTED|TRIAL_BOOKED|CONVERTED|LOST|ALL
  const search   = searchParams.get('search') || ''
  const page     = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '50'))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(status && status !== 'ALL' ? { status } : {}),
    ...(search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [leads, total, counts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['status'],
      where: { schoolId: auth.schoolId },
      _count: { id: true },
    }),
  ])

  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count.id]))
  const totalAll      = Object.values(countMap).reduce((a, b) => a + b, 0)
  const totalNew      = countMap['NEW']           ?? 0
  const totalContacted = countMap['CONTACTED']    ?? 0
  const totalTrial    = countMap['TRIAL_BOOKED']  ?? 0
  const totalConverted = countMap['CONVERTED']    ?? 0
  const totalLost     = countMap['LOST']          ?? 0
  const conversionRate = totalAll > 0 ? Math.round((totalConverted / totalAll) * 100) : 0

  return NextResponse.json({
    leads: leads.map(l => ({
      id:        l.id,
      name:      l.name,
      email:     l.email ?? null,
      phone:     l.phone ?? null,
      source:    l.source,
      status:    l.status,
      message:   l.message ?? null,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    stats: { totalAll, totalNew, totalContacted, totalTrial, totalConverted, totalLost, conversionRate },
  })
}

// POST /api/dashboard/leads
export async function POST(req: NextRequest) {
  const auth = await authorise('school.leads.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { name, email, phone, source, status, message, interestedIn } = await req.json()
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

  const lead = await prisma.lead.create({
    data: {
      schoolId: auth.schoolId,
      name: name.trim(),
      email:    email?.trim()  || null,
      phone:    phone?.trim()  || null,
      source:   source         ?? 'OTHER',
      status:   status         ?? 'NEW',
      message:  message?.trim() || null,
      interestedIn: interestedIn?.trim() || null,
    },
  })

  notifyNewLead(auth.schoolId, lead.name)

  return NextResponse.json(lead, { status: 201 })
}
