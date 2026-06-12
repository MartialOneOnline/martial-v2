'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Calendar, Shield, Edit2,
  Send, MoreHorizontal, Sparkles, CreditCard,
  BookOpen, TrendingUp, Clock, AlertCircle, ChevronRight,
  User, Heart, FileText, Dumbbell, X,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Booking = { id: string; className: string; date: string; status: string }
type Transaction = { id: string; amount: number; currency: string; method: string; status: string; date: string; description: string }
type MembershipInfo = { planName: string; status: string; expiresAt: string | null; price: number; interval: string | null }

type Profile = {
  memberId: string
  userId: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  dateOfBirth: string | null
  userCreatedAt: string
  belt: string
  beltDegree: number
  beltDate: string | null
  status: string
  role: string
  joinedAt: string | null
  emergencyContact: string | null
  medicalNotes: string | null
  notes: string | null
  schoolName: string
  bookings: Booking[]
  transactions: Transaction[]
  membership: MembershipInfo | null
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const BELT_COLORS: Record<string, { bg: string; color: string; bar: string }> = {
  Blanco: { bg: '#F9FAFB', color: '#374151', bar: '#D1D5DB' },
  Azul:   { bg: '#EFF6FF', color: '#2563EB', bar: '#2563EB' },
  Morado: { bg: '#F5F3FF', color: '#7C3AED', bar: '#7C3AED' },
  Marron: { bg: '#FEF3C7', color: '#92400E', bar: '#92400E' },
  Negro:  { bg: '#F3F4F6', color: '#111827', bar: '#111827' },
  White:  { bg: '#F9FAFB', color: '#374151', bar: '#D1D5DB' },
  Blue:   { bg: '#EFF6FF', color: '#2563EB', bar: '#2563EB' },
  Purple: { bg: '#F5F3FF', color: '#7C3AED', bar: '#7C3AED' },
  Brown:  { bg: '#FEF3C7', color: '#92400E', bar: '#92400E' },
  Black:  { bg: '#F3F4F6', color: '#111827', bar: '#111827' },
}

const BELT_ORDER = ['Blanco', 'Azul', 'Morado', 'Marron', 'Negro']

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE:   { bg: '#F0FDF4', color: '#16A34A', label: 'Active' },
  INACTIVE: { bg: '#F3F4F6', color: '#6B7280', label: 'Inactive' },
  PENDING:  { bg: '#FFFBEB', color: '#D97706', label: 'Pending' },
  ARCHIVED: { bg: '#FEF2F2', color: '#9CA3AF', label: 'Archived' },
  LEAD:     { bg: '#EEF2FF', color: '#6366F1', label: 'Lead' },
}

const TX_STATUS: Record<string, { bg: string; color: string }> = {
  PAID:    { bg: '#F0FDF4', color: '#16A34A' },
  PENDING: { bg: '#FFFBEB', color: '#D97706' },
  FAILED:  { bg: '#FEF2F2', color: '#DC2626' },
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13, color: '#111827',
  border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function age(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return now.getFullYear() - d.getFullYear() -
    (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
}

function monthsSince(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth())
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, ...style }}>
      {children}
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</p>
      {action}
    </div>
  )
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex flex-col items-center" style={{ padding: '24px 0', gap: 8 }}>
      <Icon size={24} style={{ color: '#E5E7EB' }} />
      <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>{text}</p>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>{hint}</p>}
    </div>
  )
}

