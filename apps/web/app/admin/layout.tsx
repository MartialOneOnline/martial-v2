import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/server'
import AdminLayoutClient from './AdminLayoutClient'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()

  if (!user) {
    redirect('/login?redirect=/admin')
  }

  if (user.role !== 'SUPERADMIN') {
    redirect('/dashboard')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
