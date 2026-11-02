import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { parseClassesByDegree, parseFrequency, parseMinAgeByDegree, parseMonthsByDegree } from '@/lib/grading/rules'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import { memberHasPermission } from '@/lib/auth/customRoles'

async function auth() {
  const user = await getAuthUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const schoolId = await getCurrentSchoolId()
  if (!schoolId) return { error: 'No school', status: 400 as const }
  if (user.role !== 'SUPERADMIN') {
    try {
      const m = await requireSchoolAccess(user.id, schoolId)
      if (!await memberHasPermission(m, 'school.gradings.manage')) return { error: 'Forbidden', status: 403 as const }
    } catch { return { error: 'Forbidden', status: 403 as const } }
  }
  return { schoolId }
}

async function verifySystem(systemId: string, schoolId: string) {
  return prisma.gradingSystem.findFirst({ where: { id: systemId, schoolId } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const sys = await verifySystem(id, a.schoolId)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })
  const freq = parseFrequency(body)
  if (!freq.ok) return NextResponse.json({ error: freq.error }, { status: 400 })

  const maxRank = await prisma.beltRank.findFirst({
    where: { systemId: id },
    orderBy: { order: 'desc' },
  })
  const order = body.order ?? (maxRank ? maxRank.order + 1 : 0)

  const rank = await prisma.beltRank.create({
    data: {
      systemId:             id,
      order,
      name:                 body.name,
      color:                body.color ?? '#9CA3AF',
      maxDegrees:           body.maxDegrees ?? 0,
      minAge:               body.minAge ?? null,
      minMonthsAtPrevious:  body.minMonthsAtPrevious ?? null,
      totalClassesRequired: body.totalClassesRequired ?? null,
      classesByDegree:      parseClassesByDegree(body.classesByDegree),
      monthsByDegree:       parseMonthsByDegree(body.monthsByDegree),
      minAgeByDegree:       parseMinAgeByDegree(body.minAgeByDegree),
      ...freq.value,
      classTypeIds:         body.classTypeIds ?? [],
      requireCompetition:   body.requireCompetition ?? false,
      requireExam:          body.requireExam ?? false,
    },
  })

  return NextResponse.json({ rank }, { status: 201 })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const sys = await verifySystem(id, a.schoolId)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { order }: { order: string[] } = await req.json()
  await Promise.all(order.map((rankId, idx) =>
    prisma.beltRank.updateMany({ where: { id: rankId, systemId: id }, data: { order: idx } })
  ))

  const ranks = await prisma.beltRank.findMany({ where: { systemId: id }, orderBy: { order: 'asc' } })
  return NextResponse.json({ ranks })
}

const HEX = /^#[0-9a-fA-F]{6}$/
const MAX_DEGREES = 10

function optInt(v: unknown, max: number): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(max, Math.round(n))
}

/**
 * PATCH /api/dashboard/grading-systems/[id]/ranks — Settings → Grading's one
 * Save: every belt of the system at once, all or nothing.
 * Body: { ranks: [{ id, name, color, maxDegrees, minAge, minMonthsAtPrevious,
 *   totalClassesRequired, classesByDegree, monthsByDegree, minAgeByDegree,
 *   classesPerPeriod, maxClassesPerPeriod, periodType, classTypeIds,
 *   requireExam, requireCompetition }] }
 * Belts not listed are left as they are. classTypeIds must be this school's classes.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await auth()
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })

  const { id } = await params
  const sys = await verifySystem(id, a.schoolId)
  if (!sys) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const list: unknown[] = Array.isArray(body?.ranks) ? body.ranks : []
  if (!list.length) return NextResponse.json({ error: 'ranks required' }, { status: 400 })

  const existing = await prisma.beltRank.findMany({ where: { systemId: id }, select: { id: true } })
  const known = new Set(existing.map(r => r.id))
  const classes = await prisma.class.findMany({ where: { schoolId: a.schoolId }, select: { id: true } })
  const schoolClassIds = new Set(classes.map(c => c.id))

  const updates: { id: string; data: Record<string, unknown> }[] = []
  const seen = new Set<string>()
  for (const [i, raw] of list.entries()) {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const at = `Rank ${i + 1}`
    const rankId = typeof r.id === 'string' ? r.id : ''
    if (!known.has(rankId)) return NextResponse.json({ error: `${at}: not in this system` }, { status: 400 })
    if (seen.has(rankId)) return NextResponse.json({ error: `${at}: duplicate` }, { status: 400 })
    seen.add(rankId)
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (!name || name.length > 60) return NextResponse.json({ error: `${at}: name is required (max 60)` }, { status: 400 })
    const freq = parseFrequency(r)
    if (!freq.ok) return NextResponse.json({ error: `${at}: ${freq.error}` }, { status: 400 })
    const maxDegrees = Math.min(MAX_DEGREES, Math.max(0, Math.round(Number(r.maxDegrees) || 0)))
    const classTypeIds = Array.isArray(r.classTypeIds)
      ? [...new Set(r.classTypeIds.filter((c): c is string => typeof c === 'string' && schoolClassIds.has(c)))]
      : []
    updates.push({
      id: rankId,
      data: {
        name,
        ...(typeof r.color === 'string' && HEX.test(r.color) && { color: r.color }),
        maxDegrees,
        minAge: optInt(r.minAge, 120),
        minMonthsAtPrevious: optInt(r.minMonthsAtPrevious, 1200),
        totalClassesRequired: optInt(r.totalClassesRequired, 100000),
        classesByDegree: parseClassesByDegree(r.classesByDegree).slice(0, maxDegrees + 1),
        monthsByDegree: parseMonthsByDegree(r.monthsByDegree).slice(0, maxDegrees + 1),
        minAgeByDegree: parseMinAgeByDegree(r.minAgeByDegree).slice(0, maxDegrees),
        ...freq.value,
        classTypeIds,
        requireExam: r.requireExam === true,
        requireCompetition: r.requireCompetition === true,
      },
    })
  }

  await prisma.$transaction(updates.map(u => prisma.beltRank.update({ where: { id: u.id }, data: u.data })))

  const ranks = await prisma.beltRank.findMany({ where: { systemId: id }, orderBy: { order: 'asc' } })
  return NextResponse.json({ ranks })
}
