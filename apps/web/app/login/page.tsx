'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import SchoolPicker from '../../components/SchoolPicker'
import type { SchoolContext } from '@/lib/auth/contexts'
import { safeRedirect } from '@/lib/safeRedirect'

const BLUE = '#0870E2'
const NAVY = '#0E3A7A'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

// ── Social login icons ───────────────────────────────────────────────────────
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
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
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
function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  )
}

function SSOButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: '100%', height: 52, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', border: `1px solid ${BORDER}`, borderRadius: 12, background: '#fff', fontSize: 14, fontWeight: 600, color: TEXT, cursor: 'pointer' }}>
      {icon}
      <span style={{ flex: 1, textAlign: 'center', paddingRight: 20 }}>{label}</span>
    </button>
  )
}

// Standalone login page — this is the actual entry screen the mobile app
// WebView loads after its native splash screen, so it must work fully on
// its own (no marketing header/footer, no dependency on the homepage).
function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const redirectTo = safeRedirect(searchParams.get('redirect'))
  const justRegistered = searchParams.get('registered') === '1'
  const registeredType = searchParams.get('type')

  const [view, setView] = useState<'sso' | 'email'>('sso')
  const [email, setEmail] = useState(searchParams.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [passErr, setPassErr] = useState('')
  const [pickerSchools, setPickerSchools] = useState<SchoolContext[] | null>(null)

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

      const schools: SchoolContext[] = json.contexts?.schools ?? []
      const staffSchools = schools.filter(s => s.role !== 'STUDENT')

      if (staffSchools.length === 1 && staffSchools[0]) {
        await fetch('/api/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: staffSchools[0].schoolId }),
        })
        router.push('/dashboard')
        return
      }

      if (staffSchools.length > 1) {
        setPickerSchools(staffSchools)
        return
      }

      router.push('/my')
    } catch {
      router.push('/my')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailErr(''); setPassErr(''); setError('')
    let valid = true
    if (!email) { setEmailErr('Please provide a valid email address.'); valid = false }
    if (!password) { setPassErr('Password field cannot be left blank.'); valid = false }
    if (!valid) return

    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }

    if (data.session?.access_token) {
      fetch('/api/auth/login-event', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        keepalive: true,
      }).catch(() => {})
    }

    await resolveRedirect()
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
            {view === 'sso' ? 'Welcome to Martial' : 'Welcome back'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            {view === 'sso' ? 'Your martial journey starts here' : 'Log in to continue your martial journey'}
          </p>
        </div>

        {justRegistered && (
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            Account created{registeredType === 'school' ? ' for your academy' : ''} — log in to continue.
          </p>
        )}

        {view === 'sso' ? (
          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SSOButton icon={<GoogleIcon />} label="Continue with Google" onClick={() => {}} />
              <SSOButton icon={<FacebookIcon />} label="Continue with Facebook" onClick={() => {}} />
              <SSOButton icon={<AppleIcon />} label="Continue with Apple" onClick={() => {}} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: 1 }}>or</span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            <SSOButton icon={<EmailIcon />} label="Continue with Email" onClick={() => setView('email')} />
          </div>
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

            {error && <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: loading ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>

            <button
              type="button"
              onClick={() => { setView('sso'); setError(''); setEmailErr(''); setPassErr('') }}
              style={{ width: '100%', padding: '4px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: MUTED, cursor: 'pointer' }}>
              ← Back
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
