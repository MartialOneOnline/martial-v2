'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Mail, Phone, Calendar, Shield, Edit2,
  Send, MoreHorizontal, Sparkles, CreditCard,
  BookOpen, TrendingUp, Clock, AlertCircle, ChevronRight,
  User, Heart, FileText, Dumbbell, X, Plus, Check, CheckCircle,
  Archive, Trash2, Bell, FileSignature,
} from 'lucide-react'
import { fmtPrice } from '../../../../lib/format'
import NotificationBell from '../../../../components/NotificationBell'
import RowMenu from '../../../../components/RowMenu'
import SendWaiverModal from '../../../../components/SendWaiverModal'
import { useT } from '../../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../../lib/i18n/translations'

// ── Types ──────────────────────────────────────────────────────────────────────
type Booking = { id: string; className: string; date: string; status: string; attendedAt: string | null }
type Transaction = {
  id: string; amount: number; currency: string; method: string; status: string; date: string; description: string
  membershipId: string | null
}
type MembershipRecord = {
  id: string; planName: string; planType: string; billingCycle: string | null
  price: number; currency: string; status: string
  startDate: string; endDate: string | null; consumed: number
}
type ActiveMembership = {
  id: string; planName: string; planType: string; status: string; paymentMethod: string
  startDate: string; expiresAt: string | null
  price: number; currency?: string; interval: string | null; consumed: number
}
type AvailablePlan = {
  id: string; name: string; price: number; currency: string
  planType: string; billingCycle: string | null; validityDays: number | null
}

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
  beltRankId: string | null
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
  memberships: MembershipRecord[]
  activeMembership: ActiveMembership | null
  availablePlans: AvailablePlan[]
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

type BeltRankInfo = { id: string; name: string; color: string; maxDegrees: number; order: number }

// Derives a belt swatch style from a school's real BeltRank.color when ranks
// are configured, matching the visual shape of the hardcoded BELT_COLORS map.
function rankStyle(hexColor: string) {
  return { bg: `${hexColor}14`, color: hexColor, bar: hexColor }
}

function getStatusMap(t: Translations): Record<string, { bg: string; color: string; label: string }> {
  return {
    ACTIVE:   { bg: '#F0FDF4', color: '#16A34A', label: t.common.active },
    INACTIVE: { bg: '#F3F4F6', color: '#6B7280', label: t.common.inactive },
    PENDING:  { bg: '#FFFBEB', color: '#D97706', label: t.common.pending },
    ARCHIVED: { bg: '#FEF2F2', color: '#9CA3AF', label: t.common.archived },
    LEAD:     { bg: '#EEF2FF', color: '#6366F1', label: t.common.invited },
  }
}

