'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Plus, ChevronLeft, Clock,
  LayoutList, CalendarDays, MoreHorizontal, TrendingUp,
  Pencil, Copy, Trash2, Eye, Check, Upload,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const HOUR_HEIGHT = 64
const START_HOUR  = 6
const END_HOUR    = 22
const HOURS       = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR)
const DAYS        = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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
interface Location { id: number; name: string; address: string; city: string; color: string }
interface Room     { id: number; name: string; capacity: number; locationId: number }

const LOCATIONS: Location[] = [
  { id: 1, name: 'Main Academy',   address: 'Calle del Dojo 14',    city: 'Madrid',  color: '#0071E3' },
  { id: 2, name: 'Branch Malaga',  address: 'Av. Los Boliches 8',   city: 'Malaga',  color: '#7C3AED' },
]

const ROOMS: Room[] = [
  { id: 1, name: 'Main Mat',     capacity: 30, locationId: 1 },
  { id: 2, name: 'Kids Room',    capacity: 20, locationId: 1 },
  { id: 3, name: 'Weights Area', capacity: 15, locationId: 1 },
  { id: 4, name: 'Dojo Central', capacity: 25, locationId: 2 },
  { id: 5, name: 'Fitness Room', capacity: 12, locationId: 2 },
]

function getRoom(roomId: number) { return ROOMS.find(r => r.id === roomId)! }
function getLoc(locationId: number) { return LOCATIONS.find(l => l.id === locationId)! }

// ── Calendar schedule ──────────────────────────────────────────────────────────
interface ClassSlot {
  id: number; day: number; startH: number; startM: number; durationM: number
  name: string; activity: string; instructor: string; capacity: number; enrolled: number
  roomId: number; locationId: number
}

