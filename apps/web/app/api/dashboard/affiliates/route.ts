import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import type { Permission } from '@/lib/auth/permissions'
import { memberHasPermission } from '@/lib/auth/customRoles'
import { AffiliateStatus } from '@/lib/prisma-client/enums'

async function authorise(permission: Permission) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(member, permission)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { schoolId }
}

const VALID_STATUSES: string[] = Object.values(AffiliateStatus)

// GET /api/dashboard/affiliates
export async function GET(req: NextRequest) {
  const auth = await authorise('school.affiliates.view')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // ACTIVE|INACTIVE|PENDING|ALL
  const search = searchParams.get('search') || ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    schoolId: auth.schoolId,
    ...(status && status !== 'ALL' && VALID_STATUSES.includes(status) ? { status } : {}),
    ...(search ? {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { city:  { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
      ],
    } : {}),
  }

  const [affiliates, counts] = await Promise.all([
    prisma.affiliate.findMany({ where, orderBy: { createdAt: 'desc' } }),
    prisma.affiliate.groupBy({ by: ['status'], where: { schoolId: auth.schoolId }, _count: { id: true } }),
  ])

  const countMap = Object.fromEntries(counts.map(c => [c.status, c._count.id]))

  return NextResponse.json({
    affiliates: affiliates.map(a => ({
      id:           a.id,
      name:         a.name,
      city:         a.city,
      country:      a.country,
      contactName:  a.contactName,
      contactEmail: a.contactEmail,
      notes:        a.notes,
      studentCount: a.studentCount,
      status:       a.status,
      createdAt:    a.createdAt.toISOString(),
    })),
    total: affiliates.length,
    countByStatus: {
      ACTIVE:   countMap['ACTIVE']   ?? 0,
      INACTIVE: countMap['INACTIVE'] ?? 0,
      PENDING:  countMap['PENDING']  ?? 0,
    },
  })
}

// POST /api/dashboard/affiliates
export async function POST(req: NextRequest) {
  const auth = await authorise('school.affiliates.manage')
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json().catch(() => ({}))
  const { name, city, country, contactName, contactEmail, notes } = body

  if (typeof name !== 'string' || !name.trim())        return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (typeof city !== 'string' || !city.trim())         return NextResponse.json({ error: 'city is required' }, { status: 400 })
  if (typeof country !== 'string' || !country.trim())   return NextResponse.json({ error: 'country is required' }, { status: 400 })
  if (typeof contactName !== 'string' || !contactName.trim())   return NextResponse.json({ error: 'contactName is required' }, { status: 400 })
  if (typeof contactEmail !== 'string' || !contactEmail.trim()) return NextResponse.json({ error: 'contactEmail is required' }, { status: 400 })

  const affiliate = await prisma.affiliate.create({
    data: {
      schoolId:     auth.schoolId,
      name:         name.trim(),
      city:         city.trim(),
      country:      country.trim(),
      contactName:  contactName.trim(),
      contactEmail: contactEmail.trim(),
      notes:        typeof notes === 'string' && notes.trim() ? notes.trim() : null,
    },
  })

  return NextResponse.json({ affiliate }, { status: 201 })
}
