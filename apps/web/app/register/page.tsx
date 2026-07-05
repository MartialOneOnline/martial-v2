'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeRedirect } from '@/lib/safeRedirect'
import { disciplineEmoji } from '@/lib/disciplineEmoji'

const BLUE = '#0870E2'
const NAVY = '#0E3A7A'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

const COUNTRIES = [
  ['ES', 'Spain'], ['GB', 'United Kingdom'], ['FR', 'France'], ['DE', 'Germany'], ['IT', 'Italy'],
  ['PT', 'Portugal'], ['NL', 'Netherlands'], ['BE', 'Belgium'], ['SE', 'Sweden'], ['NO', 'Norway'],
  ['DK', 'Denmark'], ['IE', 'Ireland'], ['CH', 'Switzerland'], ['AT', 'Austria'], ['PL', 'Poland'],
  ['GR', 'Greece'], ['TR', 'Turkey'], ['AE', 'UAE'], ['US', 'United States'], ['AU', 'Australia'], ['BR', 'Brazil'],
]

type AccountType = 'student' | 'school'

// Human-readable error codes from POST /api/auth/register — see that route
// for the authoritative list. Falls back to the server's own message for
// anything not explicitly mapped here.
const ERROR_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
}

function RegisterPageInner() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const redirectParam = safeRedirect(searchParams.get('redirect'))
  const initialType = searchParams.get('type') === 'school' ? 'school' : 'student'

  const [accountType, setAccountType] = useState<AccountType>(initialType)
  const [disciplineOptions, setDisciplineOptions] = useState<{ slug: string; label: string }[]>([])

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phone, setPhone] = useState('')

  const [schoolName, setSchoolName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [disciplines, setDisciplines] = useState<string[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    fetch('/api/disciplines')
      .then(r => r.json())
      .then((d: { disciplines: { name: string; slug: string }[] }) =>
        setDisciplineOptions(d.disciplines.map(x => ({ slug: x.slug, label: x.name })))
      )
      .catch(() => {})
  }, [])

  function clearError(f: string) {
    setErrors(p => { const n = { ...p }; delete n[f]; return n })
  }

  function toggleDiscipline(slug: string) {
    setDisciplines(d => d.includes(slug) ? d.filter(s => s !== slug) : [...d, slug])
    clearError('disciplines')
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!fullName.trim()) e.fullName = accountType === 'school' ? 'Owner name is required.' : 'Full name is required.'
    if (!email || !emailRe.test(email)) e.email = 'Please provide a valid email address.'
    if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (confirm !== password) e.confirm = "Passwords don't match."
    if (accountType === 'school') {
      if (!schoolName.trim()) e.schoolName = 'School name is required.'
      if (!city.trim()) e.city = 'City is required.'
      if (!country) e.country = 'Country is required.'
      if (disciplines.length === 0) e.disciplines = 'Select at least one discipline.'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          fullName,
          email,
          password,
          phone: accountType === 'student' ? phone : undefined,
          school: accountType === 'school' ? { name: schoolName, city, country, disciplines } : undefined,
        }),
      })
      const data = await res.json()

      if (!data.ok) {
        setApiError(ERROR_MESSAGES[data.code] ?? data.message ?? 'Something went wrong. Please try again.')
        return
      }

      if (data.requiresEmailConfirmation) {
        setCheckEmail(true)
        return
      }

      // Auto-login using the password just submitted, then land where the
      // account type belongs (or wherever ?redirect= sanitized to).
      setSigningIn(true)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) {
        router.push(`/login?registered=1&type=${accountType}&email=${encodeURIComponent(email)}`)
        return
      }

      if (accountType === 'school' && data.schoolId) {
        await fetch('/api/auth/context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolId: data.schoolId }),
        })
      }

      router.push(redirectParam ?? data.redirectTo ?? (accountType === 'school' ? '/dashboard' : '/my'))
    } finally {
      setLoading(false)
    }
  }

  if (checkEmail) {
    return (
      <CenteredCard>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', marginBottom: 20 }}>
          <Mail size={26} color={BLUE} />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: TEXT }}>Check your email</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
          We sent a confirmation link to <strong style={{ color: TEXT }}>{email}</strong>. Click it to activate your account, then log in.
        </p>
        <a href="/login" style={{ display: 'block', width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: BLUE, color: '#fff', border: 'none', borderRadius: 12, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
          Go to login
        </a>
      </CenteredCard>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <Image src="/martial-logo.png" alt="Martial" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>Create your account</h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>Join Martial as a student or register your academy</p>
        </div>

        {/* Account type toggle */}
        <div style={{ display: 'flex', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden', marginBottom: 10, background: '#fff' }}>
          {(['student', 'school'] as AccountType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setAccountType(t); setErrors({}); setApiError('') }}
              style={{
                flex: 1, padding: '12px 8px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                background: accountType === t ? BLUE : '#fff', color: accountType === t ? '#fff' : MUTED,
                transition: 'all .15s',
              }}
            >
              {t === 'student' ? '🥋 Student' : '🏛️ School / Academy'}
            </button>
          ))}
        </div>
        <p style={{ margin: '0 0 20px', fontSize: 12.5, color: MUTED, textAlign: 'center', lineHeight: 1.5 }}>
          {accountType === 'student'
            ? 'Book classes, track your progress and manage your membership.'
            : 'Manage your students, classes, timetable and payments.'}
        </p>

        <form onSubmit={handleSubmit} noValidate
          style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          <TextField label={accountType === 'school' ? 'Owner full name' : 'Full name'} value={fullName}
            onChange={v => { setFullName(v); clearError('fullName') }} error={errors.fullName} placeholder="Jane Doe" />

          <TextField label={accountType === 'school' ? 'Owner email' : 'Email'} type="email" value={email}
            onChange={v => { setEmail(v); clearError('email') }} error={errors.email} placeholder="you@email.com" />

          {accountType === 'student' && (
            <TextField label="Phone" optional type="tel" value={phone} onChange={setPhone} placeholder="+34 600 000 000" />
          )}

          <PasswordField label="Password" value={password}
            onChange={v => { setPassword(v); clearError('password') }} error={errors.password} placeholder="Min 8 characters" />
          <PasswordField label="Confirm password" value={confirm}
            onChange={v => { setConfirm(v); clearError('confirm') }} error={errors.confirm} placeholder="Repeat password" />

          {accountType === 'school' && (
            <>
              <div style={{ height: 1, background: BORDER, margin: '4px 0' }} />
              <TextField label="School / academy name" value={schoolName}
                onChange={v => { setSchoolName(v); clearError('schoolName') }} error={errors.schoolName} placeholder="Roger Gracie Málaga" />
              <TextField label="City" value={city}
                onChange={v => { setCity(v); clearError('city') }} error={errors.city} placeholder="Málaga" />

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Country</label>
                <select
                  value={country}
                  onChange={e => { setCountry(e.target.value); clearError('country') }}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.country ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT, background: '#fff' }}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
                {errors.country && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.country}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Disciplines</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {disciplineOptions.map(d => {
                    const selected = disciplines.includes(d.slug)
                    return (
                      <button
                        key={d.slug}
                        type="button"
                        onClick={() => toggleDiscipline(d.slug)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                          border: `2px solid ${selected ? BLUE : BORDER}`, background: selected ? '#EFF6FF' : '#fff', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{disciplineEmoji(d.slug)}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? BLUE : TEXT, lineHeight: 1.2 }}>{d.label}</span>
                      </button>
                    )
                  })}
                </div>
                {errors.disciplines && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.disciplines}</p>}
              </div>
            </>
          )}

          {apiError && (
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>
              {apiError}{' '}
              {apiError.includes('already exists') && (
                <a href={`/login?email=${encodeURIComponent(email)}`} style={{ color: '#DC2626', fontWeight: 700, textDecoration: 'underline' }}>Log in instead.</a>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: loading ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {signingIn ? 'Signing you in…' : loading ? 'Creating account…' : accountType === 'school' ? 'Create academy account' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: MUTED }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}>Log in</a>
        </p>
      </div>
    </div>
  )
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 32 }}>
        {children}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, error, placeholder, type = 'text', optional }: {
  label: string; value: string; onChange: (v: string) => void
  error?: string; placeholder?: string; type?: string; optional?: boolean
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
        {label} {optional && <span style={{ color: MUTED, fontWeight: 400 }}>(optional)</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${error ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
      />
      {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>}
    </div>
  )
}

function PasswordField({ label, value, onChange, error, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', padding: '11px 56px 11px 14px', fontSize: 15, border: `1px solid ${error ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
        />
        <button type="button" onClick={() => setShow(v => !v)}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 12, fontWeight: 600 }}>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {error && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color={BLUE} />
      </div>
    }>
      <RegisterPageInner />
    </Suspense>
  )
}
