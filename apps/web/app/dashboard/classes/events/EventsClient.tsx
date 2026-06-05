'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Plus, MoreHorizontal, Search,
  ChevronLeft, TrendingUp, TrendingDown, Check, Upload,
  Clock, MapPin, Star, Ticket,
} from 'lucide-react'

// ── Mock data ──────────────────────────────────────────────────────────────────

const EVENT_TYPES = ['Seminar', 'Competition', 'Grading', 'Open Mat', 'Camp', 'Social'] as const
type EventType = typeof EVENT_TYPES[number]
type EventStatus = 'Upcoming' | 'Past' | 'Cancelled' | 'Sold Out'

interface MartialEvent {
  id: number
  image: string
  title: string
  type: EventType
  date: string
  time: string
  instructor: string
  location: string
  capacity: number
  enrolled: number
  price: string
  status: EventStatus
  featured: boolean
}

const EVENTS: MartialEvent[] = [
  { id:1,  image:'/roger-gracie-malaga.jpg',     title:'Roger Gracie Seminar',         type:'Seminar',     date:'15 Jun 2026', time:'10:00–14:00', instructor:'Roger Gracie',  location:'Main Academy',    capacity:40,  enrolled:38, price:'€120', status:'Upcoming',  featured:true  },
  { id:2,  image:'/mathouse.jpg',                title:'Madrid BJJ Open 2026',          type:'Competition', date:'22 Jun 2026', time:'09:00–18:00', instructor:'—',             location:'Palacio Vistaleg', capacity:200, enrolled:147, price:'€45',  status:'Upcoming',  featured:true  },
  { id:3,  image:'/five-elements-jiu-jitsu.jpg', title:'Belt Grading — June',           type:'Grading',     date:'28 Jun 2026', time:'11:00–13:00', instructor:'Carlos Silva',  location:'Main Academy',    capacity:30,  enrolled:22, price:'Free', status:'Upcoming',  featured:false },
  { id:4,  image:'/roger-gracie-malaga.jpg',     title:'Summer Open Mat',               type:'Open Mat',    date:'04 Jul 2026', time:'11:00–14:00', instructor:'—',             location:'Main Academy',    capacity:50,  enrolled:31, price:'Free', status:'Upcoming',  featured:false },
  { id:5,  image:'/mathouse.jpg',                title:'Kids BJJ Camp — Summer',        type:'Camp',        date:'10 Jul 2026', time:'09:00–13:00', instructor:'Ana Torres',    location:'Main Academy',    capacity:20,  enrolled:20, price:'€180', status:'Sold Out',  featured:true  },
  { id:6,  image:'/five-elements-jiu-jitsu.jpg', title:'NOGI Championship',             type:'Competition', date:'18 Jul 2026', time:'10:00–19:00', instructor:'—',             location:'Branch Malaga',   capacity:80,  enrolled:54, price:'€55',  status:'Upcoming',  featured:false },
  { id:7,  image:'/roger-gracie-malaga.jpg',     title:'Marcelo Garcia Seminar',        type:'Seminar',     date:'02 Aug 2026', time:'10:00–15:00', instructor:'Marcelo Garcia', location:'Main Academy',   capacity:45,  enrolled:19, price:'€150', status:'Upcoming',  featured:true  },
  { id:8,  image:'/mathouse.jpg',                title:'End-of-Season Social',          type:'Social',      date:'30 Aug 2026', time:'19:00–23:00', instructor:'—',             location:'Main Academy',    capacity:100, enrolled:63, price:'€20',  status:'Upcoming',  featured:false },
  { id:9,  image:'/five-elements-jiu-jitsu.jpg', title:'Belt Grading — March',          type:'Grading',     date:'14 Mar 2026', time:'11:00–13:00', instructor:'Carlos Silva',  location:'Main Academy',    capacity:28,  enrolled:28, price:'Free', status:'Past',      featured:false },
  { id:10, image:'/roger-gracie-malaga.jpg',     title:'Gordon Ryan Seminar',           type:'Seminar',     date:'05 Apr 2026', time:'10:00–14:00', instructor:'Gordon Ryan',   location:'Main Academy',    capacity:50,  enrolled:50, price:'€130', status:'Past',      featured:true  },
  { id:11, image:'/mathouse.jpg',                title:'Spring Open Mat',               type:'Open Mat',    date:'20 Apr 2026', time:'11:00–14:00', instructor:'—',             location:'Branch Malaga',   capacity:40,  enrolled:35, price:'Free', status:'Past',      featured:false },
  { id:12, image:'/five-elements-jiu-jitsu.jpg', title:'Regional Competition Malaga',   type:'Competition', date:'10 May 2026', time:'09:00–17:00', instructor:'—',             location:'Branch Malaga',   capacity:120, enrolled:98, price:'€40',  status:'Past',      featured:false },
]

