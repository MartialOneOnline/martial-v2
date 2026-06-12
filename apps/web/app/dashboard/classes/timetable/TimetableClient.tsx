'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, Menu, X, Plus, ChevronLeft, Clock, Search, LayoutList, CalendarDays, MoreHorizontal, TrendingUp, Pencil, Copy, Trash2, Eye, Check, Upload, Flame, Award, School, ShoppingBag, HelpCircle } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import type { Translations } from '../../../../lib/i18n/translations'

// ── Constants ──────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64
const START_HOUR  = 6
const END_HOUR    = 22
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const DAYS        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const TODAY = new Date()
const NOW_H = TODAY.getHours()
const NOW_M = TODAY.getMinutes()

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

const ACTIVITIES_LIST = Object.keys(ACTIVITY_COLORS)

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClassSlot {
  id: string; day: number; startH: number; startM: number; durationM: number
  name: string; activity: string; instructor: string; capacity: number; enrolled: number
}

interface TimetableRow {
  id: string; title: string; activity: string; instructor: string
  days: string; time: string; status: 'Active' | 'Inactive'
}

// ── Converters — DB class → display formats ────────────────────────────────────

interface DbScheduleSlot { dayOfWeek: number; startTime: string; endTime?: string }

interface DbClass {
  id: string; name: string; isActive: boolean; capacity: number | null
  schedule: DbScheduleSlot[] | null
  instructor: { name: string } | null
  discipline: { name: string } | null
}

function parseTime(t: string): { h: number; m: number } {
  const [h, m] = t.split(':').map(Number)
  return { h: h ?? 0, m: m ?? 0 }
}

function classesToSlots(classes: DbClass[]): ClassSlot[] {
  const slots: ClassSlot[] = []
  for (const cls of classes) {
    if (!cls.isActive || !cls.schedule) continue
    for (const s of cls.schedule) {
      const start = parseTime(s.startTime)
      const end   = s.endTime ? parseTime(s.endTime) : { h: start.h + 1, m: start.m }
      const durationM = (end.h * 60 + end.m) - (start.h * 60 + start.m)
      // DB dayOfWeek: 0=Sun. Display day: 0=Mon. Convert: (dow + 6) % 7
      const displayDay = (s.dayOfWeek + 6) % 7
      slots.push({
        id: `${cls.id}-${s.dayOfWeek}`,
        day: displayDay,
        startH: start.h,
        startM: start.m,
        durationM: Math.max(30, durationM),
        name: cls.name,
        activity: cls.discipline?.name ?? 'Other',
        instructor: cls.instructor?.name ?? '—',
        capacity: cls.capacity ?? 20,
        enrolled: 0,
      })
    }
  }
  return slots
}

function classesToListRows(classes: DbClass[]): TimetableRow[] {
  return classes.map(cls => {
    const slots = cls.schedule ?? []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const days = [...new Set(slots.map(s => dayNames[s.dayOfWeek]))].join(' · ')
    const times = slots.length > 0
      ? `${slots[0]!.startTime}${slots[0]!.endTime ? '–' + slots[0]!.endTime : ''}`
      : '—'
    return {
      id: cls.id,
      title: cls.name,
      activity: cls.discipline?.name ?? '—',
      instructor: cls.instructor?.name ?? '—',
      days: days || '—',
      time: times,
      status: cls.isActive ? 'Active' : 'Inactive',
    }
  })
}

const LIST_STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Active:   { bg: '#F0FDF4', color: '#16A34A' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280' },
}

const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Legend ─────────────────────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { label: 'BJJ',         colors: ACTIVITY_COLORS['BJJ']! },
  { label: 'NOGI',        colors: ACTIVITY_COLORS['NOGI']! },
  { label: 'Wrestling',   colors: ACTIVITY_COLORS['Wrestling']! },
  { label: 'Kids BJJ',    colors: ACTIVITY_COLORS['BJJ Kids']! },
  { label: 'Yoga',        colors: ACTIVITY_COLORS['Yoga']! },
  { label: 'Open Mat',    colors: ACTIVITY_COLORS['Open Mat']! },
  { label: 'Competition', colors: ACTIVITY_COLORS['BJJ Comp']! },
]

