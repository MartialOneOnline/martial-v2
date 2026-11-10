'use client'

import { useEffect, useState } from 'react'
import { myFetch } from '@/lib/api/myFetch'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { isApplePrivateRelayEmail } from '@/lib/privateRelay'

const BLUE = '#0870E2'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'
const RED = '#DC2626'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${hasError ? RED : BORDER}`,
  borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT,
})
const buttonStyle = (disabled: boolean): React.CSSProperties => ({
  marginTop: 10, width: '100%', padding: '11px 16px', borderRadius: 999, border: 'none',
  background: BLUE, color: '#fff', fontSize: 14, fontWeight: 600,
  cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
})
const linkStyle: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, color: BLUE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

// Apple "Hide My Email" users replace their relay address with a real one,
// confirmed with a 6-digit code (POST /api/my/email, then /confirm). The
// account email only changes once the code is accepted.
export function RelayEmailStep({ onVerified, showRequired }: {
  onVerified: (email: string) => void
  // The profile form was submitted before the email was confirmed.
  showRequired: boolean
}) {
  const { t, locale } = useLanguage()
  const r = t.relayEmail
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const messageFor = (code: unknown) =>
    (typeof code === 'string' && code in r.errors ? r.errors[code as keyof typeof r.errors] : r.errors.generic)

  // A code may already be on its way (page reloaded, app reopened); this
  // also lets the server repair a change that failed midway.
  useEffect(() => {
    myFetch('/api/my/email')
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (!d) return
        if (!d.isRelay) { onVerified(d.email); return }
        if (d.pending?.email) { setPendingEmail(d.pending.email); setEmail(d.pending.email) }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function sendCode() {
    const candidate = email.trim().toLowerCase()
    if (!EMAIL_RE.test(candidate) || isApplePrivateRelayEmail(candidate)) { setError(r.errors.invalid_email); return }
    setBusy(true)
    setError('')
    try {
      const res = await myFetch('/api/my/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: candidate, lang: locale }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(messageFor(data.error)); return }
      setPendingEmail(data.pending?.email ?? candidate)
      setCode('')
    } catch {
      setError(r.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    const digits = code.replace(/\D/g, '')
    if (digits.length !== 6) { setError(r.errors.invalid_code); return }
    setBusy(true)
    setError('')
    try {
      const res = await myFetch('/api/my/email/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: digits }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(messageFor(data.error))
        // The pending change is gone: start again from the email.
        if (data.error === 'code_expired' || data.error === 'too_many_attempts' || data.error === 'no_pending') {
          setPendingEmail(null)
          setCode('')
        }
        return
      }
      onVerified(data.email)
    } catch {
      setError(r.errors.generic)
    } finally {
      setBusy(false)
    }
  }

  const shownError = error || (showRequired ? r.verifyFirst : '')

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{r.label}</label>
      {pendingEmail === null ? (
        <>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            placeholder={r.placeholder}
            autoComplete="email"
            style={inputStyle(!!shownError)}
          />
          <button type="button" onClick={sendCode} disabled={busy} style={buttonStyle(busy)}>
            {busy ? r.sending : r.sendCode}
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: MUTED }}>{r.codeSentTo.replace('{email}', pendingEmail)}</p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
            placeholder="000000"
            aria-label={r.codeLabel}
            style={{ ...inputStyle(!!shownError), letterSpacing: '0.3em', fontSize: 18, textAlign: 'center' }}
          />
          <button type="button" onClick={confirm} disabled={busy} style={buttonStyle(busy)}>
            {busy ? r.confirming : r.confirm}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10 }}>
            <button type="button" onClick={sendCode} disabled={busy} style={linkStyle}>{r.resend}</button>
            <button type="button" onClick={() => { setPendingEmail(null); setCode(''); setError('') }} disabled={busy} style={linkStyle}>
              {r.changeEmail}
            </button>
          </div>
        </>
      )}
      <p style={{ margin: '6px 0 0', fontSize: 12, color: shownError ? RED : MUTED, lineHeight: 1.5 }}>
        {shownError || r.hint}
      </p>
    </div>
  )
}
