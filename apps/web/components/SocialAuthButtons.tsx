'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useGoogleSignInButton } from '@/lib/useGoogleSignInButton'

const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

type OAuthProvider = 'google' | 'apple' | 'azure'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="#000000">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.75.03 2.99 2.62 3.99 2.65 4l-.07.27zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}
function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20}>
      <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
      <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
    </svg>
  )
}

const PROVIDERS: { id: OAuthProvider; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'google', label: 'Continue with Google', icon: GoogleIcon },
  { id: 'apple', label: 'Continue with Apple', icon: AppleIcon },
  { id: 'azure', label: 'Continue with Microsoft', icon: MicrosoftIcon },
]

// Lands the OAuth round trip on /login (not here) — that page already owns
// the PKCE `?code=` exchange, the login-event ping that provisions the
// prisma.user row for a first-time signup, and resolveRedirect(). Reusing it
// avoids re-implementing that sequence wherever this component is dropped in.
//
// Google is the exception: it signs in with an ID token right here (see
// useGoogleSignInButton) instead of redirecting through Supabase's OAuth
// endpoint, so there's already a session by the time /login loads. It still
// gets sent there with `?oauth=1` so the login-event ping and
// resolveRedirect() logic isn't duplicated — see the matching branch in
// app/login/page.tsx's onAuthStateChange effect.
export function SocialAuthButtons({ redirectPath }: { redirectPath?: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState('')

  async function handleOAuth(provider: OAuthProvider) {
    setError('')
    setLoading(provider)
    const redirectQuery = redirectPath ? `?redirect=${encodeURIComponent(redirectPath)}` : ''
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login${redirectQuery}`,
        ...(provider === 'azure' ? { scopes: 'openid profile email' } : {}),
      },
    })
    if (err) { setError(err.message); setLoading(null) }
  }

  async function handleGoogleCredential(idToken: string) {
    setError('')
    setLoading('google')
    const { error: err } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (err) { setError(err.message); setLoading(null); return }
    const redirectQuery = redirectPath ? `&redirect=${encodeURIComponent(redirectPath)}` : ''
    router.push(`/login?oauth=1${redirectQuery}`)
  }
  const { containerRef: googleButtonRef, fallbackToRedirect: googleFallback } = useGoogleSignInButton(handleGoogleCredential)

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ position: 'relative', height: 52 }}>
          <button
            type="button"
            disabled={loading !== null}
            onClick={googleFallback ? () => handleOAuth('google') : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              height: 52, border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff',
              fontSize: 14, fontWeight: 600, color: TEXT,
              cursor: loading !== null ? 'not-allowed' : 'pointer', opacity: loading !== null && loading !== 'google' ? 0.6 : 1,
            }}>
            <GoogleIcon />
            {loading === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          {/* Google's real button, invisible and stacked on top — see the
              matching pattern (and the "why") in app/login/page.tsx. Skipped
              (pointer-events off) inside WebViews that can't open popups —
              googleFallback routes the visible button's own onClick to the
              old redirect flow instead. */}
          <div
            ref={googleButtonRef}
            style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', opacity: 0,
              pointerEvents: googleFallback || (loading !== null && loading !== 'google') ? 'none' : 'auto',
            }}
          />
        </div>
        {PROVIDERS.filter(({ id }) => id !== 'google').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={loading !== null}
            onClick={() => handleOAuth(id)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              height: 52, border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff',
              fontSize: 14, fontWeight: 600, color: TEXT,
              cursor: loading !== null ? 'not-allowed' : 'pointer', opacity: loading !== null && loading !== id ? 0.6 : 1,
            }}>
            <Icon />
            {loading === id ? 'Redirecting…' : label}
          </button>
        ))}
      </div>

      {error && <p style={{ margin: '16px 0 0', fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 0' }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>Or</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>
    </div>
  )
}