// ── Nav ────────────────────────────────────────────────────────────────────────
type NavItem = {
  label: string; icon: React.ElementType; href?: string; active?: boolean
  children?: { label: string; href: string }[]
}

const buildNavMain = (s: Translations['sidebar']): NavItem[] => [
  { label: s.dashboard,   icon: Flame,      href: '/dashboard' },
  { label: s.users,       icon: Users,      href: '/dashboard/users' },
  { label: s.classes,     icon: Calendar,   children: [
    { label: s.classes,   href: '/dashboard/classes' },
    { label: s.events,    href: '/dashboard/classes/events' },
    { label: s.calendar,  href: '/dashboard/classes/calendar' },
    { label: s.timetable, href: '/dashboard/classes/timetable' },
  ]},
  { label: s.memberships, icon: Award,      href: '/dashboard/memberships' },
  { label: s.payments,    icon: CreditCard, children: [
    { label: s.transactions, href: '/dashboard/payments/transactions' }, { label: s.subscriptions, href: '/dashboard/payments/subscriptions' },
  ]},
  { label: s.school,      icon: School,     children: [
    { label: s.leads, href: '/dashboard/school/leads' }, { label: s.store, href: '/dashboard/school/store' },
    { label: s.curriculum, href: '/dashboard/school/curriculum' }, { label: s.affiliates, href: '/dashboard/school/affiliates' },
    { label: s.staff, href: '/dashboard/school/staff' }, { label: s.waivers, href: '/dashboard/school/waivers' }, { label: s.gradings, href: '/dashboard/school/gradings' },
  ]},
  { label: s.reports,     icon: BarChart2,  children: [
    { label: s.bookings, href: '#' }, { label: s.gradings, href: '#' },
    { label: s.payments, href: '#' }, { label: s.balance, href: '#' },
    { label: s.absents, href: '#' }, { label: s.users, href: '#' },
  ]},
  { label: s.settings, icon: Settings, href: '/dashboard/settings' },
]

