'use client'

import { useState, Suspense } from 'react'
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

const BLUE = '#0870E2'
const NAVY = '#0E3A7A'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

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

  const [view, setView] = useState<'email' | 'forgot'>('email')
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErr(''); setPassErr(''); setError(''); setUnconfirmedEmail('')
    let valid = true
    if (!email) { setEmailErr('Please provide a valid email address.'); valid = false }
    if (!password) { setPassErr('Password field cannot be left blank.'); valid = false }
    if (!valid) return

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
            {view === 'forgot' ? (resetSent ? 'Check your inbox for the reset link' : "Enter your email and we'll send you a reset link") : 'Log in to continue your martial journey'}
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
        ) : (
          <form onSubmit={handleLogin} noValidate
            style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
                style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${emailErr ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
              />
              {emailErr && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{emailErr}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
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
