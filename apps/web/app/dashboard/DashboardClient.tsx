'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  MessageSquare, Clock, TrendingUp, TrendingDown,
  ChevronRight, ChevronLeft, ChevronDown, MoreHorizontal,
  GraduationCap, Filter, Download, ShoppingBag,
  BookOpen, UserCheck, FileText, ShieldCheck,
  Flame, School, Receipt, Star, Sparkles, Send, Lightbulb,
  Menu, X, UserPlus, QrCode, Pencil,
} from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
// bg:       #F9FAFB
// card:     #FFFFFF
// border:   #E5E7EB
// text-1:   #111827  (near-black)
// text-2:   #6B7280  (secondary gray)
// blue:     #0071E3  (Apple blue — primary / active icon)
// green:    #16A34A
// red:      #DC2626
// amber:    #D97706

interface Props {
  userName: string
  userEmail: string
  userRole: string
}

// ── Simulated data ─────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Students',     value: '665',    trend: '+14%', trendUp: true,  sub: 'vs last month'   },
  { label: 'Active Classes', value: '67',   trend: '+3',   trendUp: true,  sub: 'this week'       },
  { label: 'Revenue',      value: '€3,586', trend: '+8%',  trendUp: true,  sub: 'vs last month'   },
  { label: 'Bookings',     value: '29,466', trend: '+2%',  trendUp: true,  sub: 'all time'        },
]

const TRANSACTIONS = [
  { id: 1, avatar: 'https://i.pravatar.cc/32?u=fn', name: 'Fernanda Neves',   method: 'Free',   price: '€ 0.00',  date: '01 Jun 2026', status: 'Paid'    },
  { id: 2, avatar: 'https://i.pravatar.cc/32?u=pm', name: 'Patricia Mancera', method: 'Free',   price: '€ 0.00',  date: '28 May 2026', status: 'Paid'    },
  { id: 3, avatar: 'https://i.pravatar.cc/32?u=mt', name: 'Matias Toloza',    method: 'Free',   price: '€ 0.00',  date: '27 May 2026', status: 'Pending' },
  { id: 4, avatar: 'https://i.pravatar.cc/32?u=fw', name: 'Florian Walter',   method: 'Stripe', price: '€ 65.00', date: '27 May 2026', status: 'Paid'    },
  { id: 5, avatar: 'https://i.pravatar.cc/32?u=ad', name: 'Alejandro DB',     method: 'Cash',   price: '€ 65.00', date: '26 May 2026', status: 'Failed'  },
  { id: 6, avatar: 'https://i.pravatar.cc/32?u=rg', name: 'Rafael Gonzalez',  method: 'Stripe', price: '€ 65.00', date: '25 May 2026', status: 'Paid'    },
]

const CHART_DATA = [
  { month: 'JAN', value: 28 },
  { month: 'FEB', value: 42 },
  { month: 'MAR', value: 35 },
  { month: 'APR', value: 58 },
  { month: 'MAY', value: 72 },
  { month: 'JUN', value: 65 },
]

const TODAY_CLASSES = [
  { id: 1,  name: 'BJJ All Levels',    time: '07:00–08:30', enrolled: 8,  cap: 20, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 2,  name: 'NOGI',             time: '08:30–09:30', enrolled: 15, cap: 15, status: 'Full', image: '/mathouse.jpg'                },
  { id: 3,  name: 'Kids BJJ',         time: '09:30–10:30', enrolled: 10, cap: 20, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 4,  name: 'BJJ Beginners',    time: '10:00–11:30', enrolled: 5,  cap: 25, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 5,  name: 'Open Mat',         time: '11:30–13:00', enrolled: 22, cap: 25, status: 'Open', image: '/mathouse.jpg'                },
  { id: 6,  name: 'BJJ Advanced',     time: '12:00–13:30', enrolled: 18, cap: 20, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 7,  name: 'Wrestling',        time: '17:00–18:00', enrolled: 12, cap: 15, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 8,  name: 'NOGI Advanced',    time: '18:00–19:30', enrolled: 14, cap: 15, status: 'Open', image: '/mathouse.jpg'                },
  { id: 9,  name: 'BJJ Competition',  time: '19:00–20:30', enrolled: 15, cap: 15, status: 'Full', image: '/five-elements-jiu-jitsu.jpg' },
  { id: 10, name: 'BJJ Beginners',    time: '19:30–20:30', enrolled: 3,  cap: 25, status: 'Open', image: '/roger-gracie-malaga.jpg'     },
  { id: 11, name: 'Open Mat',         time: '20:00–21:30', enrolled: 20, cap: 25, status: 'Open', image: '/mathouse.jpg'                },
  { id: 12, name: 'BJJ All Levels',   time: '20:30–21:30', enrolled: 1,  cap: 30, status: 'Open', image: '/five-elements-jiu-jitsu.jpg' },
]

const DAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN']
// Generate 14 days starting from today's Monday
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2026, 5, 1 + i) // June 2026
  return { long: DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]!, num: d.getDate() }
})

const ACADEMY_ACTIONS = [
  { icon: UserPlus, label: 'Invite'   },
  { icon: Send,     label: 'Send'     },
  { icon: QrCode,   label: 'QR code'  },
  { icon: Pencil,   label: 'Edit'     },
]

type NavItem = {
  label: string
  icon: React.ElementType
  href?: string
  active?: boolean
  children?: { label: string; href: string }[]
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard', icon: Flame,          href: '/dashboard', active: true },
  { label: 'Users',     icon: Users,          href: '#' },
  { label: 'Classes',   icon: Calendar,       children: [
    { label: 'Classes',   href: '#' },
    { label: 'Events',    href: '#' },
    { label: 'Calendar',  href: '#' },
    { label: 'Timetable', href: '#' },
  ]},
  { label: 'Memberships', icon: Award,        href: '#' },
  { label: 'Payments',    icon: CreditCard,   children: [
    { label: 'Transactions',  href: '#' },
    { label: 'Subscriptions', href: '#' },
  ]},
  { label: 'School',    icon: School,         children: [
    { label: 'Leads',      href: '#' },
    { label: 'Store',      href: '#' },
    { label: 'Curriculum', href: '#' },
    { label: 'Affiliates', href: '#' },
    { label: 'Staff',      href: '#' },
    { label: 'Waivers',    href: '#' },
    { label: 'Gradings',   href: '#' },
  ]},
  { label: 'Reports',   icon: BarChart2,      children: [
    { label: 'Bookings',  href: '#' },
    { label: 'Gradings',  href: '#' },
    { label: 'Payments',  href: '#' },
    { label: 'Balance',   href: '#' },
    { label: 'Absents',   href: '#' },
    { label: 'Users',     href: '#' },
  ]},
  { label: 'Settings',  icon: Settings,       children: [
    { label: 'Payments',       href: '#' },
    { label: 'Staff',          href: '#' },
    { label: 'Profile',        href: '#' },
    { label: 'School',         href: '#' },
    { label: 'Delete Account', href: '#' },
    { label: 'Password',       href: '#' },
    { label: 'Grading',        href: '#' },
  ]},
]

const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

type Period = 'All time' | '12 months' | '30 days' | '7 days'

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    Paid:    { bg: '#F0FDF4', color: '#16A34A' },
    Pending: { bg: '#FFFBEB', color: '#D97706' },
    Failed:  { bg: '#FEF2F2', color: '#DC2626' },
    Open:    { bg: '#EFF6FF', color: '#2563EB' },
    Full:    { bg: '#FEF2F2', color: '#DC2626' },
  }
  const { bg, color } = map[status] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  )
}

// ── SVG Area Chart ─────────────────────────────────────────────────────────────

