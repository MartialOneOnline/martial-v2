'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { COUNTRIES } from '@/lib/countries'
import { disciplineEmoji } from '@/lib/disciplineEmoji'

const BLUE = '#0870E2'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

type DisciplineOption = { slug: string; label: string }

// Landing page for a freshly-authenticated user (typically a Google/Apple/
// Microsoft sign-up from the "School / Academy" tab on /register) who has no
// school yet. Password signups create the School in the same request as the
// account — an OAuth session has no such request to piggyback on, so this
// page + POST /api/onboarding/create-school fill that gap.
//
// Also doubles as the "add your disciplines" step for an owner who already
// has a School but zero disciplines set (created before this field became
// part of onboarding) — GET /api/onboarding/create-school reports which of
// the two states applies, and `disciplinesOnly` switches the form
// accordingly. A fully set-up owner is redirected straight to /dashboard.
export default function OnboardingSchoolPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [disciplinesOnly, setDisciplinesOnly] = useState(false)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [disciplineOptions, setDisciplineOptions] = useState<DisciplineOption[]>([])
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/onboarding/create-school').then(r => (r.ok ? r.json() : Promise.reject())),
      fetch('/api/disciplines').then(r => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([status, disciplinesRes]) => {
        setDisciplineOptions((disciplinesRes.disciplines ?? []).map((d: { name: string; slug: string }) => ({ slug: d.slug, label: d.name })))
        if (status.hasSchool && status.disciplineCount > 0) { router.replace('/dashboard'); return }
        setDisciplinesOnly(Boolean(status.hasSchool))
        setChecking(false)
      })
      .catch(() => router.replace('/login?redirect=/onboarding/school'))
  }, [router])

  function clearError(f: string) {
    setErrors(p => { const n = { ...p }; delete n[f]; return n })
  }

  function toggleDiscipline(slug: string) {
    setDisciplines(d => d.includes(slug) ? d.filter(s => s !== slug) : [...d, slug])
    clearError('disciplines')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    const e2: Record<string, string> = {}
    if (!disciplinesOnly) {
      if (!name.trim()) e2.name = 'School name is required.'
      if (!city.trim()) e2.city = 'City is required.'
      if (!country) e2.country = 'Country is required.'
    }
    if (disciplines.length === 0) e2.disciplines = 'Select at least one discipline.'
    setErrors(e2)
    if (Object.keys(e2).length > 0) return

    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/create-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disciplinesOnly ? { disciplines } : { name, city, country, disciplines }),
      })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong. Please try again.'); return }

      await fetch('/api/auth/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: data.schoolId }),
      })
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: BLUE, animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <Image src="/martial-logo.png" alt="Martial" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>
            {disciplinesOnly ? 'What do you teach?' : 'Tell us about your school'}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>One last step before you reach your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} noValidate
          style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!disciplinesOnly && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>School / academy name</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); clearError('name') }}
                  placeholder="Roger Gracie Málaga"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.name ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                />
                {errors.name && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.name}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>City</label>
                <input
                  value={city}
                  onChange={e => { setCity(e.target.value); clearError('city') }}
                  placeholder="Málaga"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.city ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
                />
                {errors.city && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.city}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Country</label>
                <select
                  value={country}
                  onChange={e => { setCountry(e.target.value); clearError('country') }}
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.country ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT, background: '#fff' }}
                >
                  <option value="">Select country…</option>
                  {COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                </select>
                {errors.country && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.country}</p>}
              </div>

              <div style={{ height: 1, background: BORDER, margin: '4px 0' }} />
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
              {disciplinesOnly ? 'Select all disciplines offered at your academy' : 'Disciplines'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {disciplineOptions.map(d => {
                const selected = disciplines.includes(d.slug)
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggleDiscipline(d.slug)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, textAlign: 'left',
                      border: `1.5px solid ${selected ? BLUE : BORDER}`, background: selected ? '#EFF6FF' : '#fff', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{disciplineEmoji(d.slug)}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: selected ? BLUE : TEXT, lineHeight: 1.2 }}>{d.label}</span>
                    {selected && <CheckCircle2 size={15} color={BLUE} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
            {errors.disciplines && <p style={{ margin: '8px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.disciplines}</p>}
          </div>

          {apiError && (
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{apiError}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: loading ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? (disciplinesOnly ? 'Saving…' : 'Creating your school…') : 'Continue to dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