const STATS = [
  { label: 'Total Events',  value: '12', trend: '+4',  trendUp: true,  sub: 'vs last quarter' },
  { label: 'Upcoming',      value: '8',  trend: '+3',  trendUp: true,  sub: 'scheduled'       },
  { label: 'This Month',    value: '3',  trend: '+1',  trendUp: true,  sub: 'June 2026'       },
  { label: 'Sold Out',      value: '1',  trend: '',    trendUp: false, sub: 'Kids Camp'       },
]

const STATUS_MAP: Record<EventStatus, { bg: string; color: string }> = {
  Upcoming:  { bg: '#EFF6FF', color: '#2563EB' },
  Past:      { bg: '#F3F4F6', color: '#6B7280' },
  Cancelled: { bg: '#FEF2F2', color: '#DC2626' },
  'Sold Out':{ bg: '#FFF7ED', color: '#C2410C' },
}

const TYPE_MAP: Record<EventType, { bg: string; color: string; border: string }> = {
  Seminar:     { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  Competition: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  Grading:     { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Open Mat':  { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  Camp:        { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  Social:      { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
}

const INSTRUCTORS = ['Roger Gracie', 'Carlos Silva', 'Monti', 'Ana Torres', 'Jorge Sanchez', 'Laura M.', 'Marcelo Garcia', 'Gordon Ryan']
const LOCATIONS_LIST = ['Main Academy — Madrid', 'Branch Malaga — Malaga', 'External Venue']

type Filter = 'All' | EventStatus

const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
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

const ACTIVE_HREF = '/dashboard/classes/events'

function NavGroup({ item }: { item: NavItem }) {
  const isActive = item.href === ACTIVE_HREF || item.children?.some(c => c.href === ACTIVE_HREF)
  const [open, setOpen] = useState(isActive ?? false)
  if (!item.children) return (
    <Link href={item.href ?? '#'}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
      style={{ color: '#374151', fontSize: 14, background: item.href === ACTIVE_HREF ? '#EFF6FF' : 'transparent' }}
      onMouseEnter={e => { if (item.href !== ACTIVE_HREF) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
      onMouseLeave={e => { if (item.href !== ACTIVE_HREF) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
      <item.icon size={16} style={{ color: item.href === ACTIVE_HREF ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
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

// ── Capacity bar ────────────────────────────────────────────────────────────────
function CapacityBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct    = Math.min(100, Math.round((enrolled / capacity) * 100))
  const isFull = enrolled >= capacity
  const color  = isFull ? '#DC2626' : pct >= 80 ? '#D97706' : '#0071E3'
  return (
    <div>
      <div style={{ height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden', width: 80 }}>
        <div style={{ height: '100%', borderRadius: 99, background: color, width: pct + '%' }} />
      </div>
      <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
        {enrolled}/{capacity}
        {isFull && <span style={{ color: '#DC2626', fontWeight: 600 }}> · Full</span>}
      </p>
    </div>
  )
}

// ── Create Event drawer ────────────────────────────────────────────────────────
function CreateEventDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [bannerDrag, setBannerDrag] = useState(false)
  const [isFree, setIsFree]         = useState(false)
  const [legalChecked, setLegalChecked] = useState({ terms: false, privacy: false })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(900px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Create Event
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Fill in the details to publish a new event</p>
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

              {/* Title + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Event Title</label>
                  <input type="text" placeholder="e.g. Roger Gracie Seminar" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Event Type</label>
                  <select style={inputStyle}>
                    <option value="">Select type…</option>
                    {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Start Time</label>
                  <input type="time" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Time</label>
                  <input type="time" style={inputStyle} />
                </div>
              </div>

              {/* Instructor + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Instructor / Host</label>
                  <input type="text" placeholder="e.g. Roger Gracie" list="instructors-list" style={inputStyle} />
                  <datalist id="instructors-list">
                    {INSTRUCTORS.map(i => <option key={i} value={i} />)}
                  </datalist>
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <select style={inputStyle}>
                    <option value="">Select location…</option>
                    {LOCATIONS_LIST.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Capacity + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Capacity (max attendees)</label>
                  <input type="number" placeholder="40" min={1} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>
                    Price
                    {/* Free toggle */}
                    <span
                      onClick={() => setIsFree(v => !v)}
                      className="ml-2 cursor-pointer select-none"
                      style={{ fontSize: 11, fontWeight: 600,
                        color: isFree ? '#16A34A' : '#9CA3AF',
                        padding: '1px 7px', borderRadius: 999,
                        background: isFree ? '#F0FDF4' : '#F3F4F6',
                        border: '1px solid ' + (isFree ? '#BBF7D0' : '#E5E7EB') }}>
                      {isFree ? '✓ Free' : 'Free?'}
                    </span>
                  </label>
                  <input type="text" placeholder="€120" disabled={isFree}
                    value={isFree ? 'Free' : undefined}
                    style={{ ...inputStyle, opacity: isFree ? 0.5 : 1, cursor: isFree ? 'not-allowed' : 'text' }} />
                </div>
              </div>

              {/* Registration deadline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Registration Deadline</label>
                  <input type="date" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Max Registrations / Person</label>
                  <input type="number" placeholder="1" min={1} max={10} style={inputStyle} />
                </div>
              </div>

              {/* Featured toggle */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>Featured Event</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>Show this event highlighted on the homepage</p>
                </div>
                <div className="flex items-center gap-2">
                  <Star size={14} style={{ color: '#D97706' }} />
                  <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={4} placeholder="Describe the event, what to bring, what to expect…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
            </div>

            {/* Right — banner */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <label style={labelStyle}>Event Banner</label>
              <div
                onDragEnter={() => setBannerDrag(true)}
                onDragLeave={() => setBannerDrag(false)}
                onDrop={() => setBannerDrag(false)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer"
                style={{ height: 200, border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                  background: bannerDrag ? '#EFF6FF' : '#fff' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                  <Upload size={18} style={{ color: '#9CA3AF' }} />
                </div>
                <div className="text-center">
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop image here</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>PNG, JPG up to 5 MB</p>
                </div>
                <label className="px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
                  Browse<input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Recommended: 1200×600px</p>

              {/* Quick info preview */}
              <div className="mt-6 rounded-xl p-4 flex flex-col gap-2"
                style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  Preview
                </p>
                {[
                  { icon: Calendar, label: 'Date TBD' },
                  { icon: Clock,    label: 'Time TBD' },
                  { icon: MapPin,   label: 'Location TBD' },
                  { icon: Ticket,   label: 'Price TBD' },
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
        <div className="px-8 py-5 flex flex-col gap-4 shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <div className="flex flex-col gap-2">
            {([
              { key: 'terms',   label: 'I confirm the event details are accurate and agree to the Terms & Conditions' },
              { key: 'privacy', label: 'Attendee data will be handled according to the Privacy Policy' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setLegalChecked(p => ({ ...p, [key]: !p[key] }))}
                  className="flex items-center justify-center rounded-md flex-shrink-0"
                  style={{ width: 16, height: 16,
                    border: `1.5px solid ${legalChecked[key] ? '#0071E3' : '#D1D5DB'}`,
                    background: legalChecked[key] ? '#0071E3' : '#fff', cursor: 'pointer' }}>
                  {legalChecked[key] && <Check size={10} style={{ color: '#fff' }} strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3 justify-end">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
              Cancel
            </button>
            <button
              onClick={onSuccess}
              disabled={!legalChecked.terms || !legalChecked.privacy}
              className="px-6 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 600, border: 'none',
                background: legalChecked.terms && legalChecked.privacy ? '#0071E3' : '#93C5FD',
                color: '#fff', cursor: legalChecked.terms && legalChecked.privacy ? 'pointer' : 'not-allowed' }}>
              Publish Event
            </button>
          </div>
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Event Published!</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            Your event is now live and visible to students.
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
export default function EventsClient() {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]           = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)
  const [openMenuId, setOpenMenuId]   = useState<number | null>(null)

  const filtered = EVENTS.filter(e => {
    const matchFilter = activeFilter === 'All' || e.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' ||
      e.title.toLowerCase().includes(q) ||
      e.instructor.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.location.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: Filter) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string)  => { setSearch(v); setCurrentPage(1) }

  const FILTER_OPTIONS: Filter[] = ['All', 'Upcoming', 'Past', 'Sold Out', 'Cancelled']

  return (
    <div className="min-h-screen flex"
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
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <item.icon size={16} style={{ color: '#9CA3AF' }} />{item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={16} style={{ color: '#9CA3AF' }} />Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', minWidth: 200 }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search events…" value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: 150 }} />
            </div>

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={13} style={{ color: '#9CA3AF' }} />
              {new Date(2026, 5, 4).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>

            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>

            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />
              Create Event
            </button>
          </div>

          <div className="px-4 md:px-8 py-4 flex flex-col gap-4">

            {/* Header */}
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                Events
              </h1>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>
                {filtered.length} of {EVENTS.length} events
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '10px 14px' }}>
                  <div className="flex items-start justify-between mb-2">
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                    {stat.trend && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
                        background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                        color: stat.trendUp ? '#16A34A' : '#DC2626',
                        padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                        {stat.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {stat.trend}
                      </span>
                    )}
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
              {FILTER_OPTIONS.map(f => {
                const count = f === 'All' ? EVENTS.length : EVENTS.filter(e => e.status === f).length
                if (count === 0 && f !== 'All') return null
                return (
                  <button key={f} onClick={() => handleFilter(f)}
                    className="cursor-pointer transition-all"
                    style={{ fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8,
                      padding: '6px 14px',
                      color: activeFilter === f ? '#111827' : '#6B7280',
                      background: activeFilter === f ? '#fff' : 'transparent',
                      boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                    {f}
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
                      { label: 'Event',      cls: '' },
                      { label: 'Date',       cls: 'hidden sm:table-cell' },
                      { label: 'Host',       cls: 'hidden lg:table-cell' },
                      { label: 'Location',   cls: 'hidden lg:table-cell' },
                      { label: 'Spots',      cls: 'hidden md:table-cell' },
                      { label: 'Price',      cls: 'hidden md:table-cell' },
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
                  {paginated.map((ev, idx) => {
                    const sc = STATUS_MAP[ev.status]
                    const tc = TYPE_MAP[ev.type]
                    return (
                      <tr key={ev.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                        {/* Event */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 rounded-lg overflow-hidden relative" style={{ width: 40, height: 40 }}>
                              <Image src={ev.image} alt={ev.title} fill className="object-cover" />
                              {ev.featured && (
                                <div className="absolute top-0.5 right-0.5">
                                  <Star size={9} style={{ color: '#D97706', fill: '#D97706' }} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{ev.title}</p>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                                background: tc.bg, color: tc.color, border: '1px solid ' + tc.border }}>
                                {ev.type}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="hidden sm:table-cell px-5 py-3">
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{ev.date}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{ev.time}</p>
                        </td>

                        {/* Host */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#374151' }}>{ev.instructor}</span>
                        </td>

                        {/* Location */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: '#374151' }}>{ev.location}</span>
                          </div>
                        </td>

                        {/* Spots */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <CapacityBar enrolled={ev.enrolled} capacity={ev.capacity} />
                        </td>

                        {/* Price */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, fontWeight: 600,
                            color: ev.price === 'Free' ? '#16A34A' : '#111827' }}>
                            {ev.price}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px',
                            borderRadius: 999, background: sc.bg, color: sc.color,
                            whiteSpace: 'nowrap' }}>
                            {ev.status}
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
                                {['View registrations', 'Edit', 'Duplicate', 'Cancel event'].map(action => (
                                  <button key={action} onClick={() => setOpenMenuId(null)}
                                    className="w-full text-left px-4 py-2 transition-colors cursor-pointer"
                                    style={{ fontSize: 13,
                                      color: action === 'Cancel event' ? '#DC2626' : '#374151',
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

              {paginated.length === 0 && (
                <div className="py-16 text-center">
                  <Calendar size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>No events found</p>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>
                    Prev
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
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <CreateEventDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setSuccessOpen(true) }}
      />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </div>
  )
}
