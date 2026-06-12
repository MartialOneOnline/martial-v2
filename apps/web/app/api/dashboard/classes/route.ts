import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'

async function authorise(roles = ['OWNER', 'ADMIN', 'INSTRUCTOR']) {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school context', status: 400 }
  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!roles.includes(member.role)) return { error: 'Forbidden', status: 403 }
    } catch {
      return { error: 'Forbidden', status: 403 }
    }
  }
  return { user, schoolId }
}

// GET /api/dashboard/classes — list classes + instructors + disciplines for current school
export async function GET() {
  const auth = await authorise(['OWNER', 'ADMIN', 'INSTRUCTOR'])
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const [classes, instructors, schoolDisciplines] = await Promise.all([
    prisma.class.findMany({
      where: { schoolId: auth.schoolId },
      include: {
        instructor: { select: { id: true, name: true } },
        discipline: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.instructor.findMany({
      where: { schoolId: auth.schoolId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.schoolDiscipline.findMany({
      where: { schoolId: auth.schoolId },
      include: { discipline: { select: { id: true, name: true } } },
    }),
  ])

  return NextResponse.json({
    classes,
    instructors,
    disciplines: schoolDisciplines.map(sd => sd.discipline),
  })
}

// POST /api/dashboard/classes — create a class
export async function POST(req: NextRequest) {
  const auth = await authorise(['OWNER', 'ADMIN'])
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await req.json()
  const {
    name, description, disciplineId, level, duration,
    capacity, price, currency, isTrial, isActive, isPublished, paymentMethods,
    schedule, instructorId,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const cls = await prisma.class.create({
    data: {
      schoolId: auth.schoolId,
      name: name.trim(),
      description: description?.trim() || null,
      disciplineId: disciplineId || null,
      level: level || null,
      duration: duration ? Number(duration) : null,
      capacity: capacity ? Number(capacity) : null,
      price: price !== undefined && price !== '' ? Number(price) : null,
      currency: currency || 'EUR',
      isTrial: isTrial ?? false,
      isActive: isActive ?? true,
      isPublished: isPublished ?? false,
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : [],
      schedule: schedule ?? null,
      instructorId: instructorId || null,
    },
    include: {
      instructor: { select: { id: true, name: true } },
      discipline: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(cls, { status: 201 })
}
