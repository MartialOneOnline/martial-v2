'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { myFetch } from '@/lib/api/myFetch'
import { PhoneField } from '@/components/PhoneField'
import { calculateAge, MIN_CONSENT_AGE } from '@/lib/age'

const BLUE = '#0870E2'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

// Landing page for a freshly-confirmed (or returning, still-incomplete)
// student — registration itself only ever collects name/email/password (see
// app/api/auth/register/route.ts), so this is where the rest of the basic
// profile (photo, phone, date of birth) actually gets filled in. Gated from
// app/my/layout.tsx: any student missing one of these three fields is sent
// here instead of /my, on every login, until all three are set.
export default function CompleteProfilePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianContact, setGuardianContact] = useState('')
  const [guardianConsent, setGuardianConsent] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    myFetch('/api/my')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => {
        const u = d.user
        const isMinor = u.dateOfBirth && calculateAge(u.dateOfBirth) < MIN_CONSENT_AGE
        const guardianDone = !isMinor || (u.guardianName && u.guardianContact && u.guardianConsentAt)
        if (u.phone && u.dateOfBirth && u.avatarUrl && guardianDone) { router.replace('/my'); return }
        setName(u.name ?? '')
        setEmail(u.email ?? '')
        setAvatarUrl(u.avatarUrl ?? '')
        setPhone(u.phone ?? '')
        setDateOfBirth(u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '')
        setGuardianName(u.guardianName ?? '')
        setGuardianContact(u.guardianContact ?? '')
        setGuardianConsent(Boolean(u.guardianConsentAt))
        setChecking(false)
      })
      .catch(() => router.replace('/login?redirect=/complete-profile'))
  }, [router])

  function clearError(f: string) {
    setErrors(p => { const n = { ...p }; delete n[f]; return n })
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await myFetch('/api/my/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setApiError(data.error ?? 'Something went wrong uploading your photo. Please try again.'); return }

      await myFetch('/api/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: data.url }),
      })
      setAvatarUrl(data.url)
      clearError('avatarUrl')
    } catch (err) {
      console.error('[avatar upload]', err)
      setApiError('Something went wrong uploading your photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const age = dateOfBirth ? calculateAge(dateOfBirth) : null
  const isMinor = age !== null && age < MIN_CONSENT_AGE

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    const e2: Record<string, string> = {}
    if (!avatarUrl) e2.avatarUrl = 'Add a profile photo to continue.'
    if (!phone.trim()) e2.phone = 'Phone number is required.'
    else if (!isValidPhoneNumber(phone)) e2.phone = 'Enter a valid phone number.'
    if (!dateOfBirth) e2.dateOfBirth = 'Date of birth is required.'
    else {
      const dob = new Date(dateOfBirth)
      if (dob > new Date()) e2.dateOfBirth = "Date of birth can't be in the future."
      else if (calculateAge(dob) > 120) e2.dateOfBirth = 'Enter a valid date of birth.'
    }
    if (isMinor) {
      if (!guardianName.trim()) e2.guardianName = "A parent or guardian's name is required."
      if (!guardianContact.trim()) e2.guardianContact = "A parent or guardian's phone or email is required."
      if (!guardianConsent) e2.guardianConsent = 'A parent or guardian must confirm this before continuing.'
    }
    setErrors(e2)
    if (Object.keys(e2).length > 0) return

    setSaving(true)
    try {
      const res = await myFetch('/api/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone, dateOfBirth,
          ...(isMinor && { guardianName, guardianContact, guardianConsent: true }),
        }),
      })
      if (!res.ok) { setApiError('Something went wrong. Please try again.'); return }
      router.push('/my')
    } finally {
      setSaving(false)
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

  const initials = (name || email || 'U').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <Image src="/martial-logo.png" alt="Martial" width={56} height={56} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: TEXT }}>Complete your profile</h1>
          <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
            {name ? `Just a few more details, ${name.split(' ')[0]} — this helps your school reach you.` : 'Just a few more details to get started.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate
          style={{ background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700, background: '#EFF6FF', color: BLUE }}>
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: '#fff', border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.18)' }}>
                {uploading
                  ? <Loader2 size={12} className="animate-spin" style={{ color: BLUE }} />
                  : <Camera size={12} style={{ color: MUTED }} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f) }} />
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: errors.avatarUrl ? '#DC2626' : MUTED }}>
              {errors.avatarUrl || 'Add a profile photo'}
            </p>
          </div>

          <PhoneField label="Phone" value={phone}
            onChange={v => { setPhone(v); clearError('phone') }} error={errors.phone} placeholder="600 000 000" />

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => { setDateOfBirth(e.target.value); clearError('dateOfBirth') }}
              style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.dateOfBirth ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
            />
            {errors.dateOfBirth && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.dateOfBirth}</p>}
          </div>

          {isMinor && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 14, borderRadius: 12, background: '#F9FAFB', border: `1px solid ${BORDER}` }}>
              <p style={{ margin: 0, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
                Since you're under {MIN_CONSENT_AGE}, we need a parent or guardian's details and confirmation before you can continue.
              </p>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Parent or guardian's name</label>
                <input
                  value={guardianName}
                  onChange={e => { setGuardianName(e.target.value); clearError('guardianName') }}
                  placeholder="Jane Doe"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.guardianName ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT, background: '#fff' }}
                />
                {errors.guardianName && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.guardianName}</p>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Parent or guardian's phone or email</label>
                <input
                  value={guardianContact}
                  onChange={e => { setGuardianContact(e.target.value); clearError('guardianContact') }}
                  placeholder="+34 600 000 000 or jane@email.com"
                  style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.guardianContact ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT, background: '#fff' }}
                />
                {errors.guardianContact && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.guardianContact}</p>}
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: TEXT, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={guardianConsent}
                  onChange={e => { setGuardianConsent(e.target.checked); clearError('guardianConsent') }}
                  style={{ marginTop: 2 }}
                />
                <span>I confirm I'm this student's parent or legal guardian, and I consent to them using Martial.</span>
              </label>
              {errors.guardianConsent && <p style={{ margin: 0, fontSize: 12, color: '#DC2626' }}>{errors.guardianConsent}</p>}
            </div>
          )}

          {apiError && (
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8 }}>{apiError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: saving ? '#93C5FD' : BLUE, color: '#fff', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Saving…' : 'Continue to Martial'}
          </button>
        </form>
      </div>
    </div>
  )
}
