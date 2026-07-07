'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as getSupabase } from '@/lib/supabase/client'

const C = { primary: '#0071E3', navy: '#0E3A7A', bg: '#F4F6F9', border: '#E5E7EB', text: '#111827', muted: '#6B7280', green: '#16A34A', greenBg: '#DCFCE7' }

function SuccessScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '48px 32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: C.greenBg, marginBottom: 24 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: C.text }}>Password updated</h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
          Your password has been changed successfully.
        </p>
        <button
          onClick={onContinue}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          Continue →
        </button>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: C.muted }}>
        © {new Date().getFullYear()} Martial · <a href="https://martial.one" style={{ color: C.muted }}>martial.one</a>
      </p>
    </div>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [tokenError, setTokenError] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      try {
        const params = new URLSearchParams(hash.slice(1))
        const token = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
          if (payload.email) setEmail(payload.email)
          if (refreshToken) {
            getSupabase().auth.setSession({ access_token: token, refresh_token: refreshToken })
          }
        }
      } catch { /* ignore decode errors */ }
      finally {
        window.history.replaceState(null, '', window.location.pathname)
      }
      return
    }
    // No recovery token in the URL and no existing session — link expired/invalid
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setEmail(data.session.user.email)
      } else {
        setTokenError(true)
      }
    })
  }, [])

  const resolveRedirect = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const json = await res.json()

      if (json.user?.globalRole === 'SUPERADMIN') { router.replace('/admin'); return }

      const schools = json.contexts?.schools ?? []
      const staffSchools = schools.filter((s: { role: string }) => s.role !== 'STUDENT')

      if (staffSchools.length >= 1) {
        await fetch('/api/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: staffSchools[0].schoolId }),
        })
        router.replace('/dashboard')
        return
      }

      router.replace('/my')
    } catch {
      router.replace('/login')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password })
      if (err) { setError(err.message); return }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <SuccessScreen onContinue={resolveRedirect} />
      </div>
    )
  }

  if (tokenError) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '48px 32px' }}>
            <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: C.text }}>Link expired</h1>
            <p style={{ margin: '0 0 32px', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              onClick={() => router.replace('/login')}
              style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: C.navy, marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>M</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>Reset your password</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
            {email ? <>Choose a new password for <strong style={{ color: C.text }}>{email}</strong></> : 'Choose a new password'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <form onSubmit={handleResetPassword} style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: 14, fontWeight: 700, background: loading ? '#93C5FD' : C.primary, color: '#fff', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s' }}>
              {loading ? 'Updating…' : 'Update password →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: C.muted }}>
          © {new Date().getFullYear()} Martial · <a href="https://martial.one" style={{ color: C.muted }}>martial.one</a>
        </p>
      </div>
    </div>
  )
}
