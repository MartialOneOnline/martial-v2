'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  CheckCircle2, ChevronRight, ChevronLeft, Building2,
  User, MapPin, Dumbbell, Image as ImageIcon, Loader2, AlertCircle,
} from 'lucide-react'

const BLUE = '#0870E2'

// ── Disciplines ───────────────────────────────────────────────────────────────
const DISCIPLINES = [
  { slug: 'bjj',        label: 'Brazilian Jiu-Jitsu', emoji: '🥋' },
  { slug: 'grappling',  label: 'Grappling / No-Gi',   emoji: '🤼' },
  { slug: 'mma',        label: 'MMA',                  emoji: '🥊' },
  { slug: 'muay-thai',  label: 'Muay Thai',            emoji: '🦵' },
  { slug: 'boxing',     label: 'Boxing',               emoji: '🥊' },
  { slug: 'wrestling',  label: 'Wrestling',            emoji: '🤸' },
  { slug: 'judo',       label: 'Judo',                 emoji: '🥋' },
  { slug: 'karate',     label: 'Karate',               emoji: '🥋' },
  { slug: 'kickboxing', label: 'Kickboxing',           emoji: '🦵' },
]

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 'welcome',     label: 'Welcome',     icon: CheckCircle2 },
  { id: 'account',     label: 'Account',     icon: User },
  { id: 'school',      label: 'School Info', icon: Building2 },
  { id: 'location',    label: 'Location',    icon: MapPin },
  { id: 'disciplines', label: 'Disciplines', icon: Dumbbell },
  { id: 'profile',     label: 'Profile',     icon: ImageIcon },
]

type FormData = {
  // account
  ownerName: string
  email: string
  password: string
  passwordConfirm: string
  // school
  schoolName: string
  phone: string
  website: string
  instagram: string
  facebook: string
  // location
  address: string
  postcode: string
  city: string
  country: string
  // disciplines
  disciplines: string[]
  // profile
  description: string
  tagline: string
}

function OnboardingPageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token')

  const [step, setStep]           = useState(0)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)
  const [schoolSlug, setSchoolSlug] = useState('')

  const [invitation, setInvitation] = useState<any>(null)
  const [form, setForm] = useState<FormData>({
    ownerName: '', email: '', password: '', passwordConfirm: '',
    schoolName: '', phone: '', website: '', instagram: '', facebook: '',
    address: '', postcode: '', city: '', country: '',
    disciplines: [],
    description: '', tagline: '',
  })

  // Validate token on load
  useEffect(() => {
    if (!token) { setError('No invitation token found.'); setLoading(false); return }
    fetch(`/api/onboarding/validate?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setInvitation(data)
        setForm(f => ({
          ...f,
          email: data.email || '',
          schoolName: data.name || '',
          phone: data.phone || '',
          city: data.city || '',
          country: data.country || '',
          website: data.website || '',
        }))
        setLoading(false)
      })
      .catch(() => { setError('Failed to validate invitation.'); setLoading(false) })
  }, [token])

  function set(key: keyof FormData, val: any) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function toggleDiscipline(slug: string) {
    setForm(f => ({
      ...f,
      disciplines: f.disciplines.includes(slug)
        ? f.disciplines.filter(d => d !== slug)
        : [...f.disciplines, slug],
    }))
  }

  function canNext(): boolean {
    const s = STEPS[step]?.id
    if (s === 'welcome') return true
    if (s === 'account') return !!(form.ownerName && form.email && form.password.length >= 8 && form.password === form.passwordConfirm)
    if (s === 'school') return !!form.schoolName
    if (s === 'location') return !!(form.city && form.country)
    if (s === 'disciplines') return form.disciplines.length > 0
    return true
  }

  async function handleSubmit() {
    setSubmitting(true)
    const res = await fetch('/api/onboarding/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error || 'Registration failed'); return }
    setSchoolSlug(data.schoolSlug)
    setDone(true)
  }

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F9FAFB' }}>
      <Loader2 className="w-8 h-8 animate-spin text-[#0870E2]" />
    </div>
  )

  if (error && !invitation) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F9FAFB' }}>
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[#101828] mb-2">Invalid Invitation</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  // ── Done ───────────────────────────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F9FAFB' }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: '#EFF9F4' }}>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#101828] mb-2">You're all set! 🎉</h2>
        <p className="text-gray-500 text-sm mb-6">Your academy is live on Martial. Log in to your dashboard to complete your profile and start managing your school.</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full h-12 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          style={{ background: BLUE }}
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  )

  const totalSteps = STEPS.length
  const progress = Math.round((step / (totalSteps - 1)) * 100)
  const currentStep = STEPS[step]!

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>

      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Martial" width={28} height={28} />
          <span className="font-bold text-[#101828]">Martial</span>
        </div>
        <span className="text-xs text-gray-400 font-medium">Step {step + 1} of {totalSteps}</span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: BLUE }} />
      </div>

      <div className="flex-1 flex items-start justify-center px-4 py-8 md:py-14">
        <div className="w-full max-w-lg">

          {/* Step indicators */}
          <div className="flex items-center justify-between mb-8 overflow-x-auto gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i < step
              const active = i === step
              return (
                <div key={s.id} className="flex flex-col items-center gap-1 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done ? 'bg-emerald-500' : active ? 'text-white' : 'bg-gray-100'
                  }`} style={active ? { background: BLUE } : undefined}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                    }
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${active ? 'text-[#0870E2]' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">

            {/* ── Step 0: Welcome ── */}
            {step === 0 && (
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: '#EFF6FF' }}>
                  <Building2 className="w-8 h-8" style={{ color: BLUE }} />
                </div>
                <h1 className="text-2xl font-bold text-[#101828] mb-2">Welcome, {invitation?.name}! 👋</h1>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  You've been invited to join <strong>Martial</strong> — the platform that helps martial arts academies manage their school, members, and bookings in one place.
                  <br /><br />
                  This will take about <strong>3 minutes</strong>.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[['🗓', 'Timetable'], ['👥', 'Members'], ['💳', 'Payments']].map(([emoji, label]) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div className="text-xs font-semibold text-gray-600">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 1: Account ── */}
            {step === 1 && (
              <div>
                <h2 className="text-xl font-bold text-[#101828] mb-1">Create your account</h2>
                <p className="text-sm text-gray-500 mb-5">This will be your personal login for the dashboard.</p>
                <div className="space-y-4">
                  <Field label="Your Name" value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Pablo Cabo" />
                  <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="pablo@rogergraciemalaga.com" />
                  <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder="Min 8 characters" hint={form.password.length > 0 && form.password.length < 8 ? 'At least 8 characters required' : undefined} />
                  <Field label="Confirm Password" type="password" value={form.passwordConfirm} onChange={v => set('passwordConfirm', v)} placeholder="Repeat password" hint={form.passwordConfirm && form.password !== form.passwordConfirm ? "Passwords don't match" : undefined} />
                </div>
              </div>
            )}

            {/* ── Step 2: School Info ── */}
            {step === 2 && (
              <div>
                <h2 className="text-xl font-bold text-[#101828] mb-1">School information</h2>
                <p className="text-sm text-gray-500 mb-5">Basic details about your academy.</p>
                <div className="space-y-4">
                  <Field label="Academy Name" value={form.schoolName} onChange={v => set('schoolName', v)} placeholder="Roger Gracie Málaga" required />
                  <Field label="Phone" type="tel" value={form.phone} onChange={v => set('phone', v)} placeholder="+34 600 000 000" />
                  <Field label="Website" type="url" value={form.website} onChange={v => set('website', v)} placeholder="https://rogergraciemalaga.com" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Instagram" value={form.instagram} onChange={v => set('instagram', v)} placeholder="@rogergraciemalaga" />
                    <Field label="Facebook" value={form.facebook} onChange={v => set('facebook', v)} placeholder="rogergraciemalaga" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Location ── */}
            {step === 3 && (
              <div>
                <h2 className="text-xl font-bold text-[#101828] mb-1">Location</h2>
                <p className="text-sm text-gray-500 mb-5">Where is your academy located?</p>
                <div className="space-y-4">
                  <Field label="Street Address" value={form.address} onChange={v => set('address', v)} placeholder="Calle Polifemo, 3" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="City" value={form.city} onChange={v => set('city', v)} placeholder="Málaga" required />
                    <Field label="Postcode" value={form.postcode} onChange={v => set('postcode', v)} placeholder="29004" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#101828] mb-1.5">Country <span className="text-red-400">*</span></label>
                    <select
                      value={form.country}
                      onChange={e => set('country', e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:border-[#0870E2]"
                    >
                      <option value="">Select country…</option>
                      {[['ES','Spain'],['GB','United Kingdom'],['FR','France'],['DE','Germany'],['IT','Italy'],['PT','Portugal'],['NL','Netherlands'],['BE','Belgium'],['SE','Sweden'],['NO','Norway'],['DK','Denmark'],['IE','Ireland'],['CH','Switzerland'],['AT','Austria'],['PL','Poland'],['GR','Greece'],['TR','Turkey'],['AE','UAE'],['US','United States'],['AU','Australia'],['BR','Brazil']].map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 4: Disciplines ── */}
            {step === 4 && (
              <div>
                <h2 className="text-xl font-bold text-[#101828] mb-1">What do you teach?</h2>
                <p className="text-sm text-gray-500 mb-5">Select all disciplines offered at your academy.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DISCIPLINES.map(d => {
                    const selected = form.disciplines.includes(d.slug)
                    return (
                      <button
                        key={d.slug}
                        onClick={() => toggleDiscipline(d.slug)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                          selected ? 'border-[#0870E2] bg-[#EFF6FF]' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl">{d.emoji}</span>
                        <span className={`text-xs font-semibold leading-tight ${selected ? 'text-[#0870E2]' : 'text-[#101828]'}`}>{d.label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-[#0870E2] ml-auto shrink-0" />}
                      </button>
                    )
                  })}
                </div>
                {form.disciplines.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">Select at least one discipline</p>
                )}
              </div>
            )}

            {/* ── Step 5: Profile ── */}
            {step === 5 && (
              <div>
                <h2 className="text-xl font-bold text-[#101828] mb-1">Your profile</h2>
                <p className="text-sm text-gray-500 mb-5">Help students discover your academy. You can update this later.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#101828] mb-1.5">Tagline <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      value={form.tagline}
                      onChange={e => set('tagline', e.target.value)}
                      placeholder="e.g. Elite BJJ training in the heart of Málaga"
                      maxLength={100}
                      className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#101828] mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea
                      value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Tell students about your academy, your team, your philosophy…"
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] resize-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className={`flex gap-3 mt-7 ${step === 0 ? 'justify-center' : 'justify-between'}`}>
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 h-11 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step < totalSteps - 1 ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className={`flex items-center gap-1.5 h-11 px-6 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 ${step === 0 ? 'w-full justify-center' : ''}`}
                  style={{ background: BLUE }}
                >
                  {step === 0 ? "Let's get started" : 'Continue'} <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 h-11 px-6 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ background: '#10B981' }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? 'Creating your academy…' : 'Complete Registration'}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" /></div>}>
      <OnboardingPageInner />
    </Suspense>
  )
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = 'text', required, hint }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#101828] mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10"
      />
      {hint && <p className="text-xs text-red-500 mt-1">{hint}</p>}
    </div>
  )
}
