'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

type InvitationData = {
  id: string
  name: string
  email: string
  city: string | null
  country: string | null
  activities: string | null
  website: string | null
  status: string
  school: {
    id: string
    name: string
    city: string | null
    country: string | null
    address: string | null
    description: string | null
    logoUrl: string | null
    instagram: string | null
    website: string | null
    status: string
  } | null
}

export default function ClaimPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [data, setData]         = useState<InvitationData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // Form
  const [name, setName]         = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    fetch(`/api/claim/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setData(d)
        setName(d.name || '')
      })
      .catch(() => setError('Could not load invitation'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (password.length < 8) { setFormError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setFormError('Passwords do not match'); return }

    setSubmitting(true)

    const res = await fetch(`/api/claim/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    })

    const result = await res.json()

    if (!res.ok) {
      setFormError(result.error || 'Something went wrong')
      setSubmitting(false)
      return
    }

    // Sign in with Supabase
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    )

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data!.email,
      password,
    })

    if (signInError) {
      setFormError('Account created but sign-in failed. Please go to login.')
      setSubmitting(false)
      return
    }

    // Set school context cookie
    await fetch('/api/auth/context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId: result.schoolId }),
    })

    setDone(true)
    setTimeout(() => router.replace('/dashboard'), 1500)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Logo />
        <p style={{ color: '#6B7280', fontSize: 15 }}>Loading…</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Logo />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Link not valid</p>
          <p style={{ fontSize: 15, color: '#6B7280' }}>{error}</p>
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <Logo />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <p style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Welcome to Martial App!</p>
          <p style={{ fontSize: 15, color: '#6B7280' }}>Redirecting to your dashboard…</p>
        </div>
      </div>
    </div>
  )

  const school = data!.school
  const displayName = school?.name ?? data!.name
  const displayCity = school?.city ?? data!.city

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: 520, gap: 0, padding: 0, overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0E3A7A 0%, #0870E2 100%)',
          padding: '32px 40px',
          textAlign: 'center',
        }}>
          <Logo white />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 16, marginBottom: 0 }}>
            You've been invited to join
          </p>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '6px 0 4px' }}>
            {displayName}
          </h1>
          {displayCity && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
              📍 {displayCity}{data!.country ? `, ${data!.country}` : ''}
            </p>
          )}
        </div>

        {/* School info */}
        {school?.description && (
          <div style={{ padding: '20px 40px', borderBottom: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>
              {school.description.slice(0, 200)}{school.description.length > 200 ? '…' : ''}
            </p>
          </div>
        )}

        {/* Form */}
        <div style={{ padding: '32px 40px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
            Create your account
          </p>
          <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>
            You'll use <strong>{data!.email}</strong> to sign in
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Your name</label>
              <input
                style={inputStyle}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            <div>
              <label style={labelStyle}>Confirm password</label>
              <input
                style={inputStyle}
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

            {formError && (
              <p style={{ fontSize: 13, color: '#EF4444', margin: 0 }}>{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: submitting ? '#9CA3AF' : '#0870E2',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '13px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                marginTop: 4,
              }}
            >
              {submitting ? 'Creating account…' : 'Activate my school →'}
            </button>
          </form>

          <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 20 }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#0870E2', textDecoration: 'none' }}>Sign in</a>
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#F4F6F9',
  padding: '24px 16px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  width: '100%',
  maxWidth: 460,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 24,
  padding: 40,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #E5E7EB',
  borderRadius: 8,
  fontSize: 14,
  color: '#111827',
  outline: 'none',
  boxSizing: 'border-box',
}

function Logo({ white }: { white?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: white ? 'rgba(255,255,255,0.2)' : '#0E3A7A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 800, color: '#fff',
      }}>M</div>
      <span style={{ fontSize: 18, fontWeight: 800, color: white ? '#fff' : '#0E3A7A' }}>
        Martial
      </span>
    </div>
  )
}
