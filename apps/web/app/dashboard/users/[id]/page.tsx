import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import StudentProfileClient from './StudentProfileClient'

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const cookieStore = await cookies()
  const schoolId = cookieStore.get('currentSchoolId')?.value

  const member = await prisma.schoolMember.findFirst({
    where: {
      id,
      ...(schoolId ? { schoolId } : {}),
    },
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
  const bookings = await prisma.booking.findMany({
    where: { userId: member.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      class: { select: { name: true } },
    },
  }).catch(() => [])

  // Recent transactions
  const transactions = await prisma.transaction.findMany({
    where: { userId: member.userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  }).catch(() => [])

  // Active membership
  const membership = await prisma.membership.findFirst({
    where: { userId: member.userId, status: 'ACTIVE' },
    include: { plan: { select: { name: true, price: true, billingCycle: true } } },
  }).catch(() => null)

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
    })),
    transactions: transactions.map(t => ({
      id: t.id,
      amount: Number(t.amount),
      currency: t.currency ?? 'EUR',
      method: t.method ?? '—',
      status: t.status,
      date: t.createdAt.toISOString(),
      description: t.description ?? '—',
    })),
    membership: membership ? {
      planName: membership.plan?.name ?? 'Plan',
      status: membership.status,
      expiresAt: membership.expiresAt?.toISOString() ?? null,
      price: Number(membership.plan?.price ?? 0),
      interval: membership.plan?.billingCycle ?? null,
    } : null,
  }

  return <StudentProfileClient profile={profile} />
}
