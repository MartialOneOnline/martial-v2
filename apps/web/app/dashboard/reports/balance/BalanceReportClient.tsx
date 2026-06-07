'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Search, ChevronLeft,
} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }

const ACTIVE_HREF = '/dashboard/reports/balance'

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

const INCOME_EXPENSE_DATA: Record<string, { date: string; income: number; expenses: number }[]> = {
  '7d': [
    { date: 'Mon', income: 340,  expenses: 120 }, { date: 'Tue', income: 520, expenses: 200 },
    { date: 'Wed', income: 480,  expenses: 180 }, { date: 'Thu', income: 610, expenses: 240 },
    { date: 'Fri', income: 570,  expenses: 190 }, { date: 'Sat', income: 720, expenses: 260 },
    { date: 'Sun', income: 290,  expenses: 100 },
  ],
  '30d': [
    { date: 'May 6',  income: 1200, expenses: 450 }, { date: 'May 12', income: 1540, expenses: 580 },
    { date: 'May 18', income: 1380, expenses: 510 }, { date: 'May 24', income: 1720, expenses: 640 },
    { date: 'May 30', income: 1650, expenses: 600 }, { date: 'Jun 2',  income: 1900, expenses: 680 },
  ],
  '90d': [
    { date: 'Mar',   income: 5800, expenses: 2100 }, { date: 'Apr',   income: 7100, expenses: 2600 },
    { date: 'May',   income: 7600, expenses: 2800 }, { date: 'Jun',   income: 8100, expenses: 3000 },
  ],
  '12m': [
    { date: 'Jun', income: 9800,  expenses: 3600 }, { date: 'Jul', income: 10200, expenses: 3800 },
    { date: 'Aug', income: 9600,  expenses: 3500 }, { date: 'Sep', income: 11000, expenses: 4100 },
    { date: 'Oct', income: 11800, expenses: 4400 }, { date: 'Nov', income: 10900, expenses: 4000 },
    { date: 'Dec', income: 9400,  expenses: 3400 }, { date: 'Jan', income: 12100, expenses: 4600 },
    { date: 'Feb', income: 11700, expenses: 4400 }, { date: 'Mar', income: 12600, expenses: 4800 },
    { date: 'Apr', income: 13200, expenses: 5000 }, { date: 'May', income: 13800, expenses: 5200 },
  ],
}

const PNL_DATA = [
  { month: 'Jan', income: 12100, expenses: 4600 },
  { month: 'Feb', income: 11700, expenses: 4400 },
  { month: 'Mar', income: 12600, expenses: 4800 },
  { month: 'Apr', income: 13200, expenses: 5000 },
  { month: 'May', income: 13800, expenses: 5200 },
  { month: 'Jun', income: 14200, expenses: 5400 },
]

type LedgerCategory = 'Revenue' | 'Expense' | 'Refund'

