'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Plus, ChevronLeft, Clock, CalendarDays, LayoutList, MoreHorizontal, Pencil, Copy, Trash2, Eye, Check, Upload} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../../lib/i18n/translations'

// ── Constants ──────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64
const START_HOUR  = 6
const END_HOUR    = 22
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const WEEK_DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── Activity colours ───────────────────────────────────────────────────────────
const ACTIVITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'BJJ':          { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  'NOGI':         { bg: '#F5F3FF', border: '#DDD6FE', text: '#6D28D9' },
  'Wrestling':    { bg: '#FFF7ED', border: '#FED7AA', text: '#C2410C' },
  'BJJ Kids':     { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  'Yoga':         { bg: '#F0FDFA', border: '#99F6E4', text: '#0F766E' },
  'Open Mat':     { bg: '#F9FAFB', border: '#E5E7EB', text: '#374151' },
  'BJJ Comp':     { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' },
  'Self Defence': { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface ApiClass {
  id: string
  name: string
  capacity: number | null
  isActive: boolean
  isPublished: boolean
  schedule: { dayOfWeek: number; startTime: string; endTime: string }[] | null
  instructor: { id: string; name: string } | null
  discipline: { id: string; name: string } | null
}

interface ClassSlot {
  id: string
  classId: string   // actual DB class id (id is `${classId}-${slotIndex}`)
  day: number       // Mon=0 … Sun=6
  startH: number
  startM: number
  durationM: number
  name: string
  activity: string  // discipline name, falls back to class name
  instructor: string
  capacity: number
  enrolled: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Day-of-week index Mon=0 … Sun=6 */
function dowMon(d: Date): number { return (d.getDay() + 6) % 7 }

/**
 * Convert an API class and its recurring schedule slots into CalendarClient
 * ClassSlot items. ScheduleSlot.dayOfWeek uses JS convention (0=Sun…6=Sat);
 * CalendarClient uses Mon=0…Sun=6, so we apply (dow + 6) % 7.
 */
function apiClassToSlots(cls: ApiClass): ClassSlot[] {
  if (!cls.schedule || cls.schedule.length === 0) return []
  return cls.schedule.map((slot, i) => {
    const [startH = 0, startM = 0] = slot.startTime.split(':').map(Number)
    const [endH = 0,   endM = 0]   = slot.endTime.split(':').map(Number)
    const durationM = Math.max(30, (endH * 60 + endM) - (startH * 60 + startM))
    return {
      id:        `${cls.id}-${i}`,
      classId:   cls.id,
      day:       (slot.dayOfWeek + 6) % 7,
      startH,
      startM,
      durationM,
      name:      cls.name,
      activity:  cls.discipline?.name ?? cls.name,
      instructor: cls.instructor?.name ?? '—',
      capacity:  cls.capacity ?? 0,
      enrolled:  0,
    }
  })
}

/** Classes scheduled on a given date (matched by recurring day-of-week) */
function classesForDate(date: Date, classes: ClassSlot[]): ClassSlot[] {
  const dow = dowMon(date)
  return classes.filter(s => s.day === dow)
}

/** Build a 5-or-6-week grid for a month */
function buildMonthGrid(year: number, month: number): Date[] {
  const first   = new Date(year, month, 1)
  const last    = new Date(year, month + 1, 0)
  const pad     = dowMon(first)          // leading days from prev month
  const cells: Date[] = []
  for (let i = pad; i > 0; i--) {
    const d = new Date(year, month, 1 - i)
    cells.push(d)
  }
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  const rem = 7 - (cells.length % 7)
  if (rem < 7) for (let i = 1; i <= rem; i++) cells.push(new Date(year, month + 1, i))
  return cells
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function classTop(startH: number, startM: number) {
  return ((startH - START_HOUR) + startM / 60) * HOUR_HEIGHT
}
function classHeight(durationM: number) {
  return Math.max(28, (durationM / 60) * HOUR_HEIGHT)
}
function fmtTime(h: number, m: number) {
  return h + ':' + m.toString().padStart(2, '0')
}
function formatHour(h: number) {
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function weekMondayFor(d: Date): Date {
  const dow  = dowMon(d)
  const mon  = new Date(d)
  mon.setDate(d.getDate() - dow)
  return mon
}
function formatWeekLabel(monday: Date) {
  const sun = new Date(monday); sun.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return fmt(monday) + ' – ' + fmt(sun)
}

// ── Nav ────────────────────────────────────────────────────────────────────────
type NavItem = {
  label: string; icon: React.ElementType; href?: string
  children?: { label: string; href: string }[]
}
// ── Class popup ────────────────────────────────────────────────────────────────
function ClassPopup({ slot, date, onClose, onDeleted }: {
  slot: ClassSlot; date: Date; onClose: () => void; onDeleted: (classId: string) => void
}) {
  const t = useT()
  const router = useRouter()
  const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const endMin = slot.startH * 60 + slot.startM + slot.durationM
  const time   = fmtTime(slot.startH, slot.startM) + ' – ' + fmtTime(Math.floor(endMin / 60), endMin % 60)
  const [deleting, setDeleting] = useState(false)
  const [studentsView, setStudentsView] = useState(false)
  const [students, setStudents] = useState<{ id: string; name: string; avatarUrl: string | null; status: string }[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)

  async function loadStudents() {
    setLoadingStudents(true)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    try {
      const res = await fetch(`/api/dashboard/classes/${slot.classId}/bookings?date=${dateStr}`)
      if (res.ok) {
        const data = await res.json()
        setStudents(data.bookings ?? [])
      }
    } finally {
      setLoadingStudents(false)
    }
  }

  const bookedCount = students.length
  const pct    = slot.capacity > 0 ? Math.round((bookedCount || slot.enrolled) / slot.capacity * 100) : 0
  const isFull = slot.capacity > 0 && (bookedCount || slot.enrolled) >= slot.capacity
  const barClr = isFull ? '#DC2626' : pct >= 80 ? '#D97706' : '#16A34A'

  async function handleDelete() {
    if (!confirm(`Delete "${slot.name}"? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/dashboard/classes/${slot.classId}`, { method: 'DELETE' })
    onDeleted(slot.classId)
    onClose()
  }

  async function handleDuplicate() {
    await fetch('/api/dashboard/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: slot.name + ' (copy)', capacity: slot.capacity }),
    })
    onClose()
    router.refresh()
  }

  if (studentsView) {
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={onClose} />
        <div className="fixed z-50 rounded-2xl overflow-hidden"
          style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', width: 280, maxHeight: 420, display: 'flex', flexDirection: 'column',
            boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid #E5E7EB' }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <button onClick={() => setStudentsView(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
              style={{ background: 'none', border: 'none', padding: 0, display: 'flex' }}>
              <ChevronLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{slot.name}</p>
              <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{time} · {students.length} {t.classes.students}</p>
            </div>
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingStudents ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Users size={28} style={{ color: '#D1D5DB', marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>No bookings for this session</p>
              </div>
            ) : (
              students.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: '1px solid #F9FAFB' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#EFF6FF', fontSize: 11, fontWeight: 700, color: '#0870E2' }}>
                    {s.name?.[0] ?? '?'}
                  </div>
                  <p style={{ fontSize: 13, color: '#111827', margin: 0, flex: 1, minWidth: 0 }} className="truncate">{s.name}</p>
                  <span style={{ fontSize: 10, fontWeight: 600, color: s.status === 'ATTENDED' ? '#16A34A' : '#6B7280',
                    background: s.status === 'ATTENDED' ? '#F0FDF4' : '#F3F4F6',
                    padding: '2px 6px', borderRadius: 999 }}>
                    {s.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 rounded-2xl overflow-hidden"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: '#fff', width: 252, boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid #E5E7EB' }}>
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.3 }}>{slot.name}</p>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, flexShrink: 0,
              background: colors.bg, color: colors.text, border: '1px solid ' + colors.border }}>
              {slot.activity}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#6B7280' }}>{time} · {slot.instructor}</p>
          <div style={{ marginTop: 10, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: barClr, width: pct + '%' }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>{slot.enrolled} / {slot.capacity} {t.classes.students}</p>
            <span style={{ fontSize: 10, fontWeight: 600, color: barClr }}>
              {isFull ? t.common.full : pct >= 80 ? t.classes.almostFull : t.common.open}
            </span>
          </div>
        </div>
        <div className="py-1">
          {[
            { icon: Users,  label: t.classes.students,           color: '#374151', action: () => { setStudentsView(true); loadStudents() } },
            { icon: Pencil, label: t.classes.editClass,          color: '#374151', action: () => { onClose(); router.push('/dashboard/classes') } },
            { icon: Copy,   label: t.common.duplicate,           color: '#374151', action: handleDuplicate },
            { icon: Trash2, label: t.common.delete,              color: '#DC2626', action: handleDelete },
          ].map(({ icon: Icon, label, color, action }) => (
            <button key={label} onClick={action} disabled={deleting}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
              style={{ background: 'transparent', border: 'none', fontSize: 13, color, textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Mini date-picker popover ───────────────────────────────────────────────────
function DatePicker({
  selected, onSelect, onClose,
}: { selected: Date; onSelect: (d: Date) => void; onClose: () => void }) {
  const t = useT()
  const monthNames = t.classes.monthNames.split(',')
  const today = new Date()
  const [pickerYear,  setPickerYear]  = useState(selected.getFullYear())
  const [pickerMonth, setPickerMonth] = useState(selected.getMonth())

  const grid = buildMonthGrid(pickerYear, pickerMonth)

  function prevMonth() {
    if (pickerMonth === 0) { setPickerMonth(11); setPickerYear(y => y - 1) }
    else setPickerMonth(m => m - 1)
  }
  function nextMonth() {
    if (pickerMonth === 11) { setPickerMonth(0); setPickerYear(y => y + 1) }
    else setPickerMonth(m => m + 1)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute z-50 rounded-2xl overflow-hidden"
        style={{ top: 'calc(100% + 8px)', right: 0,
          background: '#fff', border: '1px solid #E5E7EB',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: 264, padding: '12px' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ border: '1px solid #E5E7EB', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
            <ChevronLeft size={13} style={{ color: '#374151' }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
            {monthNames[pickerMonth]} {pickerYear}
          </span>
          <button onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
            style={{ border: '1px solid #E5E7EB', background: '#fff' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
            <ChevronRight size={13} style={{ color: '#374151' }} />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 mb-1">
          {t.classes.weekDays.split(',').map((d, di) => (
            <div key={di} className="flex items-center justify-center"
              style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', padding: '3px 0', letterSpacing: '0.04em' }}>
              {d[0]}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px">
          {grid.map((date, i) => {
            const isThisMonth = date.getMonth() === pickerMonth
            const isToday     = isSameDay(date, today)
            const isSelected  = isSameDay(date, selected)
            return (
              <button key={i} onClick={() => { onSelect(date); onClose() }}
                className="flex items-center justify-center rounded-lg cursor-pointer"
                style={{ height: 32, fontSize: 12, fontWeight: isSelected || isToday ? 700 : 400, border: 'none',
                  background: isSelected ? '#0071E3' : isToday ? '#EFF6FF' : 'transparent',
                  color: isSelected ? '#fff' : isToday ? '#0071E3' : isThisMonth ? '#374151' : '#D1D5DB' }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? '#EFF6FF' : 'transparent' }}>
                {date.getDate()}
              </button>
            )
          })}
        </div>

        {/* Footer: today button */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <button onClick={() => { onSelect(today); onClose() }}
            className="w-full py-1.5 rounded-lg cursor-pointer"
            style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
            {t.classes.goToToday}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Week-view class block ──────────────────────────────────────────────────────
function WeekClassBlock({ slot, date, onSelect }: { slot: ClassSlot; date: Date; onSelect: (s: ClassSlot, d: Date) => void }) {
  const colors  = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const top     = classTop(slot.startH, slot.startM)
  const height  = classHeight(slot.durationM)
  const pct     = Math.round((slot.enrolled / slot.capacity) * 100)
  const isFull  = slot.enrolled >= slot.capacity
  const endMin  = slot.startH * 60 + slot.startM + slot.durationM
  const time    = fmtTime(slot.startH, slot.startM) + '–' + fmtTime(Math.floor(endMin / 60), endMin % 60)
  return (
    <div className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer"
      style={{ top: top + 1, height: height - 2, background: colors.bg,
        border: '1.5px solid ' + colors.border, zIndex: 1, overflow: 'hidden', transition: 'box-shadow 0.15s' }}
      onClick={e => { e.stopPropagation(); onSelect(slot, date) }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
      <p style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{slot.name}</p>
      {height > 36 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.75 }}>{time}</p>}
      {height > 52 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.6 }}>{slot.instructor}</p>}
      {height > 80 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 3, background: colors.border, borderRadius: 99 }}>
            <div style={{ height: 3, borderRadius: 99, background: isFull ? '#DC2626' : colors.text, width: pct + '%', opacity: 0.6 }} />
          </div>
          <p style={{ fontSize: 9, color: colors.text, opacity: 0.6, marginTop: 2 }}>{slot.enrolled}/{slot.capacity}{isFull ? ' · Full' : ''}</p>
        </div>
      )}
    </div>
  )
}

// ── Add Class drawer (reused from classes page) ────────────────────────────────
const INSTRUCTORS_LIST = ['Carlos Silva', 'Monti', 'Ana Torres', 'Jorge Sanchez', 'Laura M.']
const ACTIVITIES_LIST  = Object.keys(ACTIVITY_COLORS)
const DEFAULT_DAYS     = [true, true, true, true, true, false, false]

// Stub location/room data for the Add Class form (TODO: replace with API data)
const DRAWER_LOCATIONS = [
  { id: 1, name: 'Main Academy',  city: 'Madrid', color: '#0071E3' },
  { id: 2, name: 'Branch Malaga', city: 'Malaga', color: '#7C3AED' },
]
const DRAWER_ROOMS = [
  { id: 1, name: 'Main Mat',     capacity: 30, locationId: 1 },
  { id: 2, name: 'Kids Room',    capacity: 20, locationId: 1 },
  { id: 3, name: 'Weights Area', capacity: 15, locationId: 1 },
  { id: 4, name: 'Dojo Central', capacity: 25, locationId: 2 },
  { id: 5, name: 'Fitness Room', capacity: 12, locationId: 2 },
]

function AddClassDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useT()
  const daysOfWeek = t.classes.daysOfWeek.split(',')
  const [selLocId, setSelLocId]     = useState<number | ''>('')
  const [dayEnabled, setDayEnabled] = useState<boolean[]>([...DEFAULT_DAYS])
  const [bannerDrag, setBannerDrag] = useState(false)
  const [repeat, setRepeat]         = useState('Yes')

  useEffect(() => {
    if (open) { setSelLocId(''); setDayEnabled([...DEFAULT_DAYS]); setBannerDrag(false); setRepeat('Yes') }
  }, [open])

  const availableRooms = selLocId !== '' ? DRAWER_ROOMS.filter(r => r.locationId === selLocId) : []
  const iStyle: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px',
    fontSize: 12, color: '#111827', background: '#fff', outline: 'none', width: '100%',
  }
  const lStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }

  return (
    <>
      <div className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.2s' }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: 'min(760px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{t.classes.addClassToCalendar}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.classes.scheduleNewClass}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Banner */}
          <div>
            <label style={lStyle}>{t.classes.classBanner}</label>
            <div onDragEnter={() => setBannerDrag(true)} onDragLeave={() => setBannerDrag(false)} onDrop={() => setBannerDrag(false)}
              className="flex items-center gap-4 rounded-xl"
              style={{ border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                background: bannerDrag ? '#EFF6FF' : '#fff', padding: '12px 16px' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6' }}>
                <Upload size={15} style={{ color: '#9CA3AF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t.common.dropImage}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{t.common.pngJpg}</p>
              </div>
              <label className="px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                {t.common.browse}<input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label style={lStyle}>{t.common.title}</label><input type="text" placeholder={t.classes.classTitlePlaceholder} style={iStyle} /></div>
            <div>
              <label style={lStyle}>{t.common.instructor}</label>
              <select style={iStyle}><option value="">{t.classes.selectInstructor.replace('…','...')}</option>{INSTRUCTORS_LIST.map(i => <option key={i}>{i}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lStyle}>{t.common.activity}</label>
              <select style={iStyle}><option value="">{t.classes.selectActivity.replace('…','...')}</option>{ACTIVITIES_LIST.map(a => <option key={a}>{a}</option>)}</select>
            </div>
            <div><label style={lStyle}>{t.common.capacity}</label><input type="number" placeholder="20" min={1} style={iStyle} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lStyle}>{t.common.location}</label>
              <select style={iStyle} value={selLocId} onChange={e => setSelLocId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">{t.classes.selectLocation.replace('…','...')}</option>{DRAWER_LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
              </select>
            </div>
            <div>
              <label style={lStyle}>{t.classes.room}</label>
              <select style={{ ...iStyle, opacity: selLocId === '' ? 0.5 : 1 }} disabled={selLocId === ''}>
                <option value="">{selLocId === '' ? t.classes.selectLocationFirst : t.classes.selectRoom}</option>
                {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name} ({t.classes.cap} {r.capacity})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={lStyle}>{t.classes.repeat}</label>
              <select value={repeat} onChange={e => setRepeat(e.target.value)} style={iStyle}><option value="Yes">{t.common.yes}</option><option value="No">{t.common.no}</option></select>
            </div>
            <div><label style={lStyle}>{t.common.startDate}</label><input type="date" style={iStyle} /></div>
            <div><label style={lStyle}>{repeat === 'Yes' ? t.classes.repeatEndDate : t.common.endDate}</label><input type="date" style={iStyle} /></div>
          </div>
          {/* Session timings */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0071E3', marginBottom: 12 }}>{t.classes.sessionTimings}</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                    {[t.classes.day, t.classes.startTimeCol, t.classes.endTimeCol, t.classes.breakStart, t.classes.breakEnd, t.common.active].map(h => (
                      <th key={h} className="px-3 py-2 text-left"
                        style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {daysOfWeek.map((day, idx) => {
                    const on = dayEnabled[idx] ?? false
                    return (
                      <tr key={day} style={{ borderBottom: idx < daysOfWeek.length - 1 ? '1px solid #F9FAFB' : 'none', opacity: on ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                        <td className="px-3 py-2">
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{day.slice(0, 3)}</span>
                        </td>
                        {[0, 1, 2, 3].map(i => (
                          <td key={i} className="px-3 py-2">
                            <input type="time" disabled={!on} style={{ ...iStyle, width: 90, padding: '5px 6px', fontSize: 11, cursor: on ? 'text' : 'not-allowed' }} />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div onClick={() => setDayEnabled(prev => prev.map((v, i) => i === idx ? !v : v))}
                            className="cursor-pointer select-none"
                            style={{ width: 44, height: 22, borderRadius: 99, background: on ? '#0071E3' : '#E5E7EB',
                              padding: '2px', display: 'flex', alignItems: 'center', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background 0.2s' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'all 0.2s' }} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0" style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={onSuccess} className="px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
            {t.classes.addToCalendar}
          </button>
        </div>
      </div>
    </>
  )
}

function SuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>{t.classes.classAdded}</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{t.classes.classAddedDesc}</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>{t.common.done}</button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CalendarClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const monthNames = t.classes.monthNames.split(',')
  const weekDayLabels = t.classes.weekDays.split(',')
  const [today]                           = useState(() => new Date())
  const nowH = today.getHours()
  const nowM = today.getMinutes()
  const [view, setView]                   = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate]   = useState<Date>(() => new Date())
  const [selectedSlot, setSelectedSlot]   = useState<ClassSlot | null>(null)
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>(() => new Date())
  const [pickerOpen, setPickerOpen]       = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [successOpen, setSuccessOpen]     = useState(false)
  const [expandedDay, setExpandedDay]     = useState<string | null>(null)
  const [classes, setClasses]             = useState<ClassSlot[]>([])
  const [loading, setLoading]             = useState(true)
  const [loadError, setLoadError]         = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Fetch real classes from API
  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    fetch('/api/dashboard/classes')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: { classes: ApiClass[] }) => {
        setClasses(data.classes.flatMap(apiClassToSlots))
      })
      .catch(() => setLoadError('Failed to load classes'))
      .finally(() => setLoading(false))
  }, [])

  // Auto-scroll week view to current time
  useEffect(() => {
    if (view === 'week' && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, classTop(nowH, nowM) - 120)
    }
  }, [view, nowH, nowM])

  // Month/year derived from selectedDate
  const viewYear  = selectedDate.getFullYear()
  const viewMonth = selectedDate.getMonth()

  // Week view: Monday of selectedDate's week
  const weekMonday = weekMondayFor(selectedDate)
  const weekDates  = WEEK_DAYS.map((_, i) => { const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i); return d })
  const todayWeekIdx = weekDates.findIndex(d => isSameDay(d, today))
  const nowTop = classTop(nowH, nowM)

  function prevPeriod() {
    if (view === 'month') {
      const d = new Date(selectedDate)
      d.setMonth(d.getMonth() - 1, 1)
      setSelectedDate(d)
    } else {
      const d = new Date(weekMonday)
      d.setDate(d.getDate() - 7)
      setSelectedDate(d)
    }
  }
  function nextPeriod() {
    if (view === 'month') {
      const d = new Date(selectedDate)
      d.setMonth(d.getMonth() + 1, 1)
      setSelectedDate(d)
    } else {
      const d = new Date(weekMonday)
      d.setDate(d.getDate() + 7)
      setSelectedDate(d)
    }
  }
  function goToday() { setSelectedDate(today) }

  function isCurrentPeriod() {
    if (view === 'month') return selectedDate.getFullYear() === today.getFullYear() && selectedDate.getMonth() === today.getMonth()
    return weekDates.some(d => isSameDay(d, today))
  }

  const monthGrid = buildMonthGrid(viewYear, viewMonth)
  const MAX_CHIPS = 3

  const periodLabel = view === 'month'
    ? `${monthNames[viewMonth]} ${viewYear}`
    : formatWeekLabel(weekMonday)

  return (
    <main style={{ flex: 1, minWidth: 0 }}>
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 gap-3"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              {t.classes.calendarTitle}
            </h1>

            {/* View toggle: Month / Week */}
            <div className="flex items-center rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              {(['month', 'week'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 500, border: 'none',
                    background: view === v ? '#fff' : 'transparent',
                    color: view === v ? '#111827' : '#9CA3AF',
                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {v === 'month' ? <LayoutList size={13} /> : <CalendarDays size={13} />}
                  {v === 'month' ? t.classes.month : t.classes.week}
                </button>
              ))}
            </div>

            {/* Period navigation */}
            <div className="hidden sm:flex items-center gap-1">
              <button onClick={prevPeriod}
                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                <ChevronLeft size={13} style={{ color: '#374151' }} />
              </button>

              {/* Period label + date picker trigger */}
              <div className="relative" ref={pickerRef}>
                <button onClick={() => setPickerOpen(o => !o)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer select-none"
                  style={{ border: '1px solid ' + (pickerOpen ? '#0071E3' : '#E5E7EB'),
                    background: pickerOpen ? '#EFF6FF' : '#fff', fontSize: 12,
                    fontWeight: 500, color: pickerOpen ? '#0071E3' : '#374151', whiteSpace: 'nowrap' }}>
                  <CalendarDays size={12} style={{ color: pickerOpen ? '#0071E3' : '#9CA3AF' }} />
                  {periodLabel}
                </button>
                {pickerOpen && (
                  <DatePicker
                    selected={selectedDate}
                    onSelect={d => { setSelectedDate(d); setPickerOpen(false) }}
                    onClose={() => setPickerOpen(false)}
                  />
                )}
              </div>

              <button onClick={nextPeriod}
                className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                style={{ border: '1px solid #E5E7EB', background: '#fff' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                <ChevronRight size={13} style={{ color: '#374151' }} />
              </button>

              <button onClick={goToday}
                className="px-3 py-1.5 rounded-lg cursor-pointer"
                style={{ border: '1px solid #E5E7EB',
                  background: isCurrentPeriod() ? '#EFF6FF' : '#fff',
                  fontSize: 12, fontWeight: 500,
                  color: isCurrentPeriod() ? '#0071E3' : '#374151' }}
                onMouseEnter={e => { if (!isCurrentPeriod()) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                onMouseLeave={e => { if (!isCurrentPeriod()) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                {t.common.today}
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={12} style={{ color: '#9CA3AF' }} />
              {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff' }}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div className="flex-1 overflow-y-auto">
            {/* Weekday header */}
            <div className="grid grid-cols-7 sticky top-0 z-10"
              style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
              {weekDayLabels.map((d, i) => (
                <div key={i} className="py-2 flex items-center justify-center"
                  style={{ borderLeft: i > 0 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</span>
                </div>
              ))}
            </div>

            {/* Loading / error state */}
            {loading && (
              <div className="flex items-center justify-center py-16" style={{ color: '#9CA3AF', fontSize: 13 }}>
                Loading classes…
              </div>
            )}
            {loadError && (
              <div className="flex items-center justify-center py-16" style={{ color: '#DC2626', fontSize: 13 }}>
                {loadError}
              </div>
            )}

            {/* Day cells grid */}
            {!loading && !loadError && (
            <div className="grid grid-cols-7"
              style={{ gridAutoRows: 'minmax(112px, 1fr)' }}>
              {monthGrid.map((date, i) => {
                const isThisMonth  = date.getMonth() === viewMonth
                const isToday      = isSameDay(date, today)
                const isSelected   = isSameDay(date, selectedDate)
                const dayClasses   = classesForDate(date, classes)
                const shown        = dayClasses.slice(0, MAX_CHIPS)
                const overflow     = dayClasses.length - shown.length
                const dayKey      = date.toISOString().slice(0, 10)
                const isExpanded  = expandedDay === dayKey
                const col         = i % 7

                return (
                  <div key={i}
                    className="p-1.5 flex flex-col"
                    style={{
                      borderLeft: col > 0 ? '1px solid #F3F4F6' : 'none',
                      borderBottom: '1px solid #F3F4F6',
                      background: isToday ? '#FAFBFF' : isSelected && !isToday ? '#FAFAFA' : '#fff',
                      opacity: isThisMonth ? 1 : 0.45,
                      cursor: 'default',
                      position: 'relative',
                    }}>
                    {/* Date number */}
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => { setSelectedDate(date); setView('week') }}
                        className="flex items-center justify-center w-6 h-6 rounded-full cursor-pointer"
                        title={t.classes.viewThisWeek}
                        style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, border: 'none',
                          background: isToday ? '#0071E3' : 'transparent',
                          color: isToday ? '#fff' : isThisMonth ? '#374151' : '#9CA3AF' }}
                        onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                        onMouseLeave={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        {date.getDate()}
                      </button>
                      {dayClasses.length > 0 && (
                        <span style={{ fontSize: 9, color: '#9CA3AF' }}>{dayClasses.length} {dayClasses.length !== 1 ? t.classes.classCountPlural : t.classes.classCount}</span>
                      )}
                    </div>

                    {/* Class chips */}
                    <div className="flex flex-col gap-0.5 flex-1">
                      {shown.map(slot => {
                        const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
                        const endMin = slot.startH * 60 + slot.startM + slot.durationM
                        return (
                          <button key={slot.id}
                            onClick={() => { setSelectedSlot(slot); setSelectedSlotDate(date) }}
                            className="w-full text-left rounded px-1.5 py-0.5 cursor-pointer flex items-center gap-1 min-w-0"
                            style={{ background: colors.bg, border: '1px solid ' + colors.border,
                              fontSize: 10, color: colors.text, fontWeight: 600, lineHeight: 1.4 }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                            <span className="truncate flex-1">{slot.name}</span>
                            <span style={{ opacity: 0.7, flexShrink: 0 }}>
                              {fmtTime(slot.startH, slot.startM)}
                            </span>
                          </button>
                        )
                      })}

                      {/* +N more */}
                      {overflow > 0 && !isExpanded && (
                        <button
                          onClick={() => setExpandedDay(dayKey)}
                          className="w-full text-left rounded px-1.5 py-0.5 cursor-pointer"
                          style={{ fontSize: 10, fontWeight: 500, color: '#6B7280',
                            background: '#F3F4F6', border: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#E5E7EB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#F3F4F6'}>
                          +{overflow} {t.classes.more}
                        </button>
                      )}
                      {/* Expanded overflow */}
                      {isExpanded && dayClasses.slice(MAX_CHIPS).map(slot => {
                        const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
                        return (
                          <button key={slot.id}
                            onClick={() => { setSelectedSlot(slot); setSelectedSlotDate(date) }}
                            className="w-full text-left rounded px-1.5 py-0.5 cursor-pointer flex items-center gap-1 min-w-0"
                            style={{ background: colors.bg, border: '1px solid ' + colors.border,
                              fontSize: 10, color: colors.text, fontWeight: 600, lineHeight: 1.4 }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.8'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
                            <span className="truncate flex-1">{slot.name}</span>
                            <span style={{ opacity: 0.7, flexShrink: 0 }}>{fmtTime(slot.startH, slot.startM)}</span>
                          </button>
                        )
                      })}
                      {isExpanded && (
                        <button onClick={() => setExpandedDay(null)}
                          className="w-full text-left rounded px-1.5 py-0.5 cursor-pointer"
                          style={{ fontSize: 10, color: '#9CA3AF', background: 'transparent', border: 'none' }}>
                          {t.classes.showLess}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        )}

        {/* ── WEEK VIEW ── */}
        {view === 'week' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Day header */}
            <div className="flex shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ width: 56, flexShrink: 0 }} />
              {WEEK_DAYS.map((day, i) => {
                const date    = weekDates[i]!
                const isToday = isSameDay(date, today)
                return (
                  <div key={day} className="flex-1 flex flex-col items-center py-2 border-l"
                    style={{ borderColor: '#F3F4F6', minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: isToday ? '#0071E3' : '#9CA3AF' }}>
                      {weekDayLabels[i]}
                    </span>
                    <div className="flex items-center justify-center mt-0.5"
                      style={{ width: 26, height: 26, borderRadius: '50%', background: isToday ? '#0071E3' : 'transparent' }}>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : '#374151' }}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="flex" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
                <div style={{ width: 56, flexShrink: 0 }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start',
                      paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 10, color: '#C4C9D4', whiteSpace: 'nowrap' }}>{formatHour(h)}</span>
                    </div>
                  ))}
                </div>
                {WEEK_DAYS.map((day, dayIdx) => {
                  const date    = weekDates[dayIdx]!
                  const isToday = isSameDay(date, today)
                  const dow     = dowMon(date)
                  const slots   = classes.filter(s => s.day === dow)
                  return (
                    <div key={day} className="flex-1 border-l relative"
                      style={{ borderColor: '#F3F4F6', minWidth: 0, background: isToday ? '#FAFBFF' : 'transparent' }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F3F4F6' }} />
                      ))}
                      {isToday && (
                        <div className="absolute left-0 right-0 pointer-events-none flex items-center"
                          style={{ top: nowTop, zIndex: 2 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginLeft: -3.5 }} />
                          <div style={{ flex: 1, height: 1.5, background: '#EF4444', opacity: 0.9 }} />
                        </div>
                      )}
                      {slots.map(slot => (
                        <WeekClassBlock key={slot.id} slot={slot} date={date} onSelect={(s, d) => { setSelectedSlot(s); setSelectedSlotDate(d) }} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      {selectedSlot && (
        <ClassPopup
          slot={selectedSlot}
          date={selectedSlotDate}
          onClose={() => setSelectedSlot(null)}
          onDeleted={classId => {
            setClasses(prev => prev.filter(s => s.classId !== classId))
            setSelectedSlot(null)
          }}
        />
      )}

      <AddClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setSuccessOpen(true) }}
      />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </main>
  )
}
