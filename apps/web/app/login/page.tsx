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
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>Welcome back</h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>Log in to continue your martial journey</p>
        </div>

        {justRegistered && (
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#15803D', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '10px 14px', borderRadius: 10, textAlign: 'center' }}>
            Account created{registeredType === 'school' ? ' for your academy' : ''} — log in to continue.
          </p>
        )}

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
        </form>

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
