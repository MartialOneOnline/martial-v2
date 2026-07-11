'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Bell, Calendar, Menu, X, Plus, MoreHorizontal, Search,
  ChevronLeft, ChevronRight, TrendingUp, Check, Upload, Clock, Trash2, Pencil,
  ChevronDown, Users, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { useDashboard } from '../../../components/DashboardShell'
import DashboardLanguageSelector from '../../../components/DashboardLanguageSelector'
import { useT } from '../../../lib/i18n/LanguageContext'
import { type BookingSettings, minsToHoursAndMins, hoursAndMinsToTotal } from '../../../lib/types/booking-settings'
import { fmtPrice as _fmtP } from '../../../lib/format'
import { BOOKING_PAYMENT_OPTIONS, type BookingPaymentMethod } from '../../../lib/paymentMethods'
import RowMenu from '../../../components/RowMenu'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Instructor { id: string; name: string }
interface Discipline { id: string; name: string }

interface ClassRow {
  id: string
  name: string
  description: string | null
  level: string | null
  duration: number | null
  capacity: number | null
  price: number | null
  currency: string
  isTrial: boolean
  isActive: boolean
  isPublished: boolean
  paymentMethods: string[]
  bookingSettings: BookingSettings | null
  schedule: ScheduleSlot[] | null
  instructor: Instructor | null
  discipline: Discipline | null
  coverUrl: string | null
  createdAt: string
}

interface ScheduleSlot {
  dayOfWeek: number   // 0=Sun … 6=Sat
  startTime: string   // "HH:MM"
  endTime: string     // "HH:MM"
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'All levels']
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Helpers ────────────────────────────────────────────────────────────────────

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

function scheduleLabel(slots: ScheduleSlot[] | null): string {
  if (!slots || slots.length === 0) return '—'
  const days = [...new Set(slots.map(s => DAY_LABELS[s.dayOfWeek]))].join(' · ')
  if (slots.length === 1) return `${days} ${slots[0]!.startTime}`
  return days
}

function fmtPrice(price: number | null, currency: string): string {
  if (price === null) return '—'
  if (price === 0) return 'Free'
  return _fmtP(price, currency)
}

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  const t = useT()
  return (
    <span style={{
      background: active ? '#F0FDF4' : '#F3F4F6',
      color: active ? '#16A34A' : '#6B7280',
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
    }}>
      {active ? t.common.active : t.common.inactive}
    </span>
  )
}

// ── Schedule builder ───────────────────────────────────────────────────────────

