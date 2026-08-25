import { getAuthUser } from '@/lib/auth/server'
import QRClient from './QRClient'

export default async function MyQRPage() {
  const user = await getAuthUser()

  return (
    <QRClient
      userId={user?.id ?? null}
      name={user?.name ?? user?.email ?? ''}
    />
  )
}
