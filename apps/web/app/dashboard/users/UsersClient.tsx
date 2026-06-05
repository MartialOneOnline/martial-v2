'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Search, Filter, Plus, MoreHorizontal,
  UserPlus, Send, QrCode, Pencil, Download,
  TrendingUp, Clock,
} from 'lucide-react'

// ── Design tokens (same as dashboard) ─────────────────────────────────────────
// bg: #F9FAFB | card: #fff | border: #E5E7EB | text-1: #111827 | text-2: #6B7280
// blue: #0071E3 | green: #16A34A | red: #DC2626 | amber: #D97706

// ── Mock data ──────────────────────────────────────────────────────────────────

const STUDENTS = [
  { id: 1,  avatar: 'https://i.pravatar.cc/40?u=fn',  name: 'Fernanda Neves',    email: 'fernanda@email.com',   belt: 'Blue',   stripes: 2, membership: 'Premium',    classes: 24,  lastSeen: '2h ago',  status: 'Active'   },
  { id: 2,  avatar: 'https://i.pravatar.cc/40?u=pm',  name: 'Patricia Mancera',  email: 'patricia@email.com',   belt: 'White',  stripes: 4, membership: 'Basic',      classes: 8,   lastSeen: '1d ago',  status: 'Active'   },
  { id: 3,  avatar: 'https://i.pravatar.cc/40?u=mt',  name: 'Matias Toloza',     email: 'matias@email.com',     belt: 'Purple', stripes: 1, membership: 'Premium',    classes: 61,  lastSeen: '3h ago',  status: 'Pending'  },
  { id: 4,  avatar: 'https://i.pravatar.cc/40?u=fw',  name: 'Florian Walter',    email: 'florian@email.com',    belt: 'Blue',   stripes: 3, membership: 'Premium',    classes: 38,  lastSeen: '5d ago',  status: 'Inactive' },
  { id: 5,  avatar: 'https://i.pravatar.cc/40?u=ad',  name: 'Alejandro DB',      email: 'alejandro@email.com',  belt: 'Brown',  stripes: 0, membership: 'Premium',    classes: 112, lastSeen: '1h ago',  status: 'Active'   },
  { id: 6,  avatar: 'https://i.pravatar.cc/40?u=rg',  name: 'Rafael Gonzalez',   email: 'rafael@email.com',     belt: 'White',  stripes: 2, membership: 'Basic',      classes: 5,   lastSeen: '2w ago',  status: 'Archived' },
  { id: 7,  avatar: 'https://i.pravatar.cc/40?u=lm',  name: 'Laura Martinez',    email: 'laura@email.com',      belt: 'Blue',   stripes: 1, membership: 'Premium',    classes: 29,  lastSeen: '4h ago',  status: 'Active'   },
  { id: 8,  avatar: 'https://i.pravatar.cc/40?u=js',  name: 'Jorge Sanchez',     email: 'jorge@email.com',      belt: 'Black',  stripes: 1, membership: 'Instructor', classes: 203, lastSeen: 'Now',     status: 'Active'   },
  { id: 9,  avatar: 'https://i.pravatar.cc/40?u=ak',  name: 'Anna Kowalski',     email: 'anna@email.com',       belt: 'White',  stripes: 0, membership: 'Trial',      classes: 2,   lastSeen: '3d ago',  status: 'Lead'     },
  { id: 10, avatar: 'https://i.pravatar.cc/40?u=dm',  name: 'Diego Morales',     email: 'diego@email.com',      belt: 'Purple', stripes: 3, membership: 'Premium',    classes: 77,  lastSeen: '6h ago',  status: 'Active'   },
  { id: 11, avatar: 'https://i.pravatar.cc/40?u=sc',  name: 'Sofia Chen',        email: 'sofia@email.com',      belt: 'Blue',   stripes: 0, membership: 'Basic',      classes: 14,  lastSeen: '2d ago',  status: 'Pending'  },
  { id: 12, avatar: 'https://i.pravatar.cc/40?u=mb',  name: 'Marco Bianchi',     email: 'marco@email.com',      belt: 'White',  stripes: 3, membership: 'Basic',      classes: 11,  lastSeen: '1w ago',  status: 'Inactive' },
  { id: 13, avatar: 'https://i.pravatar.cc/40?u=cl',  name: 'Carlos Lopez',      email: 'carlos@email.com',     belt: 'White',  stripes: 0, membership: 'Trial',      classes: 0,   lastSeen: 'Never',   status: 'Lead'     },
  { id: 14, avatar: 'https://i.pravatar.cc/40?u=hr',  name: 'Hannah Richter',    email: 'hannah@email.com',     belt: 'Blue',   stripes: 2, membership: 'Basic',      classes: 19,  lastSeen: '3w ago',  status: 'Archived' },
]

