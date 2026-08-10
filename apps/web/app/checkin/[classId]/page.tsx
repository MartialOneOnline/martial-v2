import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import CheckinClient from './CheckinClient'

interface Props {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ date?: string }>
}

// Keep in sync with /api/dashboard/checkin/route.ts — this only gates the UI
// early so an unauthenticated/wrong-role scan doesn't silently fail after the
// camera is already open; the API route is the real enforcement point.
const CHECKIN_ROLES = ['OWNER', 'ADMIN', 'INSTRUCTOR']

export default async function CheckinPage({ params, searchParams }: Props) {
  const { classId } = await params
  const { date: dateParam } = await searchParams

  const user = await getAuthUser()
  if (!user) redirect(`/login?redirect=/checkin/${classId}`)

  const schoolId = await getCurrentSchoolId()
  if (!schoolId) redirect('/dashboard')

  if (user.role !== 'SUPERADMIN') {
    try {
      const member = await requireSchoolAccess(user.id, schoolId)
      if (!CHECKIN_ROLES.includes(member.role)) redirect('/dashboard')
    } catch {
      redirect('/dashboard')
    }
  }

  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true },
  })
  if (!cls) notFound()

  const today = new Date()
  const date = dateParam ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <CheckinClient
      classId={cls.id}
      className={cls.name}
      date={date}
    />
  )
}
