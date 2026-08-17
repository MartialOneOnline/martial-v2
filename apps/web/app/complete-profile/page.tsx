'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { myFetch } from '@/lib/api/myFetch'

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
        if (u.phone && u.dateOfBirth && u.avatarUrl) { router.replace('/my'); return }
        setName(u.name ?? '')
        setEmail(u.email ?? '')
        setAvatarUrl(u.avatarUrl ?? '')
        setPhone(u.phone ?? '')
        setDateOfBirth(u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '')
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
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await myFetch('/api/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl: publicUrl }),
      })
      setAvatarUrl(publicUrl)
      clearError('avatarUrl')
    } catch (err) {
      console.error('[avatar upload]', err)
      setApiError('Something went wrong uploading your photo. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')
    const e2: Record<string, string> = {}
    if (!avatarUrl) e2.avatarUrl = 'Add a profile photo to continue.'
    if (!phone.trim()) e2.phone = 'Phone number is required.'
    if (!dateOfBirth) e2.dateOfBirth = 'Date of birth is required.'
    else if (new Date(dateOfBirth) > new Date()) e2.dateOfBirth = 'Date of birth can\'t be in the future.'
    setErrors(e2)
    if (Object.keys(e2).length > 0) return

    setSaving(true)
    try {
      const res = await myFetch('/api/my', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, dateOfBirth }),
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

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); clearError('phone') }}
              placeholder="+34 600 000 000"
              style={{ width: '100%', padding: '11px 14px', fontSize: 15, border: `1px solid ${errors.phone ? '#DC2626' : BORDER}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box', color: TEXT }}
            />
            {errors.phone && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{errors.phone}</p>}
          </div>

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
