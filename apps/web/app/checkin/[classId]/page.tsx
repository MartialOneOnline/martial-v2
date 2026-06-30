import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import CheckinClient from './CheckinClient'

interface Props {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ date?: string }>
}

export default async function CheckinPage({ params, searchParams }: Props) {
  const { classId } = await params
  const { date: dateParam } = await searchParams

  const cls = await prisma.class.findUnique({
    where: { id: classId },
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
