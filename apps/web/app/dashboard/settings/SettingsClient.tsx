'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Bell, Menu, X, Check, Upload, Eye, EyeOff, Plus, Minus,
  User, Building2, Users2, Wallet, GraduationCap,
  Lock, Trash2, AlertTriangle,
  Globe, Phone, Mail, MapPin, Zap, RefreshCw, Clock,
  ChevronDown, ChevronRight, CreditCard, Award, Calendar, LogOut, Users, ArrowRight,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'

// ── Shared styles ─────────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E5E7EB', borderRadius: 10,
  padding: '10px 14px', fontSize: 14, color: '#111827',
  background: '#fff', outline: 'none', boxSizing: 'border-box',
}
const LBL: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
}
const SECTION_TITLE: React.CSSProperties = {
  fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 4px',
}
const SECTION_SUB: React.CSSProperties = {
  fontSize: 13, color: '#6B7280', margin: '0 0 20px',
}
const DIVIDER: React.CSSProperties = {
  border: 'none', borderTop: '1px solid #F3F4F6', margin: '24px 0',
}

function SaveToast({ show, text = 'Changes saved' }: { show: boolean; text?: string }) {
  if (!show) return null
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{text}</p>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', flexShrink: 0,
      background: value ? '#0870E2' : '#D1D5DB', transition: 'background 0.2s',
      padding: 0, cursor: 'pointer', position: 'relative',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: 10, background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
      <div className="flex-1 min-w-0 pr-6">
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{description}</p>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

function Stepper({ value, unit, min = 0, max = 999, onChange }: {
  value: number; unit: string; min?: number; max?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1" style={{ border: '1.5px solid #E5E7EB', borderRadius: 10, padding: '2px', background: '#F9FAFB' }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: value <= min ? 'not-allowed' : 'pointer', color: value <= min ? '#D1D5DB' : '#374151', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Minus size={13} />
      </button>
      <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', minWidth: 56, textAlign: 'center' }}>
        {value} <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280' }}>{unit}</span>
      </span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: value >= max ? 'not-allowed' : 'pointer', color: value >= max ? '#D1D5DB' : '#374151', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Plus size={13} />
      </button>
    </div>
  )
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', avatarUrl: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/profile').then(r => r.json()).then(d => {
      if (d.profile) setForm({ name: d.profile.name ?? '', email: d.profile.email ?? '', phone: d.profile.phone ?? '', avatarUrl: d.profile.avatarUrl ?? '' })
    }).finally(() => setLoading(false))
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/dashboard/upload?bucket=avatars', { method: 'POST', body: fd })
    if (!res.ok) { setError('Upload failed'); setUploading(false); return }
    const { url } = await res.json()
    await fetch('/api/dashboard/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatarUrl: url }) })
    setForm(p => ({ ...p, avatarUrl: url }))
    setUploading(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function save() {
    setSaving(true); setError('')
    const res = await fetch('/api/dashboard/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, phone: form.phone }) })
    setSaving(false)
    if (!res.ok) { setError('Error saving profile'); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  const initials = (form.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (loading) return <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 600 }}>
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#0870E2,#7DE7EC)' }}>
            {uploading
              ? <RefreshCw size={22} style={{ color: '#fff' }} className="animate-spin" />
              : form.avatarUrl
                ? <img src={form.avatarUrl} alt={form.name} className="w-full h-full object-cover" />
                : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{initials}</span>
            }
          </div>
          <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: '#0870E2', border: '2px solid #fff' }}>
            <Upload size={11} style={{ color: '#fff' }} />
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{form.name || '—'}</p>
          <p style={{ fontSize: 13, color: '#6B7280' }}>{form.email}</p>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Click the button to change photo</p>
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Basic info */}
      <div>
        <p style={SECTION_TITLE}>Personal information</p>
        <p style={SECTION_SUB}>Your name and contact details</p>
        <div className="flex flex-col gap-4">
          <div>
            <label style={LBL}>Full name</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} style={INP} />
          </div>
          <div>
            <label style={LBL}>Email address</label>
            <input type="email" value={form.email} disabled style={{ ...INP, background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Email cannot be changed here</p>
          </div>
          <div>
            <label style={LBL}>Phone number</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={INP} placeholder="+34 600 000 000" />
          </div>
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#E11D48' }}>{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <SaveToast show={saved} text="Profile saved" />
    </div>
  )
}

// ── School Tab ────────────────────────────────────────────────────────────────
const LANGS = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
]

