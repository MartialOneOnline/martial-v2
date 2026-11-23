import ClaimDetailClient from './ClaimDetailClient'

export default async function ClaimRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ClaimDetailClient requestId={id} />
}
