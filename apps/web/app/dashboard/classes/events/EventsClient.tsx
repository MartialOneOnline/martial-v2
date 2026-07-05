'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Bell, Menu, X, Plus, MoreHorizontal, Search,
  TrendingUp, Check, Upload, Clock, MapPin, Star,
  Ticket, Calendar, Pencil, Trash2, Globe, EyeOff, QrCode, CheckCircle2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useDashboard } from '../../../../components/DashboardShell'
import DashboardLanguageSelector from '../../../../components/DashboardLanguageSelector'
import { useT } from '../../../../lib/i18n/LanguageContext'
import { adminFetch } from '../../../../lib/api/adminFetch'

// ── Types ──────────────────────────────────────────────────────────────────────

type DbEventType = 'SEMINAR' | 'COMPETITION' | 'OPEN_MAT' | 'WORKSHOP' | 'SOCIAL' | 'CAMP' | 'OTHER'
type EventStatus = 'Upcoming' | 'Past' | 'Cancelled'

interface Instructor { id: string; name: string }

type PaymentMethod = 'STRIPE' | 'REVOLUT' | 'CASH' | 'BANK_TRANSFER'

interface EventTicket {
  name: string
  description: string
  price: number
  currency: string
  capacity: string  // string in form, number in DB
}

interface EventRow {
  id: string
  title: string
  description: string | null
  type: DbEventType
  location: string | null
  startAt: string
  endAt: string | null
  capacity: number | null
  paymentMethods: PaymentMethod[]
  isPublished: boolean
  isCancelled: boolean
  externalUrl: string | null
  instructor: Instructor | null
  tickets: { id: string; name: string; price: number; currency: string; capacity: number | null; _count?: { bookings: number } }[]
  coverUrl: string | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 8

const TYPE_LABELS: Record<DbEventType, string> = {
  SEMINAR:     'Seminar',
  COMPETITION: 'Competition',
  OPEN_MAT:    'Open Mat',
  WORKSHOP:    'Workshop',
  SOCIAL:      'Social',
  CAMP:        'Camp',
  OTHER:       'Other',
}

const TYPE_MAP: Record<DbEventType, { bg: string; color: string; border: string }> = {
  SEMINAR:     { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  COMPETITION: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  OPEN_MAT:    { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  WORKSHOP:    { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  SOCIAL:      { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
  CAMP:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  OTHER:       { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

const STATUS_MAP: Record<EventStatus, { bg: string; color: string }> = {
  Upcoming:  { bg: '#EFF6FF', color: '#2563EB' },
  Past:      { bg: '#F3F4F6', color: '#6B7280' },
  Cancelled: { bg: '#FEF2F2', color: '#DC2626' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function deriveStatus(ev: EventRow): EventStatus {
  if (ev.isCancelled) return 'Cancelled'
  return new Date(ev.startAt) >= new Date() ? 'Upcoming' : 'Past'
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function fmtTicketPrice(tickets: EventRow['tickets']): string {
  if (!tickets || tickets.length === 0) return 'Free'
  const prices = tickets.map(t => t.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const sym = (tickets[0]?.currency ?? 'EUR') === 'EUR' ? '€' : (tickets[0]?.currency ?? '')
  if (min === 0 && max === 0) return 'Free'
  if (min === max) return `${sym}${min}`
  return `${sym}${min} – ${sym}${max}`
}

function registrationSummary(ev: EventRow): { booked: number; capacity: number | null } {
  const booked = ev.tickets.reduce((sum, t) => sum + (t._count?.bookings ?? 0), 0)
  const ticketCapacities = ev.tickets.map(t => t.capacity)
  const capacity = ev.capacity ?? (ticketCapacities.every(c => c !== null) && ticketCapacities.length > 0
    ? ticketCapacities.reduce((sum, c) => sum + (c ?? 0), 0)
    : null)
  return { booked, capacity }
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Event form ─────────────────────────────────────────────────────────────────

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'STRIPE',        label: 'Online (Stripe)',   icon: '💳' },
  { value: 'REVOLUT',       label: 'Online (Revolut)',  icon: '💳' },
  { value: 'CASH',          label: 'Cash at door',      icon: '💵' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer',     icon: '🏦' },
]

const EMPTY_TICKET: EventTicket = { name: '', description: '', price: 0, currency: 'EUR', capacity: '' }

interface EventFormData {
  title: string
  type: DbEventType
  startDate: string
  startTime: string
  endTime: string
  instructorId: string
  location: string
  capacity: string
  tickets: EventTicket[]
  paymentMethods: PaymentMethod[]
  isPublished: boolean
  externalUrl: string
  description: string
  coverUrl: string
}

const EMPTY_FORM: EventFormData = {
  title: '', type: 'SEMINAR', startDate: '', startTime: '', endTime: '',
  instructorId: '', location: '', capacity: '',
  tickets: [{ ...EMPTY_TICKET, name: 'General' }],
  paymentMethods: [], isPublished: false, externalUrl: '', description: '', coverUrl: '',
}

function eventToForm(ev: EventRow): EventFormData {
  const start = new Date(ev.startAt)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

  return {
    title: ev.title,
    type: ev.type,
    startDate: toDateStr(start),
    startTime: toTimeStr(start),
    endTime: ev.endAt ? toTimeStr(new Date(ev.endAt)) : '',
    instructorId: ev.instructor?.id ?? '',
    location: ev.location ?? '',
    capacity: ev.capacity?.toString() ?? '',
    tickets: ev.tickets.length > 0
      ? ev.tickets.map(t => ({ name: t.name, description: '', price: t.price, currency: t.currency, capacity: t.capacity?.toString() ?? '' }))
      : [{ ...EMPTY_TICKET, name: 'General' }],
    paymentMethods: ev.paymentMethods ?? [],
    isPublished: ev.isPublished,
    externalUrl: ev.externalUrl ?? '',
    description: ev.description ?? '',
    coverUrl: ev.coverUrl ?? '',
  }
}

function formToPayload(form: EventFormData) {
  const startAt = form.startDate
    ? new Date(`${form.startDate}T${form.startTime || '00:00'}`).toISOString()
    : null
  const endAt = form.startDate && form.endTime
    ? new Date(`${form.startDate}T${form.endTime}`).toISOString()
    : null

  return {
    title: form.title,
    type: form.type,
    startAt,
    endAt,
    instructorId: form.instructorId || null,
    location: form.location || null,
    capacity: form.capacity ? Number(form.capacity) : null,
    tickets: form.tickets.filter(t => t.name.trim()).map(t => ({
      name: t.name.trim(),
      price: Number(t.price) || 0,
      currency: t.currency,
      capacity: t.capacity ? Number(t.capacity) : null,
    })),
    paymentMethods: form.paymentMethods,
    isPublished: form.isPublished,
    externalUrl: form.externalUrl || null,
    description: form.description || null,
    coverUrl: form.coverUrl || null,
  }
}

// ── Event drawer ───────────────────────────────────────────────────────────────

interface EventDrawerProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing: EventRow | null
  instructors: Instructor[]
}

const eventInp: React.CSSProperties = {
  width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
  fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
}
const eventLbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }
function EventField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={eventLbl}>{label}</label>{children}</div>
}

function BannerUploadZone({ value, onChange, label, height = 180, hint, dropLabel = 'Drop image here', browseLabel = 'Browse' }: {
  value: string; onChange: (url: string) => void; label: string; height?: number; hint?: string
  dropLabel?: string; browseLabel?: string
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
      const res = await adminFetch('/api/dashboard/upload?bucket=class-images', { method: 'POST', body: fd })
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
      <label style={eventLbl}>{label}</label>
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
              {uploading ? 'Uploading…' : dropLabel}
            </p>
            {hint && <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{hint}</p>}
          </div>
          <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
            className="px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {browseLabel}
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  )
}

function EventDrawer({ open, onClose, onSaved, editing, instructors }: EventDrawerProps) {
  const t = useT()
  const [form, setForm]     = useState<EventFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    if (open) { setForm(editing ? eventToForm(editing) : EMPTY_FORM); setError('') }
  }, [open, editing])

  function set(field: keyof EventFormData, value: unknown) {
    setForm(p => ({ ...p, [field]: value }))
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required'); return }
    if (!form.startDate)    { setError('Start date is required'); return }
    setSaving(true); setError('')
    try {
      const url    = editing ? `/api/dashboard/events/${editing.id}` : '/api/dashboard/events'
      const method = editing ? 'PUT' : 'POST'
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(form)),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Something went wrong'); return }
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
          width: 'min(900px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              {editing ? 'Edit event' : t.classes.createEvent}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.classes.publishEventDesc}</p>
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

            {/* Left — form */}
            <div className="flex-1 min-w-0 flex flex-col gap-5">

              <div className="grid grid-cols-2 gap-4">
                <EventField label={t.classes.eventTitle}>
                  <input type="text" placeholder={t.classes.eventTitlePlaceholder}
                    value={form.title} onChange={e => set('title', e.target.value)} style={eventInp} />
                </EventField>
                <EventField label={t.classes.eventType}>
                  <select value={form.type} onChange={e => set('type', e.target.value as DbEventType)} style={eventInp}>
                    {(Object.entries(TYPE_LABELS) as [DbEventType, string][]).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </EventField>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <EventField label={t.common.date}>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} style={eventInp} />
                </EventField>
                <EventField label={t.classes.startTime}>
                  <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} style={eventInp} />
                </EventField>
                <EventField label={t.classes.endTime}>
                  <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} style={eventInp} />
                </EventField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EventField label={t.classes.instructorHost}>
                  <select value={form.instructorId} onChange={e => set('instructorId', e.target.value)} style={eventInp}>
                    <option value="">No instructor / external guest</option>
                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </EventField>
                <EventField label={t.common.location}>
                  <input type="text" placeholder="e.g. Main Academy, Palacio de los Deportes…"
                    value={form.location} onChange={e => set('location', e.target.value)} style={eventInp} />
                </EventField>
              </div>

              <EventField label={t.classes.capacityMax}>
                <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Total attendees (optional)"
                  value={form.capacity} onChange={e => set('capacity', e.target.value.replace(/\D/g, ''))} style={eventInp} />
              </EventField>

              {/* Ticket types */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label style={eventLbl}>Ticket types</label>
                  <button type="button"
                    onClick={() => set('tickets', [...form.tickets, { ...EMPTY_TICKET }])}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-pointer"
                    style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                    <Plus size={12} /> Add ticket
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.tickets.map((ticket, idx) => {
                    function updateTicket(patch: Partial<EventTicket>) {
                      set('tickets', form.tickets.map((t, i) => i === idx ? { ...t, ...patch } : t))
                    }
                    return (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-xl"
                      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                      <Ticket size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                      <input type="text" placeholder="Ticket name (e.g. Member, Early Bird, VIP)"
                        value={ticket.name}
                        onChange={e => updateTicket({ name: e.target.value })}
                        style={{ ...eventInp, flex: 2, minWidth: 0 }} />
                      <div className="flex items-center gap-1 shrink-0" style={{ ...eventInp, width: 'auto', padding: '9px 10px' }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>€</span>
                        <input type="text" inputMode="decimal" placeholder="0"
                          value={ticket.price === 0 ? '' : ticket.price}
                          onChange={e => updateTicket({ price: Number(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                          style={{ border: 'none', outline: 'none', width: 60, fontSize: 13, color: '#111827', background: 'transparent' }} />
                      </div>
                      <input type="text" inputMode="numeric" placeholder="Cap."
                        value={ticket.capacity}
                        onChange={e => updateTicket({ capacity: e.target.value.replace(/\D/g, '') })}
                        style={{ ...eventInp, width: 70, flexShrink: 0 }} />
                      {form.tickets.length > 1 && (
                        <button type="button"
                          onClick={() => set('tickets', form.tickets.filter((_, i) => i !== idx))}
                          className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0"
                          style={{ border: 'none', background: 'transparent', color: '#9CA3AF' }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  )})}
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>
                  Each ticket can have its own price and capacity. Leave price at 0 for free tickets.
                </p>
              </div>

              {/* Payment methods */}
              <div>
                <label style={eventLbl}>Payment methods</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {PAYMENT_OPTIONS.map(opt => {
                    const active = form.paymentMethods.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? form.paymentMethods.filter(m => m !== opt.value)
                            : [...form.paymentMethods, opt.value]
                          set('paymentMethods', next)
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all"
                        style={{
                          fontSize: 13, fontWeight: 500,
                          border: `1.5px solid ${active ? '#0071E3' : '#E5E7EB'}`,
                          background: active ? '#EFF6FF' : '#fff',
                          color: active ? '#0071E3' : '#6B7280',
                        }}>
                        <span>{opt.icon}</span>
                        {opt.label}
                        {active && <Check size={12} strokeWidth={2.5} />}
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 5 }}>
                  Select how attendees can pay for this event
                </p>
              </div>

              <EventField label="External link (optional)">
                <input type="url" placeholder="https://…"
                  value={form.externalUrl} onChange={e => set('externalUrl', e.target.value)} style={eventInp} />
              </EventField>

              <EventField label={t.common.description}>
                <textarea rows={4} placeholder={t.classes.describeEvent}
                  value={form.description} onChange={e => set('description', e.target.value)}
                  style={{ ...eventInp, resize: 'vertical', lineHeight: 1.6 }} />
              </EventField>

              {/* Public toggle */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>
                    Public on Explore
                  </p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>
                    Visible to anyone browsing Explore — great for attracting new students
                  </p>
                </div>
                <div
                  onClick={() => set('isPublished', !form.isPublished)}
                  className="cursor-pointer select-none"
                  style={{
                    width: 44, height: 24, borderRadius: 99,
                    background: form.isPublished ? '#0071E3' : '#E5E7EB',
                    padding: 2, display: 'flex', alignItems: 'center',
                    justifyContent: form.isPublished ? 'flex-end' : 'flex-start',
                    transition: 'background 0.2s', flexShrink: 0,
                  }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'all 0.2s' }} />
                </div>
              </div>

              {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
            </div>

            {/* Right — banner + preview */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <BannerUploadZone
                label={t.classes.eventBanner}
                value={form.coverUrl}
                onChange={url => set('coverUrl', url)}
                dropLabel={t.common.dropImage}
                browseLabel={t.common.browse}
                hint={t.common.pngJpg}
              />
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>{t.classes.recommendedSize}</p>

              {/* Quick preview */}
              <div className="mt-6 rounded-xl p-4 flex flex-col gap-2"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  {t.classes.preview}
                </p>
                {[
                  { icon: Calendar, label: form.startDate ? fmtDate(form.startDate + 'T00:00') : t.classes.dateTbd },
                  { icon: Clock,    label: form.startTime || t.classes.timeTbd },
                  { icon: MapPin,   label: form.location   || t.classes.locationTbd },
                  { icon: Ticket,   label: form.tickets.some(t => t.price > 0) ? `from €${Math.min(...form.tickets.map(t => t.price))}` : 'Free' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: '#0071E3', color: '#fff', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : (editing ? t.common.save : t.classes.publishEvent)}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Delete confirm modal ────────────────────────────────────────────────────────

function DeleteModal({ ev, onConfirm, onCancel }: {
  ev: EventRow | null; onConfirm: () => void; onCancel: () => void
}) {
  const t = useT()
  if (!ev) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FEF2F2' }}>
          <Trash2 size={24} style={{ color: '#DC2626' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Delete event?</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            <strong>{ev.title}</strong> will be permanently deleted.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#DC2626', color: '#fff' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Success modal ──────────────────────────────────────────────────────────────

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
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{message}</h3>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
          {t.common.done}
        </button>
      </div>
    </div>
  )
}

// ── Attendees modal ──────────────────────────────────────────────────────────────

interface AttendeeRow {
  id: string
  ticketName: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
  paymentMethod: PaymentMethod
  amountPaid: number | null
  currency: string
  createdAt: string
  checkedIn: boolean
  checkedInAt: string | null
  user: { name: string | null; email: string }
}

const ATTENDEE_STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:   { bg: '#FEF9C3', color: '#A16207', label: 'Pending' },
  CONFIRMED: { bg: '#DCFCE7', color: '#15803D', label: 'Confirmed' },
  CANCELLED: { bg: '#F3F4F6', color: '#6B7280', label: 'Cancelled' },
  COMPLETED: { bg: '#EFF6FF', color: '#1D4ED8', label: 'Completed' },
  NO_SHOW:   { bg: '#FEF2F2', color: '#B91C1C', label: 'No show' },
}

function AttendeesModal({ ev, onClose }: { ev: EventRow | null; onClose: () => void }) {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!ev) return
    setLoading(true)
    try {
      const res = await adminFetch(`/api/dashboard/events/${ev.id}/bookings`)
      if (res.ok) setAttendees((await res.json()).bookings ?? [])
    } finally {
      setLoading(false)
    }
  }, [ev])

  useEffect(() => { load() }, [load])

  // Poll while open so check-ins scanned from another phone show up live
  useEffect(() => {
    if (!ev) return
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [ev, load])

  if (!ev) return null

  const checkedInCount = attendees.filter(a => a.checkedIn).length

  async function updateStatus(bookingId: string, status: 'CONFIRMED' | 'CANCELLED') {
    setUpdatingId(bookingId)
    try {
      const res = await adminFetch(`/api/dashboard/events/${ev!.id}/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (res.ok) setAttendees(prev => prev.map(a => a.id === bookingId ? { ...a, status } : a))
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="rounded-2xl flex flex-col" style={{ background: '#fff', width: 560, maxHeight: '80vh', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Registrations</h3>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {ev.title} · {checkedInCount} / {attendees.length} checked in
            </p>
          </div>
          <button onClick={onClose} className="cursor-pointer" style={{ background: 'none', border: 'none' }}>
            <X size={18} style={{ color: '#9CA3AF' }} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4" style={{ flex: 1 }}>
          {loading ? (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
          ) : attendees.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>No registrations yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {attendees.map(a => {
                const sc = ATTENDEE_STATUS_MAP[a.status] ?? { bg: '#F3F4F6', color: '#6B7280', label: a.status }
                const canConfirm = a.status === 'PENDING' && a.paymentMethod === 'CASH'
                const canCancel  = a.status === 'PENDING' || a.status === 'CONFIRMED'
                return (
                  <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ border: '1px solid #F3F4F6' }}>
                    <div className="min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{a.user.name ?? a.user.email}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {a.ticketName} × {a.quantity} · {a.paymentMethod}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                      {a.checkedIn && (
                        <span className="flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: '#DCFCE7', color: '#15803D' }}>
                          <CheckCircle2 size={11} /> Checked in
                        </span>
                      )}
                      {canConfirm && (
                        <button
                          onClick={() => updateStatus(a.id, 'CONFIRMED')}
                          disabled={updatingId === a.id}
                          className="cursor-pointer"
                          style={{ fontSize: 11, fontWeight: 600, color: '#fff', background: '#16A34A', border: 'none', borderRadius: 8, padding: '5px 10px' }}>
                          Mark as paid
                        </button>
                      )}
                      {canCancel && (
                        <button
                          onClick={() => updateStatus(a.id, 'CANCELLED')}
                          disabled={updatingId === a.id}
                          className="cursor-pointer"
                          style={{ fontSize: 11, fontWeight: 600, color: '#B91C1C', background: '#FEF2F2', border: 'none', borderRadius: 8, padding: '5px 10px' }}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── QR Check-in modal ────────────────────────────────────────────────────────

function CheckinQRModal({ ev, onClose }: { ev: EventRow | null; onClose: () => void }) {
  if (!ev) return null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const scannerUrl = `${origin}/checkin/event/${ev.id}`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4" style={{ background: '#fff', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#F5F3FF' }}>
          <QrCode size={24} style={{ color: '#6D28D9' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>QR Check-in</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{ev.title}</p>
        </div>
        <div className="p-4 rounded-2xl" style={{ background: '#F9FAFB' }}>
          <QRCodeSVG value={scannerUrl} size={200} level="M" />
        </div>
        <p style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 1.5 }}>
          Scan this with the staff phone to open the scanner, then scan each attendee&apos;s ticket QR at the door.
        </p>
        <a href={scannerUrl} target="_blank" rel="noopener noreferrer"
          className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff', textDecoration: 'none', display: 'block' }}>
          Open scanner
        </a>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
          Close
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Filter = 'All' | EventStatus

export default function EventsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()

  const [events, setEvents]           = useState<EventRow[]>([])
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading]         = useState(true)

  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null)
  const [deleteEvent, setDeleteEvent]   = useState<EventRow | null>(null)
  const [successMsg, setSuccessMsg]     = useState('')
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null)
  const [attendeesEvent, setAttendeesEvent] = useState<EventRow | null>(null)
  const [checkinEvent, setCheckinEvent]     = useState<EventRow | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminFetch('/api/dashboard/events')
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events ?? [])
        setInstructors(data.instructors ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadEvents() }, [loadEvents])

  const eventsWithStatus = events.map(ev => ({ ...ev, _status: deriveStatus(ev) }))

  const upcomingCount  = eventsWithStatus.filter(e => e._status === 'Upcoming').length
  const pastCount      = eventsWithStatus.filter(e => e._status === 'Past').length
  const cancelledCount = eventsWithStatus.filter(e => e._status === 'Cancelled').length
  const publishedCount = events.filter(e => e.isPublished).length

  const filtered = eventsWithStatus.filter(ev => {
    const matchFilter = activeFilter === 'All' || ev._status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      ev.title.toLowerCase().includes(q) ||
      (ev.instructor?.name ?? '').toLowerCase().includes(q) ||
      TYPE_LABELS[ev.type].toLowerCase().includes(q) ||
      (ev.location ?? '').toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: Filter) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string)  => { setSearch(v); setCurrentPage(1) }

  function openCreate() { setEditingEvent(null); setDrawerOpen(true) }
  function openEdit(ev: EventRow) { setEditingEvent(ev); setDrawerOpen(true); setOpenMenuId(null) }

  async function handleDelete() {
    if (!deleteEvent) return
    await adminFetch(`/api/dashboard/events/${deleteEvent.id}`, { method: 'DELETE' })
    setDeleteEvent(null)
    setSuccessMsg('Event deleted')
    loadEvents()
  }

  async function togglePublished(ev: EventRow) {
    await adminFetch(`/api/dashboard/events/${ev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublished: !ev.isPublished }),
    })
    loadEvents()
  }

  async function cancelEvent(ev: EventRow) {
    await adminFetch(`/api/dashboard/events/${ev.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCancelled: true }),
    })
    setOpenMenuId(null)
    loadEvents()
  }

  function handleSaved() {
    setDrawerOpen(false)
    setSuccessMsg(editingEvent ? 'Event updated' : t.classes.eventPublished)
    loadEvents()
  }

  const STATS = [
    { label: t.classes.totalEvents, value: events.length.toString(),    sub: t.classes.vsLastQuarter },
    { label: t.classes.upcoming,    value: upcomingCount.toString(),     sub: t.classes.scheduled     },
    { label: 'Public on Explore',   value: publishedCount.toString(),    sub: 'visible to all'        },
    { label: t.classes.past,        value: pastCount.toString(),         sub: 'completed'             },
  ]

  const filterLabels: Record<Filter, string> = {
    All: t.common.all, Upcoming: t.classes.upcoming, Past: t.classes.past, Cancelled: t.common.cancelled,
  }
  const filterCounts: Record<Filter, number> = {
    All: events.length, Upcoming: upcomingCount, Past: pastCount, Cancelled: cancelledCount,
  }

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
            <input type="text" placeholder={t.classes.eventsSearchPlaceholder} value={search}
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} />
            <span className="hidden sm:inline">{t.classes.createEvent}</span>
          </button>
        </div>

        <div className="px-4 md:px-8 py-4 flex flex-col gap-4">

          {/* Header */}
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
              {t.classes.eventsTitle}
            </h1>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
              {filtered.length} {t.common.of} {events.length} {t.classes.ofEvents}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div key={stat.label} className="rounded-2xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '10px 14px' }}>
                <div className="flex items-start justify-between mb-2">
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11,
                    fontWeight: 600, background: '#F0FDF4', color: '#16A34A', padding: '2px 7px', borderRadius: 999 }}>
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
          <div className="flex items-center gap-2 flex-wrap">
            {(['All', 'Upcoming', 'Past', 'Cancelled'] as Filter[]).map(f => {
              const count = filterCounts[f]
              if (count === 0 && f !== 'All') return null
              return (
                <button key={f} onClick={() => handleFilter(f)}
                  className="cursor-pointer transition-all"
                  style={{ fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '6px 14px',
                    color: activeFilter === f ? '#111827' : '#6B7280',
                    background: activeFilter === f ? '#fff' : 'transparent',
                    boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {filterLabels[f]}
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600,
                    color: activeFilter === f ? '#0071E3' : '#9CA3AF' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[
                    { label: t.classes.colEvent,    cls: '' },
                    { label: t.common.date,         cls: 'hidden sm:table-cell' },
                    { label: t.classes.colHost,     cls: 'hidden lg:table-cell' },
                    { label: t.common.location,     cls: 'hidden lg:table-cell' },
                    { label: t.common.price,        cls: 'hidden md:table-cell' },
                    { label: 'Registrations',       cls: 'hidden md:table-cell' },
                    { label: 'Explore',             cls: 'hidden md:table-cell' },
                    { label: t.common.status,       cls: '' },
                    { label: t.common.actions,      cls: '' },
                  ].map(h => (
                    <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                        textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      {[1,2,3,4,5,6,7,8,9].map(j => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded animate-pulse"
                            style={{ background: '#F3F4F6', width: j === 1 ? 140 : 60 }} />
                        </td>
                      ))}
                    </tr>
                  ))
                  : paginated.map((ev, idx) => {
                    const status = ev._status
                    const sc = STATUS_MAP[status]
                    const tc = TYPE_MAP[ev.type]
                    return (
                      <tr key={ev.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                        {/* Event */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 rounded-lg flex items-center justify-center"
                              style={{ width: 40, height: 40, background: tc.bg }}>
                              <Star size={16} style={{ color: tc.color }} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{ev.title}</p>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                                background: tc.bg, color: tc.color, border: '1px solid ' + tc.border }}>
                                {TYPE_LABELS[ev.type]}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="hidden sm:table-cell px-5 py-3">
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{fmtDate(ev.startAt)}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                            {fmtTime(ev.startAt)}{ev.endAt ? ` – ${fmtTime(ev.endAt)}` : ''}
                          </p>
                        </td>

                        {/* Host */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#374151' }}>
                            {ev.instructor?.name ?? '—'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#374151' }}>{ev.location ?? '—'}</span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, fontWeight: 600,
                            color: (ev.tickets.length === 0 || ev.tickets.every(t => t.price === 0)) ? '#16A34A' : '#111827' }}>
                            {fmtTicketPrice(ev.tickets)}
                          </span>
                          {ev.tickets.length > 1 && (
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                              {ev.tickets.length} ticket types
                            </p>
                          )}
                        </td>

                        {/* Registrations */}
                        <td className="hidden md:table-cell px-5 py-3">
                          {(() => {
                            const { booked, capacity } = registrationSummary(ev)
                            return (
                              <button
                                onClick={e => { e.stopPropagation(); setAttendeesEvent(ev) }}
                                className="cursor-pointer hover:underline"
                                style={{ fontSize: 13, fontWeight: 600, background: 'none', border: 'none', padding: 0,
                                  color: capacity !== null && booked >= capacity ? '#B91C1C' : '#374151' }}>
                                {booked}{capacity !== null ? ` / ${capacity}` : ''}
                              </button>
                            )
                          })()}
                        </td>

                        {/* Explore toggle */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); togglePublished(ev) }}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer"
                            style={{
                              fontSize: 11, fontWeight: 600, border: 'none',
                              background: ev.isPublished ? '#EFF6FF' : '#F3F4F6',
                              color: ev.isPublished ? '#0071E3' : '#9CA3AF',
                            }}>
                            {ev.isPublished
                              ? <><Globe size={11} /> Public</>
                              : <><EyeOff size={11} /> Private</>
                            }
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 999, background: sc.bg, color: sc.color, whiteSpace: 'nowrap' }}>
                            {status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3 relative">
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === ev.id ? null : ev.id) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <MoreHorizontal size={15} />
                          </button>
                          {openMenuId === ev.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-6 mt-1 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 150, top: '100%' }}>
                                <button onClick={() => openEdit(ev)}
                                  className="w-full text-left px-4 py-2 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <Pencil size={13} /> {t.common.edit}
                                </button>
                                <button onClick={() => { setOpenMenuId(null); setCheckinEvent(ev) }}
                                  className="w-full text-left px-4 py-2 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <QrCode size={13} /> QR Check-in
                                </button>
                                {!ev.isCancelled && (
                                  <button onClick={() => cancelEvent(ev)}
                                    className="w-full text-left px-4 py-2 cursor-pointer flex items-center gap-2"
                                    style={{ fontSize: 13, color: '#D97706', background: 'transparent', border: 'none' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFBEB'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                    <EyeOff size={13} /> {t.classes.cancelEvent}
                                  </button>
                                )}
                                <button onClick={() => { setOpenMenuId(null); setDeleteEvent(ev) }}
                                  className="w-full text-left px-4 py-2 cursor-pointer flex items-center gap-2"
                                  style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                  <Trash2 size={13} /> {t.common.delete}
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>

            {!loading && paginated.length === 0 && (
              <div className="py-16 text-center">
                <Calendar size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.classes.noEvents}</p>
              </div>
            )}

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 13, color: '#6B7280' }}>
                {t.common.showing}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                </span>
                {' '}{t.common.of}{' '}
                <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
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

      <EventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        editing={editingEvent}
        instructors={instructors}
      />

      <DeleteModal
        ev={deleteEvent}
        onConfirm={handleDelete}
        onCancel={() => setDeleteEvent(null)}
      />

      <SuccessModal
        open={!!successMsg}
        onClose={() => setSuccessMsg('')}
        message={successMsg}
      />

      <AttendeesModal
        ev={attendeesEvent}
        onClose={() => { setAttendeesEvent(null); loadEvents() }}
      />

      <CheckinQRModal
        ev={checkinEvent}
        onClose={() => setCheckinEvent(null)}
      />
    </>
  )
}
