import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import StudentProfileClient from './StudentProfileClient'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const viewer = await getAuthUser()
  if (!viewer) notFound()

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) notFound()

  if (viewer.role !== 'SUPERADMIN') {
    try {
      const membership = await requireSchoolAccess(viewer.id, schoolId)
      if (!['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(membership.role)) notFound()
    } catch {
      notFound()
    }
  }

  const member = await prisma.schoolMember.findFirst({
    where: { id, schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
          dateOfBirth: true,
          createdAt: true,
        },
      },
      school: { select: { id: true, name: true } },
    },
  })

  if (!member) notFound()

  // Recent bookings
  const [bookings, transactions, memberships, membershipPlans] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: member.userId },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
      include: { class: { select: { name: true } } },
    }).catch(() => []),
    prisma.transaction.findMany({
      where: { userId: member.userId },
      orderBy: { date: 'desc' },
      take: 50,
    }).catch(() => []),
    prisma.membership.findMany({
      where: { userId: member.userId, schoolId: member.schoolId },
      include: { plan: { select: { name: true, price: true, billingCycle: true, planType: true } } },
      orderBy: { startDate: 'desc' },
    }).catch(() => []),
    prisma.membershipPlan.findMany({
      where: { schoolId: member.schoolId, isActive: true },
      select: { id: true, name: true, price: true, currency: true, planType: true, billingCycle: true, validityDays: true },
      orderBy: { sortOrder: 'asc' },
    }).catch(() => []),
  ])

  // Count bookings used per membership
  const membershipIds = memberships.map(m => m.id)
  const usageCounts = membershipIds.length
    ? await prisma.booking.groupBy({
        by: ['membershipId'],
        where: { membershipId: { in: membershipIds }, status: { not: 'CANCELLED' } },
        _count: { id: true },
      }).catch(() => [])
    : []
  const usageMap = Object.fromEntries(usageCounts.map(u => [u.membershipId, u._count.id]))

  const activeMembership = memberships.find(m => m.status === 'ACTIVE') ?? null

  const profile = {
    memberId: member.id,
    userId: member.user.id,
    name: member.user.name ?? member.user.email,
    email: member.user.email,
    phone: member.user.phone ?? null,
    avatarUrl: member.user.avatarUrl ?? null,
    dateOfBirth: member.user.dateOfBirth?.toISOString() ?? null,
    userCreatedAt: member.user.createdAt.toISOString(),
    belt: member.belt ?? 'Blanco',
    beltDegree: member.beltDegree ?? 0,
    beltDate: member.beltDate?.toISOString() ?? null,
    status: member.status,
    role: member.role,
    joinedAt: member.joinedAt?.toISOString() ?? null,
    emergencyContact: member.emergencyContact ?? null,
    medicalNotes: member.medicalNotes ?? null,
    notes: member.notes ?? null,
    schoolName: member.school.name,
    bookings: bookings.map(b => ({
      id: b.id,
      className: b.class?.name ?? 'Clase',
      date: b.scheduledAt?.toISOString() ?? b.createdAt.toISOString(),
      status: b.status,
      attendedAt: b.attendedAt?.toISOString() ?? null,
    })),
    transactions: transactions.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      currency: t.currency ?? 'EUR',
      method: t.type ?? '—',
      status: 'PAID',
      date: t.date.toISOString(),
      description: t.description ?? t.category ?? '—',
    })),
    memberships: memberships.map(m => ({
      id: m.id,
      planName: m.plan?.name ?? m.planName,
      planType: m.plan?.planType ?? 'SUBSCRIPTION',
      billingCycle: m.plan?.billingCycle ?? null,
      price: Number(m.price),
      currency: m.currency,
      status: m.status,
      startDate: m.startDate.toISOString(),
      endDate: m.endDate?.toISOString() ?? null,
      consumed: usageMap[m.id] ?? m.classesUsed,
    })),
    activeMembership: activeMembership ? {
      id: activeMembership.id,
      planName: activeMembership.plan?.name ?? activeMembership.planName,
      status: activeMembership.status,
      startDate: activeMembership.startDate.toISOString(),
      expiresAt: activeMembership.endDate?.toISOString() ?? null,
      price: Number(activeMembership.plan?.price ?? activeMembership.price),
      interval: activeMembership.plan?.billingCycle ?? null,
      consumed: usageMap[activeMembership.id] ?? activeMembership.classesUsed,
    } : null,
    availablePlans: membershipPlans.map(p => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      currency: p.currency,
      planType: p.planType,
      billingCycle: p.billingCycle,
      validityDays: p.validityDays,
    })),
  }

  return <StudentProfileClient profile={profile} />
}