function ScheduleBuilder({
  value, onChange,
}: {
  value: ScheduleSlot[]
  onChange: (v: ScheduleSlot[]) => void
}) {
  function toggleDay(dow: number) {
    const hasDay = value.some(s => s.dayOfWeek === dow)
    if (hasDay) {
      onChange(value.filter(s => s.dayOfWeek !== dow))
    } else {
      onChange([...value, { dayOfWeek: dow, startTime: '09:00', endTime: '10:00' }])
    }
  }

  function addSlot(dow: number) {
    onChange([...value, { dayOfWeek: dow, startTime: '09:00', endTime: '10:00' }])
  }

  function updateSlot(idx: number, field: 'startTime' | 'endTime', val: string) {
    onChange(value.map((s, i) => i === idx ? { ...s, [field]: val } : s))
  }

  function removeSlot(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  // Group slots by day, preserving original indices for update/remove
  const sorted = value
    .map((slot, idx) => ({ slot, idx }))
    .sort((a, b) => a.slot.dayOfWeek - b.slot.dayOfWeek)

  const byDay = DAY_LABELS.map((_, dow) =>
    sorted.filter(({ slot }) => slot.dayOfWeek === dow)
  )

  return (
    <div className="flex flex-col gap-2">
      {/* Day chips */}
      <div className="flex gap-1.5 flex-wrap">
        {DAY_LABELS.map((label, dow) => {
          const active = value.some(s => s.dayOfWeek === dow)
          return (
            <button key={dow} type="button"
              onClick={() => toggleDay(dow)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${active ? '#0071E3' : '#E5E7EB'}`,
                background: active ? '#EFF6FF' : '#fff',
                color: active ? '#0071E3' : '#6B7280',
                cursor: 'pointer',
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* Time rows grouped by day */}
      {byDay.map((entries, dow) => {
        if (entries.length === 0) return null
        return (
          <div key={dow} className="flex flex-col gap-1">
            {entries.map(({ slot, idx }, slotInDay) => (
              <div key={idx} className="flex items-center gap-2">
                {/* Day label — only on first slot of that day */}
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', width: 28, flexShrink: 0 }}>
                  {slotInDay === 0 ? DAY_LABELS[dow] : ''}
                </span>
                <input type="time" value={slot.startTime}
                  onChange={e => updateSlot(idx, 'startTime', e.target.value)}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 12 }} />
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>–</span>
                <input type="time" value={slot.endTime}
                  onChange={e => updateSlot(idx, 'endTime', e.target.value)}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '4px 8px', fontSize: 12 }} />
                {/* Remove slot — always show if day has >1 slot, or show to remove the only slot */}
                <button type="button" onClick={() => removeSlot(idx)}
                  style={{ fontSize: 18, lineHeight: 1, color: '#D1D5DB', background: 'none',
                    border: 'none', cursor: 'pointer', padding: '0 2px' }}
                  title="Remove this time slot">
                  ×
                </button>
                {/* Add another slot for this day — only on last slot */}
                {slotInDay === entries.length - 1 && (
                  <button type="button" onClick={() => addSlot(dow)}
                    style={{ fontSize: 11, fontWeight: 600, color: '#0071E3', background: 'none',
                      border: 'none', cursor: 'pointer', padding: '0 2px', whiteSpace: 'nowrap' }}>
                    + time
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Class form (shared create / edit) ─────────────────────────────────────────

type PaymentMethod = BookingPaymentMethod

const PAYMENT_OPTIONS = BOOKING_PAYMENT_OPTIONS

// Booking form uses h+m strings for each field for easy input binding
interface BookingFormField { h: string; m: string }
interface ClassBookingForm {
  bookingOpens:      BookingFormField
  bookingCloses:     BookingFormField
  cancelOpens:       BookingFormField
  cancelCloses:      BookingFormField
  minStudents:       string
  minStudentsCancelH: string
  minStudentsCancelM: string
}

const EMPTY_BOOKING: ClassBookingForm = {
  bookingOpens:       { h: '', m: '' },
  bookingCloses:      { h: '', m: '' },
  cancelOpens:        { h: '', m: '' },
  cancelCloses:       { h: '', m: '' },
  minStudents:        '',
  minStudentsCancelH: '',
  minStudentsCancelM: '',
}

function bookingSettingsToForm(bs: BookingSettings | null): ClassBookingForm {
  if (!bs) return EMPTY_BOOKING
  const f = (mins?: number): BookingFormField => {
    if (mins == null) return { h: '', m: '' }
    const { hours, mins: m } = minsToHoursAndMins(mins)
    return { h: hours > 0 ? String(hours) : '', m: m > 0 ? String(m) : '' }
  }
  const fH = (mins?: number) => mins != null ? String(Math.floor(mins / 60)) : ''
  const fM = (mins?: number) => mins != null ? String(mins % 60) : ''
  return {
    bookingOpens:       f(bs.bookingOpensMins),
    bookingCloses:      f(bs.bookingClosesMins),
    cancelOpens:        f(bs.cancelOpensMins),
    cancelCloses:       f(bs.cancelClosesMins),
    minStudents:        bs.minStudents != null ? String(bs.minStudents) : '',
    minStudentsCancelH: fH(bs.minStudentsCancelMins),
    minStudentsCancelM: fM(bs.minStudentsCancelMins),
  }
}

function bookingFormToSettings(bf: ClassBookingForm): BookingSettings | null {
  const toMins = (h: string, m: string): number | undefined => {
    const total = hoursAndMinsToTotal(Number(h) || 0, Number(m) || 0)
    return total > 0 ? total : undefined
  }
  const s: BookingSettings = {
    bookingOpensMins:      toMins(bf.bookingOpens.h,  bf.bookingOpens.m),
    bookingClosesMins:     toMins(bf.bookingCloses.h, bf.bookingCloses.m),
    cancelOpensMins:       toMins(bf.cancelOpens.h,   bf.cancelOpens.m),
    cancelClosesMins:      toMins(bf.cancelCloses.h,  bf.cancelCloses.m),
    minStudents:           bf.minStudents ? Number(bf.minStudents) : undefined,
    minStudentsCancelMins: toMins(bf.minStudentsCancelH, bf.minStudentsCancelM),
  }
  // Return null if all fields are empty (use school defaults)
  const hasAny = Object.values(s).some(v => v != null)
  return hasAny ? s : null
}

interface ClassFormData {
  name: string
  description: string
  disciplineId: string
  level: string
  duration: string
  capacity: string
  price: string
  currency: string
  isTrial: boolean
  isActive: boolean
  isPublished: boolean
  paymentMethods: PaymentMethod[]
  booking: ClassBookingForm
  schedule: ScheduleSlot[]
  instructorId: string
  coverUrl: string
}

const EMPTY_FORM: ClassFormData = {
  name: '', description: '', disciplineId: '', level: '', duration: '',
  capacity: '', price: '', currency: 'EUR', isTrial: false, isActive: true,
  isPublished: false, paymentMethods: [], booking: EMPTY_BOOKING,
  schedule: [], instructorId: '', coverUrl: '',
}

function classToForm(cls: ClassRow): ClassFormData {
  return {
    name: cls.name,
    description: cls.description ?? '',
    disciplineId: cls.discipline?.id ?? '',
    level: cls.level ?? '',
    duration: cls.duration?.toString() ?? '',
    capacity: cls.capacity?.toString() ?? '',
    price: cls.price?.toString() ?? '',
    currency: cls.currency,
    isTrial: cls.isTrial,
    isActive: cls.isActive,
    isPublished: cls.isPublished,
    paymentMethods: (cls.paymentMethods ?? []) as PaymentMethod[],
    coverUrl: cls.coverUrl ?? '',
    booking: bookingSettingsToForm(cls.bookingSettings),
    schedule: cls.schedule ?? [],
    instructorId: cls.instructor?.id ?? '',
  }
}

// ── Booking settings section ───────────────────────────────────────────────────

function TimeInput({ label, value, onChange }: {
  label: string
  value: { h: string; m: string }
  onChange: (v: { h: string; m: string }) => void
}) {
  const inp: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: 64,
  }
  return (
    <div className="flex flex-col gap-1">
      <span style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="text" inputMode="numeric" placeholder="0" value={value.h}
          onChange={e => onChange({ ...value, h: e.target.value.replace(/\D/g, '') })}
          style={inp} />
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>h</span>
        <input type="text" inputMode="numeric" placeholder="0" value={value.m}
          onChange={e => onChange({ ...value, m: e.target.value.replace(/\D/g, '') })}
          style={inp} />
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>min</span>
      </div>
    </div>
  )
}

function BookingSettingsSection({
  value, onChange,
}: {
  value: ClassBookingForm
  onChange: (v: ClassBookingForm) => void
}) {
  const [open, setOpen] = useState(false)

  function set<K extends keyof ClassBookingForm>(field: K, val: ClassBookingForm[K]) {
    onChange({ ...value, [field]: val })
  }

  const rowStyle: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start',
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: 10,
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
      {/* Header — toggle */}
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: open ? '#F9FAFB' : '#fff', border: 'none' }}>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: '#6B7280' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Booking settings</span>
          <span style={{ fontSize: 11, color: '#9CA3AF' }}>— leave blank to use school defaults</span>
        </div>
        <ChevronDown size={14} style={{ color: '#9CA3AF', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-5" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>

          {/* Booking window */}
          <div>
            <p style={sectionLabel}>Booking window</p>
            <div style={rowStyle}>
              <TimeInput label="Opens before class"
                value={value.bookingOpens}
                onChange={v => set('bookingOpens', v)} />
              <TimeInput label="Closes before class"
                value={value.bookingCloses}
                onChange={v => set('bookingCloses', v)} />
            </div>
          </div>

          {/* Cancellation window */}
          <div>
            <p style={sectionLabel}>Cancellation window</p>
            <div style={rowStyle}>
              <TimeInput label="Opens before class"
                value={value.cancelOpens}
                onChange={v => set('cancelOpens', v)} />
              <TimeInput label="Closes before class"
                value={value.cancelCloses}
                onChange={v => set('cancelCloses', v)} />
            </div>
          </div>

          {/* Minimum enrollment */}
          <div>
            <p style={sectionLabel}>Minimum enrollment</p>
            <div className="flex items-end gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Min students to run</span>
                <input type="text" inputMode="numeric" placeholder="0 = no minimum"
                  value={value.minStudents}
                  onChange={e => set('minStudents', e.target.value.replace(/\D/g, ''))}
                  style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
                    fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: 160 }} />
              </div>
              <div className="flex flex-col gap-1">
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Auto-cancel if below min</span>
                <div className="flex items-center gap-1.5">
                  <input type="text" inputMode="numeric" placeholder="2"
                    value={value.minStudentsCancelH}
                    onChange={e => set('minStudentsCancelH', e.target.value.replace(/\D/g, ''))}
                    style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
                      fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: 64 }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>h</span>
                  <input type="text" inputMode="numeric" placeholder="0"
                    value={value.minStudentsCancelM}
                    onChange={e => set('minStudentsCancelM', e.target.value.replace(/\D/g, ''))}
                    style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px',
                      fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: 64 }} />
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>min before class</span>
                </div>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
              e.g. min 2 students, auto-cancel 2h before if not reached
            </p>
          </div>

        </div>
      )}
    </div>
  )
}

interface ClassDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: ClassRow | null
  instructors: Instructor[]
  disciplines: Discipline[]
  availableMethods: string[]
}

const drawerInputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const drawerLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={drawerLabelStyle}>{label}</label>{children}</div>
}

function BannerUploadZone({ value, onChange, label, height = 160, hint = 'PNG, JPG up to 5 MB' }: {
  value: string; onChange: (url: string) => void; label: string; height?: number; hint?: string
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadFile(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/dashboard/upload?bucket=class-images', { method: 'POST', body: fd })
      if (res.ok) {
        const { url } = await res.json()
        onChange(url)
      }
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  return (
    <div>
      <label style={drawerLabelStyle}>{label}</label>
      {value ? (
        <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB', height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <button type="button" onClick={() => onChange('')}
            className="cursor-pointer"
            style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={12} style={{ color: '#fff' }} />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={e => { e.preventDefault(); setDragOver(true) }}
          onDragOver={e => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer"
          style={{ height, border: `2px dashed ${dragOver ? '#0071E3' : '#D1D5DB'}`,
            background: dragOver ? '#EFF6FF' : '#fff' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
            <Upload size={18} style={{ color: '#9CA3AF' }} />
          </div>
          <div className="text-center">
            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
              {uploading ? 'Uploading…' : 'Drop image here'}
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{hint}</p>
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
            className="px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Browse
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  )
}

function ClassDrawer({ open, onClose, onSaved, editing, instructors, disciplines, availableMethods }: ClassDrawerProps) {
  const t = useT()
  const [form, setForm] = useState<ClassFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setForm(editing ? classToForm(editing) : EMPTY_FORM)
      setError('')
    }
  }, [open, editing])

  function set(field: keyof ClassFormData, value: unknown) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Class name is required'); return }
    setSaving(true)
    setError('')
    try {
      const url = editing
        ? `/api/dashboard/classes/${editing.id}`
        : '/api/dashboard/classes'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          disciplineId: form.disciplineId || null,
          level: form.level || null,
          duration: form.duration ? Number(form.duration) : null,
          capacity: form.capacity ? Number(form.capacity) : null,
          price: form.price !== '' ? Number(form.price) : null,
          currency: form.currency,
          isTrial: form.isTrial,
          isActive: form.isActive,
          isPublished: form.isPublished,
          paymentMethods: form.paymentMethods,
          bookingSettings: bookingFormToSettings(form.booking),
          schedule: form.schedule.length > 0 ? form.schedule : null,
          instructorId: form.instructorId || null,
          coverUrl: form.coverUrl || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: 'min(900px, 96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              {editing ? (t.classes.editClass ?? 'Edit class') : t.classes.createClass}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.classes.createClassDesc}</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="flex gap-8" style={{ alignItems: 'flex-start' }}>

            {/* Left — form fields */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              <Field label={t.classes.classTitle}>
                <input type="text" placeholder={t.classes.classTitlePlaceholder}
                  value={form.name} onChange={e => set('name', e.target.value)} style={drawerInputStyle} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.classes.instructors}>
                  <select value={form.instructorId} onChange={e => set('instructorId', e.target.value)} style={drawerInputStyle}>
                    <option value="">{t.classes.selectInstructor}</option>
                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </Field>
                <Field label={t.common.activity}>
                  <select value={form.disciplineId} onChange={e => set('disciplineId', e.target.value)} style={drawerInputStyle}>
                    <option value="">{t.classes.selectActivity}</option>
                    {disciplines.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Level">
                  <select value={form.level} onChange={e => set('level', e.target.value)} style={drawerInputStyle}>
                    <option value="">All levels</option>
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Duration (min)">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="60"
                    value={form.duration} onChange={e => set('duration', e.target.value.replace(/\D/g, ''))} style={drawerInputStyle} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label={t.common.capacity}>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="20"
                    value={form.capacity} onChange={e => set('capacity', e.target.value.replace(/\D/g, ''))} style={drawerInputStyle} />
                </Field>
                <Field label={t.classes.classFees}>
                  <input type="text" inputMode="decimal" placeholder="0 = included in membership"
                    value={form.price} onChange={e => set('price', e.target.value.replace(/[^0-9.]/g, ''))} style={drawerInputStyle} />
                </Field>
              </div>

              <Field label="Weekly schedule">
                <ScheduleBuilder value={form.schedule}
                  onChange={v => set('schedule', v)} />
              </Field>

              <Field label={t.common.description}>
                <textarea rows={3} placeholder={t.classes.describeClass}
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ ...drawerInputStyle, resize: 'vertical', lineHeight: 1.5 }} />
              </Field>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                {([
                  { field: 'isActive' as const, label: 'Active' },
                  { field: 'isTrial' as const,  label: 'Free trial class' },
                ]).map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => set(field, !form[field])}
                      className="flex items-center justify-center rounded-md"
                      style={{ width: 16, height: 16, border: `1.5px solid ${form[field] ? '#0071E3' : '#D1D5DB'}`,
                        background: form[field] ? '#0071E3' : '#fff', cursor: 'pointer', flexShrink: 0 }}>
                      {form[field] && <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
                  </label>
                ))}
              </div>

              {/* Payment methods */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>
                  Payment methods
                </label>
                {availableMethods.length === 0 ? (
                  <div className="flex items-start gap-2" style={{
                    padding: '10px 12px', borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                    <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                      No payment methods are set up for your school yet.{' '}
                      <Link href="/dashboard/settings?tab=payments" style={{ color: '#0071E3', fontWeight: 600 }}>
                        Configure them in Settings
                      </Link>{' '}before this class can accept payments.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {PAYMENT_OPTIONS.filter(opt => availableMethods.includes(opt.value)).map(opt => {
                      const active = form.paymentMethods.includes(opt.value)
                      return (
                        <button key={opt.value} type="button"
                          onClick={() => set('paymentMethods', active
                            ? form.paymentMethods.filter(m => m !== opt.value)
                            : [...form.paymentMethods, opt.value]
                          )}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                          style={{
                            fontSize: 12, fontWeight: 500,
                            border: `1.5px solid ${active ? '#0071E3' : '#E5E7EB'}`,
                            background: active ? '#EFF6FF' : '#fff',
                            color: active ? '#0071E3' : '#6B7280',
                          }}>
                          <span>{opt.icon}</span>
                          {opt.label}
                          {active && <Check size={11} strokeWidth={2.5} />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Public on Explore */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Public on Explore</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                    Visible to anyone browsing Explore
                  </p>
                </div>
                <div onClick={() => set('isPublished', !form.isPublished)}
                  className="cursor-pointer select-none"
                  style={{
                    width: 44, height: 24, borderRadius: 99,
                    background: form.isPublished ? '#0071E3' : '#E5E7EB',
                    padding: 2, display: 'flex', alignItems: 'center',
                    justifyContent: form.isPublished ? 'flex-end' : 'flex-start',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                </div>
              </div>

              {/* Booking settings — collapsible */}
              <BookingSettingsSection
                value={form.booking}
                onChange={b => set('booking', b)}
              />

              {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
            </div>

            {/* Right — banner */}
            <div style={{ width: 220, flexShrink: 0 }}>
              <BannerUploadZone
                label="Class banner"
                value={form.coverUrl}
                onChange={url => set('coverUrl', url)}
              />
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Recommended: 800 × 500px</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center gap-3 justify-end"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB', flexShrink: 0 }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff',
              opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : (editing ? t.common.save : t.classes.createClass)}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Bookings drawer ─────────────────────────────────────────────────────────────

interface BookingRow {
  id: string
  name: string
  avatarUrl: string | null
  status: string
  attendedAt: string | null
  scheduledAt: string
}

function todayIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function BookingStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDING:   { bg: '#FFF7ED', color: '#C2410C', label: 'Pending'   },
    CONFIRMED: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Confirmed' },
    COMPLETED: { bg: '#F0FDF4', color: '#15803D', label: 'Attended'  },
    CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
    NO_SHOW:   { bg: '#FEF2F2', color: '#B91C1C', label: 'No-show'   },
  }
  const s = map[status] ?? map['PENDING']!
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
      background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function BookingsDrawer({ cls, open, onClose }: {
  cls: ClassRow | null
  open: boolean
  onClose: () => void
}) {
  const [date, setDate]           = useState(todayIso)
  const [bookings, setBookings]   = useState<BookingRow[]>([])
  const [loading, setLoading]     = useState(false)
  const [marking, setMarking]     = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)

  useEffect(() => {
    if (open) { setDate(todayIso()); setBulkError(null) }
  }, [open])

  useEffect(() => {
    if (!open || !cls) return
    setBulkError(null)
    setLoading(true)
    fetch(`/api/dashboard/classes/${cls.id}/bookings?date=${date}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setBookings(data.bookings ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [open, cls, date])

  async function markAttended(bookingId: string) {
    setMarking(bookingId)
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/attend`, { method: 'PATCH' })
      if (res.ok) {
        const data = await res.json()
        setBookings(prev => prev.map(b =>
          b.id === bookingId
            ? { ...b, status: data.status, attendedAt: data.attendedAt }
            : b
        ))
      }
    } finally {
      setMarking(null)
    }
  }

  async function markNoShow(bookingId: string) {
    setMarking(bookingId)
    try {
      const res = await fetch(`/api/dashboard/bookings/${bookingId}/no-show`, { method: 'PATCH' })
      if (res.ok) {
        const data = await res.json()
        setBookings(prev => prev.map(b =>
          b.id === bookingId ? { ...b, status: data.status } : b
        ))
      }
    } finally {
      setMarking(null)
    }
  }

  async function markAllAttended() {
    const eligible = bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED')
    if (eligible.length === 0) return
    setMarkingAll(true)
    setBulkError(null)
    const results = await Promise.allSettled(
      eligible.map(b =>
        fetch(`/api/dashboard/bookings/${b.id}/attend`, { method: 'PATCH' })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(r.statusText)))
          .then(data => ({ id: b.id, status: data.status, attendedAt: data.attendedAt }))
      )
    )
    const succeeded = results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
    const failCount = results.filter(r => r.status === 'rejected').length
    if (succeeded.length > 0) {
      setBookings(prev => prev.map(b => {
        const updated = succeeded.find(s => s.id === b.id)
        return updated ? { ...b, status: updated.status, attendedAt: updated.attendedAt } : b
      }))
    }
    if (failCount > 0) setBulkError(`${failCount} booking${failCount > 1 ? 's' : ''} could not be marked attended`)
    setMarkingAll(false)
  }

  const attended  = bookings.filter(b => b.status === 'COMPLETED').length
  const total     = bookings.filter(b => b.status !== 'CANCELLED').length
  const eligible  = bookings.filter(b => b.status !== 'COMPLETED' && b.status !== 'CANCELLED').length

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(480px, 96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
              {cls?.name ?? 'Bookings'}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Attendance list</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Date picker + Mark All */}
        <div className="px-6 py-3 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-center gap-3">
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>Session date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px',
                fontSize: 13, color: '#111827', background: '#fff', outline: 'none' }} />
            {!loading && bookings.length > 0 && (
              <span style={{ fontSize: 12, color: '#6B7280', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {attended}/{total} attended
              </span>
            )}
          </div>
          {!loading && eligible > 0 && (
            <div className="flex items-center justify-between mt-2">
              <button
                onClick={markAllAttended}
                disabled={markingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ fontSize: 12, fontWeight: 600, border: '1px solid #16A34A',
                  background: markingAll ? '#F3F4F6' : '#F0FDF4',
                  color: markingAll ? '#9CA3AF' : '#16A34A',
                  cursor: markingAll ? 'not-allowed' : 'pointer' }}>
                <CheckCircle2 size={13} />
                {markingAll ? 'Marking…' : `Mark all attended (${eligible})`}
              </button>
              {bulkError && (
                <span style={{ fontSize: 11, color: '#DC2626' }}>{bulkError}</span>
              )}
            </div>
          )}
        </div>

        {/* Booking list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          {loading && (
            <div className="flex items-center justify-center py-12"
              style={{ color: '#9CA3AF', fontSize: 13 }}>Loading…</div>
          )}

          {!loading && bookings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Users size={28} style={{ color: '#E5E7EB' }} />
              <p style={{ fontSize: 13, color: '#9CA3AF' }}>No bookings for this date</p>
            </div>
          )}

          {!loading && bookings.map(b => {
            const isAttended  = b.status === 'COMPLETED'
            const isCancelled = b.status === 'CANCELLED'
            const isMarking   = marking === b.id
            return (
              <div key={b.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: '#fff', border: '1px solid #F3F4F6',
                  opacity: isCancelled ? 0.5 : 1 }}>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: '#EFF6FF', fontSize: 13, fontWeight: 700, color: '#0071E3' }}>
                  {b.avatarUrl
                    ? <img src={b.avatarUrl} alt={b.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    : b.name[0]?.toUpperCase() ?? '?'
                  }
                </div>

                {/* Name + status */}
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, whiteSpace: 'nowrap',
                    overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BookingStatusBadge status={b.status} />
                    {b.attendedAt && (
                      <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                        {new Date(b.attendedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                {isAttended ? (
                  <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
                ) : b.status === 'NO_SHOW' ? null
                  : !isCancelled ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => markAttended(b.id)}
                      disabled={isMarking}
                      className="px-2.5 py-1.5 rounded-lg cursor-pointer"
                      style={{ fontSize: 11, fontWeight: 600, border: '1px solid #0071E3',
                        background: isMarking ? '#F3F4F6' : '#EFF6FF',
                        color: isMarking ? '#9CA3AF' : '#0071E3',
                        cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                      {isMarking ? '…' : 'Attended'}
                    </button>
                    <button
                      onClick={() => markNoShow(b.id)}
                      disabled={isMarking}
                      className="px-2.5 py-1.5 rounded-lg cursor-pointer"
                      style={{ fontSize: 11, fontWeight: 600, border: '1px solid #E5E7EB',
                        background: isMarking ? '#F3F4F6' : '#FEF2F2',
                        color: isMarking ? '#9CA3AF' : '#B91C1C',
                        cursor: isMarking ? 'not-allowed' : 'pointer' }}>
                      No-show
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ── Delete confirm modal ────────────────────────────────────────────────────────

function DeleteModal({ cls, error, deleting, onConfirm, onCancel }: {
  cls: ClassRow | null; error?: string; deleting?: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const t = useT()
  if (!cls) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: '#FEF2F2' }}>
          <Trash2 size={24} style={{ color: '#DC2626' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Delete class?</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            <strong>{cls.name}</strong> will be permanently deleted. This cannot be undone.
          </p>
          {error && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 8 }}>{error}</p>}
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#DC2626', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Success modal ───────────────────────────────────────────────────────────────

function SuccessModal({ open, onClose, message }: { open: boolean; onClose: () => void; message: string }) {
  const t = useT()
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#F0FDF4' }}>
          <Check size={32} style={{ color: '#16A34A' }} strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{message}</h3>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
          {t.common.done}
        </button>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

type Filter = 'All' | 'Active' | 'Inactive'

export default function ClassesClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()

  const [classes, setClasses]         = useState<ClassRow[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [availableMethods, setAvailableMethods] = useState<string[]>([])
  const [loading, setLoading]         = useState(true)

  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [deleteClass, setDeleteClass]     = useState<ClassRow | null>(null)
  const [deleteError, setDeleteError]     = useState('')
  const [deleting, setDeleting]           = useState(false)
  const [bookingsClass, setBookingsClass] = useState<ClassRow | null>(null)
  const [successMsg, setSuccessMsg]       = useState('')

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/classes')
      if (res.ok) {
        const data = await res.json()
        setClasses(data.classes ?? [])
        setInstructors(data.instructors ?? [])
        setDisciplines(data.disciplines ?? [])
        setAvailableMethods(data.paymentCapabilities?.availableMethods ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  const filtered = classes.filter(c => {
    const matchFilter = activeFilter === 'All'
      || (activeFilter === 'Active' && c.isActive)
      || (activeFilter === 'Inactive' && !c.isActive)
    const q = search.toLowerCase()
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || (c.instructor?.name ?? '').toLowerCase().includes(q)
      || (c.discipline?.name ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: Filter) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string)  => { setSearch(v); setCurrentPage(1) }

  function openCreate() { setEditingClass(null); setDrawerOpen(true) }
  function openEdit(cls: ClassRow) { setEditingClass(cls); setDrawerOpen(true) }

  async function handleDelete() {
    if (!deleteClass) return
    setDeleting(true)
    setDeleteError('')
    const res = await fetch(`/api/dashboard/classes/${deleteClass.id}`, { method: 'DELETE' })
    setDeleting(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setDeleteError(data.error ?? 'Could not delete class.')
      return
    }
    setDeleteClass(null)
    setSuccessMsg('Class deleted')
    loadClasses()
  }

  async function togglePublish(cls: ClassRow) {
    const next = !cls.isPublished
    await fetch(`/api/dashboard/classes/${cls.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cls.name,
        isActive: cls.isActive,
        isPublished: next,
        isTrial: cls.isTrial,
        currency: cls.currency,
      }),
    })
    setSuccessMsg(next ? 'Class published' : 'Class unpublished')
    loadClasses()
  }

  function handleSaved() {
    setDrawerOpen(false)
    setSuccessMsg(editingClass ? 'Class updated' : t.classes.classCreated)
    loadClasses()
  }

  const activeCount   = classes.filter(c => c.isActive).length
  const inactiveCount = classes.filter(c => !c.isActive).length

  const STATS = [
    { label: t.classes.totalClasses,  value: classes.length.toString(),  trendUp: true,  sub: t.common.thisMonth },
    { label: t.classes.activeClasses, value: activeCount.toString(),     trendUp: true,  sub: t.common.rightNow  },
    { label: 'Instructors',           value: instructors.length.toString(), trendUp: true, sub: 'assigned'       },
    { label: t.classes.avgCapacity,   value: classes.length > 0
        ? Math.round(classes.reduce((s, c) => s + (c.capacity ?? 0), 0) / classes.length).toString()
        : '0',                                                            trendUp: true,  sub: 'avg capacity'     },
  ]

  return (
    <>
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* Topbar */}
        <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} style={{ color: '#374151' }} />
          </button>

          <div className="flex flex-1 items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', minWidth: 0 }}>
            <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input type="text" placeholder={t.classes.searchPlaceholder} value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%', minWidth: 0 }} />
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
            <Clock size={13} style={{ color: '#9CA3AF' }} />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>

          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Bell size={15} style={{ color: '#374151' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
          </button>

          <DashboardLanguageSelector />

          <button onClick={openCreate}
            className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer"
            style={{ background: '#0071E3', border: 'none', color: '#fff' }}>
            <Plus size={16} />
          </button>
        </div>

        <div className="px-4 md:px-8 py-4 flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                {t.classes.title}
              </h1>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                {filtered.length} {t.common.of} {classes.length} {t.classes.ofClasses}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div key={stat.label} className="rounded-2xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '10px 14px' }}>
                <div className="flex items-start justify-between mb-2">
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
                    background: '#F0FDF4', color: '#16A34A', padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                    <TrendingUp size={9} />
                  </span>
                </div>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            {([
              { f: 'All'      as Filter, label: t.common.all,      count: classes.length  },
              { f: 'Active'   as Filter, label: t.common.active,   count: activeCount     },
              { f: 'Inactive' as Filter, label: t.common.inactive, count: inactiveCount   },
            ]).map(({ f, label, count }) => (
              <button key={f} onClick={() => handleFilter(f)}
                className="cursor-pointer transition-all"
                style={{
                  fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '6px 14px',
                  color: activeFilter === f ? '#111827' : '#6B7280',
                  background: activeFilter === f ? '#fff' : 'transparent',
                  boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}>
                {label}
                <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600,
                  color: activeFilter === f ? '#0071E3' : '#9CA3AF' }}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[
                    { label: t.classes.colClass,    cls: '' },
                    { label: t.common.instructor,   cls: 'hidden md:table-cell' },
                    { label: 'Schedule',             cls: 'hidden lg:table-cell' },
                    { label: t.classes.classFees,   cls: 'hidden lg:table-cell' },
                    { label: t.common.status,       cls: '' },
                    { label: t.common.actions,      cls: '' },
                  ].map(h => (
                    <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      {[1,2,3,4,5,6].map(j => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded animate-pulse" style={{ background: '#F3F4F6', width: j === 1 ? 120 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : paginated.map((cls, idx) => (
                    <tr key={cls.id}
                      className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                      {/* Class */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                            style={{ width: 36, height: 36, background: '#EFF6FF' }}>
                            {cls.coverUrl
                              ? <img src={cls.coverUrl} alt={cls.name} style={{ width: 36, height: 36, objectFit: 'cover' }} />
                              : <Calendar size={16} style={{ color: '#0071E3' }} />
                            }
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{cls.name}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                              {cls.discipline?.name ?? '—'}{cls.level ? ` · ${cls.level}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Instructor */}
                      <td className="hidden md:table-cell px-5 py-3">
                        <span style={{ fontSize: 13, color: '#374151' }}>{cls.instructor?.name ?? '—'}</span>
                      </td>

                      {/* Schedule */}
                      <td className="hidden lg:table-cell px-5 py-3">
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{scheduleLabel(cls.schedule)}</span>
                      </td>

                      {/* Fees */}
                      <td className="hidden lg:table-cell px-5 py-3">
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                          {fmtPrice(cls.price, cls.currency)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge active={cls.isActive} />
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                            background: cls.isPublished ? '#EFF6FF' : '#F3F4F6',
                            color: cls.isPublished ? '#0870E2' : '#9CA3AF',
                          }}>
                            {cls.isPublished ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <RowMenu trigger={({ onClick }) => (
                          <button
                            onClick={onClick}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <MoreHorizontal size={15} />
                          </button>
                        )}>
                          <div className="rounded-xl py-1 overflow-hidden"
                            style={{ background: '#fff', border: '1px solid #E5E7EB',
                              boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 140 }}>
                            <button onClick={() => setBookingsClass(cls)}
                              className="w-full text-left px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
                              style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Users size={13} /> View bookings
                            </button>
                            <button onClick={() => openEdit(cls)}
                              className="w-full text-left px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
                              style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Pencil size={13} /> {t.common.edit}
                            </button>
                            <button onClick={() => togglePublish(cls)}
                              className="w-full text-left px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
                              style={{ fontSize: 13, color: cls.isPublished ? '#D97706' : '#0870E2', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              {cls.isPublished ? '⊘ Unpublish' : '↑ Publish'}
                            </button>
                            <button onClick={() => { setDeleteClass(cls); setDeleteError('') }}
                              className="w-full text-left px-4 py-2 transition-colors cursor-pointer flex items-center gap-2"
                              style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Trash2 size={13} /> {t.common.delete}
                            </button>
                          </div>
                        </RowMenu>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>

            {!loading && paginated.length === 0 && (
              <div className="py-16 text-center">
                <Calendar size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.classes.noClasses}</p>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                {t.common.showing}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}{' – '}{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                </span>{' '}
                {t.common.of} <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span> {t.classes.ofClasses}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                    color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                    borderRadius: 8, padding: '6px 12px' }}>
                  {t.common.prev}
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {pages.map((p, i) =>
                    p === '...'
                      ? <span key={`e-${i}`} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                      : (
                        <button key={p} onClick={() => setCurrentPage(p as number)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                            background: p === safePage ? '#F3F4F6' : 'transparent',
                            color: p === safePage ? '#111827' : '#6B7280' }}>
                          {p}
                        </button>
                      )
                  )}
                </div>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                    color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: 8, padding: '6px 12px' }}>
                  {t.common.next}
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>

      <BookingsDrawer
        cls={bookingsClass}
        open={!!bookingsClass}
        onClose={() => setBookingsClass(null)}
      />

      <ClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        editing={editingClass}
        instructors={instructors}
        disciplines={disciplines}
        availableMethods={availableMethods}
      />

      <DeleteModal
        cls={deleteClass}
        error={deleteError}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteClass(null); setDeleteError('') }}
      />

      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg('')}
        message={successMsg}
      />
    </>
  )
}