const buildNavBottom = (s: Translations['sidebar']): NavItem[] => [
  { label: s.subscription,  icon: ShoppingBag, href: '#' },
  { label: s.notifications, icon: Bell,        href: '#' },
  { label: s.support,       icon: HelpCircle,  href: '#' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function getWeekStart(offset: number): Date {
  const day  = TODAY.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(TODAY)
  monday.setDate(TODAY.getDate() + diff + offset * 7)
  return monday
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return fmt(monday) + ' – ' + fmt(sunday)
}

function formatHour(h: number): string {
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function classTop(startH: number, startM: number): number {
  return ((startH - START_HOUR) + startM / 60) * HOUR_HEIGHT
}

function classHeight(durationM: number): number {
  return Math.max(28, (durationM / 60) * HOUR_HEIGHT)
}

function fmtTime(h: number, m: number): string {
  return h + ':' + m.toString().padStart(2, '0')
}

// ── Class popup ────────────────────────────────────────────────────────────────
function ClassPopup({ slot, onClose }: { slot: ClassSlot; onClose: () => void }) {
  const t = useT()
  const colors  = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const endMin  = slot.startH * 60 + slot.startM + slot.durationM
  const endH    = Math.floor(endMin / 60)
  const endMm   = endMin % 60
  const time    = fmtTime(slot.startH, slot.startM) + ' – ' + fmtTime(endH, endMm)
  const pct     = slot.capacity > 0 ? Math.round((slot.enrolled / slot.capacity) * 100) : 0
  const isFull  = slot.enrolled >= slot.capacity
  const barColor = isFull ? '#DC2626' : pct >= 80 ? '#D97706' : '#16A34A'
  const capLabel = isFull ? t.common.full : pct >= 80 ? t.classes.almostFull : t.common.open

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
            <div style={{ height: '100%', borderRadius: 99, background: barColor, width: pct + '%', transition: 'width 0.3s' }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>{slot.enrolled} / {slot.capacity} {t.classes.students}</p>
            <span style={{ fontSize: 10, fontWeight: 600, color: barColor }}>{capLabel}</span>
          </div>
        </div>
        <div className="py-1">
          {[
            { icon: Eye,    label: t.classes.viewStudentsAction, color: '#374151' },
            { icon: Pencil, label: t.classes.editClass ?? 'Edit class', color: '#374151' },
            { icon: Copy,   label: t.common.duplicate,     color: '#374151' },
            { icon: Trash2, label: t.common.delete,        color: '#DC2626' },
          ].map(({ icon: Icon, label, color }) => (
            <button key={label} onClick={onClose}
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

// ── Class block ────────────────────────────────────────────────────────────────
function ClassBlock({ slot, onSelect }: { slot: ClassSlot; onSelect: (s: ClassSlot) => void }) {
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
      onClick={e => { e.stopPropagation(); onSelect(slot) }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
      <p style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2, marginBottom: 1 }}>{slot.name}</p>
      {height > 36 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.75, lineHeight: 1.2 }}>{time}</p>}
      {height > 52 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.6, lineHeight: 1.2 }}>{slot.instructor}</p>}
      {height > 64 && <p style={{ fontSize: 9, color: colors.text, opacity: 0.5 }}>Cap. {slot.capacity}</p>}
      {height > 80 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 3, background: colors.border, borderRadius: 99 }}>
            <div style={{ height: 3, borderRadius: 99, background: isFull ? '#DC2626' : colors.text, width: pct + '%', opacity: 0.6 }} />
          </div>
          <p style={{ fontSize: 9, color: colors.text, opacity: 0.6, marginTop: 2 }}>
            {slot.enrolled}/{slot.capacity}{isFull ? ' · Full' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Add Timetable drawer — redirects to create class ──────────────────────────
function AddTimetableDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  // The timetable is derived from classes. Redirect user to create a class instead.
  if (!open) return null
  return (
    <>
      <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />
      <div className="fixed z-50 rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          background: '#fff', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EFF6FF' }}>
          <Calendar size={24} style={{ color: '#0071E3' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add a class</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            The timetable is built from your classes. Create a class with a weekly schedule to see it here.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <a href="/dashboard/classes"
            className="flex-1 py-2.5 rounded-xl text-center cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff', textDecoration: 'none' }}>
            Go to Classes
          </a>
        </div>
      </div>
    </>
  )
}

// ── Success modal ──────────────────────────────────────────────────────────────
function SuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Timetable Added!</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>Your timetable has been created and is now active.</p>
        </div>
        <button onClick={onClose}
          className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function TimetableClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [weekOffset, setWeekOffset]     = useState(0)
  const [view, setView]                 = useState<'calendar' | 'list'>('calendar')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [successOpen, setSuccessOpen]   = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ClassSlot | null>(null)
  const [listSearch, setListSearch]     = useState('')
  const [listActivity, setListActivity] = useState('All')
  const [schedule, setSchedule]         = useState<ClassSlot[]>([])
  const [listRows, setListRows]         = useState<TimetableRow[]>([])
  const [loading, setLoading]           = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/classes')
      if (res.ok) {
        const data = await res.json()
        setSchedule(classesToSlots(data.classes ?? []))
        setListRows(classesToListRows(data.classes ?? []))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClasses() }, [loadClasses])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, classTop(NOW_H, NOW_M) - 120)
    }
  }, [])

  const monday    = getWeekStart(weekOffset)
  const weekLabel = formatWeekLabel(monday)
  const weekDates = DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  const todayIdx  = weekDates.findIndex(d => d.toDateString() === TODAY.toDateString())

  const nowTop = classTop(NOW_H, NOW_M)

  // List filtering
  const activityOptions = ['All', ...Array.from(new Set(listRows.map(r => r.activity)))]
  const filteredList = listRows.filter(r => {
    const q = listSearch.toLowerCase()
    return (listActivity === 'All' || r.activity === listActivity) &&
      (listSearch === '' || r.title.toLowerCase().includes(q) || r.instructor.toLowerCase().includes(q))
  })
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filteredList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

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
              Timetable
            </h1>
            {/* View toggle */}
            <div className="flex items-center rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              {(['calendar', 'list'] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 500, border: 'none',
                    background: view === v ? '#fff' : 'transparent',
                    color: view === v ? '#111827' : '#9CA3AF',
                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {v === 'calendar' ? <CalendarDays size={13} /> : <LayoutList size={13} />}
                  {v === 'calendar' ? 'Calendar' : 'List'}
                </button>
              ))}
            </div>
            {/* Week nav — calendar only */}
            {view === 'calendar' && (
              <div className="hidden sm:flex items-center gap-1">
                <button onClick={() => setWeekOffset(o => o - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ border: '1px solid #E5E7EB', background: '#fff' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <ChevronLeft size={13} style={{ color: '#374151' }} />
                </button>
                <span className="px-3 py-1.5 rounded-lg select-none"
                  style={{ border: '1px solid #E5E7EB', background: '#fff', fontSize: 12,
                    fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>
                  {weekLabel}
                </span>
                <button onClick={() => setWeekOffset(o => o + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ border: '1px solid #E5E7EB', background: '#fff' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <ChevronRight size={13} style={{ color: '#374151' }} />
                </button>
                <button onClick={() => setWeekOffset(0)}
                  className="px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ border: '1px solid #E5E7EB',
                    background: weekOffset === 0 ? '#EFF6FF' : '#fff',
                    fontSize: 12, fontWeight: 500,
                    color: weekOffset === 0 ? '#0071E3' : '#374151' }}
                  onMouseEnter={e => { if (weekOffset !== 0) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                  onMouseLeave={e => { if (weekOffset !== 0) (e.currentTarget as HTMLElement).style.background = '#fff' }}>
                  Today
                </button>
              </div>
            )}
          </div>
          {/* Right group */}
          <div className="flex items-center gap-2 shrink-0">
            {view === 'calendar' && (
              <div className="hidden 2xl:flex items-center gap-3 mr-2">
                {LEGEND_ITEMS.map(({ label, colors }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: colors.bg, border: '1.5px solid ' + colors.border }} />
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={12} style={{ color: '#9CA3AF' }} />
              {TODAY.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-4">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Timetables', value: '8', trend: '+2', sub: 'this month' },
                { label: 'Active',            value: '7', trend: '+1', sub: 'right now'  },
                { label: 'Repeat',            value: '7', trend: '',   sub: 'recurring'  },
                { label: 'Single',            value: '1', trend: '',   sub: 'one-off'    },
              ].map(s => (
                <div key={s.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '10px 14px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</span>
                    {s.trend && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11,
                        fontWeight: 600, background: '#F0FDF4', color: '#16A34A', padding: '2px 7px', borderRadius: 999 }}>
                        <TrendingUp size={9} />{s.trend}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* Search + Activity chips */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB', width: 220 }}>
                <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                <input type="text" placeholder="Search timetables…" value={listSearch}
                  onChange={e => { setListSearch(e.target.value); setCurrentPage(1) }}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {activityOptions.map(act => {
                  const ac = act !== 'All' ? ACTIVITY_COLORS[act] : null
                  const on = listActivity === act
                  return (
                    <button key={act} onClick={() => { setListActivity(act); setCurrentPage(1) }}
                      className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: on ? 600 : 400, borderRadius: 8, padding: '4px 10px',
                        border: on && ac ? '1.5px solid ' + ac.border : '1.5px solid #E5E7EB',
                        background: on ? (ac ? ac.bg : '#111827') : '#fff',
                        color: on ? (ac ? ac.text : '#fff') : '#6B7280' }}>
                      {act}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[
                      { label: 'Class',      cls: '' },
                      { label: 'Schedule',   cls: 'hidden md:table-cell' },
                      { label: 'Instructor', cls: 'hidden lg:table-cell' },
                      { label: 'Status',     cls: '' },
                      { label: 'Actions',    cls: '' },
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
                  {paginated.map((row, idx) => {
                    const sc = LIST_STATUS_MAP[row.status] ?? { bg: '#F3F4F6', color: '#6B7280' }
                    const ac = ACTIVITY_COLORS[row.activity]
                    return (
                      <tr key={row.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        {/* Class */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 rounded-lg flex items-center justify-center"
                              style={{ width: 36, height: 36, background: ac?.bg ?? '#F3F4F6' }}>
                              <Calendar size={16} style={{ color: ac?.text ?? '#6B7280' }} />
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.title}</p>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                                background: ac?.bg ?? '#F3F4F6', color: ac?.text ?? '#6B7280',
                                border: '1px solid ' + (ac?.border ?? '#E5E7EB') }}>
                                {row.activity}
                              </span>
                            </div>
                          </div>
                        </td>
                        {/* Schedule */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <p style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{row.days}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{row.time}</p>
                        </td>
                        {/* Instructor */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 12, color: '#374151' }}>{row.instructor}</span>
                        </td>
                        {/* Status */}
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color }}>
                            {row.status}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3 relative">
                          <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id) }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                            <MoreHorizontal size={15} />
                          </button>
                          {openMenuId === row.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-6 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 130, top: '100%' }}>
                                {['Edit', 'Duplicate', 'Delete'].map(action => (
                                  <button key={action} onClick={() => setOpenMenuId(null)}
                                    className="w-full text-left px-4 py-2 cursor-pointer"
                                    style={{ fontSize: 13, color: action === 'Delete' ? '#DC2626' : '#374151',
                                      background: 'transparent', border: 'none' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                    {action}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <Calendar size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>No timetables found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {filteredList.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredList.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{filteredList.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Day header */}
            <div className="flex shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ width: 56, flexShrink: 0 }} />
              {DAYS.map((day, i) => {
                const date    = weekDates[i]!
                const isToday = i === todayIdx
                return (
                  <div key={day} className="flex-1 flex flex-col items-center py-2 border-l"
                    style={{ borderColor: '#F3F4F6', minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: isToday ? '#0071E3' : '#9CA3AF' }}>
                      {day}
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
                {/* Hour gutter */}
                <div style={{ width: 56, flexShrink: 0 }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start',
                      paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 10, color: '#C4C9D4', whiteSpace: 'nowrap' }}>{formatHour(h)}</span>
                    </div>
                  ))}
                </div>
                {/* Day columns */}
                {DAYS.map((day, dayIdx) => {
                  const isToday  = dayIdx === todayIdx
                  return (
                    <div key={day} className="flex-1 border-l relative"
                      style={{ borderColor: '#F3F4F6', minWidth: 0, background: isToday ? '#FAFBFF' : 'transparent' }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F3F4F6' }} />
                      ))}
                      {/* Current time indicator — today column, current week only */}
                      {isToday && weekOffset === 0 && (
                        <div className="absolute left-0 right-0 pointer-events-none flex items-center"
                          style={{ top: nowTop, zIndex: 2 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%',
                            background: '#EF4444', flexShrink: 0, marginLeft: -3.5 }} />
                          <div style={{ flex: 1, height: 1.5, background: '#EF4444', opacity: 0.9 }} />
                        </div>
                      )}
                      {schedule.filter(s => s.day === dayIdx).map(slot => (
                        <ClassBlock key={slot.id} slot={slot} onSelect={setSelectedSlot} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      {selectedSlot && <ClassPopup slot={selectedSlot} onClose={() => setSelectedSlot(null)} />}
      <AddTimetableDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={() => { setDrawerOpen(false); setSuccessOpen(true) }} />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </main>
  )
}
