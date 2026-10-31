import { prisma } from '@/lib/db'
import { computeReadiness, pickBeltSince, type AttendedClass, type GradingRecord, type RankRules, type Readiness } from './readiness'

export interface MemberReadiness {
  memberId: string
  userId: string
  name: string
  avatarUrl: string | null
  status: string
  belt: string | null
  beltDegree: number
  rankId: string | null
  rankName: string | null
  rankColor: string | null
  maxDegrees: number
  lastGradedAt: string | null
  readiness: Readiness
}

/** A booking counts as attendance when staff marked it attended (COMPLETED) or it has a check-in time. */
export const ATTENDED_WHERE = {
  OR: [{ status: 'COMPLETED' as const }, { attendedAt: { not: null } }],
}

const RANK_SELECT = {
  id: true, name: true, color: true, order: true, maxDegrees: true, minAge: true,
  minMonthsAtPrevious: true, totalClassesRequired: true, classesByDegree: true, classesPerPeriod: true,
  periodType: true, classTypeIds: true, requireExam: true, requireCompetition: true, systemId: true,
} as const

function laterOf(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  if (!a) return b ?? null
  if (!b) return a
  return a > b ? a : b
}

/**
 * Readiness for every student of a school (or just `memberIds`).
 * Members without a structured rank are matched to one by belt name.
 */
export async function getReadinessForSchool(
  schoolId: string,
  opts: { memberIds?: string[]; includeInactive?: boolean } = {},
): Promise<MemberReadiness[]> {
  const systems = await prisma.gradingSystem.findMany({
    where: { schoolId, isActive: true },
    select: { id: true, isDefault: true, createdAt: true, ranks: { select: RANK_SELECT } },
    orderBy: { createdAt: 'asc' },
  })
  if (!systems.length) return []

  const rankById = new Map<string, RankRules & { systemId: string }>()
  for (const s of systems) for (const r of s.ranks) rankById.set(r.id, r)
  const defaultSystem = systems.find(s => s.isDefault) ?? systems[0]!
  const rankByName = new Map<string, string>()
  for (const r of defaultSystem.ranks) rankByName.set(r.name.trim().toLowerCase(), r.id)

  const members = await prisma.schoolMember.findMany({
    where: {
      schoolId,
      role: 'STUDENT',
      ...(opts.memberIds ? { id: { in: opts.memberIds } } : {}),
      ...(opts.includeInactive || opts.memberIds ? {} : { status: { in: ['ACTIVE', 'FROZEN'] } }),
    },
    select: {
      id: true, userId: true, status: true, belt: true, beltRankId: true, beltDegree: true,
      beltDate: true, joinedAt: true,
      user: { select: { name: true, email: true, avatarUrl: true, dateOfBirth: true } },
    },
  })
  if (!members.length) return []
  const userIds = members.map(m => m.userId)

  const gradings = await prisma.grading.findMany({
    where: { schoolId, userId: { in: userIds } },
    select: { userId: true, gradedAt: true, fromBelt: true, toBelt: true, toBeltRankId: true, toDegree: true },
    orderBy: { gradedAt: 'desc' },
  })
  const lastGrading = new Map<string, Date>()
  const gradingsByUser = new Map<string, GradingRecord[]>()
  for (const g of gradings) {
    if (!lastGrading.has(g.userId)) lastGrading.set(g.userId, g.gradedAt)
    const list = gradingsByUser.get(g.userId) ?? []
    list.push(g)
    gradingsByUser.set(g.userId, list)
  }

  const starts = new Map<string, Date | null>()
  let earliest: Date | null = null
  let unbounded = false
  for (const m of members) {
    const start = laterOf(lastGrading.get(m.userId), m.beltDate) ?? m.joinedAt ?? null
    starts.set(m.id, start)
    if (!start) unbounded = true
    else if (!earliest || start < earliest) earliest = start
  }
  // Frequency looks back at most ~3 months even when the count started earlier.
  const freqFloor = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
  const fetchFrom = unbounded ? null : (earliest && earliest < freqFloor ? earliest : freqFloor)

  const bookings = await prisma.booking.findMany({
    where: {
      userId: { in: userIds },
      class: { schoolId },
      ...ATTENDED_WHERE,
      ...(fetchFrom ? { scheduledAt: { gte: fetchFrom } } : {}),
    },
    select: { userId: true, scheduledAt: true, classId: true, class: { select: { disciplineId: true } } },
  })
  const attendedByUser = new Map<string, AttendedClass[]>()
  for (const b of bookings) {
    const list = attendedByUser.get(b.userId) ?? []
    list.push({ scheduledAt: b.scheduledAt, classId: b.classId, disciplineId: b.class.disciplineId })
    attendedByUser.set(b.userId, list)
  }

  return members.map(m => {
    const rankId = (m.beltRankId && rankById.has(m.beltRankId))
      ? m.beltRankId
      : (m.belt ? rankByName.get(m.belt.trim().toLowerCase()) ?? null : null)
    const rank = rankId ? rankById.get(rankId)! : null
    const systemRanks = rank ? [...rankById.values()].filter(r => r.systemId === rank.systemId) : []

    const readiness = computeReadiness({
      ranks: systemRanks,
      currentRankId: rankId,
      currentDegree: m.beltDegree ?? 0,
      countSince: starts.get(m.id) ?? null,
      beltSince: pickBeltSince({
        gradings: gradingsByUser.get(m.userId) ?? [],
        rankId,
        beltNames: [rank?.name, m.belt].filter((n): n is string => !!n),
        beltDate: m.beltDate,
      }),
      dateOfBirth: m.user.dateOfBirth,
      attended: attendedByUser.get(m.userId) ?? [],
    })

    return {
      memberId: m.id,
      userId: m.userId,
      name: m.user.name ?? m.user.email,
      avatarUrl: m.user.avatarUrl ?? null,
      status: m.status,
      belt: m.belt,
      beltDegree: m.beltDegree ?? 0,
      rankId: rank?.id ?? null,
      rankName: rank?.name ?? null,
      rankColor: rank?.color ?? null,
      maxDegrees: rank?.maxDegrees ?? 0,
      lastGradedAt: lastGrading.get(m.userId)?.toISOString() ?? null,
      readiness,
    }
  })
}