function getTxStatusMap(t: Translations): Record<string, { bg: string; color: string; label: string }> {
  return {
    PAID:      { bg: '#F0FDF4', color: '#16A34A', label: t.common.paid },
    PENDING:   { bg: '#FFFBEB', color: '#D97706', label: t.common.pending },
    FAILED:    { bg: '#FEF2F2', color: '#DC2626', label: t.common.failed },
    REFUNDED:  { bg: '#EEF2FF', color: '#6366F1', label: t.common.refunded },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: t.common.cancelled },
    FLAGGED:   { bg: '#FEF2F2', color: '#DC2626', label: t.studentProfile.flaggedLabel },
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
type ToastMsg = { id: number; message: string; type: ToastType }

function ToastContainer({ toasts, onRemove }: { toasts: ToastMsg[]; onRemove: (id: number) => void }) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, minWidth: 260, maxWidth: 380,
          background: t.type === 'success' ? '#ECFDF5' : t.type === 'error' ? '#FEF2F2' : '#EFF6FF',
          border: `1px solid ${t.type === 'success' ? '#A7F3D0' : t.type === 'error' ? '#FECACA' : '#BFDBFE'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        }}>
          {t.type === 'success' && <CheckCircle size={16} style={{ color: '#16A34A', flexShrink: 0 }} />}
          {t.type === 'error' && <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />}
          {t.type === 'info' && <Bell size={16} style={{ color: '#2563EB', flexShrink: 0 }} />}
          <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', flex: 1 }}>{t.message}</span>
          <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const counter = useRef(0)

  const show = (message: string, type: ToastType = 'success', duration = 3500) => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }

  const remove = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

  return { toasts, show, remove }
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: 13, color: '#111827',
  border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function age(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return now.getFullYear() - d.getFullYear() -
    (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
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
  profile, open, onClose, onSaved, ranks,
}: {
  profile: Profile
  open: boolean
  onClose: () => void
  onSaved: (updates: Partial<Profile>) => void
  ranks: BeltRankInfo[]
}) {
  const tt = useT()
  const [name, setName] = useState(profile.name)
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [dob, setDob] = useState(profile.dateOfBirth?.substring(0, 10) ?? '')
  const [status, setStatus] = useState(profile.status)
  const [belt, setBelt] = useState(profile.belt)
  const [beltRankId, setBeltRankId] = useState(profile.beltRankId)
  const [beltDegree, setBeltDegree] = useState(profile.beltDegree)
  const [beltDate, setBeltDate] = useState(profile.beltDate?.substring(0, 10) ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasRanks = ranks.length > 0
  const selectedRank = ranks.find(r => r.id === beltRankId)
  const maxDegrees = selectedRank ? selectedRank.maxDegrees : 4

  useEffect(() => {
    if (open) {
      setName(profile.name)
      setPhone(profile.phone ?? '')
      setDob(profile.dateOfBirth?.substring(0, 10) ?? '')
      setStatus(profile.status)
      setBelt(profile.belt)
      setBeltRankId(profile.beltRankId)
      setBeltDegree(profile.beltDegree)
      setBeltDate(profile.beltDate?.substring(0, 10) ?? '')
      setError(null)
    }
  }, [open])

  function selectRank(rank: BeltRankInfo) {
    setBeltRankId(rank.id)
    setBelt(rank.name)
    setBeltDegree(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const save = async () => {
    if (!name.trim()) { setError(tt.studentProfile.nameRequired); return }
    setSaving(true)
    setError(null)
    try {
      const [memberRes, userRes] = await Promise.all([
        fetch(`/api/dashboard/members/${profile.memberId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, belt, beltRankId, beltDegree, beltDate: beltDate || null }),
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
        beltRankId,
        beltDegree,
        beltDate: beltDate ? new Date(beltDate).toISOString() : null,
      })
      onClose()
    } catch {
      setError(tt.studentProfile.saveError)
    } finally {
      setSaving(false)
    }
  }

  const bc = selectedRank ? rankStyle(selectedRank.color) : (BELT_COLORS[belt] ?? BELT_COLORS['Blanco']!)

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
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(480px, 100vw)',
        background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.1)',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 50, display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{tt.studentProfile.editStudentTitle}</p>
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
            {tt.studentProfile.personalInfo}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label={tt.studentProfile.fullName}>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label={tt.common.email} hint={tt.studentProfile.emailHint}>
              <input value={profile.email} disabled style={{ ...inputStyle, background: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
            </Field>
            <Field label={tt.common.phone}>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label={tt.studentProfile.dateOfBirth}>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#0071E3')}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              />
            </Field>
            <Field label={tt.studentProfile.statusField}>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="ACTIVE">{tt.common.active}</option>
                <option value="INACTIVE">{tt.common.inactive}</option>
                <option value="PENDING">{tt.common.pending}</option>
                <option value="LEAD">{tt.common.invited}</option>
                <option value="ARCHIVED">{tt.common.archived}</option>
              </select>
            </Field>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', margin: '24px 0' }} />

          {/* Belt section */}
          <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>
            {tt.studentProfile.beltProgressTitle}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Visual belt selector */}
            <Field label={tt.studentProfile.beltField}>
              <div style={{ display: 'flex', gap: 6 }}>
                {hasRanks ? ranks.map(rank => {
                  const rColor = rankStyle(rank.color)
                  const selected = beltRankId === rank.id
                  return (
                    <button
                      key={rank.id}
                      type="button"
                      onClick={() => selectRank(rank)}
                      style={{
                        flex: 1, padding: '10px 4px', borderRadius: 10,
                        border: `2px solid ${selected ? rColor.bar : '#E5E7EB'}`,
                        background: selected ? rColor.bg : '#fff',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s ease',
                        outline: 'none',
                      }}
                    >
                      <div style={{ width: 32, height: 10, borderRadius: 999, background: rColor.bar }} />
                      <span style={{
                        fontSize: 10, fontWeight: selected ? 700 : 400,
                        color: selected ? rColor.color : '#9CA3AF',
                        whiteSpace: 'nowrap',
                      }}>
                        {rank.name}
                      </span>
                    </button>
                  )
                }) : BELT_ORDER.map(b => {
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
            <Field label={tt.studentProfile.degreesField}>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: maxDegrees + 1 }, (_, d) => d).map(d => {
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
                {tt.studentProfile.degreesHint}
              </p>
            </Field>

            <Field label={tt.studentProfile.promotionDate}>
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
            {tt.common.cancel}
          </button>
          <button
            onClick={save}
            disabled={saving}
            style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 8, background: '#0071E3', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s' }}
          >
            {saving ? tt.studentProfile.saving : tt.studentProfile.saveChanges}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Medical Notes modal ──────────────────────────────────────────────────────────
function MedicalNotesModal({ profile, onClose, onSaved, showToast }: {
  profile: Profile
  onClose: () => void
  onSaved: (updates: Partial<Profile>) => void
  showToast: (message: string, type?: ToastType) => void
}) {
  const tt = useT()
  const [emergencyContact, setEmergencyContact] = useState(profile.emergencyContact ?? '')
  const [medicalNotes, setMedicalNotes] = useState(profile.medicalNotes ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/dashboard/members/${profile.memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyContact: emergencyContact.trim() || null,
          medicalNotes: medicalNotes.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      onSaved({ emergencyContact: emergencyContact.trim() || null, medicalNotes: medicalNotes.trim() || null })
      showToast(tt.studentProfile.medicalNotesSaved, 'success')
      onClose()
    } catch {
      showToast(tt.studentProfile.medicalNotesError, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 460, maxWidth: '95vw', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{tt.studentProfile.medicalNotesTitle}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-4">
          <Field label={tt.studentProfile.emergencyContact}>
            <input
              value={emergencyContact}
              onChange={e => setEmergencyContact(e.target.value)}
              placeholder={tt.studentProfile.emergencyContactPlaceholder}
              style={inputStyle}
            />
          </Field>
          <Field label={tt.studentProfile.medicalNotesTitle} hint={tt.studentProfile.medicalNotesHint}>
            <textarea
              value={medicalNotes}
              onChange={e => setMedicalNotes(e.target.value)}
              placeholder={tt.studentProfile.medicalNotesPlaceholder}
              style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
            />
          </Field>
        </div>

        <div className="flex gap-3 justify-end" style={{ marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            {tt.common.cancel}
          </button>
          <button onClick={save} disabled={saving}
            style={{ padding: '9px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
              background: saving ? '#93C5FD' : '#0071E3', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? tt.studentProfile.saving : tt.common.save}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Email composer modal ─────────────────────────────────────────────────────────
function EmailComposerModal({ profile, onClose, showToast }: {
  profile: Profile
  onClose: () => void
  showToast: (message: string, type?: ToastType) => void
}) {
  const tt = useT()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!subject.trim() || !message.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/dashboard/members/${profile.memberId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error) }
      showToast(tt.studentProfile.emailSentTo.replace('{email}', profile.email), 'success')
      onClose()
    } catch (e: unknown) {
      showToast(e instanceof Error && e.message ? e.message : tt.studentProfile.emailSendError, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 520, maxWidth: '95vw', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{tt.studentProfile.sendEmailTitle}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 20px' }}>{tt.studentProfile.toLabel} {profile.name} · {profile.email}</p>

        <div className="flex flex-col gap-4">
          <Field label={tt.school.emailSubject}>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={tt.studentProfile.subjectPlaceholder}
              style={inputStyle}
            />
          </Field>
          <Field label={tt.studentProfile.messageLabel}>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={tt.studentProfile.messagePlaceholder}
              style={{ ...inputStyle, minHeight: 160, resize: 'vertical' }}
            />
          </Field>
        </div>

        <div className="flex gap-3 justify-end" style={{ marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            {tt.common.cancel}
          </button>
          <button onClick={send} disabled={sending || !subject.trim() || !message.trim()}
            style={{ padding: '9px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
              background: sending || !subject.trim() || !message.trim() ? '#93C5FD' : '#0071E3',
              cursor: sending || !subject.trim() || !message.trim() ? 'not-allowed' : 'pointer' }}>
            {sending ? tt.studentProfile.sendingLabel : tt.common.send}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Attendance card modal ────────────────────────────────────────────────────────
type DayStatus = 'present' | 'absent' | 'promoted' | 'not_marked'
function getDayStatusDot(t: Translations): Record<DayStatus, { color: string; label: string }> {
  return {
    present:     { color: '#22C55E', label: t.studentProfile.statusPresent },
    absent:      { color: '#E11D48', label: t.studentProfile.statusAbsent },
    promoted:    { color: '#EAB308', label: t.studentProfile.statusPromoted },
    not_marked:  { color: '#9CA3AF', label: t.studentProfile.statusNotMarked },
  }
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function daysInMonth(year: number, monthIdx: number) {
  return new Date(year, monthIdx + 1, 0).getDate()
}

function AttendanceCardModal({ profile, belt, onClose }: {
  profile: Profile
  belt: { bg: string; color: string; bar: string }
  onClose: () => void
}) {
  const tt = useT()
  const monthNames = tt.classes.monthNames.split(',')
  const dayStatusDot = getDayStatusDot(tt)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [years, setYears] = useState<number[]>([currentYear])
  const [days, setDays] = useState<Record<string, DayStatus>>({})
  const [lastGradingDate, setLastGradingDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/dashboard/members/${profile.memberId}/attendance?year=${year}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return
        setDays(data.days ?? {})
        setLastGradingDate(data.lastGradingDate ?? null)
        if (Array.isArray(data.availableYears) && data.availableYears.length) setYears(data.availableYears)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profile.memberId, year])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 1120, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-3">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
              : <div style={{ width: 44, height: 44, borderRadius: 10, background: belt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} style={{ color: belt.color }} />
                </div>}
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{tt.studentProfile.attendanceCardTitle}</h3>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{profile.name}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        {/* Year tabs */}
        <div className="flex items-center gap-1" style={{ borderBottom: '1px solid #F3F4F6', marginBottom: 16 }}>
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)}
              style={{
                padding: '8px 14px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                color: y === year ? '#0071E3' : '#9CA3AF',
                borderBottom: y === year ? '2px solid #0071E3' : '2px solid transparent',
              }}>
              {tt.studentProfile.attendanceYear.replace('{year}', String(y))}
            </button>
          ))}
        </div>

        {lastGradingDate && (
          <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 14px' }}>
            {tt.studentProfile.lastGrading}: {fmt(lastGradingDate)}
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5" style={{ marginBottom: 16 }}>
          {(Object.entries(dayStatusDot) as [DayStatus, { color: string; label: string }][]).map(([key, s]) => (
            <div key={key} className="flex items-center gap-2">
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#374151' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div style={{ overflowX: 'auto', opacity: loading ? 0.5 : 1, transition: 'opacity 0.15s' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 1060, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#6B7280', color: '#fff', fontSize: 11, fontWeight: 600,
                  padding: '6px 10px', textAlign: 'left', minWidth: 90 }} />
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <th key={d} style={{ background: '#6B7280', color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 4px', minWidth: 30 }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthNames.map((monthName, monthIdx) => {
                const dim = daysInMonth(year, monthIdx)
                return (
                  <tr key={monthName}>
                    <td style={{ position: 'sticky', left: 0, background: '#F3F4F6', fontSize: 12, fontWeight: 600, color: '#374151',
                      padding: '6px 10px', whiteSpace: 'nowrap', border: '1px solid #E5E7EB' }}>
                      {monthName}
                    </td>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                      if (day > dim) return <td key={day} style={{ border: '1px solid #F3F4F6', background: '#FAFAFA' }} />
                      const key = `${year}-${pad2(monthIdx + 1)}-${pad2(day)}`
                      const status = days[key]
                      return (
                        <td key={day} style={{ border: '1px solid #F3F4F6', textAlign: 'center', padding: '4px 0' }}>
                          {status && (
                            <span style={{ width: 10, height: 10, borderRadius: '50%', display: 'inline-block', background: dayStatusDot[status].color }} />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
// ── Booking status map ─────────────────────────────────────────────────────────
function getBookingStatusMap(t: Translations): Record<string, { bg: string; color: string; label: string }> {
  return {
    CONFIRMED:  { bg: '#EFF6FF', color: '#2563EB', label: t.studentProfile.confirmedLabel },
    PENDING:    { bg: '#FFFBEB', color: '#D97706', label: t.common.pending },
    COMPLETED:  { bg: '#F0FDF4', color: '#16A34A', label: t.studentProfile.attendedLabel },
    CANCELLED:  { bg: '#F3F4F6', color: '#9CA3AF', label: t.common.cancelled },
    NO_SHOW:    { bg: '#FEF2F2', color: '#DC2626', label: t.studentProfile.noShowLabel },
  }
}

function getMemStatusMap(t: Translations): Record<string, { bg: string; color: string; label: string }> {
  return {
    ACTIVE:    { bg: '#F0FDF4', color: '#16A34A', label: t.common.active },
    PAUSED:    { bg: '#FFFBEB', color: '#D97706', label: t.studentProfile.pausedLabel },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: t.common.cancelled },
    EXPIRED:   { bg: '#FEF2F2', color: '#9CA3AF', label: t.studentProfile.expiredLabel },
  }
}

// ── Assign Plan Modal ──────────────────────────────────────────────────────────
function AssignPlanModal({ memberId, plans, onClose, onAssigned }: {
  memberId: string
  plans: AvailablePlan[]
  onClose: () => void
  onAssigned: (m: ActiveMembership) => void
}) {
  const tt = useT()
  const [planId, setPlanId] = useState(plans[0]?.id ?? '')
  const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10))
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [endDateOverride, setEndDateOverride] = useState('')
  const [endDateTouched, setEndDateTouched] = useState(false)

  const selected = plans.find(p => p.id === planId)
  const sym = (c: string) => c === 'EUR' ? '€' : c === 'USD' ? '$' : c === 'GBP' ? '£' : c

  // Compute preview end date based on selected plan
  const previewEndDate = (() => {
    if (!selected) return null
    const start = new Date(startDate)
    if (selected.planType === 'SUBSCRIPTION') {
      const end = new Date(start)
      switch (selected.billingCycle) {
        case 'monthly':    end.setMonth(end.getMonth() + 1); break
        case 'quarterly':  end.setMonth(end.getMonth() + 3); break
        case 'annual':     end.setFullYear(end.getFullYear() + 1); break
        case 'two-weekly': end.setDate(end.getDate() + 14); break
        default: return null
      }
      return end
    }
    if (selected.validityDays) {
      const end = new Date(start)
      end.setDate(end.getDate() + selected.validityDays)
      return end
    }
    return null
  })()

  // Cash payments can override the computed end date — keep the override
  // field following the computed default until the admin manually edits it.
  useEffect(() => {
    if (endDateTouched) return
    setEndDateOverride(previewEndDate ? previewEndDate.toISOString().substring(0, 10) : '')
  }, [planId, startDate, endDateTouched]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!planId) { setError(tt.studentProfile.selectPlanError); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/dashboard/members/${memberId}/membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId, startDate, paymentMethod, notes: notes.trim() || undefined,
          ...(paymentMethod === 'CASH' && endDateOverride ? { endDate: endDateOverride } : {}),
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? tt.common.error); }
      const data = await res.json()
      onAssigned({
        id: data.id,
        planName: data.plan?.name ?? data.planName,
        planType: data.plan?.planType ?? 'SUBSCRIPTION',
        status: data.status,
        paymentMethod: data.paymentMethod,
        startDate: data.startDate,
        expiresAt: data.endDate ?? null,
        price: Number(data.price),
        interval: data.plan?.billingCycle ?? null,
        consumed: 0,
      })
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tt.common.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '95vw', maxHeight: '90vh', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflowY: 'auto' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{tt.studentProfile.assignPlanTitle}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={18} /></button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Plan selector */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>{tt.studentProfile.planLabel}</label>
            <div className="flex flex-col gap-2">
              {plans.map(p => (
                <button key={p.id} onClick={() => setPlanId(p.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                    border: planId === p.id ? '2px solid #0071E3' : '1px solid #E5E7EB',
                    background: planId === p.id ? '#EFF6FF' : '#fff' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>
                      {p.planType === 'TRIAL' ? tt.studentProfile.trialLabel : p.planType === 'SINGLE_PASS' ? tt.studentProfile.singlePassLabel : tt.studentProfile.subscriptionLabel}
                      {p.validityDays ? ` · ${p.validityDays} ${tt.studentProfile.daysSuffix}` : p.billingCycle ? ` · ${p.billingCycle}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                      {fmtPrice(p.price, p.currency)}
                    </span>
                    {planId === p.id && <Check size={14} style={{ color: '#0071E3' }} />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start date + payment */}
          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{tt.studentProfile.startDateLabel}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{tt.studentProfile.paymentMethodLabel}</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none' }}>
                <option value="CASH">{tt.studentProfile.cashLabel}</option>
                <option value="BANK_TRANSFER">{tt.studentProfile.bankTransferLabel}</option>
                <option value="STRIPE">{tt.studentProfile.stripeLabel}</option>
              </select>
            </div>
          </div>

          {previewEndDate && paymentMethod === 'CASH' && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                {selected?.planType === 'SUBSCRIPTION' ? tt.studentProfile.nextRenewal : tt.studentProfile.expiresLabel}
              </label>
              <input type="date" value={endDateOverride}
                onChange={e => { setEndDateOverride(e.target.value); setEndDateTouched(true) }}
                style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none' }} />
            </div>
          )}

          {previewEndDate && paymentMethod !== 'CASH' && (
            <p style={{ fontSize: 12, color: '#6B7280', background: '#F9FAFB', padding: '8px 12px', borderRadius: 8, margin: 0 }}>
              {selected?.planType === 'SUBSCRIPTION' ? tt.studentProfile.nextRenewal : tt.studentProfile.expiresLabel}:{' '}
              <strong>{previewEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
            </p>
          )}

          {/* Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>{tt.common.description} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>{tt.studentProfile.notesOptional}</span></label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={tt.studentProfile.notesPlaceholderPlan}
              style={{ width: '100%', padding: '8px 12px', fontSize: 13, border: '1px solid #E5E7EB', borderRadius: 8, outline: 'none' }}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 12, marginBottom: 0 }}>{error}</p>}

        <div className="flex gap-3 justify-end" style={{ marginTop: 20 }}>
          <button onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 600, color: '#374151', background: '#fff', cursor: 'pointer' }}>
            {tt.common.cancel}
          </button>
          <button onClick={save} disabled={saving || !planId}
            style={{ padding: '9px 24px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
              background: saving || !planId ? '#93C5FD' : '#0071E3', cursor: saving || !planId ? 'not-allowed' : 'pointer' }}>
            {saving ? tt.studentProfile.assigning : tt.studentProfile.assignPlanBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Membership Section ─────────────────────────────────────────────────────────
function MembershipSection({
  memberId, activeMembership: initialActiveMembership, memberships: initialMemberships, availablePlans,
  pendingRenewal, onAssigned, onRenewalCreated, onRenewalPaid, onRenewalCancelled, onCancelled,
}: {
  memberId: string
  activeMembership: ActiveMembership | null
  memberships: MembershipRecord[]
  availablePlans: AvailablePlan[]
  pendingRenewal: Transaction | null
  onAssigned: (m: ActiveMembership) => void
  onRenewalCreated: (t: Transaction) => void
  onRenewalPaid: (transactionId: string, newEndDate: string | null) => void
  onRenewalCancelled: (transactionId: string) => void
  onCancelled: (membershipId: string) => void
}) {
  const tt = useT()
  const memStatusMap = getMemStatusMap(tt)
  const [activeMembership, setActiveMembership] = useState(initialActiveMembership)
  const [memberships, setMemberships] = useState(initialMemberships)
  const [showModal, setShowModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [creatingRenewal, setCreatingRenewal] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [cancellingRenewal, setCancellingRenewal] = useState(false)
  const [editingDates, setEditingDates] = useState(false)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [savingDates, setSavingDates] = useState(false)
  const [dateError, setDateError] = useState<string | null>(null)

  const isPastDue = !!(activeMembership?.expiresAt && new Date(activeMembership.expiresAt) < new Date())

  async function handleCreateRenewalPayment() {
    if (!activeMembership) return
    setCreatingRenewal(true)
    try {
      const res = await fetch(`/api/dashboard/members/${memberId}/membership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: activeMembership.id, action: 'createRenewalPayment' }),
      })
      if (res.ok) {
        const txn = await res.json()
        onRenewalCreated({
          id: txn.id,
          amount: Number(txn.amount),
          currency: txn.currency,
          method: txn.paymentMethod ?? 'CASH',
          status: txn.status,
          date: txn.date,
          description: txn.description ?? '',
          membershipId: txn.membershipId,
        })
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? tt.studentProfile.couldNotCreateRenewal)
      }
    } finally {
      setCreatingRenewal(false)
    }
  }

  async function handleMarkPaid() {
    if (!pendingRenewal) return
    setMarkingPaid(true)
    try {
      const res = await fetch(`/api/dashboard/members/${memberId}/membership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: pendingRenewal.id, action: 'markRenewalPaid' }),
      })
      if (res.ok) {
        const m = await res.json()
        const newEndDate = m.endDate ?? null
        setActiveMembership(prev => prev ? { ...prev, expiresAt: newEndDate, status: m.status } : prev)
        onRenewalPaid(pendingRenewal.id, newEndDate)
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? tt.studentProfile.couldNotMarkPaid)
      }
    } finally {
      setMarkingPaid(false)
    }
  }

  async function handleCancelRenewal() {
    if (!pendingRenewal || !confirm(tt.studentProfile.cancelRenewalConfirm)) return
    setCancellingRenewal(true)
    try {
      const res = await fetch(`/api/dashboard/transactions/${pendingRenewal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (res.ok) {
        onRenewalCancelled(pendingRenewal.id)
      } else {
        const d = await res.json().catch(() => ({}))
        alert(d.error ?? tt.studentProfile.couldNotCancelPayment)
      }
    } finally {
      setCancellingRenewal(false)
    }
  }

  function openDateEdit() {
    if (!activeMembership) return
    setEditStart(activeMembership.startDate.slice(0, 10))
    setEditEnd(activeMembership.expiresAt ? activeMembership.expiresAt.slice(0, 10) : '')
    setDateError(null)
    setEditingDates(true)
  }

  async function handleSaveDates() {
    if (!activeMembership) return
    setDateError(null)
    setSavingDates(true)
    try {
      const res = await fetch(`/api/dashboard/memberships/${activeMembership.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateDates',
          startDate: editStart,
          endDate: editEnd || null,
        }),
      })
      if (res.ok) {
        const m = await res.json()
        setActiveMembership(prev => prev ? { ...prev, startDate: m.startDate, expiresAt: m.endDate } : prev)
        setMemberships(prev => prev.map(mem => mem.id === activeMembership.id ? { ...mem, startDate: m.startDate, endDate: m.endDate } : mem))
        setEditingDates(false)
      } else {
        const d = await res.json().catch(() => ({}))
        setDateError(d.error ?? tt.studentProfile.couldNotUpdateDates)
      }
    } finally {
      setSavingDates(false)
    }
  }

  async function handleCancel() {
    if (!activeMembership || !confirm(tt.studentProfile.cancelMembershipConfirm)) return
    setCancelling(true)
    try {
      const res = await fetch(`/api/dashboard/members/${memberId}/membership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId: activeMembership.id, action: 'cancel' }),
      })
      if (res.ok) {
        const updated: MembershipRecord = {
          id: activeMembership.id,
          planName: activeMembership.planName,
          planType: 'SUBSCRIPTION',
          billingCycle: activeMembership.interval,
          price: activeMembership.price,
          currency: 'EUR',
          status: 'CANCELLED',
          startDate: activeMembership.startDate,
          endDate: activeMembership.expiresAt,
          consumed: activeMembership.consumed,
        }
        setActiveMembership(null)
        setMemberships(prev => prev.map(m => m.id === activeMembership.id ? updated : m))
        onCancelled(activeMembership.id)
      }
    } finally {
      setCancelling(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{tt.studentProfile.membershipTitle}</p>
        <div className="flex items-center gap-2">
          {activeMembership && activeMembership.paymentMethod === 'CASH' && !pendingRenewal && (
            <button onClick={handleCreateRenewalPayment} disabled={creatingRenewal}
              className="flex items-center gap-1"
              style={{ fontSize: 12, fontWeight: 600, color: '#D97706', background: '#FFFBEB', border: 'none',
                padding: '5px 10px', borderRadius: 8, cursor: creatingRenewal ? 'not-allowed' : 'pointer', opacity: creatingRenewal ? 0.6 : 1 }}>
              <Plus size={11} />
              {creatingRenewal ? tt.studentProfile.adding : tt.studentProfile.paymentBtn}
            </button>
          )}
          {activeMembership && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex items-center gap-1"
              style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', border: 'none',
                padding: '5px 10px', borderRadius: 8, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.6 : 1 }}>
              <X size={11} />
              {cancelling ? tt.studentProfile.cancelling : tt.common.cancel}
            </button>
          )}
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', background: '#EFF6FF', border: 'none',
              padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}>
            <Plus size={12} />
            {activeMembership ? tt.studentProfile.changePlan : tt.studentProfile.assignPlanBtn}
          </button>
        </div>
      </div>

      {activeMembership ? (
        <div>
          {/* Active plan card */}
          <div style={{
            background: isPastDue ? '#FFFBEB' : '#F0FDF4',
            border: `1px solid ${isPastDue ? '#FDE68A' : '#BBF7D0'}`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 12,
          }}>
            <div className="flex items-start justify-between">
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{activeMembership.planName}</p>
                {editingDates ? (
                  <div style={{ marginTop: 4 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1" style={{ fontSize: 11, color: '#6B7280' }}>
                        {tt.studentProfile.startDateLabel}
                        <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                          style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid #D1D5DB' }} />
                      </label>
                      <label className="flex items-center gap-1" style={{ fontSize: 11, color: '#6B7280' }}>
                        {tt.studentProfile.expiresLabel}
                        <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                          style={{ fontSize: 12, padding: '3px 6px', borderRadius: 6, border: '1px solid #D1D5DB' }} />
                      </label>
                      <button onClick={handleSaveDates} disabled={savingDates}
                        style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#16A34A', border: 'none',
                          padding: '4px 10px', borderRadius: 6, cursor: savingDates ? 'not-allowed' : 'pointer', opacity: savingDates ? 0.6 : 1 }}>
                        {savingDates ? tt.studentProfile.saving : tt.common.save}
                      </button>
                      <button onClick={() => setEditingDates(false)} disabled={savingDates}
                        style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px' }}>
                        {tt.common.cancel}
                      </button>
                    </div>
                    {dateError && <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0' }}>{dateError}</p>}
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5" style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>
                    {tt.studentProfile.started} {new Date(activeMembership.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    {activeMembership.expiresAt && ` · ${tt.studentProfile.expiresLabel} ${new Date(activeMembership.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                    {activeMembership.paymentMethod === 'CASH' && (
                      <button onClick={openDateEdit} title={tt.studentProfile.editDatesTitle}
                        style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF' }}>
                        <Edit2 size={11} />
                      </button>
                    )}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  {activeMembership.price === 0 ? tt.studentProfile.free : fmtPrice(activeMembership.price, activeMembership.currency ?? 'EUR')}
                  {activeMembership.interval && <span style={{ fontSize: 11, fontWeight: 400, color: '#9CA3AF' }}>/{activeMembership.interval}</span>}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: '#fff', padding: '2px 10px', borderRadius: 999,
                  background: isPastDue ? '#D97706' : '#16A34A',
                }}>
                  {isPastDue ? tt.studentProfile.renewalDue : tt.common.active}
                </span>
              </div>
            </div>

            {/* Usage bar — only for class-pack plans (SINGLE_PASS/TRIAL); a
                SUBSCRIPTION membership is unlimited, so "classes used" has
                no ceiling to show progress against. */}
            {activeMembership.planType !== 'SUBSCRIPTION' && activeMembership.consumed > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="flex justify-between" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6B7280' }}>{tt.studentProfile.classesUsedLabel}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{activeMembership.consumed}</span>
                </div>
                <div style={{ height: 4, background: '#D1FAE5', borderRadius: 999 }}>
                  <div style={{ height: '100%', width: '100%', background: '#16A34A', borderRadius: 999 }} />
                </div>
              </div>
            )}

            {/* Pending renewal payment — cash memberships only */}
            {pendingRenewal && (
              <div style={{
                marginTop: 12, paddingTop: 12, borderTop: '1px solid #FDE68A',
              }}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
                    {tt.studentProfile.renewalPendingText.replace('{amount}', fmtPrice(pendingRenewal.amount, pendingRenewal.currency))}
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowModal(true)}
                      style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 6px' }}>
                      {tt.studentProfile.createNewInstead}
                    </button>
                    <button onClick={handleCancelRenewal} disabled={cancellingRenewal}
                      style={{ fontSize: 12, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', border: 'none',
                        padding: '6px 12px', borderRadius: 8, cursor: cancellingRenewal ? 'not-allowed' : 'pointer', opacity: cancellingRenewal ? 0.6 : 1 }}>
                      {cancellingRenewal ? tt.studentProfile.cancelling : tt.studentProfile.cancelPayment}
                    </button>
                    <button onClick={handleMarkPaid} disabled={markingPaid}
                      style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: '#D97706', border: 'none',
                        padding: '6px 12px', borderRadius: 8, cursor: markingPaid ? 'not-allowed' : 'pointer', opacity: markingPaid ? 0.6 : 1 }}>
                      {markingPaid ? tt.studentProfile.marking : tt.studentProfile.markAsPaid}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History toggle */}
          {memberships.length > 1 && (
            <button onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-1.5"
              style={{ fontSize: 12, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ChevronRight size={13} style={{ transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
              {showHistory ? tt.studentProfile.hideHistory : tt.studentProfile.showHistory} {tt.studentProfile.historyPrevious.replace('{n}', String(memberships.length - 1))}
            </button>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <CreditCard size={28} style={{ color: '#E5E7EB', marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 12px' }}>{tt.studentProfile.noActiveMembership}</p>
          {availablePlans.length > 0 && (
            <button onClick={() => setShowModal(true)}
              style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', background: '#EFF6FF', border: 'none',
                padding: '7px 16px', borderRadius: 8, cursor: 'pointer' }}>
              {tt.studentProfile.assignAPlan}
            </button>
          )}
        </div>
      )}

      {/* History list */}
      {showHistory && memberships.filter(m => m.status !== 'ACTIVE').length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>{tt.studentProfile.historyTitle}</p>
          <div className="flex flex-col gap-2">
            {memberships.filter(m => m.status !== 'ACTIVE').map(m => {
              const ms = memStatusMap[m.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: m.status }
              return (
                <div key={m.id} className="flex items-center justify-between"
                  style={{ padding: '8px 10px', borderRadius: 8, background: '#F9FAFB' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{m.planName}</p>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>
                      {new Date(m.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {m.endDate && ` → ${new Date(m.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      {m.planType !== 'SUBSCRIPTION' && m.consumed > 0 && ` · ${m.consumed} ${tt.studentProfile.classesSuffix}`}
                    </p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, background: ms.bg, color: ms.color, padding: '2px 8px', borderRadius: 999 }}>
                    {ms.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showModal && (
        <AssignPlanModal
          memberId={memberId}
          plans={availablePlans}
          onClose={() => setShowModal(false)}
          onAssigned={m => {
            setActiveMembership(m)
            setMemberships(prev => [
              { id: m.id, planName: m.planName, planType: 'SUBSCRIPTION', billingCycle: m.interval,
                price: m.price, currency: 'EUR', status: 'ACTIVE',
                startDate: m.startDate, endDate: m.expiresAt, consumed: 0 },
              ...prev.map(p => p.status === 'ACTIVE' ? { ...p, status: 'CANCELLED' } : p),
            ])
            onAssigned(m)
            setShowModal(false)
          }}
        />
      )}
    </Card>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StudentProfileClient({ profile: initialProfile, ranks, hideOwnBellOnDesktop }: { profile: Profile; ranks: BeltRankInfo[]; hideOwnBellOnDesktop?: boolean }) {
  const tt = useT()
  const statusMap = getStatusMap(tt)
  const txStatusMap = getTxStatusMap(tt)
  const bookingStatusMap = getBookingStatusMap(tt)
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [notesValue, setNotesValue] = useState(initialProfile.notes ?? '')
  const [savingNotes, setSavingNotes] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [medicalModalOpen, setMedicalModalOpen] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [waiverModalOpen, setWaiverModalOpen] = useState(false)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resending, setResending] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toasts, show: showToast, remove: removeToast } = useToast()
  const [activeMembership, setActiveMembership] = useState(initialProfile.activeMembership)
  const [memberships, setMemberships] = useState(initialProfile.memberships)
  const [bookings] = useState(initialProfile.bookings)
  const [transactions, setTransactions] = useState(initialProfile.transactions)
  const [markingTxId, setMarkingTxId] = useState<string | null>(null)
  const [cancellingTxId, setCancellingTxId] = useState<string | null>(null)
  const pendingRenewal = activeMembership
    ? transactions.find(t => t.membershipId === activeMembership.id && t.status === 'PENDING') ?? null
    : null
  const [bookingsShown, setBookingsShown] = useState(10)

  // bookings arrives sorted desc by date (see page.tsx), so filtering preserves order
  const attendedBookings = bookings.filter(b => b.status === 'COMPLETED')
  const totalClasses = attendedBookings.length
  const now = new Date()
  // Rolling 30-day window rather than calendar month — a calendar-month count
  // reads as "0" (looks broken) for the first days of a new month even when
  // the student trains regularly.
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const attendanceLast30Days = attendedBookings.filter(b => new Date(b.date) >= thirtyDaysAgo).length
  const lastClassDate = attendedBookings[0]?.date ?? null
  const [txShown, setTxShown] = useState(10)

  const hasRanks = ranks.length > 0
  const currentRank = ranks.find(r => r.id === profile.beltRankId)
  const belt = currentRank ? rankStyle(currentRank.color) : (BELT_COLORS[profile.belt] ?? BELT_COLORS['Blanco']!)
  const status = statusMap[profile.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: profile.status }
  const beltIdx = hasRanks
    ? (currentRank ? currentRank.order : -1)
    : BELT_ORDER.indexOf(profile.belt)
  const beltCount = hasRanks ? ranks.length : BELT_ORDER.length
  const beltMaxDegrees = currentRank ? currentRank.maxDegrees : 4
  const beltProgress = beltIdx >= 0 ? ((beltIdx + (profile.beltDegree / (beltMaxDegrees || 4))) / beltCount) * 100 : 0
  const nextRankName = hasRanks
    ? (ranks.find(r => r.order === beltIdx + 1)?.name ?? tt.studentProfile.lastBeltPlaceholder)
    : (BELT_ORDER[beltIdx + 1] ?? tt.studentProfile.lastBeltPlaceholder)
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

  const handleResendInvite = async () => {
    setResending(true)
    try {
      const res = await fetch(`/api/dashboard/members/${profile.memberId}/resend-invite`, { method: 'POST' })
      showToast(res.ok ? tt.studentProfile.inviteResentTo.replace('{email}', profile.email) : tt.studentProfile.inviteResendError, res.ok ? 'success' : 'error')
    } catch {
      showToast(tt.studentProfile.inviteResendError, 'error')
    } finally {
      setResending(false)
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const res = await fetch(`/api/dashboard/members/${profile.memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      })
      if (!res.ok) throw new Error()
      setProfile(prev => ({ ...prev, status: 'ARCHIVED' }))
      showToast(tt.studentProfile.studentArchived, 'success')
    } catch {
      showToast(tt.studentProfile.archiveError, 'error')
    } finally {
      setArchiving(false)
    }
  }

  const handleMarkTxPaid = async (txId: string) => {
    setMarkingTxId(txId)
    try {
      const res = await fetch(`/api/dashboard/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) throw new Error()
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: 'PAID' } : tx))
      showToast(tt.studentProfile.paymentMarkedPaid, 'success')
    } catch {
      showToast(tt.studentProfile.paymentMarkPaidError, 'error')
    } finally {
      setMarkingTxId(null)
    }
  }

  const handleCancelTx = async (txId: string) => {
    if (!confirm(tt.studentProfile.cancelTxConfirm)) return
    setCancellingTxId(txId)
    try {
      const res = await fetch(`/api/dashboard/transactions/${txId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!res.ok) throw new Error()
      setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: 'CANCELLED' } : tx))
      showToast(tt.studentProfile.paymentCancelled, 'success')
    } catch {
      showToast(tt.studentProfile.paymentCancelError, 'error')
    } finally {
      setCancellingTxId(null)
    }
  }

  const handleDeleteUser = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/dashboard/members/${profile.memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/dashboard/users')
    } catch {
      showToast(tt.studentProfile.deleteError, 'error')
      setDeleting(false)
    }
  }

  return (
    <main style={{ flex: 1, minWidth: 0, background: '#F9FAFB' }}>

      {/* Edit drawer */}
      <EditDrawer
        profile={profile}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        ranks={ranks}
      />

      {medicalModalOpen && (
        <MedicalNotesModal
          profile={profile}
          onClose={() => setMedicalModalOpen(false)}
          onSaved={handleSaved}
          showToast={showToast}
        />
      )}

      {emailModalOpen && (
        <EmailComposerModal
          profile={profile}
          onClose={() => setEmailModalOpen(false)}
          showToast={showToast}
        />
      )}

      {waiverModalOpen && (
        <SendWaiverModal
          mode="single"
          member={{ id: profile.userId, name: profile.name, email: profile.email, avatarUrl: profile.avatarUrl }}
          onClose={() => setWaiverModalOpen(false)}
          onSuccess={() => { showToast(tt.studentProfile.waiverSentTo.replace('{name}', profile.name), 'success'); setWaiverModalOpen(false) }}
        />
      )}

      {attendanceModalOpen && (
        <AttendanceCardModal
          profile={profile}
          belt={belt}
          onClose={() => setAttendanceModalOpen(false)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button onClick={() => router.back()}
          className="flex items-center gap-2 cursor-pointer"
          style={{ background: 'none', border: 'none', fontSize: 13, color: '#6B7280', padding: 0 }}>
          <ArrowLeft size={15} />
          {tt.studentProfile.backToStudents}
        </button>
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{profile.name}</span>
        <div className="flex-1" />
        {!hideOwnBellOnDesktop && <NotificationBell />}
      </div>

      <div className="px-4 md:px-8 py-6" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-[300px_1fr]">

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
                    <span style={{ fontSize: 13, color: '#374151' }}>{tt.studentProfile.yearsOld.replace('{n}', String(age(profile.dateOfBirth)))} · {fmt(profile.dateOfBirth)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>
                    {tt.studentProfile.memberSince.replace('{date}', profile.joinedAt ? fmt(profile.joinedAt) : fmt(profile.userCreatedAt))}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#374151', cursor: 'pointer' }}>
                  <Edit2 size={12} /> {tt.studentProfile.editBtn}
                </button>
                <button
                  onClick={() => setEmailModalOpen(true)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 8, background: '#0071E3', color: '#fff', cursor: 'pointer' }}>
                  <Send size={12} /> {tt.studentProfile.sendBtn}
                </button>
                <RowMenu trigger={({ onClick }) => (
                  <button
                    onClick={e => { setConfirmDelete(false); onClick(e) }}
                    style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', color: '#6B7280', cursor: 'pointer' }}>
                    <MoreHorizontal size={14} />
                  </button>
                )}>
                  <div style={{
                    minWidth: 200, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.10)', padding: '4px 0',
                  }}>
                    {profile.status === 'PENDING' && (
                      <button
                        onClick={handleResendInvite}
                        disabled={resending}
                        className="w-full flex items-center gap-2 cursor-pointer"
                        style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#374151', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Send size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                        {resending ? tt.studentProfile.resending : tt.studentProfile.resendInvite}
                      </button>
                    )}
                    <button
                      onClick={() => setMedicalModalOpen(true)}
                      className="w-full flex items-center gap-2 cursor-pointer"
                      style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#374151', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Heart size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                      {tt.studentProfile.medicalNotesMenu}
                    </button>

                    <button
                      onClick={() => setWaiverModalOpen(true)}
                      className="w-full flex items-center gap-2 cursor-pointer"
                      style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#374151', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <FileSignature size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                      {tt.studentProfile.sendWaiverMenu}
                    </button>

                    <div style={{ height: 1, background: '#F3F4F6', margin: '4px 0' }} />

                    <button
                      onClick={handleArchive}
                      disabled={archiving}
                      className="w-full flex items-center gap-2 cursor-pointer"
                      style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#374151', background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <Archive size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
                      {archiving ? tt.studentProfile.archiving : tt.studentProfile.archiveMenu}
                    </button>

                    {!confirmDelete ? (
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                        className="w-full flex items-center gap-2 cursor-pointer"
                        style={{ padding: '8px 14px', fontSize: 13, border: 'none', textAlign: 'left', color: '#DC2626', background: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <Trash2 size={13} style={{ flexShrink: 0 }} />
                        {tt.studentProfile.deleteMenu}
                      </button>
                    ) : (
                      <div onClick={e => e.stopPropagation()} style={{ padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ margin: 0, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>{tt.studentProfile.confirmDeleteTitle}</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={handleDeleteUser}
                            disabled={deleting}
                            style={{ flex: 1, padding: '5px 0', fontSize: 12, fontWeight: 600, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                            {deleting ? tt.studentProfile.deleting : tt.studentProfile.yesDelete}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                            style={{ flex: 1, padding: '5px 0', fontSize: 12, background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                            {tt.common.cancel}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </RowMenu>
              </div>
            </Card>

            {/* Belt progress */}
            <Card>
              <CardHeader title={tt.studentProfile.beltProgressTitle} action={
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ fontSize: 12, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit2 size={11} /> {tt.studentProfile.editBtn}
                </button>
              } />
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: belt.color }}>{profile.belt}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {profile.beltDegree}/{beltMaxDegrees || 4} {tt.studentProfile.degreesShort}
                </span>
              </div>
              {/* Belt bar */}
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ height: '100%', width: `${beltProgress}%`, background: belt.bar, borderRadius: 999, transition: 'width .5s' }} />
              </div>
              {/* Stripes */}
              <div className="flex gap-1.5" style={{ marginBottom: 12 }}>
                {Array.from({ length: beltMaxDegrees || 4 }, (_, i) => i).map(i => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < profile.beltDegree ? belt.bar : '#F3F4F6' }} />
                ))}
              </div>
              {profile.beltDate && (
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                  {tt.studentProfile.promotionDate}: {fmt(profile.beltDate)}
                </p>
              )}
              <div style={{ marginTop: 14, padding: '10px 12px', background: '#F9FAFB', borderRadius: 10 }}>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{tt.studentProfile.nextBelt}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '2px 0 0' }}>
                  {nextRankName}
                </p>
              </div>
            </Card>

            {/* Emergency & Medical */}
            {(profile.emergencyContact || profile.medicalNotes) && (
              <Card>
                <CardHeader title={tt.studentProfile.contactHealth} />
                {profile.emergencyContact && (
                  <div className="flex gap-2" style={{ marginBottom: 10 }}>
                    <Heart size={13} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>{tt.studentProfile.emergencyContact}</p>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{profile.emergencyContact}</p>
                    </div>
                  </div>
                )}
                {profile.medicalNotes && (
                  <div className="flex gap-2">
                    <AlertCircle size={13} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 2px' }}>{tt.studentProfile.medicalNotesTitle}</p>
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
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{tt.studentProfile.aiSummaryTitle}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, background: 'rgba(125,231,236,0.2)', color: '#7DE7EC', padding: '2px 8px', borderRadius: 999 }}>{tt.studentProfile.aiSummaryComingSoon}</span>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                {tt.studentProfile.aiSummaryDesc.replace('{name}', profile.name)}
              </p>
              <div className="flex gap-2" style={{ marginTop: 14 }}>
                {[tt.studentProfile.tagAttendanceAnalysis, tt.studentProfile.tagChurnRisk, tt.studentProfile.tagBeltReadiness].map(tag => (
                  <span key={tag} style={{ fontSize: 11, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', padding: '3px 10px', borderRadius: 999 }}>{tag}</span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
              {[
                { icon: Dumbbell, label: tt.studentProfile.totalClassesLabel, value: String(totalClasses), sub: tt.studentProfile.historic },
                { icon: TrendingUp, label: tt.studentProfile.attendanceLabel, value: String(attendanceLast30Days), sub: tt.studentProfile.last30Days },
                { icon: Clock, label: tt.studentProfile.lastClassLabel, value: lastClassDate ? fmtShort(lastClassDate) : '—', sub: '' },
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

            {/* Membership — active + history + assign */}
            <MembershipSection
              memberId={profile.memberId}
              activeMembership={activeMembership}
              memberships={memberships}
              availablePlans={profile.availablePlans}
              pendingRenewal={pendingRenewal}
              onAssigned={m => {
                setActiveMembership(m)
                setMemberships(prev => [{
                  id: m.id, planName: m.planName, planType: 'SUBSCRIPTION',
                  billingCycle: m.interval, price: m.price, currency: 'EUR',
                  status: m.status, startDate: m.startDate, endDate: m.expiresAt, consumed: 0,
                } satisfies MembershipRecord, ...prev])
                // A new plan assignment supersedes any pending renewal on the old membership.
                setTransactions(prev => prev.map(t =>
                  t.membershipId === activeMembership?.id && t.status === 'PENDING' ? { ...t, status: 'CANCELLED' } : t
                ))
              }}
              onRenewalCreated={t => setTransactions(prev => [t, ...prev])}
              onRenewalPaid={(transactionId, newEndDate) => {
                setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'PAID' } : t))
                setActiveMembership(prev => prev ? { ...prev, expiresAt: newEndDate, status: 'ACTIVE' } : prev)
              }}
              onRenewalCancelled={transactionId => {
                setTransactions(prev => prev.map(t => t.id === transactionId ? { ...t, status: 'CANCELLED' } : t))
              }}
              onCancelled={membershipId => {
                setActiveMembership(null)
                setTransactions(prev => prev.map(t =>
                  t.membershipId === membershipId && t.status === 'PENDING' ? { ...t, status: 'CANCELLED' } : t
                ))
              }}
            />

            {/* Bookings + Transactions side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Bookings — full list with show more */}
              <Card>
                <CardHeader title={tt.studentProfile.classHistory} action={
                  <button onClick={() => setAttendanceModalOpen(true)}
                    className="flex items-center gap-1"
                    style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <Calendar size={13} /> {tt.studentProfile.viewAttendance}
                  </button>
                } />
                {bookings.length === 0 ? (
                  <EmptyState icon={BookOpen} text={tt.studentProfile.noClassesRecorded} />
                ) : (
                  <>
                    <div className="flex flex-col">
                      {bookings.slice(0, bookingsShown).map((b, i) => {
                        const bk = bookingStatusMap[b.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: b.status }
                        const isPast = new Date(b.date) < new Date()
                        return (
                          <div key={b.id} className="flex items-center justify-between"
                            style={{ padding: '10px 0', borderBottom: i < Math.min(bookings.length, bookingsShown) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                            <div className="flex items-center gap-3">
                              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F9FAFB',
                                border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {b.attendedAt
                                  ? <CheckCircle size={14} style={{ color: '#16A34A' }} />
                                  : isPast
                                    ? <Clock size={14} style={{ color: '#9CA3AF' }} />
                                    : <BookOpen size={14} style={{ color: '#0071E3' }} />}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{b.className}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{fmt(b.date)}</p>
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, background: bk.bg, color: bk.color,
                              padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                              {bk.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {bookings.length > bookingsShown && (
                      <button onClick={() => setBookingsShown(n => n + 10)}
                        style={{ width: '100%', marginTop: 10, padding: '7px 0', fontSize: 12, fontWeight: 600,
                          color: '#0071E3', background: '#EFF6FF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        {tt.studentProfile.viewMoreBookings
                          .replace('{n}', String(Math.min(10, bookings.length - bookingsShown)))
                          .replace('{remaining}', String(bookings.length - bookingsShown))}
                      </button>
                    )}
                  </>
                )}
              </Card>

              {/* Transactions */}
              <Card>
                <CardHeader title={tt.studentProfile.paymentHistory} />
                {transactions.length === 0 ? (
                  <EmptyState icon={CreditCard} text={tt.studentProfile.noTransactionsFound} />
                ) : (
                  <div className="flex flex-col">
                    {transactions.slice(0, txShown).map((t, i) => {
                      const ts = txStatusMap[t.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: t.status }
                      return (
                        <div key={t.id} className="flex items-center justify-between"
                          style={{ padding: '10px 0', borderBottom: i < Math.min(transactions.length, txShown) - 1 ? '1px solid #F3F4F6' : 'none' }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{t.description}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{fmt(t.date)} · {t.method}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{fmtPrice(t.amount, t.currency)}</span>
                            {t.status === 'PENDING' ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleCancelTx(t.id)} disabled={cancellingTxId === t.id || markingTxId === t.id}
                                  style={{ fontSize: 10, fontWeight: 600, color: '#EF4444', background: '#FEF2F2', border: 'none',
                                    padding: '2px 8px', borderRadius: 999, cursor: cancellingTxId === t.id ? 'not-allowed' : 'pointer',
                                    opacity: cancellingTxId === t.id ? 0.6 : 1 }}>
                                  {cancellingTxId === t.id ? tt.studentProfile.cancelling : tt.studentProfile.cancelBtn}
                                </button>
                                <button onClick={() => handleMarkTxPaid(t.id)} disabled={markingTxId === t.id || cancellingTxId === t.id}
                                  style={{ fontSize: 10, fontWeight: 600, color: '#fff', background: '#D97706', border: 'none',
                                    padding: '2px 8px', borderRadius: 999, cursor: markingTxId === t.id ? 'not-allowed' : 'pointer',
                                    opacity: markingTxId === t.id ? 0.6 : 1 }}>
                                  {markingTxId === t.id ? tt.studentProfile.marking : tt.studentProfile.markAsPaidBtn}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 600, background: ts.bg, color: ts.color, padding: '1px 6px', borderRadius: 999 }}>{ts.label}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {transactions.length > txShown && (
                      <button onClick={() => setTxShown(n => n + 10)}
                        style={{ width: '100%', marginTop: 10, padding: '7px 0', fontSize: 12, fontWeight: 600,
                          color: '#0071E3', background: '#EFF6FF', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                        {tt.studentProfile.viewMorePayments.replace('{n}', String(Math.min(10, transactions.length - txShown)))}
                      </button>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* Admin notes */}
            <Card>
              <CardHeader title={tt.studentProfile.internalNotes} />
              <textarea
                value={notesValue}
                onChange={e => setNotesValue(e.target.value)}
                onBlur={saveNotes}
                placeholder={tt.studentProfile.notesTextareaPlaceholder}
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
                  {savingNotes ? tt.studentProfile.saving : tt.studentProfile.savedOnBlur}
                </span>
                <div className="flex items-center gap-1.5">
                  <FileText size={11} style={{ color: '#9CA3AF' }} />
                  <Shield size={11} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{tt.studentProfile.staffOnlyVisible}</span>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>
    </main>
  )
}