const SCHEDULE: ClassSlot[] = [
  // Main Academy — Main Mat (roomId:1, locId:1)
  { id:1,  day:0, startH:7,  startM:0,  durationM:90,  name:'BJJ All Levels',   activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:3,  day:0, startH:12, startM:0,  durationM:90,  name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:4,  day:0, startH:18, startM:0,  durationM:90,  name:'NOGI Advanced',     activity:'NOGI',         instructor:'Jorge Sanchez', capacity:15, enrolled:14, roomId:1, locationId:1 },
  { id:5,  day:0, startH:19, startM:0,  durationM:90,  name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:6,  day:1, startH:8,  startM:30, durationM:60,  name:'NOGI',              activity:'NOGI',         instructor:'Monti',         capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:7,  day:1, startH:10, startM:0,  durationM:90,  name:'BJJ Beginners',     activity:'BJJ',          instructor:'Carlos Silva',  capacity:25, enrolled:5,  roomId:1, locationId:1 },
  { id:8,  day:1, startH:17, startM:0,  durationM:60,  name:'Wrestling',         activity:'Wrestling',    instructor:'Monti',         capacity:15, enrolled:12, roomId:1, locationId:1 },
  { id:10, day:2, startH:7,  startM:0,  durationM:90,  name:'BJJ All Levels',    activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:13, day:2, startH:12, startM:0,  durationM:90,  name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:14, day:2, startH:18, startM:0,  durationM:90,  name:'NOGI Advanced',     activity:'NOGI',         instructor:'Jorge Sanchez', capacity:15, enrolled:14, roomId:1, locationId:1 },
  { id:15, day:2, startH:19, startM:0,  durationM:90,  name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:16, day:3, startH:8,  startM:30, durationM:60,  name:'NOGI',              activity:'NOGI',         instructor:'Monti',         capacity:15, enrolled:15, roomId:1, locationId:1 },
  { id:17, day:3, startH:10, startM:0,  durationM:90,  name:'BJJ Beginners',     activity:'BJJ',          instructor:'Carlos Silva',  capacity:25, enrolled:5,  roomId:1, locationId:1 },
  { id:18, day:3, startH:17, startM:0,  durationM:60,  name:'Wrestling',         activity:'Wrestling',    instructor:'Monti',         capacity:15, enrolled:12, roomId:1, locationId:1 },
  { id:20, day:4, startH:7,  startM:0,  durationM:90,  name:'BJJ All Levels',    activity:'BJJ',          instructor:'Carlos Silva',  capacity:20, enrolled:8,  roomId:1, locationId:1 },
  { id:22, day:4, startH:12, startM:0,  durationM:90,  name:'BJJ Advanced',      activity:'BJJ',          instructor:'Jorge Sanchez', capacity:20, enrolled:18, roomId:1, locationId:1 },
  { id:23, day:4, startH:19, startM:0,  durationM:90,  name:'BJJ Competition',   activity:'BJJ Comp',     instructor:'Carlos Silva',  capacity:15, enrolled:15, roomId:1, locationId:1 },
  // Main Academy — Kids Room (roomId:2, locId:1)
  { id:2,  day:0, startH:9,  startM:30, durationM:60,  name:'Kids BJJ',          activity:'BJJ Kids',     instructor:'Ana Torres',    capacity:20, enrolled:10, roomId:2, locationId:1 },
  { id:9,  day:1, startH:19, startM:30, durationM:60,  name:'BJJ Iniciacion',    activity:'BJJ',          instructor:'Ana Torres',    capacity:25, enrolled:3,  roomId:2, locationId:1 },
  { id:12, day:2, startH:9,  startM:30, durationM:60,  name:'Kids BJJ',          activity:'BJJ Kids',     instructor:'Ana Torres',    capacity:20, enrolled:10, roomId:2, locationId:1 },
  { id:11, day:2, startH:8,  startM:0,  durationM:60,  name:'Yoga & Stretching', activity:'Yoga',         instructor:'Laura M.',      capacity:20, enrolled:11, roomId:2, locationId:1 },
  { id:19, day:3, startH:19, startM:30, durationM:60,  name:'BJJ Iniciacion',    activity:'BJJ',          instructor:'Ana Torres',    capacity:25, enrolled:3,  roomId:2, locationId:1 },
  { id:21, day:4, startH:8,  startM:0,  durationM:60,  name:'Yoga & Stretching', activity:'Yoga',         instructor:'Laura M.',      capacity:20, enrolled:11, roomId:2, locationId:1 },
  // Branch Malaga — Dojo Central (roomId:4, locId:2)
  { id:24, day:5, startH:10, startM:0,  durationM:60,  name:'Self Defence',      activity:'Self Defence', instructor:'Jorge Sanchez', capacity:20, enrolled:0,  roomId:4, locationId:2 },
  { id:25, day:5, startH:11, startM:30, durationM:90,  name:'Open Mat',          activity:'Open Mat',     instructor:'-',             capacity:25, enrolled:22, roomId:4, locationId:2 },
  { id:26, day:6, startH:11, startM:30, durationM:90,  name:'Open Mat',          activity:'Open Mat',     instructor:'-',             capacity:25, enrolled:20, roomId:4, locationId:2 },
]

