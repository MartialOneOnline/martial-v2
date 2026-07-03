'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Bell, Menu, X, Check, Upload, Eye, EyeOff, Plus, Minus,
  User, Building2, Users2, Wallet, GraduationCap,
  Lock, Trash2, AlertTriangle,
  Globe, Phone, Mail, MapPin, Zap, RefreshCw, Clock,
  ChevronDown, ChevronRight, CreditCard, Award, Calendar, LogOut, Users, ArrowRight,
  GripVertical, ChevronUp, Edit2, Settings2,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../lib/format'

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
  // Which methods the platform allows at all — schools can only pick from this subset.
  // Defaults to everything so the picker doesn't flash-hide options before the fetch resolves.
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(PAYMENT_METHODS.map(m => m.key))
  const [cancelPolicy,  setCancelPolicy]  = useState<'IMMEDIATE' | 'UNTIL_END_OF_PERIOD'>('IMMEDIATE')
  const [autoCharge,    setAutoCharge]    = useState(true)
  const [invoiceEmails, setInvoiceEmails] = useState(true)
  const [receiptEmails, setReceiptEmails] = useState(true)
  const [failedAlerts,  setFailedAlerts]  = useState(true)
  const [saved, setSaved] = useState(false)

  // Stripe keys
  const [stripePk,      setStripePk]      = useState('')
  const [stripeSk,      setStripeSk]      = useState('')
  const [stripeWh,      setStripeWh]      = useState('')
  const [showPk,        setShowPk]        = useState(false)
  const [showSk,        setShowSk]        = useState(false)
  const [showWh,        setShowWh]        = useState(false)
  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeSaving,  setStripeSaving]  = useState(false)
  const [stripeSaved,   setStripeSaved]   = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/school').then(r => r.json()).then(d => {
      const enabled: string[] = d.enabledPaymentMethods ?? PAYMENT_METHODS.map(m => m.key)
      setEnabledPaymentMethods(enabled)
      const s = d.school?.defaultBookingSettings
      // Intersect with what the platform still allows — a method the platform disabled since
      // this school last saved silently drops out here instead of staying stuck selected.
      if (s?.acceptedMethods?.length) setAcceptedMethods(s.acceptedMethods.filter((m: string) => enabled.includes(m)))
      if (d.school?.cancelPolicy) setCancelPolicy(d.school.cancelPolicy)
      if (d.school?.stripePublishableKey) { setStripePk(d.school.stripePublishableKey); setStripeConnected(true) }
      if (d.school?.stripeSecretKey)      setStripeSk(d.school.stripeSecretKey)
      if (d.school?.stripeWebhookSecret)  setStripeWh(d.school.stripeWebhookSecret)
    })
  }, [])

  async function saveStripeKeys() {
    setStripeSaving(true)
    await fetch('/api/dashboard/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stripePublishableKey: stripePk || null,
        stripeSecretKey:      stripeSk || null,
        stripeWebhookSecret:  stripeWh || null,
      }),
    })
    setStripeConnected(!!(stripePk && stripeSk))
    setStripeSaving(false); setStripeSaved(true); setTimeout(() => setStripeSaved(false), 2500)
  }

  async function disconnectStripe() {
    setStripePk(''); setStripeSk(''); setStripeWh('')
    await fetch('/api/dashboard/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stripePublishableKey: null, stripeSecretKey: null, stripeWebhookSecret: null }),
    })
    setStripeConnected(false)
  }

  function toggleMethod(key: string) {
    setAcceptedMethods(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key])
  }

  async function save() {
    await fetch('/api/dashboard/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultBookingSettings: { acceptedMethods }, cancelPolicy }),
    })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 600 }}>

      {/* Stripe */}
      <div>
        <p style={SECTION_TITLE}>Payment processor</p>
        <p style={SECTION_SUB}>Connect Stripe to accept online card payments from members</p>

        <div className="p-5 rounded-2xl flex flex-col gap-4" style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F0F0FF' }}>
                <CreditCard size={17} style={{ color: '#635BFF' }} />
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Stripe</p>
              {stripeConnected && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>✓ Connected</span>
              )}
            </div>
            {stripeConnected && (
              <button onClick={disconnectStripe}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                Disconnect
              </button>
            )}
          </div>

          {/* Publishable key */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Publishable key</label>
            <div className="flex items-center gap-2" style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#F9FAFB' }}>
              <input type={showPk ? 'text' : 'password'} value={stripePk} onChange={e => setStripePk(e.target.value)}
                placeholder="pk_live_···"
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: 'transparent', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'monospace' }} />
              <button onClick={() => setShowPk(v => !v)} style={{ padding: '0 12px', height: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                {showPk ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Secret key */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Secret key</label>
            <div className="flex items-center gap-2" style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#F9FAFB' }}>
              <input type={showSk ? 'text' : 'password'} value={stripeSk} onChange={e => setStripeSk(e.target.value)}
                placeholder="sk_live_···"
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: 'transparent', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'monospace' }} />
              <button onClick={() => setShowSk(v => !v)} style={{ padding: '0 12px', height: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                {showSk ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Webhook secret */}
          <div className="flex flex-col gap-1">
            <label style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>Webhook secret</label>
            <div className="flex items-center gap-2" style={{ border: '1px solid #E5E7EB', borderRadius: 8, overflow: 'hidden', background: '#F9FAFB' }}>
              <input type={showWh ? 'text' : 'password'} value={stripeWh} onChange={e => setStripeWh(e.target.value)}
                placeholder="whsec_···"
                style={{ flex: 1, padding: '8px 12px', border: 'none', background: 'transparent', fontSize: 13, color: '#111827', outline: 'none', fontFamily: 'monospace' }} />
              <button onClick={() => setShowWh(v => !v)} style={{ padding: '0 12px', height: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center' }}>
                {showWh ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>In your Stripe dashboard → Webhooks → add endpoint: <span style={{ fontFamily: 'monospace' }}>/api/webhooks/stripe</span></p>
          </div>

          <button onClick={saveStripeKeys} disabled={stripeSaving}
            style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 8, background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: stripeSaving ? 0.6 : 1 }}>
            {stripeSaved ? '✓ Saved' : stripeSaving ? 'Saving…' : 'Save keys'}
          </button>
        </div>
      </div>

      <hr style={DIVIDER} />

      {/* Accepted methods */}
      <div>
        <p style={SECTION_TITLE}>Accepted payment methods</p>
        <p style={SECTION_SUB}>Choose which methods your school accepts from members</p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.filter(m => enabledPaymentMethods.includes(m.key)).map(m => {
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

      {/* Cancellation policy */}
      <div>
        <p style={SECTION_TITLE}>Cancellation policy</p>
        <p style={SECTION_SUB}>How member access is handled when a paid subscription is cancelled</p>
        <div className="flex flex-col gap-3 mt-3">
          {([
            {
              value: 'IMMEDIATE',
              label: 'Immediate',
              description: 'Access ends on the day of cancellation',
            },
            {
              value: 'UNTIL_END_OF_PERIOD',
              label: 'Until end of period',
              description: 'Member retains access until their billing period expires (e.g. Netflix model)',
            },
          ] as const).map(opt => {
            const active = cancelPolicy === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setCancelPolicy(opt.value)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 16px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                  border: `1.5px solid ${active ? '#0870E2' : '#E5E7EB'}`,
                  background: active ? '#EFF6FF' : '#F9FAFB',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  border: `2px solid ${active ? '#0870E2' : '#D1D5DB'}`,
                  background: active ? '#0870E2' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </span>
                <span>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: active ? '#0870E2' : '#111827' }}>
                    {opt.label}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {opt.description}
                  </span>
                </span>
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

// ── Billing Tab ───────────────────────────────────────────────────────────────
// Martial's own SaaS subscription — your school paying Martial. Distinct from
// the Payments tab above, which configures how your school gets paid by its own members.
type BillingCycle = 'monthly' | 'quarterly' | 'annual'
const BILLING_CYCLES: { cycle: BillingCycle; label: string }[] = [
  { cycle: 'monthly',   label: 'Monthly' },
  { cycle: 'quarterly', label: 'Quarterly' },
  { cycle: 'annual',    label: 'Annual' },
]
const SUBSCRIPTION_STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  TRIALING:           { label: 'Trialing',   bg: '#EFF6FF', color: '#0870E2' },
  ACTIVE:              { label: 'Active',     bg: '#F0FDF4', color: '#16A34A' },
  INCOMPLETE:          { label: 'Incomplete', bg: '#FFFBEB', color: '#D97706' },
  INCOMPLETE_EXPIRED:  { label: 'Expired',    bg: '#F3F4F6', color: '#6B7280' },
  PAST_DUE:            { label: 'Past due',   bg: '#FEF2F2', color: '#DC2626' },
  UNPAID:              { label: 'Unpaid',     bg: '#FEF2F2', color: '#DC2626' },
  PAUSED:              { label: 'Paused',     bg: '#FFFBEB', color: '#D97706' },
  CANCELED:            { label: 'Canceled',   bg: '#F3F4F6', color: '#6B7280' },
  INACTIVE:            { label: 'No plan',    bg: '#F3F4F6', color: '#9CA3AF' },
}
const LIVE_SUBSCRIPTION_STATUSES = ['TRIALING', 'ACTIVE', 'INCOMPLETE', 'PAST_DUE', 'UNPAID', 'PAUSED']

function BillingTab() {
  const [subscription, setSubscription] = useState<{
    status: string; billingCycle: string | null; currentPeriodEnd: string | null
  } | null>(null)
  const [plans, setPlans] = useState<{ currency: string; monthly: number | null; quarterly: number | null; annual: number | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [redirecting, setRedirecting] = useState<BillingCycle | 'portal' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/dashboard/billing').then(r => r.json()).then(d => {
      setSubscription(d.subscription)
      setPlans(d.plans)
      setLoading(false)
    })
  }, [])

  async function subscribe(cycle: BillingCycle) {
    setRedirecting(cycle)
    setError('')
    const res = await fetch('/api/dashboard/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billingCycle: cycle }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Could not start checkout'); setRedirecting(null); return }
    window.location.href = data.url
  }

  async function manageBilling() {
    setRedirecting('portal')
    setError('')
    const res = await fetch('/api/dashboard/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Could not open billing portal'); setRedirecting(null); return }
    window.location.href = data.url
  }

  if (loading) {
    return <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
  }

  const isLive = !!subscription && LIVE_SUBSCRIPTION_STATUSES.includes(subscription.status)

  return (
    <div className="flex flex-col gap-8" style={{ maxWidth: 600 }}>
      <div>
        <p style={SECTION_TITLE}>Martial subscription</p>
        <p style={SECTION_SUB}>Your school&apos;s subscription to the Martial platform</p>

        {error && (
          <div className="p-3 rounded-xl mb-4" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {isLive ? (
          <div className="p-5 rounded-2xl flex flex-col gap-4" style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                  <CreditCard size={17} style={{ color: '#0870E2' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, textTransform: 'capitalize' }}>
                    {subscription!.billingCycle ?? 'Subscription'} plan
                  </p>
                  {subscription!.currentPeriodEnd && (
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                      Renews {new Date(subscription!.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                background: SUBSCRIPTION_STATUS_BADGE[subscription!.status]?.bg ?? '#F3F4F6',
                color: SUBSCRIPTION_STATUS_BADGE[subscription!.status]?.color ?? '#6B7280',
              }}>
                {SUBSCRIPTION_STATUS_BADGE[subscription!.status]?.label ?? subscription!.status}
              </span>
            </div>
            <button onClick={manageBilling} disabled={redirecting !== null}
              style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 8, background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', opacity: redirecting ? 0.6 : 1 }}>
              {redirecting === 'portal' ? 'Opening…' : 'Manage billing'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {BILLING_CYCLES.map(({ cycle, label }) => {
              const amount = plans?.[cycle]
              return (
                <div key={cycle} className="p-4 rounded-2xl flex items-center justify-between" style={{ border: '1.5px solid #E5E7EB' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                      {amount != null ? fmtPrice(amount / 100, plans!.currency) : 'Not available yet'}
                    </p>
                  </div>
                  <button onClick={() => subscribe(cycle)} disabled={amount == null || redirecting !== null}
                    style={{ padding: '8px 18px', borderRadius: 8, background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: amount == null ? 'not-allowed' : 'pointer', opacity: amount == null || redirecting ? 0.5 : 1 }}>
                    {redirecting === cycle ? 'Redirecting…' : 'Subscribe'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Grading Tab ───────────────────────────────────────────────────────────────
interface BeltRank {
  id: string; order: number; name: string; color: string; maxDegrees: number
  minAge: number | null; minMonthsAtPrevious: number | null
  totalClassesRequired: number | null; classesPerPeriod: number | null; periodType: string | null
  classTypeIds: string[]
}
interface GradingSystem {
  id: string; name: string; activity: string | null; isDefault: boolean
  requireApproval: boolean; gradingFee: number; notifyStudent: boolean; notifyInstructor: boolean
  ranks: BeltRank[]
}

const PERIOD_OPTS = [{ value: 'WEEK', label: 'per week' }, { value: 'MONTH', label: 'per month' }]

const COLOR_PRESETS = [
  '#9CA3AF', // white/grey
  '#2563EB', // blue
  '#7C3AED', // purple
  '#92400E', // brown
  '#111827', // black
  '#EAB308', // yellow
  '#F97316', // orange
  '#16A34A', // green
  '#DC2626', // red
]

function RankRow({
  rank, systemId, onUpdate, onDelete, isLast,
}: {
  rank: BeltRank; systemId: string
  onUpdate: (r: BeltRank) => void; onDelete: () => void; isLast: boolean
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(rank)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof BeltRank>(k: K, v: BeltRank[K]) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/dashboard/grading-systems/${systemId}/ranks/${rank.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) return
    const { rank: updated } = await res.json()
    onUpdate(updated)
    setOpen(false)
  }

  const INP: React.CSSProperties = {
    border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: '100%',
  }

  return (
    <div style={{ borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}>
      {/* Rank header row */}
      <div className="flex items-center gap-3 py-3 px-1">
        <div className="w-5 h-5 rounded-full shrink-0 border-2 border-white shadow-sm"
          style={{ background: form.color }} />
        <p style={{ fontSize: 14, fontWeight: 500, color: '#111827', flex: 1, margin: 0 }}>{form.name}</p>
        {form.maxDegrees > 0 && (
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>{form.maxDegrees} stripes</span>
        )}
        {form.totalClassesRequired && (
          <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 999 }}>
            {form.totalClassesRequired} classes
          </span>
        )}
        {form.minMonthsAtPrevious && (
          <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 999 }}>
            {form.minMonthsAtPrevious} mo
          </span>
        )}
        <button onClick={() => setOpen(o => !o)}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          style={{ background: open ? '#F3F4F6' : 'transparent', border: 'none', color: '#6B7280' }}>
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: '#D1D5DB' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#DC2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#D1D5DB'}>
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expandable edit form */}
      {open && (
        <div className="mx-1 mb-3 p-4 rounded-xl flex flex-col gap-4"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Name</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} style={INP} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Stripes / Degrees</label>
              <select value={form.maxDegrees} onChange={e => set('maxDegrees', Number(e.target.value))} style={INP}>
                <option value={0}>No stripes</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} stripes</option>)}
              </select>
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Color</label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => set('color', c)}
                  style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: form.color === c ? '3px solid #0870E2' : '2px solid transparent', cursor: 'pointer', outline: 'none' }} />
              ))}
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB', cursor: 'pointer', padding: 2, background: '#fff' }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Min age</label>
              <input type="number" min={0} max={99} value={form.minAge ?? ''} placeholder="—"
                onChange={e => set('minAge', e.target.value ? Number(e.target.value) : null)} style={INP} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Months at prev.</label>
              <input type="number" min={0} value={form.minMonthsAtPrevious ?? ''} placeholder="—"
                onChange={e => set('minMonthsAtPrevious', e.target.value ? Number(e.target.value) : null)} style={INP} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Total classes</label>
              <input type="number" min={0} value={form.totalClassesRequired ?? ''} placeholder="—"
                onChange={e => set('totalClassesRequired', e.target.value ? Number(e.target.value) : null)} style={INP} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Min classes</label>
              <input type="number" min={0} value={form.classesPerPeriod ?? ''} placeholder="—"
                onChange={e => set('classesPerPeriod', e.target.value ? Number(e.target.value) : null)} style={INP} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 4 }}>Period</label>
              <select value={form.periodType ?? ''} onChange={e => set('periodType', e.target.value || null)} style={INP}>
                <option value="">—</option>
                {PERIOD_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setForm(rank); setOpen(false) }}
              style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', color: '#374151', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={save} disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving…' : 'Save rank'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SystemEditor({ system, onUpdate, onDelete }: {
  system: GradingSystem
  onUpdate: (s: GradingSystem) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [addingRank, setAddingRank] = useState(false)
  const [newRankName, setNewRankName] = useState('')
  const [newRankColor, setNewRankColor] = useState('#9CA3AF')
  const [saving, setSaving]       = useState(false)
  const [editName, setEditName]   = useState(false)
  const [nameVal, setNameVal]     = useState(system.name)
  const [actVal, setActVal]       = useState(system.activity ?? '')

  async function saveName() {
    if (!nameVal.trim()) return
    const res = await fetch(`/api/dashboard/grading-systems/${system.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nameVal, activity: actVal || null }),
    })
    if (!res.ok) return
    const { system: s } = await res.json()
    onUpdate(s); setEditName(false)
  }

  async function toggleSetting(key: keyof GradingSystem, value: boolean | number) {
    const res = await fetch(`/api/dashboard/grading-systems/${system.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (!res.ok) return
    const { system: s } = await res.json()
    onUpdate(s)
  }

  async function addRank() {
    if (!newRankName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/dashboard/grading-systems/${system.id}/ranks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRankName, color: newRankColor }),
    })
    setSaving(false)
    if (!res.ok) return
    const { rank } = await res.json()
    onUpdate({ ...system, ranks: [...system.ranks, rank] })
    setNewRankName(''); setNewRankColor('#9CA3AF'); setAddingRank(false)
  }

  async function deleteRank(rankId: string) {
    await fetch(`/api/dashboard/grading-systems/${system.id}/ranks/${rankId}`, { method: 'DELETE' })
    onUpdate({ ...system, ranks: system.ranks.filter(r => r.id !== rankId) })
  }

  function updateRank(updated: BeltRank) {
    onUpdate({ ...system, ranks: system.ranks.map(r => r.id === updated.id ? updated : r) })
  }

  const INP: React.CSSProperties = {
    border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #E5E7EB', background: '#fff' }}>
      {/* System header */}
      <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: expanded ? '1px solid #F3F4F6' : 'none' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Color preview strip */}
          <div className="flex gap-0.5 shrink-0">
            {system.ranks.slice(0, 6).map(r => (
              <div key={r.id} className="w-2 h-5 rounded-sm" style={{ background: r.color }} />
            ))}
            {system.ranks.length === 0 && <div className="w-2 h-5 rounded-sm" style={{ background: '#E5E7EB' }} />}
          </div>
          {editName ? (
            <div className="flex items-center gap-2 flex-1">
              <input value={nameVal} onChange={e => setNameVal(e.target.value)} style={{ ...INP, width: 160 }}
                placeholder="System name" autoFocus />
              <input value={actVal} onChange={e => setActVal(e.target.value)} style={{ ...INP, width: 120 }}
                placeholder="Activity (BJJ…)" />
              <button onClick={saveName}
                style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#0870E2', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => setEditName(false)}
                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <p style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>{system.name}</p>
              {system.activity && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: '#F0F7FF', color: '#0870E2', border: '1px solid #BFDBFE' }}>
                  {system.activity}
                </span>
              )}
              {system.isDefault && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                  Default
                </span>
              )}
              <button onClick={() => setEditName(true)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                <Edit2 size={12} />
              </button>
            </div>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{system.ranks.length} ranks</span>
        <button onClick={onDelete}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#DC2626'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#D1D5DB'}>
          <Trash2 size={14} />
        </button>
        <button onClick={() => setExpanded(o => !o)}
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#374151' }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Collapse' : 'Edit ranks'}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          {/* Ranks list */}
          <div className="mt-2">
            {system.ranks.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', padding: '16px 0', textAlign: 'center' }}>
                No ranks yet. Add the first rank below.
              </p>
            ) : (
              system.ranks.map((rank, idx) => (
                <RankRow key={rank.id} rank={rank} systemId={system.id}
                  onUpdate={updateRank} onDelete={() => deleteRank(rank.id)}
                  isLast={idx === system.ranks.length - 1} />
              ))
            )}
          </div>

          {/* Add rank */}
          {addingRank ? (
            <div className="flex items-center gap-2 mt-3 p-3 rounded-xl" style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <input value={newRankName} onChange={e => setNewRankName(e.target.value)}
                placeholder="Rank name (e.g. Azul)" autoFocus
                style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }}
                onKeyDown={e => e.key === 'Enter' && addRank()} />
              <div className="flex gap-1">
                {COLOR_PRESETS.slice(0, 6).map(c => (
                  <button key={c} onClick={() => setNewRankColor(c)}
                    style={{ width: 20, height: 20, borderRadius: '50%', background: c,
                      border: newRankColor === c ? '2.5px solid #0870E2' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
              <button onClick={addRank} disabled={saving || !newRankName.trim()}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? '…' : 'Add'}
              </button>
              <button onClick={() => setAddingRank(false)}
                style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
                <X size={13} style={{ color: '#9CA3AF' }} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAddingRank(true)}
              className="flex items-center gap-2 mt-3 cursor-pointer"
              style={{ fontSize: 13, color: '#0870E2', fontWeight: 500, background: 'transparent', border: 'none', padding: '4px 0' }}>
              <Plus size={14} /> Add rank
            </button>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '16px 0' }} />

          {/* System-level rules */}
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>Rules for this system</p>
          <div className="flex flex-col">
            {[
              { key: 'requireApproval' as const,  label: 'Require instructor approval', desc: 'Manual approval before each promotion' },
              { key: 'notifyStudent' as const,    label: 'Notify student on promotion',  desc: 'Email sent when promoted' },
              { key: 'notifyInstructor' as const, label: 'Notify instructor',            desc: 'Summary after each grading' },
            ].map(row => (
              <div key={row.key} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F9FAFB' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{row.label}</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{row.desc}</p>
                </div>
                <Toggle value={system[row.key] as boolean} onChange={v => toggleSetting(row.key, v)} />
              </div>
            ))}
            <div className="flex items-center justify-between py-3">
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>Grading fee</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Default fee per student per grading event</p>
              </div>
              <Stepper value={system.gradingFee} unit="€" min={0} max={500}
                onChange={v => toggleSetting('gradingFee', v)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GradingTab() {
  const [systems, setSystems]   = useState<GradingSystem[]>([])
  const [loading, setLoading]   = useState(true)
  const [adding,  setAdding]    = useState(false)
  const [newName, setNewName]   = useState('')
  const [newAct,  setNewAct]    = useState('')
  const [saving,  setSaving]    = useState(false)

  useEffect(() => {
    fetch('/api/dashboard/grading-systems').then(r => r.json()).then(d => {
      setSystems(d.systems ?? [])
      setLoading(false)
    })
  }, [])

  async function createSystem() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch('/api/dashboard/grading-systems', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, activity: newAct || null, isDefault: systems.length === 0 }),
    })
    setSaving(false)
    if (!res.ok) return
    const { system } = await res.json()
    setSystems(prev => [...prev, system])
    setNewName(''); setNewAct(''); setAdding(false)
  }

  async function deleteSystem(id: string) {
    if (!confirm('Delete this grading system?')) return
    await fetch(`/api/dashboard/grading-systems/${id}`, { method: 'DELETE' })
    setSystems(prev => prev.filter(s => s.id !== id))
  }

  function updateSystem(updated: GradingSystem) {
    setSystems(prev => prev.map(s => s.id === updated.id ? updated : s))
  }

  return (
    <div className="flex flex-col gap-6" style={{ maxWidth: 700 }}>
      {/* Link to Gradings module */}
      <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#F0F7FF', border: '1px solid #BFDBFE' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1E40AF', margin: 0 }}>Grading events &amp; history</p>
          <p style={{ fontSize: 13, color: '#3B82F6', marginTop: 2 }}>Record promotions and view full history in the Gradings module.</p>
        </div>
        <a href="/dashboard/school/gradings"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10,
            background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          Go to Gradings <ArrowRight size={13} />
        </a>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p style={SECTION_TITLE}>Grading Systems</p>
          <p style={SECTION_SUB}>One system per activity (BJJ, Judo, Karate…). Each system has its own belt progression and rules.</p>
        </div>
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 cursor-pointer"
          style={{ padding: '9px 16px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={14} /> New system
        </button>
      </div>

      {/* New system form */}
      {adding && (
        <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="System name (e.g. BJJ Adultos)"
            autoFocus style={{ flex: 2, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}
            onKeyDown={e => e.key === 'Enter' && createSystem()} />
          <input value={newAct} onChange={e => setNewAct(e.target.value)} placeholder="Activity (BJJ, Judo…)"
            style={{ flex: 1, border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
          <button onClick={createSystem} disabled={saving || !newName.trim()}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? '…' : 'Create'}
          </button>
          <button onClick={() => setAdding(false)}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer' }}>
            <X size={14} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
      )}

      {/* Systems list */}
      {loading ? (
        <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
      ) : systems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12" style={{ border: '2px dashed #E5E7EB', borderRadius: 16 }}>
          <Award size={28} style={{ color: '#D1D5DB' }} />
          <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>No grading systems yet</p>
          <button onClick={() => setAdding(true)}
            style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#0870E2', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Create first system
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {systems.map(s => (
            <SystemEditor key={s.id} system={s} onUpdate={updateSystem} onDelete={() => deleteSystem(s.id)} />
          ))}
        </div>
      )}
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
type TabId = 'profile' | 'school' | 'staff' | 'payments' | 'billing' | 'grading' | 'password' | 'delete'

const TABS: { id: TabId; label: string; danger?: boolean }[] = [
  { id: 'profile',  label: 'Profile'         },
  { id: 'school',   label: 'School'          },
  { id: 'staff',    label: 'Staff'           },
  { id: 'payments', label: 'Payments'        },
  { id: 'billing',  label: 'Billing'         },
  { id: 'grading',  label: 'Grading'         },
  { id: 'password', label: 'Password'        },
  { id: 'delete',   label: 'Delete Account', danger: true },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some(tab => tab.id === tabParam) ? (tabParam as TabId) : 'profile'
  )

  const content: Record<TabId, React.ReactNode> = {
    profile:  <ProfileTab />,
    school:   <SchoolTab />,
    staff:    <StaffTab />,
    payments: <PaymentsTab />,
    billing:  <BillingTab />,
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
