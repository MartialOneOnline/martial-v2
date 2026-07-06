'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AcceptInvitePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // schoolId (if present) identifies which school's invite this is — read it
    // via window.location directly (not useSearchParams) to avoid a Suspense
    // boundary requirement for what's otherwise a plain client-only redirect.
    const schoolId = new URLSearchParams(window.location.search).get('schoolId')

    // onAuthStateChange fires after Supabase parses the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        router.replace(schoolId ? `/auth/set-password?schoolId=${encodeURIComponent(schoolId)}` : '/auth/set-password')
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        // No session after initial check — redirect to login
        setTimeout(() => router.replace('/login'), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F4F6F9', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: '#0E3A7A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 18, fontWeight: 800, color: '#fff',
        }}>M</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
          Activando tu cuenta…
        </p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Serás redirigido en un momento
        </p>
      </div>
    </div>
  )
}