// ── List view data ─────────────────────────────────────────────────────────────
const TIMETABLE_LIST = [
  { id: 1, image: '/roger-gracie-malaga.jpg',     title: 'BJJ All Levels',    activity: 'BJJ',          startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 1, roomId: 1 },
  { id: 2, image: '/mathouse.jpg',                title: 'NOGI',              activity: 'NOGI',         startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 1, roomId: 1 },
  { id: 3, image: '/five-elements-jiu-jitsu.jpg', title: 'Kids BJJ',          activity: 'BJJ Kids',     startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 1, roomId: 2 },
  { id: 4, image: '/roger-gracie-malaga.jpg',     title: 'BJJ Beginners',     activity: 'BJJ',          startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 1, roomId: 1 },
  { id: 5, image: '/mathouse.jpg',                title: 'Open Mat',          activity: 'Open Mat',     startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 2, roomId: 4 },
  { id: 6, image: '/five-elements-jiu-jitsu.jpg', title: 'BJJ Advanced',      activity: 'BJJ',          startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Inactive', locationId: 1, roomId: 1 },
  { id: 7, image: '/roger-gracie-malaga.jpg',     title: 'Wrestling',         activity: 'Wrestling',    startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Single', status: 'Active',   locationId: 2, roomId: 4 },
  { id: 8, image: '/mathouse.jpg',                title: 'NOGI Advanced',     activity: 'NOGI',         startDate: 'Mon, Oct 27, 2025', endDate: 'Mon, Oct 27, 2025', type: 'Repeat', status: 'Active',   locationId: 1, roomId: 1 },
]

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

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard',   icon: Flame,      href: '/dashboard' },
  { label: 'Users',       icon: Users,      href: '/dashboard/users' },
  { label: 'Classes',     icon: Calendar,   children: [
    { label: 'Classes',   href: '/dashboard/classes' },
    { label: 'Events',    href: '#' },
    { label: 'Calendar',  href: '#' },
    { label: 'Timetable', href: '/dashboard/classes/timetable' },
  ]},
  { label: 'Memberships', icon: Award,      href: '#' },
  { label: 'Payments',    icon: CreditCard, children: [
    { label: 'Transactions', href: '#' }, { label: 'Subscriptions', href: '#' },
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

function NavGroup({ item }: { item: NavItem }) {
  const isActive = item.children?.some(c => c.href === '/dashboard/classes/timetable')
  const [open, setOpen] = useState(isActive ?? false)
  if (!item.children) return (
    <Link href={item.href ?? '#'}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
      style={{ color: '#374151', fontSize: 14, background: item.active ? '#EFF6FF' : 'transparent' }}
      onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
      onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <item.icon size={16} style={{ color: item.active ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
      {item.label}
    </Link>
  )
  return (
    <div>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
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
              className="flex items-center px-3 py-2 rounded-lg no-underline transition-colors"
              style={{ fontSize: 13,
                color: child.href === '/dashboard/classes/timetable' ? '#0071E3' : '#6B7280',
                fontWeight: child.href === '/dashboard/classes/timetable' ? 600 : 400 }}
              onMouseEnter={e => { if (child.href !== '/dashboard/classes/timetable') { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}}
              onMouseLeave={e => { if (child.href !== '/dashboard/classes/timetable') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}}
            >{child.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getWeekStart(offset: number): Date {
  const now = new Date(2026, 5, 1)
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offset * 7)
  return monday
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
  return fmt(monday) + ' - ' + fmt(sunday)
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM'
  if (h === 12) return '12:00 PM'
  return h < 12 ? h + ':00 AM' : (h - 12) + ':00 PM'
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

// ── Class popup (fixed, rendered at page level) ────────────────────────────────
function ClassPopup({ slot, onClose }: { slot: ClassSlot; onClose: () => void }) {
  const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const endTotalMin = slot.startH * 60 + slot.startM + slot.durationM
  const endH = Math.floor(endTotalMin / 60)
  const endM = endTotalMin % 60
  const timeLabel = fmtTime(slot.startH, slot.startM) + ' - ' + fmtTime(endH, endM)
  const pct = Math.round((slot.enrolled / slot.capacity) * 100)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed z-50 rounded-2xl overflow-hidden"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: '#fff', width: 240, boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          border: '1px solid #E5E7EB' }}>
        {/* Header */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{slot.name}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{timeLabel}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{slot.instructor}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
              background: colors.bg, color: colors.text, border: '1px solid ' + colors.border }}>
              {slot.activity}
            </span>
          </div>
          {/* Location + Room */}
          <div className="flex items-center gap-1.5 mt-2">
            <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99,
              background: getLoc(slot.locationId).color + '18',
              color: getLoc(slot.locationId).color }}>
              {getLoc(slot.locationId).name}
            </span>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>
              {getRoom(slot.roomId).name}
            </span>
          </div>
          <div style={{ marginTop: 8, height: 3, background: '#F3F4F6', borderRadius: 99 }}>
            <div style={{ height: 3, borderRadius: 99, background: colors.text,
              width: pct + '%', opacity: 0.7 }} />
          </div>
          <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 3 }}>
            {slot.enrolled} / {slot.capacity} students ({pct}%)
          </p>
        </div>
        {/* Actions */}
        <div className="py-1">
          {[
            { icon: Eye,    label: 'View students', color: '#374151' },
            { icon: Pencil, label: 'Edit class',     color: '#374151' },
            { icon: Copy,   label: 'Duplicate',      color: '#374151' },
            { icon: Trash2, label: 'Delete',         color: '#DC2626' },
          ].map(({ icon: Icon, label, color }) => (
            <button key={label} onClick={onClose}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 cursor-pointer"
              style={{ background: 'transparent', border: 'none', fontSize: 13, color, textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Class block (click → action popup) ─────────────────────────────────────────
function ClassBlock({ slot, onSelect }: { slot: ClassSlot; onSelect: (s: ClassSlot) => void }) {
  const colors = ACTIVITY_COLORS[slot.activity] ?? ACTIVITY_COLORS['Open Mat']!
  const top    = classTop(slot.startH, slot.startM)
  const height = classHeight(slot.durationM)
  const pct    = Math.round((slot.enrolled / slot.capacity) * 100)
  const endTotalMin = slot.startH * 60 + slot.startM + slot.durationM
  const endH = Math.floor(endTotalMin / 60)
  const endM = endTotalMin % 60
  const timeLabel = fmtTime(slot.startH, slot.startM) + ' - ' + fmtTime(endH, endM)

  return (
    <div
      className="absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer"
      style={{ top: top + 1, height: height - 2, background: colors.bg,
        border: '1.5px solid ' + colors.border, zIndex: 1, overflow: 'hidden',
        transition: 'box-shadow 0.15s' }}
      onClick={e => { e.stopPropagation(); onSelect(slot) }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: colors.text, lineHeight: 1.2, marginBottom: 1 }}>
        {slot.name}
      </p>
      {height > 36 && (
        <p style={{ fontSize: 10, color: colors.text, opacity: 0.75, lineHeight: 1.2 }}>{timeLabel}</p>
      )}
      {height > 52 && (
        <p style={{ fontSize: 10, color: colors.text, opacity: 0.6, lineHeight: 1.2 }}>{slot.instructor}</p>
      )}
      {height > 64 && (
        <p style={{ fontSize: 9, color: colors.text, opacity: 0.5, lineHeight: 1.2 }}>
          {getRoom(slot.roomId).name}
        </p>
      )}
      {height > 80 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ height: 3, background: colors.border, borderRadius: 99 }}>
            <div style={{ height: 3, borderRadius: 99, background: colors.text, width: pct + '%', opacity: 0.5 }} />
          </div>
          <p style={{ fontSize: 9, color: colors.text, opacity: 0.6, marginTop: 2 }}>{slot.enrolled}/{slot.capacity}</p>
        </div>
      )}
    </div>
  )
}

// ── Add Timetable drawer ───────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const INSTRUCTORS_LIST = ['Carlos Silva', 'Monti', 'Ana Torres', 'Jorge Sanchez', 'Laura M.']

function AddTimetableDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [repeat, setRepeat]       = useState('Yes')
  const [selLocId, setSelLocId]   = useState<number | ''>('')
  const [dayEnabled, setDayEnabled] = useState<boolean[]>([true, true, true, true, true, false, false])
  const [bannerDrag, setBannerDrag] = useState(false)
  const availableRooms = selLocId !== '' ? ROOMS.filter(r => r.locationId === selLocId) : []
  const inputStyle: React.CSSProperties = {
    border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px',
    fontSize: 12, color: '#111827', background: '#fff', outline: 'none', width: '100%',
  }

  function toggleDay(idx: number) {
    setDayEnabled(prev => prev.map((v, i) => i === idx ? !v : v))
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />
      <div className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{ width: 'min(760px, 96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Add Timetable</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Configure recurring or one-off schedule</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

          {/* Banner upload */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              Timetable Banner
            </label>
            <div
              onDragEnter={() => setBannerDrag(true)}
              onDragLeave={() => setBannerDrag(false)}
              onDrop={() => setBannerDrag(false)}
              className="flex items-center gap-4 rounded-xl cursor-pointer"
              style={{ border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                background: bannerDrag ? '#EFF6FF' : '#fff', padding: '12px 16px' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: '#F3F4F6' }}>
                <Upload size={15} style={{ color: '#9CA3AF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop image here</p>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>PNG, JPG up to 5 MB — recommended 1200×600px</p>
              </div>
              <label className="px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
                style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB',
                  background: '#fff', color: '#374151' }}>
                Browse
                <input type="file" accept="image/*" className="hidden" />
              </label>
            </div>
          </div>

          {/* Top fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Title
              </label>
              <input type="text" placeholder="e.g. BJJ Schedule" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Instructor
              </label>
              <select style={inputStyle}>
                <option value="">Select instructor...</option>
                {INSTRUCTORS_LIST.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Location + Room */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Location
              </label>
              <select style={inputStyle} value={selLocId}
                onChange={e => setSelLocId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="">Select location...</option>
                {LOCATIONS.map(l => (
                  <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Room
              </label>
              <select style={{ ...inputStyle, opacity: selLocId === '' ? 0.5 : 1 }}
                disabled={selLocId === ''}>
                <option value="">{selLocId === '' ? 'Select location first' : 'Select room...'}</option>
                {availableRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name} (cap. {r.capacity})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Repeat Timetable
              </label>
              <select value={repeat} onChange={e => setRepeat(e.target.value)} style={inputStyle}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                Start Date
              </label>
              <input type="date" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                {repeat === 'Yes' ? 'Repeat End Date' : 'End Date'}
              </label>
              <input type="date" style={inputStyle} />
            </div>
          </div>

          {/* Session timings */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0071E3', marginBottom: 12 }}>
              Session Timings by Day
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6', background: '#F9FAFB' }}>
                    {['Day', 'Start Time', 'End Time', 'Break Start', 'Break End', 'Status'].map(h => (
                      <th key={h} className="px-3 py-2 text-left"
                        style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF',
                          textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS_OF_WEEK.map((day, idx) => {
                    const on = dayEnabled[idx] ?? false
                    return (
                      <tr key={day} style={{ borderBottom: idx < DAYS_OF_WEEK.length - 1 ? '1px solid #F9FAFB' : 'none',
                        opacity: on ? 1 : 0.45 }}>
                        <td className="px-3 py-2">
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151',
                            textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {day.slice(0, 3)}
                          </span>
                        </td>
                        {[0, 1, 2, 3].map(i => (
                          <td key={i} className="px-3 py-2">
                            <input type="time" disabled={!on}
                              style={{ ...inputStyle, width: 90, padding: '5px 6px', fontSize: 11,
                                opacity: on ? 1 : 0.5, cursor: on ? 'text' : 'not-allowed' }} />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div onClick={() => toggleDay(idx)}
                            className="cursor-pointer select-none"
                            style={{ width: 44, height: 22, borderRadius: 99,
                              background: on ? '#0071E3' : '#E5E7EB',
                              padding: '2px', display: 'flex', alignItems: 'center',
                              justifyContent: on ? 'flex-end' : 'flex-start',
                              transition: 'background 0.2s' }}>
                            <div style={{ width: 18, height: 18, borderRadius: '50%',
                              background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              transition: 'all 0.2s' }} />
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

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3 shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB',
              background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={onSuccess}
            className="px-6 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: '#0071E3', color: '#fff' }}>
            Add Timetable
          </button>
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#F0FDF4' }}>
          <Check size={32} style={{ color: '#16A34A' }} strokeWidth={2.5} />
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Timetable Added!
          </h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Your timetable has been created and is now active.
          </p>
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
  const [menuOpen, setMenuOpen]           = useState(false)
  const [weekOffset, setWeekOffset]       = useState(0)
  const [view, setView]                   = useState<'calendar' | 'list'>('calendar')
  const [currentPage, setCurrentPage]     = useState(1)
  const [openMenuId, setOpenMenuId]       = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]       = useState(false)
  const [successOpen, setSuccessOpen]     = useState(false)
  const [selectedSlot, setSelectedSlot]   = useState<ClassSlot | null>(null)
  const [filterLocId, setFilterLocId]     = useState<number | null>(null)  // null = All
  const scrollRef = useRef<HTMLDivElement>(null)

  function handleDrawerSuccess() {
    setDrawerOpen(false)
    setSuccessOpen(true)
  }

  const filteredSchedule = filterLocId
    ? SCHEDULE.filter(s => s.locationId === filterLocId)
    : SCHEDULE

  const monday    = getWeekStart(weekOffset)
  const weekLabel = formatWeekLabel(monday)
  const weekDates = DAYS.map((_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })

  const todayIdx = (() => {
    const today = new Date(2026, 5, 1)
    return weekDates.findIndex(d => d.toDateString() === today.toDateString())
  })()

  const totalPages = Math.max(1, Math.ceil(TIMETABLE_LIST.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = TIMETABLE_LIST.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  return (
    <div className="h-screen flex overflow-hidden"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      <style>{`@media (min-width: 768px) { .dashboard-sidebar { transform: translateX(0) !important; } }`}</style>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMenuOpen(false)} />
      )}

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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <item.icon size={16} style={{ color: '#9CA3AF' }} />
              {item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
              <LogOut size={16} style={{ color: '#9CA3AF' }} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 md:ml-[232px] h-screen overflow-hidden">

        {/* Topbar */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 gap-3"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>

          {/* Left group: menu + title + toggle + week nav */}
          <div className="flex items-center gap-3 min-w-0">
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0,
              letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              Timetable
            </h1>

            {/* View toggle — always in same position */}
            <div className="flex items-center rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <button onClick={() => setView('calendar')}
                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
                style={{ fontSize: 12, fontWeight: 500, border: 'none',
                  background: view === 'calendar' ? '#fff' : 'transparent',
                  color: view === 'calendar' ? '#111827' : '#9CA3AF',
                  boxShadow: view === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                <CalendarDays size={13} />
                Calendar
              </button>
              <button onClick={() => setView('list')}
                className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
                style={{ fontSize: 12, fontWeight: 500, border: 'none',
                  background: view === 'list' ? '#fff' : 'transparent',
                  color: view === 'list' ? '#111827' : '#9CA3AF',
                  boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                <LayoutList size={13} />
                List
              </button>
            </div>

            {/* Week nav — only in calendar mode */}
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

          {/* Right group: legend + date + bell + + */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Legend — calendar only, large screens */}
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
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 12,
                color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={12} style={{ color: '#9CA3AF' }} />
              {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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

        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 flex flex-col gap-4">
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
                    {s.trend !== '' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11,
                        fontWeight: 600, background: '#F0FDF4', color: '#16A34A',
                        padding: '2px 7px', borderRadius: 999 }}>
                        <TrendingUp size={9} />{s.trend}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[
                      { label: 'Class',      cls: '' },
                      { label: 'Location',   cls: 'hidden md:table-cell' },
                      { label: 'Start Date', cls: 'hidden lg:table-cell' },
                      { label: 'End Date',   cls: 'hidden lg:table-cell' },
                      { label: 'Type',       cls: 'hidden md:table-cell' },
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
                    const tc = row.type === 'Repeat'
                      ? { bg: '#EFF6FF', color: '#2563EB' }
                      : { bg: '#F5F3FF', color: '#6D28D9' }
                    return (
                      <tr key={row.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 rounded-lg overflow-hidden relative" style={{ width: 36, height: 36 }}>
                              <Image src={row.image} alt={row.title} fill className="object-cover" />
                            </div>
                            <div>
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{row.title}</p>
                              <p style={{ fontSize: 12, color: '#9CA3AF' }}>{row.activity}</p>
                            </div>
                          </div>
                        </td>
                        {/* Location + Room */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                                background: getLoc(row.locationId).color, display: 'inline-block' }} />
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>
                                {getLoc(row.locationId).name}
                              </span>
                            </div>
                            <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, paddingLeft: 10 }}>
                              {getRoom(row.roomId).name}
                            </p>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{row.startDate}</span>
                        </td>
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{row.endDate}</span>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 999, background: tc.bg, color: tc.color }}>
                            {row.type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 999, background: sc.bg, color: sc.color }}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 relative">
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id) }}
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
                                    className="w-full text-left px-4 py-2 transition-colors cursor-pointer"
                                    style={{ fontSize: 13,
                                      color: action === 'Delete' ? '#DC2626' : '#374151',
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
                </tbody>
              </table>

              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}{' - '}{Math.min(safePage * ITEMS_PER_PAGE, TIMETABLE_LIST.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{TIMETABLE_LIST.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}>
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>...</span>
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
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer"
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}>
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR VIEW */}
        {view === 'calendar' && (
          <div className="flex flex-col flex-1 overflow-hidden">

            {/* Location filter bar */}
            <div className="flex items-center gap-2 px-4 md:px-6 py-2 shrink-0"
              style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 4 }}>Location</span>
              <button
                onClick={() => setFilterLocId(null)}
                className="px-3 py-1 rounded-lg cursor-pointer transition-colors"
                style={{ fontSize: 12, fontWeight: filterLocId === null ? 600 : 400, border: 'none',
                  background: filterLocId === null ? '#111827' : '#F3F4F6',
                  color: filterLocId === null ? '#fff' : '#374151' }}>
                All locations
              </button>
              {LOCATIONS.map(loc => (
                <button key={loc.id}
                  onClick={() => setFilterLocId(loc.id)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg cursor-pointer transition-colors"
                  style={{ fontSize: 12, fontWeight: filterLocId === loc.id ? 600 : 400, border: 'none',
                    background: filterLocId === loc.id ? loc.color : '#F3F4F6',
                    color: filterLocId === loc.id ? '#fff' : '#374151' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%',
                    background: filterLocId === loc.id ? 'rgba(255,255,255,0.7)' : loc.color,
                    flexShrink: 0, display: 'inline-block' }} />
                  {loc.name}
                  <span style={{ fontSize: 11, opacity: 0.75 }}>
                    {' · '}{loc.city}
                  </span>
                </button>
              ))}
            </div>

            {/* Day header */}
            <div className="flex shrink-0" style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ width: 56, flexShrink: 0 }} />
              {DAYS.map((day, i) => {
                const date    = weekDates[i]!
                const isToday = i === todayIdx
                return (
                  <div key={day} className="flex-1 flex flex-col items-center py-2 border-l"
                    style={{ borderColor: '#F3F4F6', minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF',
                      textTransform: 'uppercase', letterSpacing: '0.06em' }}>{day}</span>
                    <div className="flex items-center justify-center mt-0.5"
                      style={{ width: 26, height: 26, borderRadius: '50%',
                        background: isToday ? '#0071E3' : 'transparent' }}>
                      <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 500,
                        color: isToday ? '#fff' : '#374151' }}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Scrollable grid */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="flex" style={{ minHeight: HOURS.length * HOUR_HEIGHT }}>
                <div style={{ width: 56, flexShrink: 0 }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start',
                      paddingTop: 4, paddingRight: 8, justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{formatHour(h)}</span>
                    </div>
                  ))}
                </div>
                {DAYS.map((day, dayIdx) => {
                  const isToday  = dayIdx === todayIdx
                  const daySlots = filteredSchedule.filter(s => s.day === dayIdx)
                  return (
                    <div key={day} className="flex-1 border-l relative"
                      style={{ borderColor: '#F3F4F6', minWidth: 0,
                        background: isToday ? '#FAFBFF' : 'transparent' }}>
                      {HOURS.map(h => (
                        <div key={h} style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F3F4F6' }} />
                      ))}
                      {daySlots.map(slot => (
                        <ClassBlock key={slot.id} slot={slot} onSelect={setSelectedSlot} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSlot && (
        <ClassPopup slot={selectedSlot} onClose={() => setSelectedSlot(null)} />
      )}

      <AddTimetableDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onSuccess={handleDrawerSuccess} />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </div>
  )
}
