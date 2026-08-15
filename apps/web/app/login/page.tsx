'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import SchoolPicker from '../../components/SchoolPicker'
import type { SchoolContext } from '@/lib/auth/contexts'
import { safeRedirect } from '@/lib/safeRedirect'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { resolveLoginRedirectAction } from '@/lib/auth/loginRedirect'
import { fetchAvailableContexts } from '@/app/choose-profile/logic'
import { useT } from '@/lib/i18n/LanguageContext'
import { useGoogleSignInButton } from '@/lib/useGoogleSignInButton'

const BLUE = '#0870E2'
const NAVY = '#0E3A7A'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

// ── Social login icons — same providers/layout as martialapp.com/login
// (Google, Apple, Microsoft; no Facebook) ────────────────────────────────────
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

type OAuthProvider = 'google' | 'apple' | 'azure'

function SocialButton({ provider, label, loading, disabled, onClick }: {
  provider: OAuthProvider; label: string; loading: boolean; disabled: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        height: 52, border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff',
        fontSize: 14, fontWeight: 600, color: TEXT,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
      }}>
      {provider === 'google' ? <GoogleIcon /> : provider === 'apple' ? <AppleIcon /> : <MicrosoftIcon />}
      {loading ? 'Redirigiendo…' : label}
    </button>
  )
}