function AreaChart() {
  const W = 560; const H = 160; const PAD = { t: 16, r: 16, b: 32, l: 40 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const max = Math.max(...CHART_DATA.map(d => d.value))
  const points = CHART_DATA.map((d, i) => ({
    x: PAD.l + (i / (CHART_DATA.length - 1)) * innerW,
    y: PAD.t + (1 - d.value / max) * innerH,
  }))

  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]!
    const cpX = (prev.x + p.x) / 2
    return `${acc} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`
  }, '')

  const lastPt  = points[points.length - 1]!
  const firstPt = points[0]!
  const areaPath = `${linePath} L ${lastPt.x} ${H - PAD.b} L ${firstPt.x} ${H - PAD.b} Z`
  const gridLines = [0.25, 0.5, 0.75].map(t => PAD.t + t * innerH)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0071E3" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0071E3" stopOpacity="0"   />
        </linearGradient>
      </defs>
      {gridLines.map((y, i) => (
        <line key={i} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
          stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#0071E3" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke="#0071E3" strokeWidth="2" />
      ))}
      {CHART_DATA.map((d, i) => (
        <text key={i} x={points[i]!.x} y={H - 8} textAnchor="middle"
          fontSize="10" fontWeight="500" fill="#6B7280"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}
        >
          {d.month}
        </text>
      ))}
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const hasChildren = !!item.children

  if (!hasChildren) {
    return (
      <Link
        href={item.href ?? '#'}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
        style={{ color: '#374151', fontSize: 14, fontWeight: item.active ? 600 : 400 }}
        onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <item.icon size={16} style={{ color: item.active ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
        {item.label}
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
        style={{ color: '#374151', fontSize: 14, fontWeight: 400, background: 'transparent', border: 'none' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <item.icon size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {open
          ? <ChevronDown size={13} style={{ color: '#9CA3AF' }} />
          : <ChevronRight size={13} style={{ color: '#9CA3AF' }} />
        }
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children!.map(child => (
            <Link
              key={child.label}
              href={child.href}
              className="flex items-center px-3 py-2 rounded-lg no-underline transition-colors"
              style={{ fontSize: 13, color: '#6B7280' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardClient({ userName, userEmail }: Props) {
  const [period, setPeriod]         = useState<Period>('12 months')
  const [activeDay, setActiveDay]   = useState(() => {
    const todayNum = new Date().getDate()
    const idx = DAYS.findIndex(d => d.num === todayNum)
    return idx >= 0 ? idx : 0
  })
  const [menuOpen, setMenuOpen]     = useState(false)
  const [aiInput, setAiInput]       = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: '👋 I can help you manage your academy. Ask me anything.' },
  ])

  const firstName = userName.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
    >
      <style>{`@media (min-width: 768px) { .dashboard-sidebar { transform: translateX(0) !important; } }`}</style>
      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: always visible / mobile: drawer) ──────────────── */}
      <aside
        className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{
          width: 232,
          background: '#fff',
          borderRight: '1px solid #E5E7EB',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Logo + close (mobile) */}
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
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            onClick={() => setMenuOpen(false)}
          >
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_MAIN.map(item => (
            <NavGroup key={item.label} item={item} />
          ))}
        </nav>

        {/* Bottom nav + Sign out */}
        <div style={{ borderTop: '1px solid #E5E7EB' }} className="px-3 py-3 space-y-0.5">
          {NAV_BOTTOM.map(item => (
            <Link
              key={item.label}
              href={item.href ?? '#'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <item.icon size={16} style={{ color: '#9CA3AF' }} />
              {item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <LogOut size={16} style={{ color: '#9CA3AF' }} />
              Sign out
            </button>
          </form>
        </div>

        {/* User */}
        <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #E5E7EB' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: '#111827', fontSize: 12, fontWeight: 700 }}
          >
            {firstName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </p>
            <p style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Academy Owner
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-w-0 md:ml-[232px]">
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* ── Top bar ───────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-2 px-4 md:px-8 py-3 sticky top-0 z-20"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}
        >
          {/* Burger — mobile/tablet only */}
          <button
            id="burger-btn"
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
            onClick={() => setMenuOpen(o => !o)}
          >
            <Menu size={16} style={{ color: '#374151' }} />
          </button>

          {/* Search — hidden on mobile */}
          <div className="hidden sm:flex flex-1 max-w-xs items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Filter size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input type="text" placeholder="Search..."
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
          </div>

          {/* Period pills — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            {(['All time', '12 months', '30 days', '7 days'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                color: period === p ? '#111827' : '#6B7280',
                background: period === p ? '#F3F4F6' : 'transparent',
                border: 'none', borderRadius: 8, padding: '5px 10px',
              }}>{p}</button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Date — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
            <Clock size={13} style={{ color: '#9CA3AF' }} />
            {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>

          {/* Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <Bell size={15} style={{ color: '#374151' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
          </button>

          {/* Language */}
          <button className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-base"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            🇬🇧
          </button>

          {/* Export */}
          <button className="hidden sm:flex" style={{
            alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 500, color: '#374151',
            background: '#fff', border: '1px solid #E5E7EB',
            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
          }}>
            <Download size={13} style={{ color: '#6B7280' }} />
            Export
          </button>
        </div>

        <div className="px-4 md:px-8 py-5 md:py-6 flex flex-col gap-5 md:gap-6 min-h-screen">

          {/* 1. Academy Info — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="relative overflow-visible" style={{ height: 90 }}>
              <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
                <Image src="/roger-gracie-malaga.jpg" alt="Roger Gracie Malaga" fill className="object-cover" />
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white"
                style={{ width: 64, height: 64, bottom: -32, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', zIndex: 10 }}>
                <Image src="/logo-roger-gracie.png" alt="Roger Gracie" width={64} height={64} className="object-contain" />
              </div>
            </div>
            <div className="pt-10 pb-4 px-4 text-center">
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Roger Gracie Malaga</p>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>Jiu Jitsu Academy</p>
            </div>
            <div className="px-4 pb-4 flex gap-2" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
              {ACADEMY_ACTIONS.map(({ icon: Icon, label }) => (
                <button key={label} title={label} className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <Icon size={15} style={{ color: '#0071E3' }} />
                </button>
              ))}
            </div>
          </div>

          {/* 2. AI Suggested Actions — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
                  <Sparkles size={13} style={{ color: '#fff' }} />
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>AI Assistant</p>
                  <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2 }}>Powered by Martial AI</p>
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 999 }}>
                Online
              </span>
            </div>
            <div className="px-4 py-3">
              <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Suggested Actions
              </p>
              <div className="space-y-3">
                {[
                  { insight: '12 students haven\'t attended in 3+ weeks.', action: 'Send re-engagement message' },
                  { insight: 'BJJ Advanced is 93% full every session.',    action: 'Add an extra class this week' },
                  { insight: '4 leads haven\'t been contacted in 7 days.', action: 'Follow up before they go cold' },
                ].map((r, i, arr) => (
                  <div key={i} style={{ paddingBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{r.insight}</p>
                    <button style={{
                      marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, fontWeight: 600, color: '#6366F1',
                      background: '#EEF2FF', border: 'none', borderRadius: 8,
                      padding: '5px 10px', cursor: 'pointer',
                    }}>
                      {r.action} →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl"
                style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '14px 14px 12px' }}
              >
                {/* Label + trend */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span style={{ fontSize: 11, color: '#9CA3AF', lineHeight: 1.3 }}>{stat.label}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0,
                    fontSize: 11, fontWeight: 600,
                    background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                    color: stat.trendUp ? '#16A34A' : '#DC2626',
                    padding: '2px 7px', borderRadius: 999,
                  }}>
                    {stat.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {stat.trend}
                  </span>
                </div>

                {/* Value */}
                <p className="text-3xl lg:text-4xl" style={{ fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                  {stat.value}
                </p>

                {/* Sub-text */}
                <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* 4. Upcoming Classes — mobile only */}
          <div className="lg:hidden rounded-2xl" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>Upcoming Classes</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <Calendar size={13} style={{ color: '#9CA3AF' }} />
              </div>
            </div>
            <div className="flex gap-1 px-3 py-2" style={{ borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {DAYS.map((d, i) => (
                <button key={i} onClick={() => setActiveDay(i)} className="flex flex-col items-center shrink-0 py-1.5 cursor-pointer" style={{ background: 'none', border: 'none', minWidth: 36 }}>
                  <span style={{ fontSize: 9, fontWeight: 500, color: activeDay === i ? '#0071E3' : '#9CA3AF', letterSpacing: '0.04em' }}>{d.long}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: activeDay === i ? '#0071E3' : '#374151', borderBottom: activeDay === i ? '2px solid #0071E3' : '2px solid transparent', paddingBottom: 1 }}>{d.num}</span>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 space-y-3">
              {TODAY_CLASSES.slice(0, 5).map((cls, i) => {
                const pct = cls.enrolled / cls.cap
                const capacityColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
                return (
                  <div key={cls.id} className="flex items-center gap-3" style={{ paddingBottom: i < 4 ? 12 : 0, borderBottom: i < 4 ? '1px solid #F9FAFB' : 'none' }}>
                    <div className="shrink-0 rounded-xl overflow-hidden relative" style={{ width: 44, height: 44 }}>
                      <Image src={cls.image} alt={cls.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cls.name}</p>
                        <span style={{ fontSize: 12, fontWeight: 700, color: capacityColor, whiteSpace: 'nowrap' }}>{cls.enrolled}/{cls.cap}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p style={{ fontSize: 11, color: '#9CA3AF' }}>{cls.time}</p>
                        <StatusBadge status={cls.status} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 5. Quick Stats — mobile only */}
          <div className="lg:hidden rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
            <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 12, color: '#9CA3AF' }}>Quick Stats</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Today</p>
            </div>
            <div className="grid grid-cols-3" style={{ gap: 1, background: '#F3F4F6' }}>
              {[
                { label: 'Avg Attendance', value: '78%', color: '#0071E3' },
                { label: 'Open Leads',     value: '4',   color: '#D97706' },
                { label: 'Gradings',       value: '167', color: '#16A34A' },
                { label: 'Notifications',  value: '35',  color: '#DC2626' },
                { label: 'Active Members', value: '421', color: '#6366F1' },
                { label: 'Classes Today',  value: '12',  color: '#0071E3' },
              ].map(s => (
                <div key={s.label} className="flex flex-col gap-1 px-3 py-3" style={{ background: '#fff' }}>
                  <p style={{ fontSize: 10, color: '#9CA3AF' }}>{s.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Bookings chart — full width */}
          <div
            className="rounded-2xl"
            style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '22px 26px' }}
          >
            <div className="flex items-center justify-between mb-1">
              <p style={{ fontSize: 14, color: '#6B7280' }}>Bookings Overview</p>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', background: '#EFF6FF', padding: '3px 10px', borderRadius: 999 }}>
                +18% vs last period
              </span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: 20 }}>
              Jan – Jun 2026
            </p>
            <AreaChart />
          </div>

          {/* 7. Transactions */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col flex-1"
            style={{ background: '#fff', border: '1px solid #E5E7EB' }}
          >
            <div className="flex items-center justify-between px-7 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <div>
                <p style={{ fontSize: 14, color: '#6B7280' }}>Latest Transactions</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                  {TRANSACTIONS.length} recent
                </p>
              </div>
              <Link href="#" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }} className="no-underline flex items-center gap-1">
                View all <ChevronRight size={12} />
              </Link>
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {[
                    { label: 'Member',  cls: '' },
                    { label: 'Method',  cls: 'hidden sm:table-cell' },
                    { label: 'Amount',  cls: '' },
                    { label: 'Date',    cls: 'hidden md:table-cell' },
                    { label: 'Status',  cls: 'hidden sm:table-cell' },
                    { label: '',        cls: 'hidden sm:table-cell' },
                  ].map(h => (
                    <th key={h.label} className={`px-4 md:px-7 py-3 text-left ${h.cls}`}
                      style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: idx < TRANSACTIONS.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                    className="hover:bg-[#FAFAFA] transition-colors"
                  >
                    <td className="px-4 md:px-7 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#E5E7EB]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={tx.avatar} alt={tx.name} width={32} height={32} style={{ width: 32, height: 32, objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: 14, color: '#111827', whiteSpace: 'nowrap' }}>{tx.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <span style={{ fontSize: 14, color: '#6B7280' }}>{tx.method}</span>
                    </td>
                    <td className="px-4 md:px-7 py-4" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tx.price}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 md:px-7 py-4" style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{tx.date}</span>
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="hidden sm:table-cell px-4 md:px-7 py-4">
                      <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


        </div>
      </main>

      {/* ── Right Panel ─────────────────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex shrink-0 flex-col gap-5 p-5 overflow-y-auto"
        style={{
          width: 280,
          borderLeft: '1px solid #E5E7EB',
          background: '#F9FAFB',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        {/* Academy card */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          {/* Banner — school photo */}
          <div className="relative overflow-visible" style={{ height: 100 }}>
            <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
              <Image src="/roger-gracie-malaga.jpg" alt="Roger Gracie Malaga" fill className="object-cover" />
            </div>
            {/* Logo overlapping bottom edge */}
            <div
              className="absolute left-1/2 -translate-x-1/2 rounded-full overflow-hidden border-[3px] border-white"
              style={{ width: 72, height: 72, bottom: -36, background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.2)', zIndex: 10 }}
            >
              <Image src="/logo-roger-gracie.png" alt="Roger Gracie" width={72} height={72} className="object-contain" />
            </div>
          </div>
          <div className="pt-12 pb-4 px-4 text-center">
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Roger Gracie Malaga</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Jiu Jitsu Academy</p>
          </div>
          {/* Action buttons */}
          <div className="px-4 pb-4 flex gap-2" style={{ borderTop: '1px solid #F3F4F6', paddingTop: 12 }}>
            {ACADEMY_ACTIONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="flex-1 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EFF6FF'; (e.currentTarget as HTMLElement).style.borderColor = '#0071E3' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB' }}
              >
                <Icon size={14} style={{ color: '#0071E3' }} />
              </button>
            ))}
          </div>
        </div>

        {/* AI Assistant */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', background: '#fff' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
                <Sparkles size={13} style={{ color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>AI Assistant</p>
                <p style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2 }}>Powered by Martial AI</p>
              </div>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#F0FDF4', padding: '2px 8px', borderRadius: 999 }}>
              Online
            </span>
          </div>

          {/* Suggested Actions */}
          <div className="px-4 py-3" style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'none' }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Suggested Actions
            </p>
            <div className="space-y-3">
              {[
                { insight: '12 students haven\'t attended in 3+ weeks.', action: 'Send re-engagement message' },
                { insight: 'BJJ Advanced is 93% full every session.',    action: 'Add an extra class this week' },
                { insight: '4 leads haven\'t been contacted in 7 days.', action: 'Follow up before they go cold' },
                { insight: 'Attendance up 14% — students are engaged.',  action: 'Good time to schedule a grading' },
                { insight: 'Revenue down 5% vs last month.',             action: 'Review membership pricing' },
                { insight: '3 students birthday this week.',             action: 'Send a birthday message' },
              ].map((r, i, arr) => (
                <div key={i} style={{ paddingBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', lineHeight: 1.4 }}>{r.insight}</p>
                  <button style={{
                    marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 600, color: '#6366F1',
                    background: '#EEF2FF', border: 'none', borderRadius: 7,
                    padding: '4px 9px', cursor: 'pointer',
                  }}>
                    {r.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Upcoming Classes */}
        <div className="rounded-2xl" style={{ border: '1px solid #E5E7EB' }}>

          {/* Header */}
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Upcoming Classes</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <Calendar size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            </div>
          </div>

          {/* Day carousel — horizontal scroll */}
          <div
            className="flex gap-1 px-3 py-2"
            style={{ borderBottom: '1px solid #F3F4F6', overflowX: 'auto', scrollbarWidth: 'none' }}
          >
            {DAYS.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className="flex flex-col items-center justify-center py-1.5 cursor-pointer shrink-0 transition-all"
                style={{ background: 'none', border: 'none', minWidth: 32 }}
              >
                <span style={{ fontSize: 9, fontWeight: 500, color: activeDay === i ? '#0071E3' : '#9CA3AF', letterSpacing: '0.04em' }}>
                  {d.long}
                </span>
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: activeDay === i ? '#0071E3' : '#374151',
                  borderBottom: activeDay === i ? '2px solid #0071E3' : '2px solid transparent',
                  paddingBottom: 1,
                }}>
                  {d.num}
                </span>
              </button>
            ))}
          </div>

          {/* Class list — vertical scroll */}
          <div className="px-4 py-3 space-y-3" style={{ maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {TODAY_CLASSES.map((cls, i) => {
              const pct = cls.enrolled / cls.cap
              const capacityColor = pct >= 1 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#16A34A'
              return (
                <div key={cls.id} className="flex items-center gap-3"
                  style={{ paddingBottom: i < TODAY_CLASSES.length - 1 ? 12 : 0, borderBottom: i < TODAY_CLASSES.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                >
                  <div className="shrink-0 rounded-xl overflow-hidden relative" style={{ width: 44, height: 44 }}>
                    <Image src={cls.image} alt={cls.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#111827', lineHeight: 1.3, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cls.name}
                      </p>
                      <span style={{ fontSize: 11, fontWeight: 700, color: capacityColor, whiteSpace: 'nowrap' }}>
                        {cls.enrolled}/{cls.cap}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p style={{ fontSize: 10, color: '#9CA3AF' }}>{cls.time}</p>
                      <StatusBadge status={cls.status} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 12, color: '#9CA3AF' }}>Quick Stats</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>Today</p>
          </div>
          <div className="grid grid-cols-2" style={{ gap: 1, background: '#F3F4F6' }}>
            {[
              { label: 'Avg Attendance', value: '78%', color: '#0071E3' },
              { label: 'Open Leads',     value: '4',   color: '#D97706' },
              { label: 'Gradings',       value: '167', color: '#16A34A' },
              { label: 'Notifications',  value: '35',  color: '#DC2626' },
              { label: 'Active Members', value: '421', color: '#6366F1' },
              { label: 'Classes Today',  value: '12',  color: '#0071E3' },
            ].map(s => (
              <div key={s.label} className="flex flex-col gap-1 px-4 py-3" style={{ background: '#fff' }}>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

      </aside>

      </div>
    </div>
  )
}
