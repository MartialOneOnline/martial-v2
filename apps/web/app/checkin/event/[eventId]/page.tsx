import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { getAuthUser, getCurrentSchoolId } from '@/lib/auth/server'
import { requireSchoolAccess } from '@/lib/auth/contexts'
import EventCheckinClient from './EventCheckinClient'

interface Props {
  params: Promise<{ eventId: string }>
}

// Keep in sync with authorise() in /api/dashboard/events/[id]/checkin/route.ts —
// this only gates the UI early so an unauthenticated/wrong-role scan doesn't
// silently fail after the camera is already open; the API route is the real
// enforcement point.
const CHECKIN_ROLES = ['OWNER', 'ADMIN', 'INSTRUCTOR']

export default async function EventCheckinPage({ params }: Props) {
  const { eventId } = await params

  const user = await getAuthUser()
  if (!user) redirect(`/login?redirect=/checkin/event/${eventId}`)

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

  const event = await prisma.event.findFirst({
    where: { id: eventId, schoolId },
    select: { id: true, title: true },
  })
  if (!event) notFound()

  return (
    <EventCheckinClient
      eventId={event.id}
      eventTitle={event.title}
    />
  )
}
