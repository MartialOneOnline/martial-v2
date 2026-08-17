'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Building2, GraduationCap, Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { SocialAuthButtons } from '@/components/SocialAuthButtons'
import { useT, useLanguage } from '@/lib/i18n/LanguageContext'

const BLUE = '#0870E2'
const NAVY = '#0E3A7A'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

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
  const t = useT()
  const { locale } = useLanguage()
  const searchParams = useSearchParams()
  const redirectParam = safeConfirmRedirect(searchParams.get('redirect'))
  const initialType = searchParams.get('type') === 'school' ? 'school' : 'student'
  // Contexts like buying an event ticket only make sense as a student account —
  // showing the School/Academy choice there is a non-sequitur, not a real option.
  const typeLocked = searchParams.get('lock') === '1'

  const [accountType, setAccountType] = useState<AccountType>(initialType)
  const [step, setStep] = useState<'method' | 'details'>('method')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  function clearError(f: string) {
    setErrors(p => { const n = { ...p }; delete n[f]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!fullName.trim()) e.fullName = accountType === 'school' ? 'Owner name is required.' : 'Full name is required.'
    if (!email || !emailRe.test(email)) e.email = 'Please provide a valid email address.'
    if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (confirm !== password) e.confirm = "Passwords don't match."
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
          redirect: redirectParam,
          lang: locale,
        }),
      })
      const data = await res.json()

      if (!data.ok) {
        setApiError(ERROR_MESSAGES[data.code] ?? data.message ?? 'Something went wrong. Please try again.')
        return
      }

      if (data.requiresEmailConfirmation) {
        setEmailSent(data.emailSent !== false)
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

  async function handleResend() {
    if (resending || resent) return
    setResending(true)
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect: redirectParam, lang: locale }),
      })
      setResent(true)
    } finally {
      setResending(false)
    }
  }

  if (checkEmail) {
    return (
      <CenteredCard>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', marginBottom: 20 }}>
          <Mail size={26} color={BLUE} />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: TEXT }}>
          {emailSent ? t.authVerify.registerCheckTitle : t.authVerify.sendFailedTitle}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
          {(emailSent ? t.authVerify.registerCheckBody : t.authVerify.sendFailedBody)
            .split('{email}')
            .flatMap((part, i) => i === 0 ? [part] : [<strong key={i} style={{ color: TEXT }}>{email}</strong>, part])}
        </p>

        {!emailSent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || resent}
            style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: resent ? '#DCFCE7' : (resending ? '#93C5FD' : BLUE), color: resent ? '#166534' : '#fff', border: 'none', borderRadius: 12, cursor: (resending || resent) ? 'not-allowed' : 'pointer', marginBottom: 12, boxSizing: 'border-box' }}>
            {resent ? t.authVerify.resent : resending ? t.authVerify.resending : t.authVerify.resend}
          </button>
        )}

        <a href="/login" style={{ display: 'block', width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: emailSent ? BLUE : '#fff', color: emailSent ? '#fff' : NAVY, border: emailSent ? 'none' : `1px solid ${BORDER}`, borderRadius: 12, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
          {t.authVerify.registerGoToLogin}
        </a>
      </CenteredCard>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {step === 'method' ? (
          <>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                <Image src="/martial-logo.png" alt="Martial" width={56} height={56} style={{ objectFit: 'contain' }} />
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>Create your account</h1>
              <p style={{ margin: 0, fontSize: 14, color: MUTED }}>Join Martial as a student or register your academy</p>
            </div>

            {/* Account type toggle */}
            {!typeLocked && (
              <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: '#F3F4F6', marginBottom: 10 }}>
                {(['student', 'school'] as AccountType[]).map(t => {
                  const active = accountType === t
                  const Icon = t === 'student' ? GraduationCap : Building2
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setAccountType(t); setErrors({}); setApiError('') }}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '11px 8px', fontSize: 13.5, fontWeight: 700, border: 'none', borderRadius: 12, cursor: 'pointer',
                        background: active ? '#fff' : 'transparent',
                        color: active ? TEXT : MUTED,
                        boxShadow: active ? '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)' : 'none',
                        transition: 'all .15s',
                      }}
                    >
                      <Icon size={16} color={active ? BLUE : MUTED} />
                      {t === 'student' ? 'Student' : 'School / Academy'}
                    </button>
                  )
                })}
              </div>
            )}
            <p style={{ margin: '0 0 20px', fontSize: 12.5, color: MUTED, textAlign: 'center', lineHeight: 1.5 }}>
              {typeLocked
                ? 'Create your free student account to get your ticket.'
                : accountType === 'student'
                  ? 'Book classes, track your progress and manage your membership.'
                  : 'Manage your students, classes, timetable and payments.'}
            </p>

            <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 24 }}>
              <SocialAuthButtons redirectPath={accountType === 'school' ? '/onboarding/school' : redirectParam} />

              <button
                type="button"
                onClick={() => { setApiError(''); setStep('details') }}
                style={{ width: '100%', padding: '13px', fontSize: 14.5, fontWeight: 700, background: BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Mail size={17} />
                Continue with email
              </button>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: MUTED }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: NAVY, fontWeight: 600, textDecoration: 'underline' }}>Log in</a>
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setStep('method')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: MUTED, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 0', marginBottom: 4 }}>
              <ArrowLeft size={15} />
              Back
            </button>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14, background: '#EFF6FF', color: BLUE, marginBottom: 16 }}>
                <Mail size={22} />
              </div>
              <h1 style={{ margin: '0 0 6px', fontSize: 21, fontWeight: 700, color: TEXT }}>Set up your login</h1>
              <p style={{ margin: 0, fontSize: 13.5, color: MUTED, lineHeight: 1.5 }}>
                Just the essentials for now — you'll fill in the rest of your profile after you sign in.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate
              style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

              <TextField label={accountType === 'school' ? 'Owner full name' : 'Full name'} value={fullName}
                onChange={v => { setFullName(v); clearError('fullName') }} error={errors.fullName} placeholder="Jane Doe" />

              <TextField label={accountType === 'school' ? 'Owner email' : 'Email'} type="email" value={email}
                onChange={v => { setEmail(v); clearError('email') }} error={errors.email} placeholder="you@email.com" />

              <PasswordField label="Password" value={password}
                onChange={v => { setPassword(v); clearError('password') }} error={errors.password} placeholder="Create a password" />
              <PasswordField label="Confirm password" value={confirm}
                onChange={v => { setConfirm(v); clearError('confirm') }} error={errors.confirm} placeholder="Re-enter your password" />

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
          </>
        )}
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
