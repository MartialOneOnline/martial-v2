import VerifyClient from './VerifyClient'

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <VerifyClient code={code} />
}