// ── Edit Drawer ────────────────────────────────────────────────────────────────
function EditDrawer({
  profile, open, onClose, onSaved,
}: {
  profile: Profile
  open: boolean
  onClose: () => void
  onSaved: (updates: Partial<Profile>) => void
}) {
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [dob, setDob] = useState(profile.dateOfBirth?.substring(0, 10) ?? '')
  const [status, setStatus] = useState(profile.status)
  const [belt, setBelt] = useState(profile.belt)
  const [beltDegree, setBeltDegree] = useState(profile.beltDegree)
  const [beltDate, setBeltDate] = useState(profile.beltDate?.substring(0, 10) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(profile.name)
      setPhone(profile.phone ?? '')
      setDob(profile.dateOfBirth?.substring(0, 10) ?? '')
      setStatus(profile.status)
      setBelt(profile.belt)
      setBeltDegree(profile.beltDegree)
      setBeltDate(profile.beltDate?.substring(0, 10) ?? '')
      setError(null)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const save = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError(null)
    try {
      const [memberRes, userRes] = await Promise.all([
        fetch(`/api/dashboard/members/${profile.memberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, belt, beltDegree, beltDate: beltDate || null }),
        }),
        fetch(`/api/dashboard/users/${profile.userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone: phone.trim() || null,
            dateOfBirth: dob || null,
          }),
        }),
      ])
      if (!memberRes.ok || !userRes.ok) throw new Error('save failed')
      onSaved({
        name: name.trim(),
        phone: phone.trim() || null,
        dateOfBirth: dob ? new Date(dob).toISOString() : null,
        status,
        belt,
        beltDegree,
        beltDate: beltDate ? new Date(beltDate).toISOString() : null,
      })
      onClose()
    } catch {
      setError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const bc = BELT_COLORS[belt] ?? BELT_COLORS['Blanco']!

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)',
          opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease', zIndex: 40,
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Editar alumno</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{profile.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* Personal info */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Información personal
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Nombre completo">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label="Email" hint="El email es el identificador de acceso — no se puede cambiar aquí.">
              <input value={profile.email} disabled style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
            </Field>
            <Field label="Teléfono">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label="Fecha de nacimiento">
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label="Estado">
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PENDING">Pending</option>
                <option value="LEAD">Lead</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </Field>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', margin: '24px 0' }} />

          {/* Belt section */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            Cinturón & Progreso
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Visual belt selector */}
            <Field label="Cinturón">
              <div style={{ display: 'flex', gap: 6 }}>
                {BELT_ORDER.map(b => {
                  const bColor = BELT_COLORS[b]!
                  const selected = belt === b
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBelt(b)}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10,
                        border: `2px solid ${selected ? bColor.bar : '#E5E7EB'}`,
                        background: selected ? bColor.bg : '#fff',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      <div style={{
                        width: 32, height: 10, borderRadius: 999,
                        background: b === 'Blanco' ? '#E5E7EB' : bColor.bar,
                      }} />
                      <span style={{
                        fontSize: 10, fontWeight: selected ? 700 : 400,
                        color: selected ? bColor.color : '#9CA3AF',
                        whiteSpace: 'nowrap',
                      }}>
                        {b}
                      </span>
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Degree selector */}
            <Field label="Grados (rayas)">
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2, 3, 4].map(d => {
                  const selected = beltDegree === d
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBeltDegree(d)}
                      style={{
                        flex: 1, padding: '9px 0', borderRadius: 8,
                        border: `2px solid ${selected ? bc.bar : '#E5E7EB'}`,
                        background: selected ? bc.bg : '#fff',
                        cursor: 'pointer', fontSize: 13, fontWeight: selected ? 700 : 400,
                        color: selected ? bc.color : '#6B7280',
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>
                Número de rayas/grados en el cinturón actual
              </p>
            </Field>

            <Field label="Fecha de promoción">
              <input
                type="date"
                value={beltDate}
                onChange={e => setBeltDate(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div style={{ padding: '10px 24px', background: '#FEF2F2', borderTop: '1px solid #FEE2E2' }}>
            <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s' }}
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StudentProfileClient({ profile: initialProfile }: { profile: Profile }) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [notesValue, setNotesValue] = useState(initialProfile.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const belt = BELT_COLORS[profile.belt] ?? BELT_COLORS['Blanco']!
  const status = STATUS_MAP[profile.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: profile.status }
  const beltIdx = BELT_ORDER.indexOf(profile.belt)
  const beltProgress = beltIdx >= 0 ? ((beltIdx + (profile.beltDegree / 4)) / BELT_ORDER.length) * 100 : 0
  const memberMonths = profile.joinedAt ? monthsSince(profile.joinedAt) : null

  const handleSaved = (updates: Partial<Profile>) => {
    setProfile(prev => ({ ...prev, ...updates }))
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await fetch(`/api/dashboard/members/${profile.memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notesValue }),
    })
    setSavingNotes(false)
  }

  return (
    <main style={{ flex: 1, minWidth: 0, background: '#F9FAFB' }}>

      {/* Edit drawer */}
      <EditDrawer
        profile={profile}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => router.back()}
          className="flex items-center gap-2 cursor-pointer"
          style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B7280', padding: 0 }}>
          <ArrowLeft size={15} />
          Students
        </button>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{profile.name}</span>
      </div>

      <div className="px-4 md:px-8 py-6" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="grid gap-5" style={{ gridTemplateColumns: '300px 1fr' }}>

          {/* ── Left column ── */}
          <div className="flex flex-col gap-4">

            {/* Identity card */}
            <Card>
              <div className="flex flex-col items-center" style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #E5E7EB', marginBottom: 12 }} />
                ) : (
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#F3F4F6', border: '3px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 28, fontWeight: 700, color: '#374151' }}>{profile.name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{profile.name}</h2>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 10px' }}>{profile.schoolName}</p>
                <div className="flex items-center gap-2">
                  <span style={{ background: status.bg, color: status.color, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
                    {status.label}
                  </span>
                  <span style={{ background: belt.bg, color: belt.color, fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 999 }}>
                    {profile.belt}
                    {profile.beltDegree > 0 && ` ${'●'.repeat(profile.beltDegree)}`}
                  </span>
                </div>
              </div>

              {/* Contact info */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Mail size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151', wordBreak: 'break-all' }}>{profile.email}</span>
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{profile.phone}</span>
                  </div>
                )}
                {profile.dateOfBirth && (
                  <div className="flex items-center gap-2">
                    <User size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#374151' }}>{age(profile.dateOfBirth)} años · {fmt(profile.dateOfBirth)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    Desde {profile.joinedAt ? fmt(profile.joinedAt) : fmt(profile.userCreatedAt)}
                    {memberMonths !== null && memberMonths > 0 && (
                      <span style={{ color: '#9CA3AF' }}> · {memberMonths}m</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
                  <Edit2 size={12} /> Editar
                </button>
                <button style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 8, background: '#0071E3', color: '#fff', cursor: 'pointer' }}>
                  <Send size={12} /> Invitar
                </button>
                <button style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#6B7280', cursor: 'pointer' }}>
                  <MoreHorizontal size={14} />
                </button>
              </div>
            </Card>

            {/* Belt progress */}
            <Card>
              <CardHeader title="Cinturón & Progreso" action={
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit2 size={11} /> Editar
                </button>
              } />
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: belt.color }}>{profile.belt}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {profile.beltDegree}/4 grados
                </span>
              </div>
              {/* Belt bar */}
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${beltProgress}%`, background: belt.bar, borderRadius: 999, transition: 'width .5s' }} />
              </div>
              {/* Stripes */}
              <div className="flex gap-1.5" style={{ marginBottom: 12 }}>
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < profile.beltDegree ? belt.bar : '#F3F4F6' }} />
                ))}
              </div>
              {profile.beltDate && (
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                  Promovido el {fmt(profile.beltDate)}
                </p>
              )}
              <div style={{ marginTop: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Próximo cinturón</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0 0' }}>
                  {BELT_ORDER[beltIdx + 1] ?? '— (Cinturón negro)'}
                </p>
              </div>
            </Card>

            {/* Emergency & Medical */}
            {(profile.emergencyContact || profile.medicalNotes) && (
              <Card>
                <CardHeader title="Contacto & Salud" />
                {profile.emergencyContact && (
                  <div className="flex gap-2" style={{ marginBottom: 10 }}>
                    <Heart size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>Contacto de emergencia</p>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{profile.emergencyContact}</p>
                    </div>
                  </div>
                )}
                {profile.medicalNotes && (
                  <div className="flex gap-2">
                    <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>Notas médicas</p>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{profile.medicalNotes}</p>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* ── Right column ── */}
          <div className="flex flex-col gap-4">

            {/* AI Summary — placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, #0071E3 0%, #0E3A7A 100%)',
              borderRadius: 16, padding: 20, color: '#fff',
            }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                  <Sparkles size={16} style={{ color: '#7DE7EC' }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>AI Student Summary</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(125,231,236,0.2)', color: '#7DE7EC', padding: '2px 8px', borderRadius: 999 }}>PRÓXIMAMENTE</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                El asistente analizará la asistencia, pagos y progreso de <strong style={{ color: '#fff' }}>{profile.name}</strong> para darte un resumen accionable: alertas de abandono, progreso de cinturón y recomendaciones personalizadas.
              </p>
              <div className="flex gap-2" style={{ marginTop: 14 }}>
                {['Análisis de asistencia', 'Riesgo de churn', 'Belt readiness'].map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', padding: '3px 10px', borderRadius: 999 }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: Dumbbell, label: 'Clases totales', value: '—', sub: 'histórico' },
                { icon: TrendingUp, label: 'Asistencia', value: '—', sub: 'este mes' },
                { icon: Clock, label: 'Última clase', value: '—', sub: '' },
              ].map(s => (
                <Card key={s.label} style={{ padding: '14px 16px' }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <s.icon size={13} style={{ color: '#9CA3AF' }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</span>
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p>
                  {s.sub && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>{s.sub}</p>}
                </Card>
              ))}
            </div>

            {/* Membership */}
            <Card>
              <CardHeader title="Membresía" action={
                <button style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Ver todo <ChevronRight size={12} style={{ display: 'inline' }} />
                </button>
              } />
              {profile.membership ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>{profile.membership.planName}</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                      {profile.membership.expiresAt ? `Expira el ${fmt(profile.membership.expiresAt)}` : 'Sin fecha de expiración'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                      €{profile.membership.price}
                      <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>/{profile.membership.interval ?? 'mes'}</span>
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#16A34A', padding: '2px 10px', borderRadius: 999 }}>
                      {profile.membership.status}
                    </span>
                  </div>
                </div>
              ) : (
                <EmptyState icon={CreditCard} text="Sin membresía activa" />
              )}
            </Card>

            {/* Recent bookings + Transactions side by side */}
            <div className="grid grid-cols-2 gap-4">

              {/* Bookings */}
              <Card>
                <CardHeader title="Clases recientes" action={
                  <button style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todo</button>
                } />
                {profile.bookings.length === 0 ? (
                  <EmptyState icon={BookOpen} text="Sin clases registradas" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {profile.bookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{b.className}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{fmt(b.date)}</p>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#16A34A', padding: '2px 8px', borderRadius: 999 }}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader title="Pagos recientes" action={
                  <button style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todo</button>
                } />
                {profile.transactions.length === 0 ? (
                  <EmptyState icon={CreditCard} text="Sin transacciones" />
                ) : (
                  <div className="flex flex-col gap-2">
                    {profile.transactions.map(t => {
                      const ts = TX_STATUS[t.status] ?? { bg: '#F3F4F6', color: '#6B7280' }
                      return (
                        <div key={t.id} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid #F9FAFB' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{t.description}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{fmt(t.date)} · {t.method}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>€{t.amount.toFixed(2)}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, background: ts.bg, color: ts.color, padding: '1px 6px', borderRadius: 999 }}>{t.status}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Admin notes */}
            <Card>
              <CardHeader title="Notas internas" />
              <textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onBlur={saveNotes}
                placeholder="Añade notas privadas sobre este alumno (lesiones, objetivos, conversaciones…)"
                style={{
                  width: '100%', minHeight: 90, padding: '10px 12px', fontSize: 13, color: '#374151',
                  border: '1px solid #E5E7EB', borderRadius: 10, resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  background: '#FAFAFA', lineHeight: 1.6,
                }}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
              />
              <div className="flex items-center justify-between" style={{ marginTop: 8 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {savingNotes ? 'Guardando…' : 'Se guarda al salir del campo'}
                </span>
                <div className="flex items-center gap-1.5">
                  <FileText size={11} style={{ color: '#9CA3AF' }} />
                  <Shield size={11} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>Solo visible para el staff</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </main>
  )
}
