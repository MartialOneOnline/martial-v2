'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Supabase reads the #access_token from the URL hash automatically
// when using the browser client — we just need to trigger a session check
// and redirect to onboarding/dashboard.

export default function AcceptInvitePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )

    // Supabase JS v2 auto-detects the hash and sets the session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // Logged in — go to dashboard
        router.replace('/dashboard')
      } else {
        // Wait a moment for the hash to be processed, then retry
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: d2 }) => {
            if (d2.session) {
              router.replace('/dashboard')
            } else {
              router.replace('/login')
            }
          })
        }, 1500)
      }
    })
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
