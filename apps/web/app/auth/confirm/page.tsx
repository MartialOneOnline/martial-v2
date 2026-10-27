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
    let done = false
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined

    // Normal path: /auth/confirm/verify already redeemed the token
    // server-side, so a cookie session exists and INITIAL_SESSION carries it.
    //
    // Legacy path: confirmation emails sent before that route existed link
    // through Supabase's action_link, which lands here with the session in
    // the URL #hash (implicit flow). The PKCE browser client refuses to
    // redeem that on its own, so read the tokens and set the session by hand
    // — same approach as auth/set-password and auth/reset-password.
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const hashAccessToken = hash.get('access_token')
    const hashRefreshToken = hash.get('refresh_token')
    const hasHashSession = Boolean(hashAccessToken && hashRefreshToken)

    const goToLogin = () => { if (!done) { done = true; router.replace('/login') } }

    const proceed = async () => {
      if (done) return
      done = true
      clearTimeout(fallbackTimer)
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
    }

    if (hasHashSession) {
      // Strip the tokens from the address bar before anything else runs.
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      supabase.auth
        .setSession({ access_token: hashAccessToken!, refresh_token: hashRefreshToken! })
        .then(({ data, error }) => { if (data.session && !error) proceed(); else goToLogin() })
        .catch(goToLogin)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // The hash path above decides on its own — don't let the INITIAL_SESSION
      // that fires before setSession resolves bounce the user to /login.
      if (hasHashSession) return
      if (session) {
        proceed()
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        // No session after initial check (expired/already-used link) — redirect to login
        fallbackTimer = setTimeout(goToLogin, 2000)
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(fallbackTimer) }
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
