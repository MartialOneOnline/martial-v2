'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Plus, ChevronLeft, Clock,
  CalendarDays, LayoutList, MoreHorizontal,
  Pencil, Copy, Trash2, Eye, Check, Upload,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64
const START_HOUR  = 6
const END_HOUR    = 22
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const WEEK_DAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December']

// Simulated today: June 4 2026 (Thursday)
const TODAY = new Date(2026, 5, 4)
const NOW_H = 10
const NOW_M = 30

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

// ── Locations & Rooms ──────────────────────────────────────────────────────────
interface Location { id: number; name: string; city: string; color: string }
interface Room     { id: number; name: string; capacity: number; locationId: number }

const LOCATIONS: Location[] = [
  { id: 1, name: 'Main Academy',  city: 'Madrid', color: '#0071E3' },
  { id: 2, name: 'Branch Malaga', city: 'Malaga', color: '#7C3AED' },
]
const ROOMS: Room[] = [
  { id: 1, name: 'Main Mat',     capacity: 30, locationId: 1 },
  { id: 2, name: 'Kids Room',    capacity: 20, locationId: 1 },
  { id: 3, name: 'Weights Area', capacity: 15, locationId: 1 },
  { id: 4, name: 'Dojo Central', capacity: 25, locationId: 2 },
  { id: 5, name: 'Fitness Room', capacity: 12, locationId: 2 },
]
function getRoom(id: number) { return ROOMS.find(r => r.id === id)! }
function getLoc(id: number)  { return LOCATIONS.find(l => l.id === id)! }

// ── Schedule data ──────────────────────────────────────────────────────────────
interface ClassSlot {
  id: number; day: number; startH: number; startM: number; durationM: number
  name: string; activity: string; instructor: string; capacity: number; enrolled: number
  roomId: number; locationId: number
}

