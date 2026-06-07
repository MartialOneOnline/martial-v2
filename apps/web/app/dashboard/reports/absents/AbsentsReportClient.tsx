'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Search, ChevronLeft, AlertTriangle,
} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }

const ACTIVE_HREF = '/dashboard/reports/absents'

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
    { label: 'Transactions',  href: '/dashboard/payments/transactions' },
    { label: 'Subscriptions', href: '/dashboard/payments/subscriptions' },
  ]},
  { label: 'School',      icon: School,     children: [
    { label: 'Leads',      href: '/dashboard/school/leads' },
    { label: 'Store',      href: '/dashboard/school/store' },
    { label: 'Curriculum', href: '/dashboard/school/curriculum' },
    { label: 'Affiliates', href: '/dashboard/school/affiliates' },
    { label: 'Staff',      href: '/dashboard/school/staff' },
    { label: 'Waivers',    href: '/dashboard/school/waivers' },
    { label: 'Gradings',   href: '/dashboard/school/gradings' },
  ]},
  { label: 'Reports',     icon: BarChart2,  children: [
    { label: 'Bookings', href: '/dashboard/reports/bookings' },
    { label: 'Gradings', href: '/dashboard/reports/gradings' },
    { label: 'Payments', href: '/dashboard/reports/payments' },
    { label: 'Balance',  href: '/dashboard/reports/balance' },
    { label: 'Absents',  href: '/dashboard/reports/absents' },
    { label: 'Users',    href: '/dashboard/reports/users' },
  ]},
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]
const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

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
              style={{ fontSize: 13, color: child.href === ACTIVE_HREF ? '#0071E3' : '#6B7280', fontWeight: child.href === ACTIVE_HREF ? 600 : 400 }}
              onMouseEnter={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}}
              onMouseLeave={e => { if (child.href !== ACTIVE_HREF) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}}
            >{child.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

const ITEMS_PER_PAGE = 10

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const DOW_DATA = [
  { day: 'Mon', absences: 14 },
  { day: 'Tue', absences: 8 },
  { day: 'Wed', absences: 17 },
  { day: 'Thu', absences: 11 },
  { day: 'Fri', absences: 9 },
  { day: 'Sat', absences: 6 },
  { day: 'Sun', absences: 4 },
]

const TREND_DATA: Record<string, { week: string; absences: number }[]> = {
  '7d': [
    { week: 'Mon', absences: 3 }, { week: 'Tue', absences: 2 }, { week: 'Wed', absences: 4 },
    { week: 'Thu', absences: 1 }, { week: 'Fri', absences: 3 }, { week: 'Sat', absences: 1 }, { week: 'Sun', absences: 0 },
  ],
  '30d': [
    { week: 'W1', absences: 12 }, { week: 'W2', absences: 18 }, { week: 'W3', absences: 15 }, { week: 'W4', absences: 24 },
  ],
  '90d': [
    { week: 'Mar W1', absences: 20 }, { week: 'Mar W2', absences: 28 }, { week: 'Apr W1', absences: 22 },
    { week: 'Apr W2', absences: 35 }, { week: 'May W1', absences: 30 }, { week: 'May W2', absences: 42 },
  ],
  '12m': [
    { week: 'Jun', absences: 48 }, { week: 'Jul', absences: 52 }, { week: 'Aug', absences: 44 },
    { week: 'Sep', absences: 61 }, { week: 'Oct', absences: 58 }, { week: 'Nov', absences: 50 },
    { week: 'Dec', absences: 42 }, { week: 'Jan', absences: 67 }, { week: 'Feb', absences: 63 },
    { week: 'Mar', absences: 71 }, { week: 'Apr', absences: 75 }, { week: 'May', absences: 69 },
  ],
}

interface AbsenceRecord {
  id: number
  avatar: string
  name: string
  classMissed: string
  date: string
  streak: number
  lastSeen: string
}

const ABSENCES: AbsenceRecord[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?img=1',  name:'Carlos Mendez',    classMissed:'BJJ',       date:'Jun 5',  streak:1, lastSeen:'Jun 3' },
  { id:2,  avatar:'https://i.pravatar.cc/32?img=2',  name:'Ana García',       classMissed:'NOGI',      date:'Jun 4',  streak:3, lastSeen:'May 30' },
  { id:3,  avatar:'https://i.pravatar.cc/32?img=3',  name:'Miguel López',     classMissed:'BJJ',       date:'Jun 4',  streak:4, lastSeen:'May 27' },
  { id:4,  avatar:'https://i.pravatar.cc/32?img=4',  name:'Laura Martínez',   classMissed:'BJJ Kids',  date:'Jun 3',  streak:1, lastSeen:'Jun 2' },
  { id:5,  avatar:'https://i.pravatar.cc/32?img=5',  name:'David Sánchez',    classMissed:'Open Mat',  date:'Jun 3',  streak:2, lastSeen:'May 31' },
  { id:6,  avatar:'https://i.pravatar.cc/32?img=6',  name:'Sofía Fernández',  classMissed:'BJJ',       date:'Jun 2',  streak:5, lastSeen:'May 22' },
  { id:7,  avatar:'https://i.pravatar.cc/32?img=7',  name:'Javier Romero',    classMissed:'NOGI',      date:'Jun 2',  streak:1, lastSeen:'May 31' },
  { id:8,  avatar:'https://i.pravatar.cc/32?img=8',  name:'Elena Díaz',       classMissed:'Yoga',      date:'Jun 1',  streak:2, lastSeen:'May 28' },
  { id:9,  avatar:'https://i.pravatar.cc/32?img=9',  name:'Pedro Jiménez',    classMissed:'BJJ',       date:'Jun 1',  streak:1, lastSeen:'May 29' },
  { id:10, avatar:'https://i.pravatar.cc/32?img=10', name:'Isabel Moreno',    classMissed:'BJJ Kids',  date:'May 31', streak:3, lastSeen:'May 24' },
  { id:11, avatar:'https://i.pravatar.cc/32?img=11', name:'Antonio Ruiz',     classMissed:'Wrestling', date:'May 31', streak:1, lastSeen:'May 28' },
  { id:12, avatar:'https://i.pravatar.cc/32?img=12', name:'Carmen Álvarez',   classMissed:'BJJ',       date:'May 30', streak:6, lastSeen:'May 12' },
  { id:13, avatar:'https://i.pravatar.cc/32?img=13', name:'Francisco Torres', classMissed:'Open Mat',  date:'May 30', streak:2, lastSeen:'May 26' },
  { id:14, avatar:'https://i.pravatar.cc/32?img=14', name:'Beatriz González', classMissed:'NOGI',      date:'May 29', streak:1, lastSeen:'May 26' },
]

const CLASS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  'BJJ':       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'NOGI':      { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Wrestling': { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' },
  'BJJ Kids':  { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
  'Open Mat':  { bg: '#F9FAFB', color: '#374151', border: '#E5E7EB' },
  'Yoga':      { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
}

export default function AbsentsReportClient() {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'All' | 'At Risk' | 'Occasional'>('All')
  const [page, setPage] = useState(1)

  const atRisk = ABSENCES.filter(a => a.streak >= 3)
  const occasional = ABSENCES.filter(a => a.streak < 3)
  const filtered = filterTab === 'All' ? ABSENCES : filterTab === 'At Risk' ? atRisk : occasional
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const trendData = TREND_DATA[period]
  const totalAbsences = ABSENCES.length
  const uniqueMembers = new Set(ABSENCES.map(a => a.name)).size
  const avgStreak = Math.round(ABSENCES.reduce((s, a) => s + a.streak, 0) / ABSENCES.length * 10) / 10

  const STATS = [
    { label: 'Total Absences',  value: String(totalAbsences), sub: 'this period',     color: '#DC2626' },
    { label: 'Unique Members',  value: String(uniqueMembers), sub: 'affected',        color: '#D97706' },
    { label: 'Avg Streak',      value: String(avgStreak),     sub: 'consecutive',     color: '#6D28D9' },
    { label: 'At-Risk Members', value: String(atRisk.length), sub: '3+ in a row',     color: '#DC2626' },
  ]

  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <style>{`@media(min-width:768px){.dashboard-sidebar{transform:translateX(0)!important}}`}</style>
      {menuOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMenuOpen(false)} />}

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

      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search absences…"
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
              {(['7d', '30d', '90d', '12m'] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                    background: period === p ? '#fff' : 'transparent',
                    color: period === p ? '#111827' : '#6B7280',
                    boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.absentsTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Absence patterns, at-risk members and day-of-week trends</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Absences by Day of Week</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={DOW_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="absences" fill="#D97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Absence Trend</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Area type="monotone" dataKey="absences" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {([
                  { id: 'All' as const,        count: ABSENCES.length },
                  { id: 'At Risk' as const,     count: atRisk.length },
                  { id: 'Occasional' as const,  count: occasional.length },
                ]).map(({ id, count }) => {
                  const isOn = filterTab === id
                  return (
                    <button key={id} onClick={() => { setFilterTab(id); setPage(1) }} className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                        background: isOn ? (id === 'At Risk' ? '#FEF2F2' : '#111827') : '#fff',
                        color: isOn ? (id === 'At Risk' ? '#DC2626' : '#fff') : '#6B7280',
                        border: isOn ? '1.5px solid ' + (id === 'At Risk' ? '#FECACA' : '#111827') : '1.5px solid #E5E7EB' }}>
                      {id} <span style={{ opacity: 0.7, marginLeft: 2 }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Member', 'Class Missed', 'Date', 'Streak', 'Last Seen'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((a, idx) => {
                      const cc = CLASS_COLORS[a.classMissed] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
                      const isAtRisk = a.streak >= 3
                      return (
                        <tr key={a.id} className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <img src={a.avatar} alt={a.name} width={28} height={28} className="rounded-full" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{a.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                              background: cc.bg, color: cc.color, border: '1px solid ' + cc.border }}>
                              {a.classMissed}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#374151' }}>{a.date}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                              background: isAtRisk ? '#FEF2F2' : '#F3F4F6',
                              color: isAtRisk ? '#DC2626' : '#6B7280',
                              border: '1px solid ' + (isAtRisk ? '#FECACA' : '#E5E7EB') }}>
                              {isAtRisk && <AlertTriangle size={9} />}
                              {a.streak}x
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#9CA3AF' }}>{a.lastSeen}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>
                      Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                        <ChevronLeft size={14} />
                      </button>
                      {pages.map((p, i) =>
                        p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                          <button key={p} onClick={() => setPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
                        )
                      )}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
