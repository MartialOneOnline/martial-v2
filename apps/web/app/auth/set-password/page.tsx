'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient as getSupabase } from '@/lib/supabase/client'

const C = { primary: '#0071E3', navy: '#0E3A7A', bg: '#F4F6F9', border: '#E5E7EB', text: '#111827', muted: '#6B7280', green: '#16A34A', greenBg: '#DCFCE7' }

function SuccessScreen({ name, onContinue }: { name: string; onContinue: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: '48px 32px' }}>
        {/* Success icon */}
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: 20, background: C.greenBg, marginBottom: 24 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: C.text }}>¡Cuenta activada!</h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
          {name ? <>Bienvenido/a, <strong style={{ color: C.text }}>{name}</strong>.<br /></> : ''}
          Tu acceso a Martial está listo.
        </p>
        <button
          onClick={onContinue}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: C.primary, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer' }}>
          Ir al dashboard →
        </button>
      </div>
      <p style={{ marginTop: 20, fontSize: 12, color: C.muted }}>
        © {new Date().getFullYear()} Martial · <a href="https://martial.one" style={{ color: C.muted }}>martial.one</a>
      </p>
    </div>
  )
}

export default function SetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [redirect, setRedirect] = useState('/my')
  const [schoolId, setSchoolId] = useState<string | null>(null)

  useEffect(() => {
    // Read schoolId before the hash cleanup below wipes the query string too.
    setSchoolId(new URLSearchParams(window.location.search).get('schoolId'))

    // Decode email from hash JWT immediately (no async needed)
    const hash = window.location.hash
    if (hash.includes('access_token')) {
      try {
        const params = new URLSearchParams(hash.slice(1))
        const token = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1] ?? ''))
          if (payload.email) setEmail(payload.email)
          // Establish session so updateUser works
          if (refreshToken) {
            getSupabase().auth.setSession({ access_token: token, refresh_token: refreshToken })
          }
        }
      } catch { /* ignore decode errors */ }
      finally {
        // Strip the token out of the address bar/history now that it's been read
        window.history.replaceState(null, '', window.location.pathname)
      }
      return
    }
    // Fallback: existing session (e.g. Google OAuth return)
    getSupabase().auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setEmail(data.session.user.email)
        const meta = data.session.user.user_metadata
        if (meta?.full_name) setName(String(meta.full_name))
        else if (meta?.name) setName(String(meta.name))
      }
    })
  }, [])

  const activateMember = async (): Promise<string> => {
    try {
      const res = await fetch('/api/auth/activate-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Password was already set successfully above — this only means the
        // school-membership activation couldn't be resolved unambiguously
        // (e.g. a stale multi-school legacy link). Account still works; land
        // on a safe default rather than surfacing a raw API error here.
        console.error('[set-password] activate-member failed:', data)
        return '/my'
      }
      return data.redirect ?? '/my'
    } catch { return '/my' }
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    try {
      const { error: err } = await getSupabase().auth.updateUser({ password })
      if (err) { setError(err.message); return }
      const redirectTo = await activateMember()
      setRedirect(redirectTo)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const { error: err } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/accept-invite` },
    })
    if (err) { setError(err.message); setGoogleLoading(false) }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <SuccessScreen name={name || email.split('@')[0] || ''} onContinue={() => router.replace(redirect)} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 12, background: C.navy, marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>M</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: C.text }}>Activa tu cuenta</h1>
          <p style={{ margin: 0, fontSize: 14, color: C.muted }}>
            {email ? <><strong style={{ color: C.text }}>{email}</strong> — elige cómo acceder</> : 'Elige cómo quieres acceder a Martial'}
          </p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

          {/* Google */}
          <div style={{ padding: '24px 28px 20px' }}>
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '11px 16px', border: `1px solid ${C.border}`, borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, color: C.text, cursor: 'pointer', transition: 'all .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {googleLoading ? 'Redirigiendo…' : 'Continuar con Google'}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 28px 20px' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>o crea una contraseña</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {/* Password form */}
          <form onSubmit={handleSetPassword} style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                style={{ width: '100%', padding: '10px 12px', fontSize: 14, border: `1px solid ${C.border}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', color: C.text }}
                onFocus={e => (e.currentTarget.style.borderColor = C.primary)}
                onBlur={e => (e.currentTarget.style.borderColor = C.border)}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
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
              {loading ? 'Activando…' : 'Activar cuenta →'}
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
