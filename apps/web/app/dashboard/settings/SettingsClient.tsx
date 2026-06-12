'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Bell,
  Menu, X, Check, Upload, Eye, EyeOff, Plus, Minus,
  User, Building2, Users2, Wallet, GraduationCap,
  Lock, Trash2, AlertTriangle,
  Globe, Phone, Mail, MapPin, Zap, RefreshCw, Clock,
  ChevronDown, ChevronRight, CreditCard, Award, Calendar, LogOut, Users,
} from 'lucide-react'
import Link from 'next/link'
import { useDashboard } from '../../../components/DashboardShell'
import { useT } from '../../../lib/i18n/LanguageContext'

// ── Reusable primitives ────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative shrink-0 cursor-pointer"
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none',
        background: value ? '#0071E3' : '#D1D5DB', transition: 'background 0.2s', padding: 0 }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2,
        width: 20, height: 20, borderRadius: 10, background: '#fff',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

function ToggleRow({ icon: Icon, label, description, value, onChange }: {
  icon?: React.ElementType; label: string; description: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Icon size={14} style={{ color: '#6B7280' }} />
          </div>
        )}
        <div className="min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{description}</p>
        </div>
      </div>
      <Toggle value={value} onChange={onChange} />
    </div>
  )
}

function StepperRow({ icon: Icon, label, description, value, unit, min = 0, max = 999, onChange }: {
  icon?: React.ElementType; label: string; description: string
  value: number; unit: string; min?: number; max?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        {Icon && (
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Icon size={14} style={{ color: '#6B7280' }} />
          </div>
        )}
        <div className="min-w-0">
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0"
        style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#F9FAFB', padding: '2px' }}>
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: value <= min ? '#D1D5DB' : '#374151' }}
          disabled={value <= min}>
          <Minus size={13} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', minWidth: 56, textAlign: 'center' }}>
          {value} <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280' }}>{unit}</span>
        </span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: value >= max ? '#D1D5DB' : '#374151' }}
          disabled={value >= max}>
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF',
      textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, marginTop: 4 }}>
      {title}
    </p>
  )
}

function AccordionSection({ icon: Icon, title, badge, children, defaultOpen = false }: {
  icon: React.ElementType; title: string; badge?: string
  children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-6 py-5 cursor-pointer"
        style={{ background: open ? '#FAFAFA' : '#fff', border: 'none', textAlign: 'left' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: open ? '#EFF6FF' : '#F9FAFB', border: '1px solid ' + (open ? '#BFDBFE' : '#E5E7EB') }}>
          <Icon size={16} style={{ color: open ? '#0071E3' : '#6B7280' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{title}</p>
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
            background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', marginRight: 8 }}>
            {badge}
          </span>
        )}
        <ChevronDown size={16} style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-2 flex flex-col gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
  padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="flex justify-end pt-4">
      <button onClick={onSave}
        className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
        style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
        <Check size={14} />
        Save changes
      </button>
    </div>
  )
}

// ── Staff preview data ─────────────────────────────────────────────────────────
const STAFF_PREVIEW = [
  { id:1, avatar:'https://i.pravatar.cc/32?u=js',  name:'Jorge Sanchez',    role:'Head Instructor', belt:'Black', status:'Active'   },
  { id:2, avatar:'https://i.pravatar.cc/32?u=ad2', name:'Ana Díaz',         role:'Instructor',      belt:'Brown', status:'Active'   },
  { id:3, avatar:'https://i.pravatar.cc/32?u=rf',  name:'Roberto Flores',   role:'Assistant',       belt:'Blue',  status:'Active'   },
  { id:4, avatar:'https://i.pravatar.cc/32?u=ml',  name:'María López',      role:'Admin',           belt:'White', status:'Active'   },
  { id:5, avatar:'https://i.pravatar.cc/32?u=pk',  name:'Pavel Kowalski',   role:'Instructor',      belt:'Purple',status:'On Leave' },
]

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  'Head Instructor': { bg: '#FEF2F2', color: '#DC2626' },
  'Instructor':      { bg: '#EFF6FF', color: '#1D4ED8' },
  'Assistant':       { bg: '#F5F3FF', color: '#6D28D9' },
  'Admin':           { bg: '#F0FDF4', color: '#16A34A' },
  'Receptionist':    { bg: '#F9FAFB', color: '#374151' },
}