const CAT_STYLES: Record<LedgerCategory, { bg: string; color: string; border: string }> = {
  'Revenue': { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Expense': { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  'Refund':  { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
}

interface LedgerEntry {
  id: number
  date: string
  description: string
  category: LedgerCategory
  amount: number
  balance: number
}

const LEDGER: LedgerEntry[] = [
  { id:1,  date:'Jun 5',  description:'Monthly subscription batch',      category:'Revenue', amount: 1820,  balance: 48240 },
  { id:2,  date:'Jun 4',  description:'Staff salaries — June',           category:'Expense', amount: -2400, balance: 46420 },
  { id:3,  date:'Jun 4',  description:'Drop-in fees',                    category:'Revenue', amount: 144,   balance: 48820 },
  { id:4,  date:'Jun 3',  description:'Refund — David Sánchez',          category:'Refund',  amount: -65,   balance: 48676 },
  { id:5,  date:'Jun 3',  description:'Equipment purchase — mats',       category:'Expense', amount: -680,  balance: 48741 },
  { id:6,  date:'Jun 2',  description:'Quarterly membership batch',      category:'Revenue', amount: 540,   balance: 49421 },
  { id:7,  date:'Jun 1',  description:'Utility bills — June',            category:'Expense', amount: -320,  balance: 48881 },
  { id:8,  date:'Jun 1',  description:'Trial memberships',               category:'Revenue', amount: 87,    balance: 49201 },
  { id:9,  date:'May 31', description:'Monthly subscription batch',      category:'Revenue', amount: 1820,  balance: 49114 },
  { id:10, date:'May 30', description:'Marketing — social media ads',    category:'Expense', amount: -240,  balance: 47294 },
  { id:11, date:'May 29', description:'Refund — Roberto Herrera',        category:'Refund',  amount: -65,   balance: 47534 },
  { id:12, date:'May 28', description:'Seminar fees',                    category:'Revenue', amount: 375,   balance: 47599 },
  { id:13, date:'May 27', description:'Insurance — annual premium',      category:'Expense', amount: -1200, balance: 47224 },
  { id:14, date:'May 26', description:'Drop-in + open mat fees',         category:'Revenue', amount: 96,    balance: 48424 },
  { id:15, date:'May 25', description:'Cleaning services',               category:'Expense', amount: -180,  balance: 48328 },
]

export default function BalanceReportClient() {
  const t = useT()
  const [menuOpen, setMenuOpen] = useState(false)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'All' | LedgerCategory>('All')
  const [page, setPage] = useState(1)

  const filtered = filterTab === 'All' ? LEDGER : LEDGER.filter(e => e.category === filterTab)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const chartData = INCOME_EXPENSE_DATA[period] ?? []
  const totalIncome = chartData.reduce((s, d) => s + d.income, 0)
  const totalExpenses = chartData.reduce((s, d) => s + d.expenses, 0)
  const netBalance = totalIncome - totalExpenses
  const profitMargin = Math.round((netBalance / totalIncome) * 100)

  const STATS = [
    { label: 'Total Income',   value: '€' + totalIncome.toLocaleString(),   sub: 'this period', color: '#16A34A' },
    { label: 'Total Expenses', value: '€' + totalExpenses.toLocaleString(), sub: 'this period', color: '#DC2626' },
    { label: 'Net Balance',    value: '€' + netBalance.toLocaleString(),     sub: 'net result',  color: '#0071E3' },
    { label: 'Profit Margin',  value: profitMargin + '%',                    sub: 'of income',   color: '#6D28D9' },
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
              <input type="text" placeholder="Search ledger…"
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
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.balanceTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Income, expenses and net balance over time</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Income vs Expenses</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: unknown) => ['€' + (v as number).toLocaleString()]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="income" name="Income" stroke="#16A34A" fill="#16A34A" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Monthly P&L</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={PNL_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: unknown) => ['€' + (v as number).toLocaleString()]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="income" name="Income" fill="#16A34A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {(['All', 'Revenue', 'Expense', 'Refund'] as const).map(tab => {
                  const count = tab === 'All' ? LEDGER.length : LEDGER.filter(e => e.category === tab).length
                  const isOn = filterTab === tab
                  return (
                    <button key={tab} onClick={() => { setFilterTab(tab); setPage(1) }} className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                        background: isOn ? '#111827' : '#fff',
                        color: isOn ? '#fff' : '#6B7280',
                        border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                      {tab} <span style={{ opacity: 0.7, marginLeft: 2 }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Date', 'Description', 'Category', 'Amount', 'Balance'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((e, idx) => {
                      const cs = CAT_STYLES[e.category]
                      const isIncome = e.amount > 0
                      return (
                        <tr key={e.id} className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{e.date}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{e.description}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                              background: cs.bg, color: cs.color, border: '1px solid ' + cs.border }}>
                              {e.category}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
                              color: isIncome ? '#16A34A' : '#DC2626' }}>
                              {isIncome ? '+' : ''}€{Math.abs(e.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>€{e.balance.toLocaleString()}</span>
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