const STATS = [
  { label: 'Total Students',  value: '665',  trend: '+14%', trendUp: true,  sub: 'vs last month' },
  { label: 'Active Members',  value: '421',  trend: '+8%',  trendUp: true,  sub: 'this month'    },
  { label: 'New This Month',  value: '23',   trend: '+5',   trendUp: true,  sub: 'vs last month' },
  { label: 'Avg Attendance',  value: '78%',  trend: '+3%',  trendUp: true,  sub: 'this week'     },
]

const BELT_COLORS: Record<string, { bg: string; color: string; dot: string }> = {
  White:      { bg: '#F9FAFB', color: '#374151',   dot: '#9CA3AF' },
  Blue:       { bg: '#EFF6FF', color: '#2563EB',   dot: '#2563EB' },
  Purple:     { bg: '#F5F3FF', color: '#7C3AED',   dot: '#7C3AED' },
  Brown:      { bg: '#FEF3C7', color: '#92400E',   dot: '#92400E' },
  Black:      { bg: '#F3F4F6', color: '#111827',   dot: '#111827' },
}

const STATUS_MAP: Record<string, { bg: string; color: string }> = {
  Active:   { bg: '#F0FDF4', color: '#16A34A' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280' },
  Pending:  { bg: '#FFFBEB', color: '#D97706' },
  Lead:     { bg: '#EEF2FF', color: '#6366F1' },
  Archived: { bg: '#FEF2F2', color: '#9CA3AF' },
}

type NavItem = {
  label: string; icon: React.ElementType; href?: string; active?: boolean
  children?: { label: string; href: string }[]
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard',   icon: Flame,      href: '/dashboard'       },
  { label: 'Users',       icon: Users,      href: '/dashboard/users', active: true },
  { label: 'Classes',     icon: Calendar,   children: [
    { label: 'Classes', href: '/dashboard/classes' }, { label: 'Events', href: '#' },
    { label: 'Calendar', href: '#' }, { label: 'Timetable', href: '#' },
  ]},
  { label: 'Memberships', icon: Award,      href: '/dashboard/memberships' },
  { label: 'Payments',    icon: CreditCard, children: [
    { label: 'Transactions', href: '/dashboard/payments/transactions' }, { label: 'Subscriptions', href: '/dashboard/payments/subscriptions' },
  ]},
  { label: 'School',      icon: School,     children: [
    { label: 'Leads', href: '/dashboard/school/leads' }, { label: 'Store', href: '/dashboard/school/store' },
    { label: 'Curriculum', href: '/dashboard/school/curriculum' }, { label: 'Affiliates', href: '/dashboard/school/affiliates' },
    { label: 'Staff', href: '/dashboard/school/staff' }, { label: 'Waivers', href: '/dashboard/school/waivers' }, { label: 'Gradings', href: '/dashboard/school/gradings' },
  ]},
  { label: 'Reports',     icon: BarChart2,  children: [
    { label: 'Bookings', href: '#' }, { label: 'Gradings', href: '#' },
    { label: 'Payments', href: '#' }, { label: 'Balance', href: '#' },
    { label: 'Absents', href: '#' }, { label: 'Users', href: '#' },
  ]},
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]

const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

function NavGroup({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  if (!item.children) {
    return (
      <Link href={item.href ?? '#'}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
        style={{ color: '#374151', fontSize: 14, fontWeight: item.active ? 600 : 400,
          background: item.active ? '#EFF6FF' : 'transparent' }}
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
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
        style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <item.icon size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {open ? <ChevronDown size={13} style={{ color: '#9CA3AF' }} /> : <ChevronRight size={13} style={{ color: '#9CA3AF' }} />}
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children!.map(child => (
            <Link key={child.label} href={child.href}
              className="flex items-center px-3 py-2 rounded-lg no-underline transition-colors"
              style={{ fontSize: 13, color: '#6B7280' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}
            >{child.label}</Link>
          ))}
        </div>
      )}
    </div>
  )
}

function BeltBadge({ belt, stripes }: { belt: string; stripes: number }) {
  const c = BELT_COLORS[belt] ?? BELT_COLORS['White']!
  return (
    <span className="inline-flex items-center gap-1.5" style={{
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, display: 'inline-block', flexShrink: 0 }} />
      {belt}
      {stripes > 0 && (
        <span style={{ display: 'inline-flex', gap: 1 }}>
          {Array.from({ length: stripes }).map((_, i) => (
            <span key={i} style={{ width: 3, height: 8, borderRadius: 1, background: c.dot, opacity: 0.6 }} />
          ))}
        </span>
      )}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { bg, color } = STATUS_MAP[status] ?? { bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
      {status}
    </span>
  )
}

const ITEMS_PER_PAGE = 8

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type Filter = 'All' | 'Active' | 'Inactive' | 'Pending' | 'Lead' | 'Archived'

export default function UsersClient() {
  const [menuOpen, setMenuOpen]         = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)

  const filtered = STUDENTS.filter(s => {
    const matchFilter = activeFilter === 'All' || s.status === activeFilter
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.email.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  const totalPages   = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage     = Math.min(currentPage, totalPages)
  const paginated    = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages        = getPaginationPages(safePage, totalPages)

  const handleFilter = (f: Filter) => { setActiveFilter(f); setCurrentPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setCurrentPage(1) }

  return (
    <div className="min-h-screen flex"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      <style>{`@media (min-width: 768px) { .dashboard-sidebar { transform: translateX(0) !important; } }`}</style>

      {/* Mobile overlay */}
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
      </aside>

      {/* Main */}
      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            {/* Search */}
            <div className="flex flex-1 max-w-sm items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search students..." value={search}
                onChange={e => handleSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>

            <div className="flex-1" />

            {/* Date */}
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

            {/* Flag */}
            <button className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer text-base"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>🇬🇧</button>

            {/* Add student */}
            <button className="hidden sm:flex items-center gap-2 cursor-pointer"
              style={{ fontSize: 13, fontWeight: 600, color: '#fff', background: '#0071E3',
                border: 'none', borderRadius: 8, padding: '7px 14px' }}>
              <Plus size={14} />
              Add student
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Page header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                  Students
                </h1>
                <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                  {filtered.length} of {STUDENTS.length} members
                </p>
              </div>
              <button className="hidden sm:flex items-center gap-2 cursor-pointer"
                style={{ fontSize: 13, fontWeight: 500, color: '#374151', background: '#fff',
                  border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 14px' }}>
                <Download size={13} style={{ color: '#6B7280' }} />
                Export
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '14px 16px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.label}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2,
                      fontSize: 11, fontWeight: 600,
                      background: stat.trendUp ? '#F0FDF4' : '#FEF2F2',
                      color: stat.trendUp ? '#16A34A' : '#DC2626',
                      padding: '2px 7px', borderRadius: 999, flexShrink: 0 }}>
                      <TrendingUp size={9} />
                      {stat.trend}
                    </span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
              {(['All', 'Active', 'Pending', 'Lead', 'Inactive', 'Archived'] as Filter[]).map(f => (
                <button key={f} onClick={() => handleFilter(f)}
                  className="cursor-pointer transition-all"
                  style={{
                    fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 8, padding: '6px 14px',
                    color: activeFilter === f ? '#111827' : '#6B7280',
                    background: activeFilter === f ? '#fff' : 'transparent',
                    boxShadow: activeFilter === f ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}>
                  {f}
                  <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600,
                    color: activeFilter === f ? '#0071E3' : '#9CA3AF' }}>
                    {f === 'All' ? STUDENTS.length
                      : STUDENTS.filter(s => s.status === f).length}
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
                      { label: 'Member',     cls: '' },
                      { label: 'Belt',       cls: 'hidden md:table-cell' },
                      { label: 'Membership', cls: 'hidden lg:table-cell' },
                      { label: 'Classes',    cls: 'hidden lg:table-cell' },
                      { label: 'Last seen',  cls: 'hidden md:table-cell' },
                      { label: 'Status',     cls: '' },
                      { label: '',           cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-6 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((student, idx) => (
                    <tr key={student.id}
                      className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                      style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                      {/* Member */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[#E5E7EB]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={student.avatar} alt={student.name} width={36} height={36}
                              style={{ width: 36, height: 36, objectFit: 'cover' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{student.name}</p>
                            <p style={{ fontSize: 12, color: '#9CA3AF' }}>{student.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Belt */}
                      <td className="hidden md:table-cell px-6 py-4">
                        <BeltBadge belt={student.belt} stripes={student.stripes} />
                      </td>

                      {/* Membership */}
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span style={{ fontSize: 13, color: '#374151' }}>{student.membership}</span>
                      </td>

                      {/* Classes */}
                      <td className="hidden lg:table-cell px-6 py-4">
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{student.classes}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 3 }}>classes</span>
                      </td>

                      {/* Last seen */}
                      <td className="hidden md:table-cell px-6 py-4">
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{student.lastSeen}</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <StatusBadge status={student.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                          style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}>
                          <MoreHorizontal size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {paginated.length === 0 && (
                <div className="py-16 text-center">
                  <Users size={32} style={{ color: '#E5E7EB', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#9CA3AF' }}>No students found</p>
                </div>
              )}

              {/* Pagination footer */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                  {/* Info */}
                  <p style={{ fontSize: 13, color: '#6B7280' }}>
                    Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span> students
                  </p>

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    {/* Previous */}
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{
                        fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB',
                        color: safePage === 1 ? '#D1D5DB' : '#374151',
                        background: '#fff', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      }}>
                      ← Previous
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1 mx-1">
                      {pages.map((p, i) =>
                        p === '...'
                          ? <span key={`ellipsis-${i}`} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                          : (
                            <button key={p} onClick={() => setCurrentPage(p as number)}
                              className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                              style={{
                                fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                                background: p === safePage ? '#F3F4F6' : 'transparent',
                                color: p === safePage ? '#111827' : '#6B7280',
                              }}>
                              {p}
                            </button>
                          )
                      )}
                    </div>

                    {/* Next */}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                      style={{
                        fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB',
                        color: safePage === totalPages ? '#D1D5DB' : '#374151',
                        background: '#fff', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      }}>
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