const SCHEDULE: ClassSlot[] = [
  { id:1,  day:0, startH:7,  startM:0,  durationM:90, name:'BJJ All Levels',    activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:3,  day:0, startH:12, startM:0,  durationM:90, name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:4,  day:0, startH:18, startM:0,  durationM:90, name:'NOGI Advanced',     activity:'NOGI',         instructor:'Jorge Sanchez', capacity:15, enrolled:14, roomId:1, locationId:1 },
  { id:5,  day:0, startH:19, startM:0,  durationM:90, name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:2,  day:0, startH:9,  startM:30, durationM:60, name:'Kids BJJ',          activity:'BJJ Kids',     instructor:'Ana Torres',    capacity:20, enrolled:10, roomId:2, locationId:1 },
  { id:6,  day:1, startH:8,  startM:30, durationM:60, name:'NOGI',              activity:'NOGI',         instructor:'Monti',         capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:7,  day:1, startH:10, startM:0,  durationM:90, name:'BJJ Beginners',     activity:'BJJ',          instructor:'Carlos Silva',  capacity:25, enrolled:5,  roomId:1, locationId:1 },
  { id:8,  day:1, startH:17, startM:0,  durationM:60, name:'Wrestling',         activity:'Wrestling',    instructor:'Monti',         capacity:15, enrolled:12, roomId:1, locationId:1 },
  { id:9,  day:1, startH:19, startM:30, durationM:60, name:'BJJ Iniciacion',    activity:'BJJ',          instructor:'Ana Torres',    capacity:25, enrolled:3,  roomId:2, locationId:1 },
  { id:10, day:2, startH:7,  startM:0,  durationM:90, name:'BJJ All Levels',    activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:11, day:2, startH:8,  startM:0,  durationM:60, name:'Yoga & Stretching', activity:'Yoga',         instructor:'Laura M.',      capacity:20, enrolled:11, roomId:2, locationId:1 },
  { id:12, day:2, startH:9,  startM:30, durationM:60, name:'Kids BJJ',          activity:'BJJ Kids',     instructor:'Ana Torres',    capacity:20, enrolled:10, roomId:2, locationId:1 },
  { id:13, day:2, startH:12, startM:0,  durationM:90, name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:14, day:2, startH:18, startM:0,  durationM:90, name:'NOGI Advanced',     activity:'NOGI',         instructor:'Jorge Sanchez', capacity:15, enrolled:14, roomId:1, locationId:1 },
  { id:15, day:2, startH:19, startM:0,  durationM:90, name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:16, day:3, startH:8,  startM:30, durationM:60, name:'NOGI',              activity:'NOGI',         instructor:'Monti',         capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:17, day:3, startH:10, startM:0,  durationM:90, name:'BJJ Beginners',     activity:'BJJ',          instructor:'Carlos Silva',  capacity:25, enrolled:5,  roomId:1, locationId:1 },
  { id:18, day:3, startH:17, startM:0,  durationM:60, name:'Wrestling',         activity:'Wrestling',    instructor:'Monti',         capacity:15, enrolled:12, roomId:1, locationId:1 },
  { id:19, day:3, startH:19, startM:30, durationM:60, name:'BJJ Iniciacion',    activity:'BJJ',          instructor:'Ana Torres',    capacity:25, enrolled:3,  roomId:2, locationId:1 },
  { id:20, day:4, startH:7,  startM:0,  durationM:90, name:'BJJ All Levels',    activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:21, day:4, startH:8,  startM:0,  durationM:60, name:'Yoga & Stretching', activity:'Yoga',         instructor:'Laura M.',      capacity:20, enrolled:11, roomId:2, locationId:1 },
  { id:22, day:4, startH:12, startM:0,  durationM:90, name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:23, day:4, startH:19, startM:0,  durationM:90, name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:24, day:5, startH:10, startM:0,  durationM:60, name:'Self Defence',      activity:'Self Defence', instructor:'Jorge Sanchez', capacity:20, enrolled:0,  roomId:4, locationId:2 },
  { id:25, day:5, startH:11, startM:30, durationM:90, name:'Open Mat',          activity:'Open Mat',     instructor:'—',             capacity:25, enrolled:22, roomId:4, locationId:2 },
  { id:26, day:6, startH:11, startM:30, durationM:90, name:'Open Mat',          activity:'Open Mat',     instructor:'—',             capacity:25, enrolled:20, roomId:4, locationId:2 },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
/** Day-of-week index Mon=0 … Sun=6 */
function dowMon(d: Date): number { return (d.getDay() + 6) % 7 }

/** Classes for a given Date (matched by recurring day-of-week) */
function classesForDate(date: Date, locFilter: number | null): ClassSlot[] {
  const dow = dowMon(date)
  return SCHEDULE.filter(s => s.day === dow && (locFilter === null || s.locationId === locFilter))
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
const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard',   icon: Flame,      href: '/dashboard' },
  { label: 'Users',       icon: Users,      href: '/dashboard/users' },
  { label: 'Classes',     icon: Calendar,   children: [
    { label: 'Classes',   href: '/dashboard/classes' },
    { label: 'Events',    href: '/dashboard/classes/events' },
    { label: 'Calendar',  href: '/dashboard/classes/calendar' },
    { label: 'Timetable', href: '/dashboard/classes/timetable' },
  ]},
  { label: 'Memberships', icon: Award,      href: '/dashboard/memberships' },
  { label: 'Payments',    icon: CreditCard, children: [
    { label: 'Transactions', href: '/dashboard/payments/transactions' }, { label: 'Subscriptions', href: '/dashboard/payments/subscriptions' },
  ]},
  { label: 'School',      icon: School,     children: [
    { label: 'Leads', href: '#' }, { label: 'Store', href: '#' },
    { label: 'Curriculum', href: '#' }, { label: 'Affiliates', href: '#' },
    { label: 'Staff', href: '#' }, { label: 'Waivers', href: '#' }, { label: 'Gradings', href: '#' },
  ]},
  { label: 'Reports',     icon: BarChart2,  children: [
    { label: 'Bookings', href: '#' }, { label: 'Gradings', href: '#' },
    { label: 'Payments', href: '#' }, { label: 'Balance', href: '#' },
    { label: 'Absents', href: '#' }, { label: 'Users', href: '#' },
  ]},
  { label: 'Settings',    icon: Settings,   children: [
    { label: 'Payments', href: '#' }, { label: 'Staff', href: '#' },
    { label: 'Profile', href: '#' }, { label: 'School', href: '#' },
    { label: 'Delete Account', href: '#' }, { label: 'Password', href: '#' }, { label: 'Grading', href: '#' },
  ]},
]
const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

const ACTIVE_HREF = '/dashboard/classes/calendar'

function NavGroup({ item }: { item: NavItem }) {
  const isActive = item.children?.some(c => c.href === ACTIVE_HREF)
  const [open, setOpen] = useState(isActive ?? false)
  if (!item.children) return (
    <Link href={item.href ?? '#'}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
      style={{ color: '#374151', fontSize: 14 }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
      <item.icon size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />{item.label}
    </Link>
  )
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left"
        style={{ color: '#374151', fontSize: 14, background: isActive ? '#EFF6FF' : 'transparent', border: 'none' }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = isActive ? '#EFF6FF' : 'transparent' }}>
        <item.icon size={16} style={{ color: isActive ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {open ? <ChevronDown size={13} style={{ color: '#9CA3AF' }} /> : <ChevronRight size={13} style={{ color: '#9CA3AF' }} />}
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children!.map(child => (
            <Link key={child.label} href={child.href}
              className="flex items-center px-3 py-2 rounded-lg no-underline"
              style={{ fontSize: 13,
                color: child.href === ACTIVE_HREF ? '#0071E3' : '#6B7280',
                fontWeight: child.href === ACTIVE_HREF ? 600 : 400 }}
              onMouseEnter={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}}
              onMouseLeave={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}}
            >{child.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Class popup ────────────────────────────────────────────────────────────────
function ClassPopup({ slot, onClose }: { slot: ClassSlot; onClose: () => void }) {
  const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const endMin = slot.startH * 60 + slot.startM + slot.durationM
  const time   = fmtTime(slot.startH, slot.startM) + ' – ' + fmtTime(Math.floor(endMin / 60), endMin % 60)
  const pct    = Math.round((slot.enrolled / slot.capacity) * 100)
  const isFull = slot.enrolled >= slot.capacity
  const barClr = isFull ? '#DC2626' : pct >= 80 ? '#D97706' : '#16A34A'

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
          <div className="flex items-center gap-1.5 mt-2">
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              background: getLoc(slot.locationId).color + '18', color: getLoc(slot.locationId).color }}>
              {getLoc(slot.locationId).name}
            </span>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>{getRoom(slot.roomId).name}</span>
          </div>
          <div style={{ marginTop: 10, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: barClr, width: pct + '%' }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p style={{ fontSize: 10, color: '#9CA3AF' }}>{slot.enrolled} / {slot.capacity} students</p>
            <span style={{ fontSize: 10, fontWeight: 600, color: barClr }}>
              {isFull ? 'Full' : pct >= 80 ? 'Almost full' : 'Open'}
            </span>
          </div>
        </div>
        <div className="py-1">
          {[
            { icon: Eye,    label: 'View students', color: '#374151' },
            { icon: Pencil, label: 'Edit class',    color: '#374151' },
            { icon: Copy,   label: 'Duplicate',     color: '#374151' },
            { icon: Trash2, label: 'Delete',        color: '#DC2626' },
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

// ── Mini date-picker popover ───────────────────────────────────────────────────
function DatePicker({
  selected, onSelect, onClose,
}: { selected: Date; onSelect: (d: Date) => void; onClose: () => void }) {
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
            {MONTH_NAMES[pickerMonth]} {pickerYear}
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
          {MONTH_DAYS.map(d => (
            <div key={d} className="flex items-center justify-center"
              style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', padding: '3px 0', letterSpacing: '0.04em' }}>
              {d[0]}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px">
          {grid.map((date, i) => {
            const isThisMonth = date.getMonth() === pickerMonth
            const isToday     = isSameDay(date, TODAY)
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
          <button onClick={() => { onSelect(TODAY); onClose() }}
            className="w-full py-1.5 rounded-lg cursor-pointer"
            style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
            Go to today
          </button>
        </div>
      </div>
    </>
  )
}

// ── Week-view class block ──────────────────────────────────────────────────────
function WeekClassBlock({ slot, onSelect }: { slot: ClassSlot; onSelect: (s: ClassSlot) => void }) {
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
      <p style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2 }}>{slot.name}</p>
      {height > 36 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.75 }}>{time}</p>}
      {height > 52 && <p style={{ fontSize: 10, color: colors.text, opacity: 0.6 }}>{slot.instructor}</p>}
      {height > 64 && <p style={{ fontSize: 9, color: colors.text, opacity: 0.5 }}>{getRoom(slot.roomId).name}</p>}
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
const DAYS_OF_WEEK     = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function AddClassDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [selLocId, setSelLocId]     = useState<number | ''>('')
  const [dayEnabled, setDayEnabled] = useState<boolean[]>([...DEFAULT_DAYS])
  const [bannerDrag, setBannerDrag] = useState(false)
  const [repeat, setRepeat]         = useState('Yes')

  useEffect(() => {
    if (open) { setSelLocId(''); setDayEnabled([...DEFAULT_DAYS]); setBannerDrag(false); setRepeat('Yes') }
  }, [open])

  const availableRooms = selLocId !== '' ? ROOMS.filter(r => r.locationId === selLocId) : []
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
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Class to Calendar</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Schedule a new class or event</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Banner */}
          <div>
            <label style={lStyle}>Class Banner</label>
            <div onDragEnter={() => setBannerDrag(true)} onDragLeave={() => setBannerDrag(false)} onDrop={() => setBannerDrag(false)}
              className="flex items-center gap-4 rounded-xl"
              style={{ border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                background: bannerDrag ? '#EFF6FF' : '#fff', padding: '12px 16px' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#F3F4F6' }}>
                <Upload size={15} style={{ color: '#9CA3AF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop image here</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>PNG, JPG up to 5 MB</p>
              </div>
              <label className="px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                Browse<input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label style={lStyle}>Title</label><input type="text" placeholder="e.g. BJJ All Levels" style={iStyle} /></div>
            <div>
              <label style={lStyle}>Instructor</label>
              <select style={iStyle}><option value="">Select instructor...</option>{INSTRUCTORS_LIST.map(i => <option key={i}>{i}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lStyle}>Activity</label>
              <select style={iStyle}><option value="">Select activity...</option>{ACTIVITIES_LIST.map(a => <option key={a}>{a}</option>)}</select>
            </div>
            <div><label style={lStyle}>Capacity</label><input type="number" placeholder="20" min={1} style={iStyle} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={lStyle}>Location</label>
              <select style={iStyle} value={selLocId} onChange={e => setSelLocId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Select location...</option>{LOCATIONS.map(l => <option key={l.id} value={l.id}>{l.name} — {l.city}</option>)}
              </select>
            </div>
            <div>
              <label style={lStyle}>Room</label>
              <select style={{ ...iStyle, opacity: selLocId === '' ? 0.5 : 1 }} disabled={selLocId === ''}>
                <option value="">{selLocId === '' ? 'Select location first' : 'Select room...'}</option>
                {availableRooms.map(r => <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={lStyle}>Repeat</label>
              <select value={repeat} onChange={e => setRepeat(e.target.value)} style={iStyle}><option>Yes</option><option>No</option></select>
            </div>
            <div><label style={lStyle}>Start Date</label><input type="date" style={iStyle} /></div>
            <div><label style={lStyle}>{repeat === 'Yes' ? 'Repeat End Date' : 'End Date'}</label><input type="date" style={iStyle} /></div>
          </div>
          {/* Session timings */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0071E3', marginBottom: 12 }}>Session Timings by Day</p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                    {['Day', 'Start Time', 'End Time', 'Break Start', 'Break End', 'Active'].map(h => (
                      <th key={h} className="px-3 py-2 text-left"
                        style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const on = dayEnabled[idx] ?? false
                    return (
                      <tr key={day} style={{ borderBottom: idx < DAYS_OF_WEEK.length - 1 ? '1px solid #F9FAFB' : 'none', opacity: on ? 1 : 0.4, transition: 'opacity 0.15s' }}>
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
            Cancel
          </button>
          <button onClick={onSuccess} className="px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
            Add to Calendar
          </button>
        </div>
      </div>
    </>
  )
}

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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Class Added!</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>The class has been added to the calendar.</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>Done</button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function CalendarClient() {
  const [menuOpen, setMenuOpen]           = useState(false)
  const [view, setView]                   = useState<'month' | 'week'>('month')
  const [selectedDate, setSelectedDate]   = useState<Date>(TODAY)
  const [filterLocId, setFilterLocId]     = useState<number | null>(null)
  const [selectedSlot, setSelectedSlot]   = useState<ClassSlot | null>(null)
  const [pickerOpen, setPickerOpen]       = useState(false)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [successOpen, setSuccessOpen]     = useState(false)
  const [expandedDay, setExpandedDay]     = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll week view to current time
  useEffect(() => {
    if (view === 'week' && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, classTop(NOW_H, NOW_M) - 120)
    }
  }, [view])

  // Month/year derived from selectedDate
  const viewYear  = selectedDate.getFullYear()
  const viewMonth = selectedDate.getMonth()

  // Week view: Monday of selectedDate's week
  const weekMonday = weekMondayFor(selectedDate)
  const weekDates  = WEEK_DAYS.map((_, i) => { const d = new Date(weekMonday); d.setDate(weekMonday.getDate() + i); return d })
  const todayWeekIdx = weekDates.findIndex(d => isSameDay(d, TODAY))
  const nowTop = classTop(NOW_H, NOW_M)

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
  function goToday() { setSelectedDate(TODAY) }

  function isCurrentPeriod() {
    if (view === 'month') return selectedDate.getFullYear() === TODAY.getFullYear() && selectedDate.getMonth() === TODAY.getMonth()
    return weekDates.some(d => isSameDay(d, TODAY))
  }

  const monthGrid = buildMonthGrid(viewYear, viewMonth)
  const MAX_CHIPS = 3

  const periodLabel = view === 'month'
    ? `${MONTH_NAMES[viewMonth]} ${viewYear}`
    : formatWeekLabel(weekMonday)

  return (
    <div className="h-screen flex overflow-hidden"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <style>{`@media(min-width:768px){.dashboard-sidebar{transform:translateX(0)!important}}`}</style>

      {menuOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{ width: 232, background: '#fff', borderRight: '1px solid #E5E7EB',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <Image src="/martial-logo.png" alt="Martial" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>MARTIAL</p>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Academy</p>
            </div>
          </div>
          <button className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(false)}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_MAIN.map(item => <NavGroup key={item.label} item={item} />)}
        </nav>
        <div style={{ borderTop: '1px solid #E5E7EB' }} className="px-3 py-3 space-y-0.5">
          {NAV_BOTTOM.map(item => (
            <Link key={item.label} href={item.href ?? '#'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <item.icon size={16} style={{ color: '#9CA3AF' }} />{item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={16} style={{ color: '#9CA3AF' }} />Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-[232px] h-screen overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 gap-3"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Calendar
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
                  {v === 'month' ? 'Month' : 'Week'}
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
                Today
              </button>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
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

        {/* Location filter */}
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
            textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>Location</span>
          <button onClick={() => setFilterLocId(null)}
            className="px-3 py-1 rounded-lg cursor-pointer"
            style={{ fontSize: 12, fontWeight: filterLocId === null ? 600 : 400, border: 'none',
              background: filterLocId === null ? '#111827' : '#F3F4F6',
              color: filterLocId === null ? '#fff' : '#374151' }}>
            All locations
          </button>
          {LOCATIONS.map(loc => (
            <button key={loc.id} onClick={() => setFilterLocId(loc.id)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer"
              style={{ fontSize: 12, fontWeight: filterLocId === loc.id ? 600 : 400, border: 'none',
                background: filterLocId === loc.id ? loc.color : '#F3F4F6',
                color: filterLocId === loc.id ? '#fff' : '#374151' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%',
                background: filterLocId === loc.id ? 'rgba(255,255,255,0.7)' : loc.color,
                flexShrink: 0, display: 'inline-block' }} />
              {loc.name}
              <span style={{ fontSize: 11, opacity: 0.75 }}> · {loc.city}</span>
            </button>
          ))}
        </div>

        {/* ── MONTH VIEW ── */}
        {view === 'month' && (
          <div className="flex-1 overflow-y-auto">
            {/* Weekday header */}
            <div className="grid grid-cols-7 sticky top-0 z-10"
              style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
              {MONTH_DAYS.map((d, i) => (
                <div key={d} className="py-2 flex items-center justify-center"
                  style={{ borderLeft: i > 0 ? '1px solid #F3F4F6' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d}</span>
                </div>
              ))}
            </div>

            {/* Day cells grid */}
            <div className="grid grid-cols-7"
              style={{ gridAutoRows: 'minmax(112px, 1fr)' }}>
              {monthGrid.map((date, i) => {
                const isThisMonth = date.getMonth() === viewMonth
                const isToday     = isSameDay(date, TODAY)
                const isSelected  = isSameDay(date, selectedDate)
                const classes     = classesForDate(date, filterLocId)
                const shown       = classes.slice(0, MAX_CHIPS)
                const overflow    = classes.length - shown.length
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
                        title="View this week"
                        style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, border: 'none',
                          background: isToday ? '#0071E3' : 'transparent',
                          color: isToday ? '#fff' : isThisMonth ? '#374151' : '#9CA3AF' }}
                        onMouseEnter={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = '#F3F4F6' }}
                        onMouseLeave={e => { if (!isToday) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                        {date.getDate()}
                      </button>
                      {classes.length > 0 && (
                        <span style={{ fontSize: 9, color: '#9CA3AF' }}>{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
                      )}
                    </div>

                    {/* Class chips */}
                    <div className="flex flex-col gap-0.5 flex-1">
                      {shown.map(slot => {
                        const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
                        const endMin = slot.startH * 60 + slot.startM + slot.durationM
                        return (
                          <button key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
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
                          +{overflow} more
                        </button>
                      )}
                      {/* Expanded overflow */}
                      {isExpanded && classes.slice(MAX_CHIPS).map(slot => {
                        const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
                        return (
                          <button key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
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
                          Show less
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
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
                const isToday = isSameDay(date, TODAY)
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
                  const isToday = isSameDay(date, TODAY)
                  const dow     = dowMon(date)
                  const slots   = SCHEDULE.filter(s => s.day === dow && (filterLocId === null || s.locationId === filterLocId))
                  return (
                    <div key={day} className="flex-1 border-l relative"
                      style={{ borderColor: '#F3F4F6', minWidth: 0, background: isToday ? '#FAFBFF' : 'transparent' }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F3F4F6' }} />
                      ))}
                      {isToday && isSameDay(date, TODAY) && (
                        <div className="absolute left-0 right-0 pointer-events-none flex items-center"
                          style={{ top: nowTop, zIndex: 2 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', flexShrink: 0, marginLeft: -3.5 }} />
                          <div style={{ flex: 1, height: 1.5, background: '#EF4444', opacity: 0.9 }} />
                        </div>
                      )}
                      {slots.map(slot => (
                        <WeekClassBlock key={slot.id} slot={slot} onSelect={setSelectedSlot} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSlot && <ClassPopup slot={selectedSlot} onClose={() => setSelectedSlot(null)} />}

      <AddClassDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setSuccessOpen(true) }}
      />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </div>
  )
}
