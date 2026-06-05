'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Plus, MoreHorizontal, Search,
  ChevronLeft, TrendingUp, Check, Upload, Eye,
  Clock, Zap, RefreshCw, ToggleLeft, Infinity, Hash,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type MembershipStatus = 'Active' | 'Inactive'
type TabId = 'subscriptions' | 'single-passes' | 'trials'

interface Membership {
  id: number
  image: string
  name: string
  classes: string[]
  price: string
  billing: string
  members: number
  status: MembershipStatus
  public: boolean
  stripe?: string
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const SUBSCRIPTIONS: Membership[] = [
  { id:1, image:'/roger-gracie-malaga.jpg',     name:'Jiu Jitsu Mensual',    classes:['BJJ','NOGI','Open Mat'],              price:'€65.00',  billing:'Every Month',     members:89, status:'Active',   public:true,  stripe:'price_1P2a' },
  { id:2, image:'/mathouse.jpg',                name:'Jiu Jitsu Trimestral', classes:['BJJ','NOGI','Open Mat','Wrestling'],   price:'€180.00', billing:'Every 3 Months',  members:31, status:'Active',   public:true,  stripe:'price_1P2b' },
  { id:3, image:'/five-elements-jiu-jitsu.jpg', name:'Jiu Jitsu Infantil',   classes:['BJJ Kids','BJJ'],                     price:'€50.00',  billing:'Every Month',     members:24, status:'Active',   public:true,  stripe:'price_1P2c' },
  { id:4, image:'/mathouse.jpg',                name:'Family Jiu Jitsu',     classes:['BJJ','NOGI','BJJ Kids','Open Mat'],    price:'€100.00', billing:'Every Month',     members:8,  status:'Active',   public:true,  stripe:'price_1P2d' },
  { id:5, image:'/roger-gracie-malaga.jpg',     name:'2 Semanas',            classes:['BJJ','NOGI'],                         price:'€35.00',  billing:'Every 2 Weeks',   members:12, status:'Active',   public:true,  stripe:'price_1P2e' },
  { id:6, image:'',                             name:'Kids Family',          classes:['BJJ Kids'],                           price:'€0.00',   billing:'Every Month',     members:6,  status:'Active',   public:false, stripe:''           },
  { id:7, image:'',                             name:'BJJ Competición',      classes:['BJJ Comp','BJJ'],                     price:'€85.00',  billing:'Every Month',     members:0,  status:'Inactive', public:false, stripe:'price_1P2f' },
]

const SINGLE_PASSES: Membership[] = [
  { id:1, image:'/roger-gracie-malaga.jpg',     name:'Drop-in Class',   classes:['BJJ','NOGI','Wrestling'], price:'€12.00', billing:'Single use', members:45, status:'Active', public:true  },
  { id:2, image:'',                             name:'Open Mat Pass',   classes:['Open Mat'],               price:'€8.00',  billing:'Single use', members:23, status:'Active', public:true  },
  { id:3, image:'/mathouse.jpg',                name:'Seminar Pass',    classes:['BJJ Comp'],               price:'€25.00', billing:'Single use', members:12, status:'Active', public:false },
]

const TRIAL_MEMBERSHIPS: Membership[] = [
  { id:1, image:'/roger-gracie-malaga.jpg',     name:'7-Day Free Trial', classes:['BJJ','NOGI','Open Mat'], price:'€0.00',  billing:'7 Days',  members:18, status:'Active', public:true  },
  { id:2, image:'/five-elements-jiu-jitsu.jpg', name:'30-Day Trial',     classes:['BJJ','NOGI'],            price:'€29.00', billing:'30 Days', members:7,  status:'Active', public:true  },
]

// Activity types for class access selection
const ACTIVITY_TYPES = [
  { key: 'BJJ',          bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  { key: 'NOGI',         bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  { key: 'Wrestling',    bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  { key: 'BJJ Kids',     bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  { key: 'Yoga',         bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
  { key: 'Open Mat',     bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  { key: 'BJJ Comp',     bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
  { key: 'Self Defence', bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
]

const CLASS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'BJJ':       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'NOGI':      { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Wrestling': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  'BJJ Kids':  { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Open Mat':  { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  'BJJ Comp':  { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
}
function classChipStyle(cls: string) {
  return CLASS_COLORS[cls] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
}

const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Nav ────────────────────────────────────────────────────────────────────────
type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }

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
const ACTIVE_HREF = '/dashboard/memberships'

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

// ── Class chips (compact) ──────────────────────────────────────────────────────
function ClassChips({ classes, max = 2 }: { classes: string[]; max?: number }) {
  const shown    = classes.slice(0, max)
  const overflow = classes.length - shown.length
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {shown.map(cls => {
        const s = classChipStyle(cls)
        return (
          <span key={cls} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
            background: s.bg, color: s.color, border: '1px solid ' + s.border, whiteSpace: 'nowrap' }}>
            {cls}
          </span>
        )
      })}
      {overflow > 0 && (
        <span style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
          +{overflow}
        </span>
      )}
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: MembershipStatus }) {
  const isActive = status === 'Active'
  return (
    <span className="inline-flex items-center gap-1"
      style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
        background: isActive ? '#F0FDF4' : '#F3F4F6',
        color: isActive ? '#16A34A' : '#6B7280',
        border: '1px solid ' + (isActive ? '#BBF7D0' : '#E5E7EB') }}>
      {isActive
        ? <Check size={9} strokeWidth={3} />
        : <X size={9} strokeWidth={3} />}
      {status}
    </span>
  )
}

// ── Per-activity access config ─────────────────────────────────────────────────
type ActivityAccess = 'off' | 'unlimited' | 'limited'
interface ActivityRow { key: string; bg: string; color: string; border: string; access: ActivityAccess; n: string; per: string }

const DEFAULT_ACTIVITY_ROWS: ActivityRow[] = ACTIVITY_TYPES.map(a => ({
  ...a, access: 'off', n: '4', per: 'Week',
}))

// ── Create Membership Drawer ───────────────────────────────────────────────────
function CreateMembershipDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [rows, setRows]             = useState<ActivityRow[]>(DEFAULT_ACTIVITY_ROWS.map(r => ({ ...r })))
  const [freqUnit, setFreqUnit]     = useState('Month')
  const [bannerDrag, setBannerDrag] = useState(false)
  const [legalChecked, setLegalChecked] = useState({ terms: false, privacy: false })

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10, padding: '9px 12px',
    fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  function setAccess(key: string, access: ActivityAccess) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, access } : r))
  }
  function setN(key: string, n: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, n } : r))
  }
  function setPer(key: string, per: string) {
    setRows(prev => prev.map(r => r.key === key ? { ...r, per } : r))
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
              Create Membership
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              Configure a new subscription plan, pass or trial
            </p>
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

              {/* Name + Visibility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Membership Name</label>
                  <input type="text" placeholder="e.g. Jiu Jitsu Mensual" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Visibility</label>
                  <select style={inputStyle}>
                    <option value="yes">Public — visible to members</option>
                    <option value="no">Private — hidden</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Description</label>
                <textarea rows={3} placeholder="What's included in this plan…"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* Price + Billing */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label style={labelStyle}>Price (€)</label>
                  <input type="number" placeholder="65.00" min={0} step={0.01} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Billing Every</label>
                  <input type="number" placeholder="1" min={1} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Frequency</label>
                  <select value={freqUnit} onChange={e => setFreqUnit(e.target.value)} style={inputStyle}>
                    {['Day', 'Week', 'Month', 'Year'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Per-activity class access */}
              <div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 2 }}>Class Access</label>
                    <p style={{ fontSize: 12, color: '#9CA3AF' }}>
                      Set access rules per activity type
                    </p>
                  </div>
                  {/* Quick actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRows(prev => prev.map(r => ({ ...r, access: 'unlimited' })))}
                      className="cursor-pointer"
                      style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 7,
                        border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                      All unlimited
                    </button>
                    <button onClick={() => setRows(prev => prev.map(r => ({ ...r, access: 'off' })))}
                      className="cursor-pointer"
                      style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 7,
                        border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                      Clear all
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                  {rows.map((row, idx) => {
                    const isOn = row.access !== 'off'
                    return (
                      <div key={row.key}
                        style={{ borderBottom: idx < rows.length - 1 ? '1px solid #F3F4F6' : 'none',
                          padding: '12px 16px', opacity: isOn ? 1 : 0.55, transition: 'opacity 0.15s' }}>
                        <div className="flex items-center gap-3 flex-wrap">

                          {/* Activity chip */}
                          <div style={{ width: 110, flexShrink: 0 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px',
                              borderRadius: 99, background: isOn ? row.bg : '#F3F4F6',
                              color: isOn ? row.color : '#9CA3AF',
                              border: '1.5px solid ' + (isOn ? row.border : '#E5E7EB'),
                              display: 'inline-block', transition: 'all 0.15s' }}>
                              {row.key}
                            </span>
                          </div>

                          {/* Access mode selector — 3 pill buttons */}
                          <div className="flex items-center rounded-lg overflow-hidden shrink-0"
                            style={{ border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                            {([
                              { id: 'off' as ActivityAccess,       label: 'Off'       },
                              { id: 'unlimited' as ActivityAccess, label: 'Unlimited' },
                              { id: 'limited' as ActivityAccess,   label: 'Limited'   },
                            ]).map(({ id, label }) => {
                              const active = row.access === id
                              return (
                                <button key={id} onClick={() => setAccess(row.key, id)}
                                  className="cursor-pointer"
                                  style={{ fontSize: 12, fontWeight: active ? 600 : 400,
                                    padding: '5px 12px', border: 'none',
                                    background: active
                                      ? id === 'off' ? '#F3F4F6'
                                        : id === 'unlimited' ? '#EFF6FF'
                                        : '#EFF6FF'
                                      : 'transparent',
                                    color: active
                                      ? id === 'off' ? '#374151' : '#0071E3'
                                      : '#9CA3AF',
                                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    transition: 'all 0.12s' }}>
                                  {label}
                                </button>
                              )
                            })}
                          </div>

                          {/* Limited config — inline, only when limited */}
                          {row.access === 'limited' && (
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <input type="number" value={row.n} min={1}
                                onChange={e => setN(row.key, e.target.value)}
                                style={{ border: '1px solid #E5E7EB', borderRadius: 8,
                                  padding: '5px 8px', fontSize: 13, fontWeight: 700,
                                  color: '#111827', background: '#fff', outline: 'none',
                                  width: 56, textAlign: 'center' }} />
                              <span style={{ fontSize: 12, color: '#9CA3AF', whiteSpace: 'nowrap' }}>per</span>
                              <select value={row.per} onChange={e => setPer(row.key, e.target.value)}
                                style={{ border: '1px solid #E5E7EB', borderRadius: 8,
                                  padding: '5px 10px', fontSize: 12, color: '#374151',
                                  background: '#fff', outline: 'none' }}>
                                {['Day', 'Week', 'Month'].map(u => <option key={u}>{u}</option>)}
                              </select>
                            </div>
                          )}

                          {/* Unlimited label */}
                          {row.access === 'unlimited' && (
                            <span className="flex items-center gap-1"
                              style={{ fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
                              <Infinity size={13} />
                              No session limit
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right — image */}
            <div style={{ width: 240, flexShrink: 0 }}>
              <label style={labelStyle}>Membership Image</label>
              <div
                onDragEnter={() => setBannerDrag(true)}
                onDragLeave={() => setBannerDrag(false)}
                onDrop={() => setBannerDrag(false)}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer"
                style={{ height: 180, border: `2px dashed ${bannerDrag ? '#0071E3' : '#D1D5DB'}`,
                  background: bannerDrag ? '#EFF6FF' : '#fff' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: '#F3F4F6' }}>
                  <Upload size={18} style={{ color: '#9CA3AF' }} />
                </div>
                <div className="text-center">
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Drop image here</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>PNG, JPG up to 5 MB</p>
                </div>
                <label className="px-3 py-1.5 rounded-lg cursor-pointer"
                  style={{ fontSize: 12, fontWeight: 500, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151' }}>
                  Browse<input type="file" accept="image/*" className="hidden" />
                </label>
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>Recommended: 325 × 261px</p>

              {/* Summary of selected classes */}
              {rows.some(r => r.access !== 'off') && (
                <div className="mt-5 rounded-xl p-4"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#374151',
                    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    Access Summary
                  </p>
                  <div className="flex flex-col gap-2">
                    {rows.filter(r => r.access !== 'off').map(r => (
                      <div key={r.key} className="flex items-center justify-between">
                        <span style={{ fontSize: 11, fontWeight: 600, color: r.color }}>{r.key}</span>
                        <span style={{ fontSize: 11, color: '#6B7280' }}>
                          {r.access === 'unlimited' ? '∞ Unlimited' : `${r.n}× / ${r.per}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 flex flex-col gap-4 shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <div className="flex flex-col gap-2">
            {([
              { key: 'terms',   label: 'I confirm the membership details are accurate and agree to the Terms & Conditions' },
              { key: 'privacy', label: 'Member data will be handled in accordance with the Privacy Policy' },
            ] as const).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setLegalChecked(p => ({ ...p, [key]: !p[key] }))}
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
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB',
                background: '#fff', color: '#374151' }}>
              Cancel
            </button>
            <button onClick={onSuccess}
              disabled={!legalChecked.terms || !legalChecked.privacy}
              className="px-6 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 600, border: 'none',
                background: legalChecked.terms && legalChecked.privacy ? '#0071E3' : '#93C5FD',
                color: '#fff',
                cursor: legalChecked.terms && legalChecked.privacy ? 'pointer' : 'not-allowed' }}>
              Create Membership
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
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Membership Created!</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>The new plan is now active and available to members.</p>
        </div>
        <button onClick={onClose} className="w-full py-2.5 rounded-xl cursor-pointer"
          style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0071E3', color: '#fff' }}>
          Done
        </button>
      </div>
    </div>
  )
}

// ── Membership table ───────────────────────────────────────────────────────────
function MembershipTable({
  data, search, filterStatus, openMenuId, setOpenMenuId,
}: {
  data: Membership[]
  search: string
  filterStatus: 'All' | MembershipStatus
  openMenuId: number | null
  setOpenMenuId: (id: number | null) => void
}) {
  const [page, setPage] = useState(1)

  const filtered = data.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = search === '' || m.name.toLowerCase().includes(q)
    const matchStatus = filterStatus === 'All' || m.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
            {[
              { label: 'Image',        cls: 'hidden sm:table-cell' },
              { label: 'Name',         cls: '' },
              { label: 'Includes',     cls: 'hidden lg:table-cell' },
              { label: 'Price',        cls: 'hidden sm:table-cell' },
              { label: 'Billing',      cls: 'hidden md:table-cell' },
              { label: 'Members',      cls: 'hidden md:table-cell' },
              { label: 'Status',       cls: '' },
              { label: 'Actions',      cls: '' },
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
          {paginated.map((m, idx) => (
            <tr key={m.id}
              className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
              style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

              {/* Image */}
              <td className="hidden sm:table-cell px-5 py-3">
                <div className="rounded-xl overflow-hidden relative shrink-0"
                  style={{ width: 56, height: 44, background: '#F3F4F6', flexShrink: 0 }}>
                  {m.image ? (
                    <Image src={m.image} alt={m.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Award size={20} style={{ color: '#D1D5DB' }} />
                    </div>
                  )}
                </div>
              </td>

              {/* Name */}
              <td className="px-5 py-3">
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                {m.stripe && (
                  <p style={{ fontSize: 10, color: '#C4C9D4', marginTop: 1, fontFamily: 'monospace' }}>
                    {m.stripe}
                  </p>
                )}
              </td>

              {/* Classes */}
              <td className="hidden lg:table-cell px-5 py-3">
                <ClassChips classes={m.classes} max={2} />
              </td>

              {/* Price */}
              <td className="hidden sm:table-cell px-5 py-3">
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                  {m.price}
                </span>
              </td>

              {/* Billing */}
              <td className="hidden md:table-cell px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={11} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 12, color: '#6B7280' }}>{m.billing}</span>
                </div>
              </td>

              {/* Members */}
              <td className="hidden md:table-cell px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <Users size={11} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{m.members}</span>
                </div>
              </td>

              {/* Status */}
              <td className="px-5 py-3">
                <StatusBadge status={m.status} />
              </td>

              {/* Actions */}
              <td className="px-5 py-3 relative">
                <div className="flex items-center gap-1">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                    title="View members"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === m.id ? null : m.id) }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <MoreHorizontal size={15} />
                  </button>
                </div>
                {openMenuId === m.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                      style={{ background: '#fff', border: '1px solid #E5E7EB',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                      {[
                        { label: 'View members', icon: Eye },
                        { label: 'Edit plan',    icon: ToggleLeft },
                        { label: 'Duplicate',    icon: RefreshCw },
                      ].map(({ label, icon: Icon }) => (
                        <button key={label} onClick={() => setOpenMenuId(null)}
                          className="w-full text-left px-4 py-2.5 transition-colors cursor-pointer flex items-center gap-2.5"
                          style={{ fontSize: 13, color: '#374151', background: 'transparent', border: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <Icon size={13} style={{ color: '#9CA3AF' }} />{label}
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid #F3F4F6', margin: '2px 0' }} />
                      <button onClick={() => setOpenMenuId(null)}
                        className="w-full text-left px-4 py-2.5 transition-colors cursor-pointer flex items-center gap-2.5"
                        style={{ fontSize: 13, color: '#DC2626', background: 'transparent', border: 'none' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                        <X size={13} style={{ color: '#DC2626' }} />Deactivate
                      </button>
                    </div>
                  </>
                )}
              </td>
            </tr>
          ))}
          {paginated.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0' }}>
                <Award size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>No memberships found</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: 13, color: '#6B7280' }}>
            Showing{' '}
            <span style={{ fontWeight: 600, color: '#111827' }}>
              {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
            </span>
            {' of '}
            <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                borderRadius: 8, padding: '6px 12px' }}>Prev</button>
            {pages.map((p, i) =>
              p === '...'
                ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                : (
                  <button key={p} onClick={() => setPage(p as number)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                      background: p === safePage ? '#F3F4F6' : 'transparent',
                      color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
                )
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                borderRadius: 8, padding: '6px 12px' }}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
const TABS: { id: TabId; label: string; data: Membership[]; icon: React.ElementType }[] = [
  { id: 'subscriptions',  label: 'Subscriptions',    data: SUBSCRIPTIONS,    icon: RefreshCw },
  { id: 'single-passes',  label: 'Single Passes',    data: SINGLE_PASSES,    icon: Zap       },
  { id: 'trials',         label: 'Trial Memberships', data: TRIAL_MEMBERSHIPS, icon: Clock    },
]

export default function MembershipsClient() {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [activeTab, setActiveTab]     = useState<TabId>('subscriptions')
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<'All' | MembershipStatus>('All')
  const [openMenuId, setOpenMenuId]   = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  const currentTab  = TABS.find(t => t.id === activeTab)!
  const totalActive = [...SUBSCRIPTIONS, ...SINGLE_PASSES, ...TRIAL_MEMBERSHIPS].filter(m => m.status === 'Active').length
  const totalMembers = SUBSCRIPTIONS.reduce((s, m) => s + m.members, 0)

  // Approximate MRR
  const mrr = SUBSCRIPTIONS.filter(m => m.status === 'Active').reduce((sum, m) => {
    const price = parseFloat(m.price.replace('€', '')) || 0
    const factor = m.billing.includes('2 Week') ? 2.17 : m.billing.includes('3 Month') ? 1 / 3 : m.billing.includes('Month') ? 1 : 0
    return sum + price * factor * m.members
  }, 0)

  const STATS = [
    { label: 'Total Plans',      value: String(SUBSCRIPTIONS.length + SINGLE_PASSES.length + TRIAL_MEMBERSHIPS.length), sub: 'across all types',   icon: Award,     color: '#0071E3', bg: '#EFF6FF' },
    { label: 'Active Plans',     value: String(totalActive),   sub: 'currently live',       icon: Check,     color: '#16A34A', bg: '#F0FDF4' },
    { label: 'MRR',              value: '€' + Math.round(mrr).toLocaleString(), sub: 'monthly recurring',  icon: TrendingUp, color: '#6D28D9', bg: '#F5F3FF' },
    { label: 'Active Members',   value: String(totalMembers),  sub: 'with a subscription',  icon: Users,     color: '#C2410C', bg: '#FFF7ED' },
  ]

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
      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search memberships…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={13} style={{ color: '#9CA3AF' }} />
              04 Jun 2026
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
              Add Subscription
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Page title */}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                Memberships
              </h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                Manage subscription plans, single passes and trials
              </p>
            </div>

            {/* KPI Stats — Stripe style: bigger cards with icon + progress */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: stat.bg }}>
                      <stat.icon size={16} style={{ color: stat.color }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#111827',
                    letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs — NZZL underline style */}
            <div>
              <div className="flex items-center gap-1 border-b" style={{ borderColor: '#E5E7EB' }}>
                {TABS.map(tab => {
                  const isActive = activeTab === tab.id
                  const activeCount = tab.data.filter(m => m.status === 'Active').length
                  return (
                    <button key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setFilterStatus('All'); setSearch('') }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none', background: 'transparent',
                        color: isActive ? '#111827' : '#6B7280' }}>
                      <tab.icon size={14} style={{ color: isActive ? '#0071E3' : '#9CA3AF' }} />
                      {tab.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive ? '#EFF6FF' : '#F3F4F6',
                        color: isActive ? '#0071E3' : '#9CA3AF' }}>
                        {activeCount}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Filter chips — Stripe style */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                  textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</span>
                {(['All', 'Active', 'Inactive'] as const).map(f => {
                  const count = f === 'All' ? currentTab.data.length
                    : currentTab.data.filter(m => m.status === f).length
                  const isOn = filterStatus === f
                  return (
                    <button key={f} onClick={() => setFilterStatus(f)}
                      className="flex items-center gap-1.5 cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, borderRadius: 8,
                        padding: '4px 12px',
                        background: isOn
                          ? f === 'Active' ? '#F0FDF4' : f === 'Inactive' ? '#F3F4F6' : '#111827'
                          : '#fff',
                        color: isOn
                          ? f === 'Active' ? '#16A34A' : f === 'Inactive' ? '#6B7280' : '#fff'
                          : '#6B7280',
                        border: isOn
                          ? '1.5px solid ' + (f === 'Active' ? '#BBF7D0' : f === 'Inactive' ? '#E5E7EB' : '#111827')
                          : '1.5px solid #E5E7EB' }}>
                      {f === 'Active' && isOn && <Check size={10} strokeWidth={3} />}
                      {f} <span style={{ opacity: 0.7 }}>{count}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Table */}
            <MembershipTable
              data={currentTab.data}
              search={search}
              filterStatus={filterStatus}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
            />
          </div>
        </main>
      </div>

      <CreateMembershipDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); setSuccessOpen(true) }}
      />
      <SuccessModal open={successOpen} onClose={() => setSuccessOpen(false)} />
    </div>
  )
}
