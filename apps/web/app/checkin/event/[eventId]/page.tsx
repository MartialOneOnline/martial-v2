import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import EventCheckinClient from './EventCheckinClient'

interface Props {
  params: Promise<{ eventId: string }>
}

export default async function EventCheckinPage({ params }: Props) {
  const { eventId } = await params

  const event = await prisma.event.findUnique({
    where: { id: eventId },
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