// Standalone login page — this is the actual entry screen the mobile app
// WebView loads after its native splash screen, so it must work fully on
// its own (no marketing header/footer, no dependency on the homepage).
function LoginPageInner() {
  const router = useRouter()
  const t = useT()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const supabase = createClient()
  const redirectTo = safeRedirect(searchParams.get('redirect'))
  // Same value, run through the extra /auth/** loop guard — only used when
  // linking into the confirmation flow below, not for the normal post-login
  // redirect above.
  const confirmRedirect = safeConfirmRedirect(searchParams.get('redirect'))
  const justRegistered = searchParams.get('registered') === '1'
  const registeredType = searchParams.get('type')

  const [view, setView] = useState<'email' | 'password' | 'forgot'>('email')
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr] = useState('')
  const [pickerSchools, setPickerSchools] = useState<SchoolContext[] | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null)

  // @supabase/ssr's browser client hardcodes flowType: 'pkce' (not
  // overridable), so an OAuth round trip returns here as `?code=...` in the
  // query string, not `#access_token=` in the hash — that's implicit flow,
  // which never happens for these buttons. The SDK exchanges the code and
  // strips it from the URL asynchronously as part of its own init, racing
  // this component's effects, so the signal has to be captured synchronously
  // on first render, before that happens.
  //
  // `?oauth=1` is the equivalent signal for the Google ID-token flow
  // (SocialAuthButtons, register/join) — that flow already has a session by
  // the time it lands here (signInWithIdToken ran client-side on the
  // previous page), so there's no `?code=` to exchange, but it still needs
  // the same login-event ping + resolveRedirect() sequence below.
  const [oauthCallback] = useState(() => {
    if (typeof window === 'undefined') return { active: false, error: null as string | null }
    const params = new URLSearchParams(window.location.search)
    return {
      active: params.has('code') || params.get('oauth') === '1',
      error: params.get('error_description') || params.get('error'),
    }
  })
  // While true, render a full-page spinner instead of the login form. Without
  // this, the `?code=...` round trip re-mounts this page with fresh state
  // (oauthLoading resets to null), so the user sees the entire idle login
  // form — email field, social buttons, all of it — for the second or two it
  // takes Supabase to exchange the code and resolveRedirect() to run, making
  // the login page itself look like the loading screen. Falls back to the
  // normal form after a timeout in case SIGNED_IN never fires (bad code,
  // network hiccup) so the user isn't stuck looking at a spinner forever.
  const [showOauthSpinner, setShowOauthSpinner] = useState(oauthCallback.active && !oauthCallback.error)

  const resolveRedirect = async () => {
    try {
      if (redirectTo) {
        router.push(redirectTo)
        return
      }

      const res = await fetch('/api/auth/me')
      const json = await res.json()

      if (json.user?.globalRole === 'SUPERADMIN') {
        router.push('/admin')
        return
      }

      const legacySchools: SchoolContext[] = json.contexts?.schools ?? []

      // Decision extracted to lib/auth/loginRedirect.ts — see that file for
      // the full priority order (explicit redirect / SUPERADMIN already
      // handled above, so this only ever resolves the "how many real
      // contexts does this user have" branch, with a safe fallback to the
      // pre-existing staffSchools logic if GET /api/auth/contexts fails).
      const action = await resolveLoginRedirectAction({
        explicitPath: undefined,
        isSuperAdmin: false,
        legacySchools,
        isOnChooseProfile: pathname === '/choose-profile',
        fetchContexts: () => fetchAvailableContexts(),
      })

      switch (action.kind) {
        case 'dashboard-auto':
          await fetch('/api/auth/context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schoolId: action.schoolId }),
          })
          router.push('/dashboard')
          return
        case 'legacy-picker':
          setPickerSchools(action.schools)
          return
        case 'noop':
          return
        case 'push':
          router.push(action.path)
          return
      }
    } catch {
      router.push('/my')
    }
  }

  // Gated on oauthCallback.active (captured above) so this never double-fires
  // alongside handleLogin's own resolveRedirect() call for password logins.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // INITIAL_SESSION covers the `?oauth=1` case: the session already
      // exists in cookies by the time this page's client initializes (set
      // by signInWithIdToken on the previous page), so it's never a
      // SIGNED_IN transition here.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && oauthCallback.active) {
        // handleLogin sends this for password logins — OAuth never went
        // through that path, so it needs its own login-event. The route
        // dedupes server-side, so this can't double up with it either.
        fetch('/api/auth/login-event', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          keepalive: true,
        }).catch(() => {})
        resolveRedirect()
      }
    })
    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Safety net for the spinner above: if the code exchange fails in a way
  // that never fires SIGNED_IN and never sets ?error= either, don't leave the
  // user staring at a spinner indefinitely — drop back to the normal form.
  useEffect(() => {
    if (!showOauthSpinner) return
    const timer = setTimeout(() => setShowOauthSpinner(false), 10000)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Supabase can return `?error=...&error_description=...` when the OAuth
  // round trip itself succeeded but sign-in was rejected (e.g. this email
  // already has an account under a different provider and manual identity
  // linking is off). Without this, that case silently dumps the user back on
  // a blank login form with no explanation.
  useEffect(() => {
    if (!oauthCallback.error) return
    setError(oauthCallback.error.replace(/\+/g, ' '))
    const url = new URL(window.location.href)
    url.searchParams.delete('error')
    url.searchParams.delete('error_description')
    url.searchParams.delete('error_code')
    window.history.replaceState(null, '', url.pathname + url.search)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOAuth = async (provider: OAuthProvider) => {
    setError('')
    setOauthLoading(provider)
    const redirectQuery = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/login${redirectQuery}`,
        // Supabase's Azure provider doesn't request the `email` scope by
        // default, so accounts that don't expose it elsewhere in the token
        // fail sign-in with "Error getting user email from external
        // provider". Request it explicitly — harmless no-op for the other
        // providers, which already get it by default.
        ...(provider === 'azure' ? { scopes: 'openid profile email' } : {}),
      },
    })
    if (err) { setError(err.message); setOauthLoading(null) }
  }

  // Google specifically skips signInWithOAuth's redirect round trip — the ID
  // token comes back straight from Google's own button (rendered by
  // useGoogleSignInButton below) without ever leaving this page, so there's
  // no PKCE `?code=` exchange to wait for and the session is available
  // immediately.
  const handleGoogleCredential = async (idToken: string) => {
    setError('')
    setOauthLoading('google')
    const { data, error: err } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken })
    if (err) { setError(err.message); setOauthLoading(null); return }
    if (data.session?.access_token) {
      fetch('/api/auth/login-event', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        keepalive: true,
      }).catch(() => {})
    }
    await resolveRedirect()
  }
  const googleButtonRef = useGoogleSignInButton(handleGoogleCredential)

  const handleContinueWithEmail = (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErr('')
    if (!email) { setEmailErr('Please provide a valid email address.'); return }
    setView('password')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassErr(''); setError(''); setUnconfirmedEmail('')
    if (!password) { setPassErr('Password field cannot be left blank.'); return }

    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      // Only reachable if the Supabase project's "Confirm email" toggle is
      // on — proxy.ts's email_confirmed_at gate is the authoritative check
      // otherwise (a session can exist for an unconfirmed user).
      if (err.message === 'Email not confirmed') {
        setUnconfirmedEmail(email)
      } else {
        setError(err.message)
      }
      return
    }

    if (data.session?.access_token) {
      fetch('/api/auth/login-event', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        keepalive: true,
      }).catch(() => {})
    }

    await resolveRedirect()
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetErr('')
    if (!resetEmail) { setResetErr('Please provide a valid email address.'); return }

    setResetLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    setResetLoading(false)
    if (err) { setResetErr(err.message); return }
    setResetSent(true)
  }

  if (pickerSchools) {
    return (
      <SchoolPicker
        schools={pickerSchools}
        onSelect={() => router.push('/dashboard')}
        onPersonal={() => router.push('/explore')}
      />
    )
  }

  if (showOauthSpinner) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
        <div style={{ width: 32, height: 32, border: `3px solid ${BLUE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <Image src="/martial-logo.png" alt="Martial" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>
            {view === 'forgot' ? 'Forgot Password?' : 'Welcome back'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            {view === 'forgot'
              ? (resetSent ? 'Check your inbox for the reset link' : "Enter your email and we'll send you a reset link")
              : view === 'password'
              ? 'Enter your password to continue'
              : 'Log in to continue your martial journey'}
          </p>
        </div>

        {justRegistered && (
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            Account created{registeredType === 'school' ? ' for your academy' : ''} — log in to continue.
          </p>
        )}

        {view === 'forgot' ? (
          resetSent ? (
            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28, textAlign: 'center' }}>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: TEXT }}>
                We&apos;ve sent a password reset link to <strong>{resetEmail}</strong>.
              </p>
              <button
                type="button"
                onClick={() => { setView('email'); setResetSent(false) }}
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} noValidate
              style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${resetErr ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                />
                {resetErr && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{resetErr}</p>}
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: resetLoading ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: resetLoading ? 'not-allowed' : 'pointer' }}>
                {resetLoading ? 'Sending…' : 'Send reset link'}
              </button>

              <button
                type="button"
                onClick={() => { setView('email'); setResetErr('') }}
                style={{ width: '100%', padding: '4px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}>
                ← Back
              </button>
            </form>
          )
        ) : view === 'password' ? (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28 }}>
            <button type="button" onClick={() => { setView('email'); setPassErr(''); setError(''); setUnconfirmedEmail('') }}
              style={{ display: 'block', marginBottom: 16, padding: '4px 0', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}>
              ← Back
            </button>

            <form onSubmit={handleLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoFocus
                    style={{ width: '100%', padding: '11px 44px 11px 14px', fontSize: 15, border: `1px solid ${passErr ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 12, fontWeight: 600 }}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
                {passErr && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{passErr}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -8 }}>
                <span
                  onClick={() => { setResetEmail(email); setResetErr(''); setResetSent(false); setView('forgot') }}
                  style={{ fontSize: 13, fontWeight: 600, color: BLUE, cursor: 'pointer' }}>
                  Forgot Password?
                </span>
              </div>

              {unconfirmedEmail && (
                <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
                  {t.authVerify.loginUnconfirmed}{' '}
                  <a href={`/auth/verify-pending?email=${encodeURIComponent(unconfirmedEmail)}${confirmRedirect ? `&redirect=${encodeURIComponent(confirmRedirect)}` : ''}`} style={{ color: '#DC2626', fontWeight: 700, textDecoration: 'underline' }}>
                    {t.authVerify.loginResendLink}
                  </a>
                </p>
              )}
              {error && <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: loading ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Logging in…' : 'Log in'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28 }}>
            <form onSubmit={handleContinueWithEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  autoFocus
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${emailErr ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                />
                {emailErr && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{emailErr}</p>}
              </div>

              <button
                type="submit"
                style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                Continue with email
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: MUTED }}>OR</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative', height: 52 }}>
                <SocialButton provider="google" label="Continuar con Google"
                  loading={oauthLoading === 'google'} disabled={oauthLoading !== null}
                  onClick={() => {}} />
                {/* Google's real button, invisible and stacked on top — its
                    click (not a simulated one) is what's actually allowed to
                    open the account-picker popup, per Google's ToS. The
                    visible button above is pure decoration matching
                    Apple/Microsoft's styling. */}
                <div
                  ref={googleButtonRef}
                  style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', opacity: 0,
                    pointerEvents: oauthLoading && oauthLoading !== 'google' ? 'none' : 'auto',
                  }}
                />
              </div>
              <SocialButton provider="apple" label="Continuar con Apple"
                loading={oauthLoading === 'apple'} disabled={oauthLoading !== null}
                onClick={() => handleOAuth('apple')} />
              <SocialButton provider="azure" label="Continuar con Microsoft"
                loading={oauthLoading === 'azure'} disabled={oauthLoading !== null}
                onClick={() => handleOAuth('azure')} />
            </div>

            {error && <p style={{ margin: '16px 0 0', fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: MUTED }}>
          Don&apos;t have an account?{' '}
          <a href="/register" style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}>Register</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 24, height: 24, border: `2px solid ${BLUE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  )
}