const BELT_COLORS: Record<string, { bg: string; color: string }> = {
  White:  { bg: '#F9FAFB', color: '#374151' },
  Blue:   { bg: '#EFF6FF', color: '#1D4ED8' },
  Purple: { bg: '#F5F3FF', color: '#6D28D9' },
  Brown:  { bg: '#FFF7ED', color: '#C2410C' },
  Black:  { bg: '#111827', color: '#F9FAFB' },
}

// ── Tab contents ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="flex flex-col gap-6">
      {/* Avatar + stats card */}
      <div className="flex gap-6 flex-wrap">
        <div className="rounded-2xl p-6 flex flex-col items-center gap-4 shrink-0"
          style={{ background: '#fff', border: '1px solid #E5E7EB', width: 200 }}>
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: '#F3F4F6', border: '3px solid #E5E7EB' }}>
              <img src="https://i.pravatar.cc/96?u=owner" alt="avatar" className="w-full h-full object-cover" />
            </div>
            <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
              style={{ background: '#0071E3', border: '2px solid #fff' }}>
              <Upload size={11} style={{ color: '#fff' }} />
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
          <div className="text-center">
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Carlos Silva</p>
            <p style={{ fontSize: 11, color: '#9CA3AF' }}>Academy Owner</p>
          </div>
          <div className="w-full grid grid-cols-3 gap-2" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
            {[{ label: 'Belt', value: 'Black' }, { label: 'Classes', value: '247' }, { label: 'Years', value: '12' }].map(s => (
              <div key={s.label} className="flex flex-col items-center">
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{s.value}</p>
                <p style={{ fontSize: 10, color: '#9CA3AF' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 min-w-0 rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>First Name</label>
              <input type="text" defaultValue="Carlos" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Last Name</label>
              <input type="text" defaultValue="Silva" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" defaultValue="carlos@academy.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" defaultValue="+34 611 222 333" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea rows={3} defaultValue="Head instructor and founder of the academy. Black belt in Brazilian Jiu-Jitsu with 12 years of teaching experience."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Timezone</label>
              <select style={inputStyle} defaultValue="Europe/Madrid">
                {['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo'].map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Language</label>
              <select style={inputStyle} defaultValue="en">
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <SaveBar onSave={save} />
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Profile saved</p>
        </div>
      )}
    </div>
  )
}

function SchoolLanguageCard() {
  const [language, setLanguage] = useState<string>('en')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load current school language
  useState(() => {
    fetch('/api/dashboard/school')
      .then(r => r.json())
      .then(d => { if (d.school?.language) setLanguage(d.school.language) })
      .finally(() => setLoading(false))
  })

  const save = async (lang: string) => {
    setSaving(true)
    await fetch('/api/dashboard/school', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: lang }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const LANGS = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'pt', label: 'Português', flag: '🇧🇷' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
  ]

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>Idioma de comunicaciones</p>
        <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>Idioma en el que se envían los emails a los alumnos (invitaciones, avisos, etc.)</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {LANGS.map(l => (
          <button
            key={l.value}
            disabled={loading || saving}
            onClick={() => { setLanguage(l.value); save(l.value) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              border: `2px solid ${language === l.value ? '#0071E3' : '#E5E7EB'}`,
              background: language === l.value ? '#EFF6FF' : '#fff',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>{l.flag}</span>
            <span style={{ fontSize: 13, fontWeight: language === l.value ? 600 : 400, color: language === l.value ? '#0071E3' : '#374151' }}>
              {l.label}
            </span>
            {language === l.value && (
              <span style={{ marginLeft: 'auto', width: 16, height: 16, borderRadius: '50%', background: '#0071E3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
      {saved && (
        <p style={{ fontSize: 12, color: '#16A34A', margin: 0 }}>✓ Idioma guardado</p>
      )}
      {saving && (
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Guardando…</p>
      )}
    </div>
  )
}

function SchoolTab() {
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="flex flex-col gap-5">
      {/* Logo + banner */}
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Identity" />
        <div className="flex items-start gap-6 flex-wrap">
          <div>
            <label style={labelStyle}>School Logo</label>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center cursor-pointer relative overflow-hidden"
              style={{ background: '#F3F4F6', border: '2px dashed #D1D5DB' }}>
              <Upload size={20} style={{ color: '#9CA3AF' }} />
              <input type="file" accept="image/*" className="hidden absolute inset-0 cursor-pointer opacity-0" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Academy Name</label>
                <input type="text" defaultValue="Martial Academy" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tagline</label>
                <input type="text" defaultValue="Train Hard. Live Better." style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>School Type</label>
              <select style={inputStyle} defaultValue="bjj">
                <option value="bjj">Brazilian Jiu-Jitsu</option>
                <option value="mma">Mixed Martial Arts</option>
                <option value="muay">Muay Thai</option>
                <option value="wrestling">Wrestling</option>
                <option value="multi">Multi-discipline</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Address" />
        <div>
          <label style={labelStyle}><MapPin size={11} style={{ display:'inline', marginRight:4 }} />Street Address</label>
          <input type="text" defaultValue="Calle Gran Vía 28" style={inputStyle} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label style={labelStyle}>City</label>
            <input type="text" defaultValue="Málaga" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Country</label>
            <select style={inputStyle} defaultValue="ES">
              <option value="ES">Spain</option>
              <option value="PT">Portugal</option>
              <option value="GB">United Kingdom</option>
              <option value="FR">France</option>
              <option value="DE">Germany</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Postal Code</label>
            <input type="text" defaultValue="29001" style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Contact" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={labelStyle}><Phone size={11} style={{ display:'inline', marginRight:4 }} />Phone</label>
            <input type="tel" defaultValue="+34 952 000 000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}><Mail size={11} style={{ display:'inline', marginRight:4 }} />Email</label>
            <input type="email" defaultValue="info@martialacademy.com" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}><Globe size={11} style={{ display:'inline', marginRight:4 }} />Website</label>
          <input type="url" defaultValue="https://martialacademy.com" style={inputStyle} />
        </div>
      </div>

      {/* Social */}
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Social Links" />
        <div className="grid grid-cols-1 gap-3">
          {[
            { icon: Globe, label: 'Instagram', placeholder: '@martialacademy', defaultValue: '@martialacademy_malaga' },
            { icon: Globe, label: 'YouTube',   placeholder: 'Channel URL', defaultValue: '' },
            { icon: Globe, label: 'Facebook',  placeholder: 'Page URL', defaultValue: 'facebook.com/martialacademy' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <s.icon size={14} style={{ color: '#6B7280' }} />
              </div>
              <input type="text" placeholder={s.placeholder} defaultValue={s.defaultValue}
                style={{ ...inputStyle, flex: 1 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Communications language */}
      <SchoolLanguageCard />

      <SaveBar onSave={save} />
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>School settings saved</p>
        </div>
      )}
    </div>
  )
}

function StaffTab() {
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Active Staff</p>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Quick overview — {STAFF_PREVIEW.length} members</p>
          </div>
          <Link href="/dashboard/school/staff"
            className="flex items-center gap-2 px-4 py-2 rounded-xl no-underline"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151' }}>
            Manage full staff <ChevronRight size={13} />
          </Link>
        </div>
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              {['Member', 'Role', 'Belt', 'Status'].map(h => (
                <th key={h} className="px-6 py-3 text-left"
                  style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAFF_PREVIEW.map((s, i) => {
              const rc = ROLE_COLORS[s.role] ?? { bg: '#F9FAFB', color: '#374151' }
              const bc = BELT_COLORS[s.belt] ?? BELT_COLORS['White']!
              return (
                <tr key={s.id} className="hover:bg-[#FAFAFA] transition-colors"
                  style={{ borderBottom: i < STAFF_PREVIEW.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <img src={s.avatar} alt={s.name} className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{s.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                      background: rc.bg, color: rc.color }}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: bc.bg, color: bc.color, border: '1px solid ' + (s.belt === 'White' ? '#E5E7EB' : bc.bg) }}>
                      {s.belt}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                      background: s.status === 'Active' ? '#F0FDF4' : '#FFFBEB',
                      color: s.status === 'Active' ? '#16A34A' : '#D97706',
                      border: '1px solid ' + (s.status === 'Active' ? '#BBF7D0' : '#FDE68A') }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1D4ED8' }}>Need to add or manage staff?</p>
          <p style={{ fontSize: 12, color: '#3B82F6', marginTop: 2 }}>
            Go to School → Staff for full management, roles, schedules and permissions.
          </p>
        </div>
        <Link href="/dashboard/school/staff"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl no-underline shrink-0"
          style={{ background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          Go to Staff <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  )
}

function PaymentsTab() {
  const [connected] = useState(true)
  const [autoCharge, setAutoCharge] = useState(true)
  const [invoiceEmails, setInvoiceEmails] = useState(true)
  const [receiptEmails, setReceiptEmails] = useState(true)
  const [failedAlerts, setFailedAlerts] = useState(true)
  const [dropinFee, setDropinFee] = useState(12)
  const [latePaymentPct, setLatePaymentPct] = useState(5)
  const [processingPct, setProcessingPct] = useState(3)
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="flex flex-col gap-5">
      {/* Stripe connection */}
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Payment Processor" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#F0F0FF', border: '1px solid #E0E0FF' }}>
              <CreditCard size={18} style={{ color: '#635BFF' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Stripe</p>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                  background: connected ? '#F0FDF4' : '#FEF2F2',
                  color: connected ? '#16A34A' : '#DC2626',
                  border: '1px solid ' + (connected ? '#BBF7D0' : '#FECACA') }}>
                  {connected ? '✓ Connected' : '✗ Disconnected'}
                </span>
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                {connected ? 'Account: acct_1P2a···3f8x · Live mode' : 'Connect your Stripe account to accept payments'}
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500,
              border: '1px solid ' + (connected ? '#FECACA' : '#0071E3'),
              background: connected ? '#FEF2F2' : '#0071E3',
              color: connected ? '#DC2626' : '#fff' }}>
            {connected ? 'Disconnect' : 'Connect Stripe'}
          </button>
        </div>
      </div>

      {/* Fee config */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Fee Configuration" />
        <StepperRow
          icon={Wallet} label="Drop-in Class Fee" description="Default price charged for a single drop-in session"
          value={dropinFee} unit="€" min={0} max={100} onChange={setDropinFee} />
        <StepperRow
          icon={AlertTriangle} label="Late Payment Penalty" description="Percentage added to overdue invoices after 7 days"
          value={latePaymentPct} unit="%" min={0} max={25} onChange={setLatePaymentPct} />
        <StepperRow
          icon={CreditCard} label="Processing Fee Passthrough" description="Percentage of Stripe processing fee passed to member"
          value={processingPct} unit="%" min={0} max={10} onChange={setProcessingPct} />
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3">
        <SectionHeader title="Automation" />
        <ToggleRow icon={RefreshCw} label="Auto-charge on billing date"
          description="Automatically charge members on their renewal date via Stripe"
          value={autoCharge} onChange={setAutoCharge} />
        <ToggleRow icon={Mail} label="Send invoice emails"
          description="Email members a PDF invoice before each billing cycle"
          value={invoiceEmails} onChange={setInvoiceEmails} />
        <ToggleRow icon={Check} label="Send payment receipts"
          description="Email a receipt to members after each successful payment"
          value={receiptEmails} onChange={setReceiptEmails} />
        <ToggleRow icon={Bell} label="Failed payment alerts"
          description="Notify admin and member when a payment fails"
          value={failedAlerts} onChange={setFailedAlerts} />
      </div>

      <SaveBar onSave={save} />
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Payment settings saved</p>
        </div>
      )}
    </div>
  )
}

function GradingTab() {
  const [whiteToBlue, setWhiteToBlue]   = useState(12)
  const [blueToPurple, setBlueToPurple] = useState(24)
  const [purpleToBrown, setPurpleToBrown] = useState(36)
  const [brownToBlack, setBrownToBlack] = useState(48)
  const [requireApproval, setRequireApproval] = useState(true)
  const [minAttendance, setMinAttendance] = useState(75)
  const [requireTechnique, setRequireTechnique] = useState(false)
  const [notifyStudent, setNotifyStudent] = useState(true)
  const [notifyInstructor, setNotifyInstructor] = useState(true)
  const [sendCertificate, setSendCertificate] = useState(true)
  const [reminderDays, setReminderDays] = useState(7)
  const [maxCandidates, setMaxCandidates] = useState(20)
  const [defaultDuration, setDefaultDuration] = useState(3)
  const [gradingFee, setGradingFee] = useState(0)
  const [autoCharge, setAutoCharge] = useState(false)
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const beltRows = [
    { label: 'White → Blue',   description: 'Minimum months at White Belt before promotion', value: whiteToBlue,   onChange: setWhiteToBlue,   color: '#1D4ED8' },
    { label: 'Blue → Purple',  description: 'Minimum months at Blue Belt before promotion',  value: blueToPurple,  onChange: setBlueToPurple,  color: '#6D28D9' },
    { label: 'Purple → Brown', description: 'Minimum months at Purple Belt before promotion', value: purpleToBrown, onChange: setPurpleToBrown, color: '#92400E' },
    { label: 'Brown → Black',  description: 'Minimum months at Brown Belt before promotion', value: brownToBlack,  onChange: setBrownToBlack,  color: '#111827' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <AccordionSection icon={Award} title="Belt Progression" badge="4 belts" defaultOpen>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
          Set the minimum time a student must hold each belt before becoming eligible for promotion.
        </p>
        {beltRows.map(row => (
          <div key={row.label} className="flex items-center justify-between px-5 py-4 rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: row.color }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.label}</p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{row.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0"
              style={{ border: '1px solid #E5E7EB', borderRadius: 12, background: '#F9FAFB', padding: '2px' }}>
              <button onClick={() => row.onChange(Math.max(1, row.value - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                style={{ background: 'transparent', border: 'none', color: '#374151' }}>
                <Minus size={13} />
              </button>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', minWidth: 72, textAlign: 'center' }}>
                {row.value} <span style={{ fontSize: 11, fontWeight: 400, color: '#6B7280' }}>mo</span>
              </span>
              <button onClick={() => row.onChange(row.value + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                style={{ background: 'transparent', border: 'none', color: '#374151' }}>
                <Plus size={13} />
              </button>
            </div>
          </div>
        ))}
      </AccordionSection>

      <AccordionSection icon={Check} title="Promotion Rules" defaultOpen>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
          Define the requirements that must be met before a student can be promoted.
        </p>
        <ToggleRow icon={User} label="Require instructor approval"
          description="An instructor must manually approve each promotion before it is finalised"
          value={requireApproval} onChange={setRequireApproval} />
        <StepperRow icon={Award} label="Minimum attendance rate"
          description="Student must have attended at least this percentage of classes in the period"
          value={minAttendance} unit="%" min={0} max={100} onChange={setMinAttendance} />
        <ToggleRow icon={GraduationCap} label="Require technique sign-off"
          description="Instructor must mark required techniques as completed in the curriculum before promotion"
          value={requireTechnique} onChange={setRequireTechnique} />
      </AccordionSection>

      <AccordionSection icon={Bell} title="Notifications">
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
          Control who gets notified and when for grading events and promotions.
        </p>
        <ToggleRow icon={User} label="Notify student on promotion"
          description="Send an email to the student when they are promoted to a new belt"
          value={notifyStudent} onChange={setNotifyStudent} />
        <ToggleRow icon={Users} label="Notify instructor"
          description="Send a summary email to the assigned instructor after each grading event"
          value={notifyInstructor} onChange={setNotifyInstructor} />
        <ToggleRow icon={Award} label="Send promotion certificate"
          description="Automatically email a PDF certificate to the student after promotion"
          value={sendCertificate} onChange={setSendCertificate} />
        <StepperRow icon={Bell} label="Grading event reminder"
          description="Send a reminder to all candidates this many days before the grading event"
          value={reminderDays} unit="days" min={1} max={30} onChange={setReminderDays} />
      </AccordionSection>

      <AccordionSection icon={Calendar} title="Grading Events">
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
          Default settings applied when creating a new grading event.
        </p>
        <div className="rounded-2xl px-5 py-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <label style={labelStyle}>Default Venue</label>
          <input type="text" defaultValue="Main Mat" style={inputStyle} />
        </div>
        <StepperRow icon={Users} label="Max candidates per event"
          description="Maximum number of students that can attend a single grading ceremony"
          value={maxCandidates} unit="students" min={5} max={100} onChange={setMaxCandidates} />
        <StepperRow icon={Clock} label="Default event duration"
          description="Expected duration of a grading ceremony in hours"
          value={defaultDuration} unit="hrs" min={1} max={12} onChange={setDefaultDuration} />
      </AccordionSection>

      <AccordionSection icon={CreditCard} title="Grading Fees">
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
          Configure whether students are charged for grading events.
        </p>
        <StepperRow icon={Wallet} label="Grading fee"
          description="Amount charged per student per grading event (0 = free)"
          value={gradingFee} unit="€" min={0} max={200} onChange={setGradingFee} />
        <ToggleRow icon={CreditCard} label="Auto-charge via Stripe"
          description="Automatically charge the grading fee to the student's saved payment method"
          value={autoCharge} onChange={setAutoCharge} />
      </AccordionSection>

      <SaveBar onSave={save} />
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Grading settings saved</p>
        </div>
      )}
    </div>
  )
}

function PasswordTab() {
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [twoFA, setTwoFA]             = useState(false)
  const [saved, setSaved]             = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 540 }}>
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <SectionHeader title="Change Password" />
        {[
          { label: 'Current Password', show: showCurrent, toggle: setShowCurrent },
          { label: 'New Password',     show: showNew,     toggle: setShowNew     },
          { label: 'Confirm New Password', show: showConfirm, toggle: setShowConfirm },
        ].map(f => (
          <div key={f.label}>
            <label style={labelStyle}>{f.label}</label>
            <div className="relative">
              <input type={f.show ? 'text' : 'password'} placeholder="••••••••"
                style={{ ...inputStyle, paddingRight: 40 }} />
              <button onClick={() => f.toggle(!f.show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ background: 'transparent', border: 'none', color: '#9CA3AF' }}>
                {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#9CA3AF' }}>
          Last changed: 14 March 2026
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader title="Security" />
        <ToggleRow icon={Zap} label="Two-factor authentication"
          description="Require a verification code in addition to your password when signing in"
          value={twoFA} onChange={setTwoFA} />
        <div className="flex items-center justify-between px-5 py-4 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <LogOut size={14} style={{ color: '#6B7280' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Sign out all devices</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                Revoke all active sessions except this one
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-xl cursor-pointer"
            style={{ fontSize: 12, fontWeight: 600, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Sign out all
          </button>
        </div>
      </div>

      <SaveBar onSave={save} />
      {saved && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl"
          style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Password updated</p>
        </div>
      )}
    </div>
  )
}

function DeleteTab() {
  const [confirmText, setConfirmText] = useState('')
  const [showModal, setShowModal]     = useState(false)
  const canDelete = confirmText === 'DELETE'

  return (
    <div className="flex flex-col gap-5" style={{ maxWidth: 600 }}>
      <div className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Before you delete</p>
        <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>
          Deleting your academy account is permanent and cannot be undone. Please review what will happen:
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {[
            'All member data, bookings and class history will be permanently deleted',
            'Active subscriptions will be cancelled immediately — no refunds issued',
            'Your Stripe connection will be disconnected',
            'All staff accounts linked to this academy will lose access',
            'Curriculum, grading records and reports will be erased',
            'You will lose access to this dashboard within 24 hours',
          ].map(item => (
            <li key={item} className="flex items-start gap-2.5">
              <X size={13} style={{ color: '#DC2626', marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#374151' }}>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
        <div className="flex items-center gap-3">
          <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#991B1B' }}>Danger Zone</p>
            <p style={{ fontSize: 12, color: '#B91C1C', marginTop: 1 }}>
              This action is irreversible. Your academy and all associated data will be permanently removed.
            </p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="self-start px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
          style={{ background: '#DC2626', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Trash2 size={14} />
          Delete Academy Account
        </button>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowModal(false); setConfirmText('') }}>
          <div className="rounded-2xl p-8 flex flex-col gap-5"
            style={{ background: '#fff', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <AlertTriangle size={18} style={{ color: '#DC2626' }} />
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Delete academy account</p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>This cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
              To confirm, type <strong>DELETE</strong> in the box below.
            </p>
            <input type="text" placeholder="Type DELETE to confirm"
              value={confirmText} onChange={e => setConfirmText(e.target.value)}
              style={{ ...inputStyle, border: '1.5px solid ' + (canDelete ? '#DC2626' : '#E5E7EB') }} />
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => { setShowModal(false); setConfirmText('') }}
                className="px-5 py-2.5 rounded-xl cursor-pointer"
                style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Cancel
              </button>
              <button disabled={!canDelete}
                className="px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
                style={{ fontSize: 13, fontWeight: 600, border: 'none',
                  background: canDelete ? '#DC2626' : '#FCA5A5', color: '#fff',
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

// ── Tabs config ────────────────────────────────────────────────────────────────
type TabId = 'profile' | 'school' | 'staff' | 'payments' | 'grading' | 'password' | 'delete'

const TABS: { id: TabId; label: string; icon: React.ElementType; danger?: boolean }[] = [
  { id: 'profile',  label: 'Profile',        icon: User         },
  { id: 'school',   label: 'School',          icon: Building2    },
  { id: 'staff',    label: 'Staff',           icon: Users2       },
  { id: 'payments', label: 'Payments',        icon: Wallet       },
  { id: 'grading',  label: 'Grading',         icon: GraduationCap },
  { id: 'password', label: 'Password',        icon: Lock         },
  { id: 'delete',   label: 'Delete Account',  icon: Trash2, danger: true },
]

// ── Main ───────────────────────────────────────────────────────────────────────
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

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Page header */}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                {t.settings.title}
              </h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                {t.settings.subtitle}
              </p>
            </div>

            {/* Horizontal tab strip */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <div className="flex items-center overflow-x-auto" style={{ borderBottom: '1px solid #E5E7EB' }}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id
                  return (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-2 px-5 py-4 shrink-0 cursor-pointer relative"
                      style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent',
                        color: tab.danger
                          ? isActive ? '#DC2626' : '#9CA3AF'
                          : isActive ? '#111827' : '#6B7280' }}>
                      <tab.icon size={14} style={{ color: tab.danger
                        ? isActive ? '#DC2626' : '#D1D5DB'
                        : isActive ? '#0071E3' : '#9CA3AF' }} />
                      {tab.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ height: 2, background: tab.danger ? '#DC2626' : '#0071E3',
                            borderRadius: '2px 2px 0 0' }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {content[activeTab]}
              </div>
            </div>
          </div>
      </main>
  )
}