function SchoolTab() {
  const [form, setForm] = useState({
    name: '', tagline: '', description: '',
    address: '', city: '', country: '', postcode: '',
    phone: '', email: '', website: '',
    instagram: '', facebook: '', youtube: '', tiktok: '',
    logoUrl: '', language: 'en',
  })
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')
  const [uploading,  setUploading]  = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/school').then(r => r.json()).then(d => {
      if (d.school) setForm({
        name:        d.school.name        ?? '',
        tagline:     d.school.tagline     ?? '',
        description: d.school.description ?? '',
        address:     d.school.address     ?? '',
        city:        d.school.city        ?? '',
        country:     d.school.country     ?? '',
        postcode:    d.school.postcode    ?? '',
        phone:       d.school.phone       ?? '',
        email:       d.school.email       ?? '',
        website:     d.school.website     ?? '',
        instagram:   d.school.instagram   ?? '',
        facebook:    d.school.facebook    ?? '',
        youtube:     d.school.youtube     ?? '',
        tiktok:      d.school.tiktok      ?? '',
        logoUrl:     d.school.logoUrl     ?? '',
        language:    d.school.language    ?? 'en',
      })
    }).finally(() => setLoading(false))
  }, [])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/dashboard/upload?bucket=avatars', { method: 'POST', body: fd })
    if (!res.ok) { setError('Upload failed'); setUploading(false); return }
    const { url } = await res.json()
    await fetch('/api/dashboard/school', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logoUrl: url }) })
    setForm(p => ({ ...p, logoUrl: url }))
    setUploading(false); setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  async function save() {
    setSaving(true); setError('')
    const res = await fetch('/api/dashboard/school', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { setError('Error saving'); return }
    setSaved(true); setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 680 }}>

      {/* Identity */}
      <div>
        <p style={SECTION_TITLE}>Identity</p>
        <p style={SECTION_SUB}>Your academy name, logo and description</p>
        <div className="flex items-start gap-5 mb-5">
          <div className="shrink-0">
            <label style={LBL}>Logo</label>
            <label className="block relative cursor-pointer group" style={{ width: 72, height: 72 }}>
              <div className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
                style={{ background: '#F3F4F6', border: '2px dashed #D1D5DB' }}>
                {uploading
                  ? <RefreshCw size={20} style={{ color: '#9CA3AF' }} className="animate-spin" />
                  : form.logoUrl
                    ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover" />
                    : <Upload size={20} style={{ color: '#9CA3AF' }} />
                }
              </div>
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.35)' }}>
                <Upload size={16} style={{ color: '#fff' }} />
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
            </label>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'center', maxWidth: 72 }}>Click to upload</p>
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div>
              <label style={LBL}>Academy name</label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Tagline</label>
              <input type="text" value={form.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Elite BJJ in the heart of Málaga" style={INP} />
            </div>
          </div>
        </div>
        <div>
          <label style={LBL}>Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)}
            style={{ ...INP, resize: 'vertical', lineHeight: 1.6 }} />
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Address */}
      <div>
        <p style={SECTION_TITLE}>Address</p>
        <p style={SECTION_SUB}>Where your academy is located</p>
        <div className="flex flex-col gap-4">
          <div>
            <label style={LBL}>Street address</label>
            <input type="text" value={form.address} onChange={e => set('address', e.target.value)} style={INP} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={LBL}>City</label>
              <input type="text" value={form.city} onChange={e => set('city', e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Country</label>
              <input type="text" value={form.country} onChange={e => set('country', e.target.value)} placeholder="ES" style={INP} />
            </div>
            <div>
              <label style={LBL}>Postal code</label>
              <input type="text" value={form.postcode} onChange={e => set('postcode', e.target.value)} style={INP} />
            </div>
          </div>
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Contact */}
      <div>
        <p style={SECTION_TITLE}>Contact</p>
        <p style={SECTION_SUB}>How members and potential students reach you</p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={LBL}>Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} style={INP} />
            </div>
            <div>
              <label style={LBL}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={INP} />
            </div>
          </div>
          <div>
            <label style={LBL}>Website</label>
            <input type="url" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://" style={INP} />
          </div>
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Social */}
      <div>
        <p style={SECTION_TITLE}>Social links</p>
        <p style={SECTION_SUB}>Connect your social media profiles</p>
        <div className="flex flex-col gap-4">
          {([
            { key: 'instagram', label: 'Instagram', placeholder: '@youracademy' },
            { key: 'facebook',  label: 'Facebook',  placeholder: 'facebook.com/youracademy' },
            { key: 'youtube',   label: 'YouTube',   placeholder: 'youtube.com/@youracademy' },
            { key: 'tiktok',    label: 'TikTok',    placeholder: '@youracademy' },
          ] as const).map(s => (
            <div key={s.key}>
              <label style={LBL}>{s.label}</label>
              <input type="text" value={form[s.key]} onChange={e => set(s.key, e.target.value)}
                placeholder={s.placeholder} style={INP} />
            </div>
          ))}
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Language */}
      <div>
        <p style={SECTION_TITLE}>Communications language</p>
        <p style={SECTION_SUB}>Language used in emails sent to your members</p>
        <div className="grid grid-cols-2 gap-3" style={{ maxWidth: 360 }}>
          {LANGS.map(l => (
            <button key={l.value} onClick={() => set('language', l.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${form.language === l.value ? '#0870E2' : '#E5E7EB'}`,
                background: form.language === l.value ? '#EFF6FF' : '#fff' }}>
              <span style={{ fontSize: 20 }}>{l.flag}</span>
              <span style={{ fontSize: 13, fontWeight: form.language === l.value ? 600 : 400, color: form.language === l.value ? '#0870E2' : '#374151' }}>{l.label}</span>
              {form.language === l.value && (
                <span style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: '#0870E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: 13, color: '#E11D48' }}>{error}</p>}

      <div>
        <button onClick={save} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <SaveToast show={saved} text="School settings saved" />
    </div>
  )
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────
function StaffTab() {
  const MOCK_STAFF = [
    { name: 'Jorge Sanchez', role: 'Head Instructor', belt: 'Black',  status: 'Active',   avatar: '' },
    { name: 'Ana Díaz',      role: 'Instructor',      belt: 'Brown',  status: 'Active',   avatar: '' },
    { name: 'Roberto Flores',role: 'Assistant',        belt: 'Blue',   status: 'Active',   avatar: '' },
    { name: 'María López',   role: 'Admin',            belt: 'White',  status: 'Active',   avatar: '' },
    { name: 'Pavel Kowalski',role: 'Instructor',       belt: 'Purple', status: 'On Leave', avatar: '' },
  ]
  const BELT_COLOR: Record<string, string> = { Black: '#111827', Brown: '#92400E', Blue: '#1D4ED8', Purple: '#6D28D9', White: '#374151' }
  const ROLE_COLOR: Record<string, string> = { 'Head Instructor': '#DC2626', Instructor: '#0870E2', Assistant: '#7C3AED', Admin: '#16A34A' }

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 680 }}>
      <div>
        <p style={SECTION_TITLE}>Active staff</p>
        <p style={SECTION_SUB}>Quick overview of your team</p>
        <div className="flex flex-col" style={{ border: '1.5px solid #E5E7EB', borderRadius: 14, overflow: 'hidden' }}>
          {MOCK_STAFF.map((s, i) => {
            const initials = s.name.split(' ').map(w => w[0]).join('').slice(0, 2)
            return (
              <div key={s.name} className="flex items-center gap-4 px-5 py-3.5"
                style={{ borderBottom: i < MOCK_STAFF.length - 1 ? '1px solid #F3F4F6' : 'none', background: '#fff' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                  {initials}
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1 }}>{s.name}</p>
                <span style={{ fontSize: 12, fontWeight: 600, color: ROLE_COLOR[s.role] ?? '#374151', minWidth: 110 }}>{s.role}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: BELT_COLOR[s.belt] ?? '#374151', minWidth: 60 }}>{s.belt}</span>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                  background: s.status === 'Active' ? '#F0FDF4' : '#FFFBEB',
                  color: s.status === 'Active' ? '#16A34A' : '#D97706',
                  border: '1px solid ' + (s.status === 'Active' ? '#BBF7D0' : '#FDE68A') }}>
                  {s.status}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="p-5 rounded-2xl flex items-center justify-between" style={{ background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', margin: 0 }}>Need to add or manage staff?</p>
          <p style={{ fontSize: 13, color: '#3B82F6', marginTop: 2 }}>Go to School → Staff for full management, roles and permissions.</p>
        </div>
        <a href="/dashboard/school/staff" style={{ padding: '9px 18px', borderRadius: 10, background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Go to Staff →
        </a>
      </div>
    </div>
  )
}

// ── Payments Tab ──────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'CASH',          label: 'Cash',          description: 'Accept cash payments in person' },
  { key: 'STRIPE',        label: 'Stripe',         description: 'Online card payments via Stripe' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer',  description: 'Direct bank / SEPA transfers' },
  { key: 'DIRECT_DEBIT',  label: 'Direct Debit',   description: 'Recurring SEPA direct debits' },
  { key: 'PAYPAL',        label: 'PayPal',          description: 'Payments via PayPal' },
  { key: 'OTHER',         label: 'Other',           description: 'Any other payment method' },
] as const

function PaymentsTab() {
  const [acceptedMethods, setAcceptedMethods] = useState<string[]>(['CASH', 'STRIPE', 'BANK_TRANSFER'])
  const [autoCharge,    setAutoCharge]    = useState(true)
  const [invoiceEmails, setInvoiceEmails] = useState(true)
  const [receiptEmails, setReceiptEmails] = useState(true)
  const [failedAlerts,  setFailedAlerts]  = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/school').then(r => r.json()).then(d => {
      const s = d.school?.defaultBookingSettings
      if (s?.acceptedMethods?.length) setAcceptedMethods(s.acceptedMethods)
    })
  }, [])

  function toggleMethod(key: string) {
    setAcceptedMethods(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key])
  }

  async function save() {
    await fetch('/api/dashboard/school', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ defaultBookingSettings: { acceptedMethods } }) })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 600 }}>

      {/* Stripe */}
      <div>
        <p style={SECTION_TITLE}>Payment processor</p>
        <p style={SECTION_SUB}>Connect Stripe to accept online card payments</p>
        <div className="flex items-center justify-between p-5 rounded-2xl" style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0F0FF' }}>
              <CreditCard size={18} style={{ color: '#635BFF' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Stripe</p>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>✓ Connected</span>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Live mode · acct_1P2a···3f8x</p>
            </div>
          </div>
          <button style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Disconnect
          </button>
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Accepted methods */}
      <div>
        <p style={SECTION_TITLE}>Accepted payment methods</p>
        <p style={SECTION_SUB}>Choose which methods your school accepts from members</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map(m => {
            const active = acceptedMethods.includes(m.key)
            return (
              <button key={m.key} onClick={() => toggleMethod(m.key)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 16px', borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  border: `1.5px solid ${active ? '#0870E2' : '#E5E7EB'}`,
                  background: active ? '#EFF6FF' : '#F9FAFB',
                  color: active ? '#0870E2' : '#6B7280' }}>
                {active && <Check size={11} strokeWidth={3} style={{ color: '#0870E2' }} />}
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Automation */}
      <div>
        <p style={SECTION_TITLE}>Automation</p>
        <p style={SECTION_SUB}>Configure automatic payment actions</p>
        <ToggleRow label="Auto-charge on billing date" description="Automatically charge members on their renewal date via Stripe" value={autoCharge} onChange={setAutoCharge} />
        <ToggleRow label="Send invoice emails" description="Email members a PDF invoice before each billing cycle" value={invoiceEmails} onChange={setInvoiceEmails} />
        <ToggleRow label="Send payment receipts" description="Email a receipt to members after each successful payment" value={receiptEmails} onChange={setReceiptEmails} />
        <ToggleRow label="Failed payment alerts" description="Notify admin and member when a payment fails" value={failedAlerts} onChange={setFailedAlerts} />
      </div>

      <div>
        <button onClick={save}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Save changes
        </button>
      </div>

      <SaveToast show={saved} text="Payment settings saved" />
    </div>
  )
}

// ── Grading Tab ───────────────────────────────────────────────────────────────
function GradingTab() {
  const [whiteToBlue,   setWhiteToBlue]   = useState(12)
  const [blueToPurple,  setBlueToPurple]  = useState(24)
  const [purpleToBrown, setPurpleToBrown] = useState(36)
  const [brownToBlack,  setBrownToBlack]  = useState(48)
  const [requireApproval,  setRequireApproval]  = useState(true)
  const [minAttendance,    setMinAttendance]     = useState(75)
  const [notifyStudent,    setNotifyStudent]     = useState(true)
  const [notifyInstructor, setNotifyInstructor]  = useState(true)
  const [gradingFee,       setGradingFee]        = useState(0)
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const belts = [
    { label: 'White → Blue',   dot: '#2563EB', value: whiteToBlue,   onChange: setWhiteToBlue   },
    { label: 'Blue → Purple',  dot: '#7C3AED', value: blueToPurple,  onChange: setBlueToPurple  },
    { label: 'Purple → Brown', dot: '#92400E', value: purpleToBrown, onChange: setPurpleToBrown },
    { label: 'Brown → Black',  dot: '#111827', value: brownToBlack,  onChange: setBrownToBlack  },
  ]

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 600 }}>

      {/* Link to full Gradings module */}
      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', margin: 0 }}>Grading events &amp; results</p>
          <p style={{ fontSize: 13, color: '#3B82F6', marginTop: 2 }}>Schedule events, record promotions and view history in the Gradings module.</p>
        </div>
        <a href="/dashboard/school/gradings"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Go to Gradings <ArrowRight size={13} />
        </a>
      </div>

      {/* Belt progression */}
      <div>
        <p style={SECTION_TITLE}>Belt progression</p>
        <p style={SECTION_SUB}>Minimum months at each belt before promotion</p>
        <div className="flex flex-col">
          {belts.map(b => (
            <div key={b.label} className="flex items-center justify-between py-3"
              style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.dot }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>{b.label}</p>
              </div>
              <Stepper value={b.value} unit="mo" min={1} max={120} onChange={b.onChange} />
            </div>
          ))}
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Promotion rules */}
      <div>
        <p style={SECTION_TITLE}>Promotion rules</p>
        <p style={SECTION_SUB}>Requirements before a student can be promoted</p>
        <ToggleRow label="Require instructor approval" description="An instructor must manually approve each promotion" value={requireApproval} onChange={setRequireApproval} />
        <div className="flex items-center justify-between py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>Minimum attendance rate</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Student must have attended at least this % of classes</p>
          </div>
          <Stepper value={minAttendance} unit="%" min={0} max={100} onChange={setMinAttendance} />
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Grading fee */}
      <div>
        <p style={SECTION_TITLE}>Grading fee</p>
        <p style={SECTION_SUB}>Default amount charged per student per grading event (0 = free)</p>
        <Stepper value={gradingFee} unit="€" min={0} max={500} onChange={setGradingFee} />
      </div>

      <hr style={DIVIDER} />

      {/* Notifications */}
      <div>
        <p style={SECTION_TITLE}>Notifications</p>
        <p style={SECTION_SUB}>Who gets notified for gradings and promotions</p>
        <ToggleRow label="Notify student on promotion" description="Send an email when a student is promoted" value={notifyStudent} onChange={setNotifyStudent} />
        <ToggleRow label="Notify instructor" description="Send a summary to the instructor after each grading" value={notifyInstructor} onChange={setNotifyInstructor} />
      </div>

      <div>
        <button onClick={save}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Save changes
        </button>
      </div>

      <SaveToast show={saved} text="Grading settings saved" />
    </div>
  )
}

// ── Password Tab ──────────────────────────────────────────────────────────────
function PasswordTab() {
  const [current,  setCurrent]  = useState('')
  const [newPwd,   setNewPwd]   = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showC, setShowC] = useState(false)
  const [showN, setShowN] = useState(false)
  const [showF, setShowF] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!current || !newPwd || !confirm) { setError('Fill in all fields'); return }
    if (newPwd !== confirm) { setError('Passwords do not match'); return }
    if (newPwd.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    // Supabase password update via client SDK would go here
    setSaved(true); setTimeout(() => setSaved(false), 2500)
    setCurrent(''); setNewPwd(''); setConfirm('')
  }

  const PwdField = ({ label, value, onChange, show, setShow }: { label: string; value: string; onChange: (v: string) => void; show: boolean; setShow: (v: boolean) => void }) => (
    <div>
      <label style={LBL}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
          placeholder="••••••••" style={{ ...INP, paddingRight: 44 }} />
        <button onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 480 }}>
      <div>
        <p style={SECTION_TITLE}>Change password</p>
        <p style={SECTION_SUB}>Must be at least 8 characters</p>
        <div className="flex flex-col gap-4">
          <PwdField label="Current password" value={current} onChange={setCurrent} show={showC} setShow={setShowC} />
          <PwdField label="New password"     value={newPwd}  onChange={setNewPwd}  show={showN} setShow={setShowN} />
          <PwdField label="Confirm new password" value={confirm} onChange={setConfirm} show={showF} setShow={setShowF} />
          {error && <p style={{ fontSize: 13, color: '#E11D48' }}>{error}</p>}
        </div>
      </div>

      <hr style={DIVIDER} />

      <div>
        <p style={SECTION_TITLE}>Sessions</p>
        <p style={SECTION_SUB}>Manage active logins on other devices</p>
        <div className="flex items-center justify-between py-4">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', margin: 0 }}>Sign out all devices</p>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Revoke all active sessions except this one</p>
          </div>
          <button style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            Sign out all
          </button>
        </div>
      </div>

      <div>
        <button onClick={save}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Update password
        </button>
      </div>

      <SaveToast show={saved} text="Password updated" />
    </div>
  )
}

// ── Delete Tab ────────────────────────────────────────────────────────────────
function DeleteTab() {
  const [confirmText, setConfirmText] = useState('')
  const [showModal,   setShowModal]   = useState(false)
  const canDelete = confirmText === 'DELETE'

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 560 }}>
      <div>
        <p style={SECTION_TITLE}>Before you delete</p>
        <p style={SECTION_SUB}>Please review what will happen when you delete your academy account</p>
        <ul className="flex flex-col gap-3">
          {[
            'All member data, bookings and class history will be permanently deleted',
            'Active subscriptions will be cancelled immediately — no refunds issued',
            'Your Stripe connection will be disconnected',
            'All staff accounts linked to this academy will lose access',
            'Curriculum, grading records and reports will be erased',
          ].map(item => (
            <li key={item} className="flex items-start gap-3">
              <X size={14} style={{ color: '#DC2626', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#374151' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="p-5 rounded-2xl" style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#991B1B', margin: 0 }}>Danger zone</p>
            <p style={{ fontSize: 13, color: '#B91C1C', marginTop: 2 }}>This action is irreversible and cannot be undone.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#DC2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Trash2 size={14} />
          Delete academy account
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowModal(false); setConfirmText('') }}>
          <div className="rounded-2xl p-8 flex flex-col gap-5"
            style={{ background: '#fff', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
                <AlertTriangle size={18} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Delete academy account</p>
                <p style={{ fontSize: 12, color: '#6B7280' }}>This cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input type="text" placeholder="Type DELETE to confirm"
              value={confirmText} onChange={e => setConfirmText(e.target.value)}
              style={{ ...INP, border: '1.5px solid ' + (canDelete ? '#DC2626' : '#E5E7EB') }} />
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => { setShowModal(false); setConfirmText('') }}
                style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button disabled={!canDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none',
                  background: canDelete ? '#DC2626' : '#FCA5A5', color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: canDelete ? 'pointer' : 'not-allowed' }}>
                <Trash2 size={13} />
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tabs config ───────────────────────────────────────────────────────────────
type TabId = 'profile' | 'school' | 'staff' | 'payments' | 'grading' | 'password' | 'delete'

const TABS: { id: TabId; label: string; danger?: boolean }[] = [
  { id: 'profile',  label: 'Profile'         },
  { id: 'school',   label: 'School'          },
  { id: 'staff',    label: 'Staff'           },
  { id: 'payments', label: 'Payments'        },
  { id: 'grading',  label: 'Grading'         },
  { id: 'password', label: 'Password'        },
  { id: 'delete',   label: 'Delete Account', danger: true },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const [activeTab, setActiveTab] = useState<TabId>('profile')

  const content: Record<TabId, React.ReactNode> = {
    profile:  <ProfileTab />,
    school:   <SchoolTab />,
    staff:    <StaffTab />,
    payments: <PaymentsTab />,
    grading:  <GradingTab />,
    password: <PasswordTab />,
    delete:   <DeleteTab />,
  }

  return (
    <main style={{ flex: 1, minWidth: 0 }}>
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex-1" />
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Bell size={15} style={{ color: '#374151' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
        </button>
      </div>

      <div className="px-4 md:px-8 py-8 flex flex-col gap-8">
        {/* Page header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
            {t.settings.title}
          </h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 3 }}>
            {t.settings.subtitle}
          </p>
        </div>

        {/* Pill tabs */}
        <div className="flex items-center gap-1 overflow-x-auto"
          style={{ background: '#F3F4F6', padding: 4, borderRadius: 12, width: 'fit-content' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: isActive ? 600 : 500, whiteSpace: 'nowrap',
                  background: isActive ? '#fff' : 'transparent',
                  color: isActive ? (tab.danger ? '#DC2626' : '#111827') : (tab.danger ? '#EF4444' : '#6B7280'),
                  boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div>
          {content[activeTab]}
        </div>
      </div>
    </main>
  )
}
