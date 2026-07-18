'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { resolveLoginRedirectAction } from '@/lib/auth/loginRedirect'
import { fetchAvailableContexts } from '@/app/choose-profile/logic'
import { useT } from '@/lib/i18n/LanguageContext'

export default function ConfirmPage() {
  const router = useRouter()
  const t = useT()

  useEffect(() => {
    const supabase = createClient()

    // onAuthStateChange fires after Supabase parses the magiclink hash token
    // and confirms the account (email_confirmed_at gets set as a side effect
    // of redeeming the link).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const explicitPath = safeConfirmRedirect(new URLSearchParams(window.location.search).get('redirect'))
          const res = await fetch('/api/auth/me')
          const json = await res.json()

          // Same decision layer login/page.tsx's resolveRedirect() uses — a
          // brand-new school owner needs the currentSchoolId cookie set via
          // the 'dashboard-auto' branch before /dashboard's data routes work.
          const action = await resolveLoginRedirectAction({
            explicitPath,
            isSuperAdmin: json.user?.globalRole === 'SUPERADMIN',
            legacySchools: json.contexts?.schools ?? [],
            isOnChooseProfile: false,
            fetchContexts: () => fetchAvailableContexts(),
          })

          switch (action.kind) {
            case 'dashboard-auto':
              await fetch('/api/auth/context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId: action.schoolId }),
              })
              router.replace('/dashboard')
              return
            case 'legacy-picker':
            case 'noop':
              // Not reachable for a fresh single-account confirmation — safe fallback.
              router.replace('/login')
              return
            case 'push':
              router.replace(action.path)
              return
          }
        } catch {
          router.replace('/login')
        }
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        // No session after initial check (expired/already-used link) — redirect to login
        setTimeout(() => router.replace('/login'), 2000)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: '#0E3A7A',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 18, fontWeight: 800, color: '#fff',
        }}>M</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#101828', margin: '0 0 8px' }}>
          {t.authVerify.confirmingTitle}
        </p>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          {t.authVerify.confirmingSubtitle}
        </p>
      </div>
    </div>
  )
}
