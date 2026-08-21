'use client'

import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { useSchoolContext } from '../lib/auth/useSchoolContext'
import type { Permission } from '../lib/auth/permissions'

// Exported so server components that fetch data directly (bypassing an API
// route's own hasPermission check) can render it after their own server-side
// permission check, instead of fetching real data and only hiding it client-side.
export function ForbiddenView() {
  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="flex flex-col items-center text-center" style={{ maxWidth: 360 }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#FEF2F2' }}>
          <ShieldOff size={24} style={{ color: '#DC2626' }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>You don&apos;t have access to this page</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 8, lineHeight: 1.6 }}>
          Your role doesn&apos;t include this section. If you think this is a mistake, ask an admin or owner at your school.
        </p>
        <Link href="/dashboard" prefetch={false}
          className="mt-5 px-5 py-2.5 rounded-xl no-underline"
          style={{ background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}

// Client-side guard for dashboard pages: hides content the current
// SchoolMember role lacks permission for, instead of letting the page
// render fully and silently break on a 403 from the API. Not a security
// boundary by itself — every API route behind it must independently call
// hasPermission() too; this only fixes the direct-URL-navigation UX.
export default function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { loading, isAdmin, currentSchool } = useSchoolContext()

  if (loading) return null
  if (isAdmin || currentSchool?.permissions.includes(permission)) return <>{children}</>
  return <ForbiddenView />
}
