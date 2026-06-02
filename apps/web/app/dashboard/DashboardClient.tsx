'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  MessageSquare, Clock, TrendingUp, TrendingDown,
  ChevronRight, ChevronLeft, MoreHorizontal,
  GraduationCap, UserPlus, Send, Grid3x3,
  MapPin, Mail, Phone,
} from 'lucide-react'

// ── Design tokens (Apple-inspired) ────────────────────────────────────────────
// bg:       #F5F5F7  (Apple signature off-white)
// card:     #FFFFFF
// text-1:   #1D1D1F  (Apple near-black)
// text-2:   #6E6E73  (Apple secondary gray)
// border:   #E5E5EA  (Apple separator)
// blue:     #0071E3  (Apple blue)
// green:    #30D158  (Apple green)
// red:      #FF3B30  (Apple red)
// amber:    #FF9F0A  (Apple amber)

interface Props {
  userName: string
  userEmail: string
  userRole: string
}

// ── Simulated data ─────────────────────────────────────────────────────────────

const STATS = [
  {
    label: 'Total Students',
    value: '665',
    trend: '+14%',
    trendUp: true,
    sub: 'vs last month',
    icon: Users,
    color: '#0071E3',
  },
  {
    label: 'Active Classes',
    value: '67',
    trend: '+3',
    trendUp: true,
    sub: 'this week',
    icon: Calendar,
    color: '#30D158',
  },
  {
    label: 'Revenue',
    value: '€3,586',
    trend: '+8%',
    trendUp: true,
    sub: 'vs last month',
    icon: CreditCard,
    color: '#FF9F0A',
  },
  {
    label: 'Total Bookings',
    value: '29,466',
    trend: '+2%',
    trendUp: true,
    sub: 'all time',
    icon: GraduationCap,
    color: '#BF5AF2',
  },
]

const TRANSACTIONS = [
  { id: 1, initials: 'FN', color: '#0071E3', name: 'Fernanda Neves',   method: 'Free',   price: '€ 0.00',  date: '01 Jun 2026', status: 'Paid',      statusColor: 'text-[#30D158] bg-[#F0FFF4]' },
  { id: 2, initials: 'PM', color: '#30D158', name: 'Patricia Mancera', method: 'Free',   price: '€ 0.00',  date: '28 May 2026', status: 'Paid',      statusColor: 'text-[#30D158] bg-[#F0FFF4]' },
  { id: 3, initials: 'MT', color: '#FF9F0A', name: 'Matias Toloza',    method: 'Free',   price: '€ 0.00',  date: '27 May 2026', status: 'Paid',      statusColor: 'text-[#30D158] bg-[#F0FFF4]' },
  { id: 4, initials: 'FW', color: '#BF5AF2', name: 'Florian Walter',   method: 'Stripe', price: '€ 65.00', date: '27 May 2026', status: 'Paid',      statusColor: 'text-[#30D158] bg-[#F0FFF4]' },
  { id: 5, initials: 'AD', color: '#FF3B30', name: 'Alejandro DB',     method: 'Cash',   price: '€ 65.00', date: '26 May 2026', status: 'Paid',      statusColor: 'text-[#30D158] bg-[#F0FFF4]' },
]

// Monthly chart data (Jan–Jun)
const CHART_DATA = [
  { month: 'JAN', value: 28 },
  { month: 'FEB', value: 42 },
  { month: 'MAR', value: 35 },
  { month: 'APR', value: 58 },
  { month: 'MAY', value: 72 },
  { month: 'JUN', value: 65 },
]

const TODAY_CLASSES = [
  { id: 1, name: 'Jiu Jitsu — All Levels', time: '10:00–11:30', enrolled: 8,  cap: 30, image: '/roger-gracie-malaga.jpg' },
  { id: 2, name: 'Jiu Jitsu — Advanced',   time: '19:00–20:30', enrolled: 12, cap: 30, image: '/mathouse.jpg' },
  { id: 3, name: 'Jiu Jitsu — Beginners',  time: '20:30–21:30', enrolled: 1,  cap: 30, image: '/five-elements-jiu-jitsu.jpg' },
]

const DAYS = [
  { short: 'M', long: 'MON' },
  { short: 'T', long: 'TUE' },
  { short: 'W', long: 'WED' },
  { short: 'T', long: 'THU' },
  { short: 'F', long: 'FRI' },
  { short: 'S', long: 'SAT' },
  { short: 'S', long: 'SUN' },
]

const NAV = [
  { label: 'Dashboard',    icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Students',     icon: Users,            href: '#' },
  { label: 'Classes',      icon: Calendar,         href: '#' },
  { label: 'Schedule',     icon: Clock,            href: '#' },
  { label: 'Memberships',  icon: Award,            href: '#' },
  { label: 'Payments',     icon: CreditCard,       href: '#' },
  { label: 'Reports',      icon: BarChart2,        href: '#' },
  { label: 'Messages',     icon: MessageSquare,    href: '#' },
  { label: 'Settings',     icon: Settings,         href: '#' },
]

// ── SVG Area Chart ─────────────────────────────────────────────────────────────

function AreaChart() {
  const W = 540; const H = 160; const PAD = { t: 16, r: 16, b: 32, l: 40 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const max = Math.max(...CHART_DATA.map(d => d.value))
  const points = CHART_DATA.map((d, i) => ({
    x: PAD.l + (i / (CHART_DATA.length - 1)) * innerW,
    y: PAD.t + (1 - d.value / max) * innerH,
  }))

  // Smooth bezier path
  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]!
    const cpX = (prev.x + p.x) / 2
    return `${acc} C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`
  }, '')

  const lastPt  = points[points.length - 1]!
  const firstPt = points[0]!
  const areaPath = `${linePath} L ${lastPt.x} ${H - PAD.b} L ${firstPt.x} ${H - PAD.b} Z`

  // Y-axis grid lines (3 lines)
  const gridLines = [0.25, 0.5, 0.75].map(t => PAD.t + t * innerH)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0071E3" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#0071E3" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map((y, i) => (
        <line key={i} x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
          stroke="#E5E5EA" strokeWidth="1" strokeDasharray="4 4" />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#areaGrad)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#0071E3" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#0071E3" strokeWidth="2.5" />
        </g>
      ))}

      {/* X-axis labels */}
      {CHART_DATA.map((d, i) => (
        <text key={i}
          x={points[i]!.x} y={H - 8}
          textAnchor="middle"
          fontSize="10" fontWeight="500" fill="#6E6E73"
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}
        >
          {d.month}
        </text>
      ))}

      {/* Peak label */}
      {(() => {
        const maxIdx  = CHART_DATA.findIndex(d => d.value === max)
        const p       = points[maxIdx]!
        const peakVal = CHART_DATA[maxIdx]?.value ?? 0
        return (
          <g>
            <rect x={p.x - 28} y={p.y - 26} width={56} height={18}
              rx="5" fill="#1D1D1F" />
            <text x={p.x} y={p.y - 13}
              textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, Inter, sans-serif' }}
            >
              {peakVal} bookings
            </text>
          </g>
        )
      })()}
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardClient({ userName, userEmail }: Props) {
  const [period, setPeriod]       = useState<'Today' | 'This Week' | 'This Month'>('This Month')
  const [activeDay, setActiveDay] = useState(0)

  const firstName = userName.split(' ')[0] ?? 'there'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      className="min-h-screen flex"
      style={{ background: '#F5F5F7', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full flex flex-col z-30"
        style={{ width: 240, background: '#fff', borderRight: '1px solid #E5E5EA' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: '1px solid #E5E5EA' }}>
          <div className="w-8 h-8 rounded-[10px] overflow-hidden shrink-0">
            <Image src="/martial-logo.png" alt="Martial" width={32} height={32} className="object-contain" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.01em', lineHeight: 1.2 }}>MARTIAL</p>
            <p style={{ fontSize: 10, fontWeight: 500, color: '#6E6E73', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Academy</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group no-underline"
              style={{
                background: item.active ? '#EBF5FF' : 'transparent',
                color: item.active ? '#0071E3' : '#1D1D1F',
                fontSize: 14,
                fontWeight: item.active ? 600 : 500,
              }}
              onMouseEnter={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
              onMouseLeave={e => { if (!item.active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <item.icon
                size={16}
                style={{ color: item.active ? '#0071E3' : '#6E6E73', flexShrink: 0 }}
              />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Divider + Support + Sign out */}
        <div style={{ borderTop: '1px solid #E5E5EA' }} className="px-3 py-3 space-y-0.5">
          <Link href="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
            style={{ color: '#1D1D1F', fontSize: 14, fontWeight: 500 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <HelpCircle size={16} style={{ color: '#6E6E73' }} />
            Support
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-left"
              style={{ color: '#FF3B30', fontSize: 14, fontWeight: 500, background: 'transparent', border: 'none' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FFF5F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <LogOut size={16} style={{ color: '#FF3B30' }} />
              Sign out
            </button>
          </form>
        </div>

        {/* User */}
        <div className="px-4 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #E5E5EA' }}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
            style={{ background: '#0071E3', fontSize: 12, fontWeight: 700 }}
          >
            {firstName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </p>
            <p style={{ fontSize: 11, color: '#6E6E73', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Academy Owner
            </p>
          </div>
        </div>
      </aside>

      {/* ── Main + Right ─────────────────────────────────────────────────── */}
      <div className="flex flex-1" style={{ marginLeft: 240 }}>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {greeting}, {firstName} 👋
              </h1>
              <p style={{ fontSize: 14, color: '#6E6E73', marginTop: 4 }}>
                Here's what's happening at your academy today.
              </p>
            </div>

            {/* Period selector — Apple segmented control */}
            <div
              className="flex items-center p-1 rounded-xl"
              style={{ background: '#E5E5EA', gap: 2 }}
            >
              {(['Today', 'This Week', 'This Month'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-4 py-2 rounded-[10px] cursor-pointer transition-all"
                  style={{
                    fontSize: 13,
                    fontWeight: period === p ? 600 : 500,
                    color: period === p ? '#1D1D1F' : '#6E6E73',
                    background: period === p ? '#fff' : 'transparent',
                    boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div
                key={stat.label}
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
              >
                {/* Icon + trend */}
                <div className="flex items-center justify-between">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${stat.color}15` }}
                  >
                    <stat.icon size={18} style={{ color: stat.color }} />
                  </div>
                  <span
                    className="flex items-center gap-0.5 px-2 py-0.5 rounded-full"
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      background: stat.trendUp ? '#F0FFF4' : '#FFF5F5',
                      color: stat.trendUp ? '#30D158' : '#FF3B30',
                    }}
                  >
                    {stat.trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {stat.trend}
                  </span>
                </div>

                {/* Value */}
                <div>
                  <p
                    style={{
                      fontSize: 30,
                      fontWeight: 700,
                      color: '#1D1D1F',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.1,
                    }}
                  >
                    {stat.value}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6E6E73', marginTop: 4, letterSpacing: '0.01em' }}>
                    {stat.label}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between" style={{ paddingTop: 8, borderTop: '1px solid #F5F5F7' }}>
                  <span style={{ fontSize: 11, color: '#6E6E73' }}>{stat.sub}</span>
                  <Link href="#" className="flex items-center gap-0.5 no-underline" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }}>
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Chart + Today's Classes */}
          <div className="grid grid-cols-3 gap-4">

            {/* Revenue chart */}
            <div
              className="col-span-2 rounded-2xl p-6"
              style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Bookings Overview
                  </p>
                  <p style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-0.02em', marginTop: 2 }}>
                    Jan – Jun 2026
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-3 py-1 rounded-full"
                    style={{ fontSize: 12, fontWeight: 600, color: '#0071E3', background: '#EBF5FF' }}
                  >
                    +18% vs last period
                  </span>
                </div>
              </div>
              <AreaChart />
            </div>

            {/* Today's classes */}
            <div
              className="rounded-2xl p-5 flex flex-col"
              style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F' }}>Today's Classes</p>
                <Link href="#" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }} className="no-underline">View all</Link>
              </div>

              {/* Day selector */}
              <div className="flex justify-between mb-4">
                {DAYS.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveDay(i)}
                    className="flex flex-col items-center justify-center rounded-xl py-1.5 px-1 cursor-pointer transition-all"
                    style={{
                      background: activeDay === i ? '#0071E3' : 'transparent',
                      border: 'none',
                      minWidth: 28,
                    }}
                  >
                    <span style={{ fontSize: 9, fontWeight: 600, color: activeDay === i ? 'rgba(255,255,255,0.7)' : '#6E6E73', letterSpacing: '0.04em', lineHeight: 1.4 }}>
                      {d.long}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: activeDay === i ? '#fff' : '#1D1D1F', lineHeight: 1.3 }}>
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>

              <p style={{ fontSize: 11, color: '#6E6E73', marginBottom: 12, fontWeight: 500 }}>
                {TODAY_CLASSES.length} classes scheduled
              </p>

              {/* Class list */}
              <div className="space-y-3 flex-1">
                {TODAY_CLASSES.map(cls => (
                  <div key={cls.id} className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl overflow-hidden shrink-0 relative"
                      style={{ background: '#F5F5F7' }}
                    >
                      <Image src={cls.image} alt={cls.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1D1D1F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cls.name}
                      </p>
                      <p style={{ fontSize: 11, color: '#6E6E73' }}>{cls.time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }}>{cls.enrolled}</p>
                      <p style={{ fontSize: 10, color: '#6E6E73' }}>/{cls.cap}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F5F5F7' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F' }}>Latest Transactions</p>
              <Link href="#" style={{ fontSize: 12, fontWeight: 600, color: '#0071E3' }} className="no-underline">View all</Link>
            </div>

            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F5F5F7' }}>
                  {['Member', 'Method', 'Amount', 'Date', 'Status', ''].map(h => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#6E6E73', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRANSACTIONS.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    style={{ borderBottom: idx < TRANSACTIONS.length - 1 ? '1px solid #F5F5F7' : 'none' }}
                    className="hover:bg-[#FAFAFA] transition-colors"
                  >
                    {/* Member */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white"
                          style={{ background: tx.color, fontSize: 11, fontWeight: 700 }}
                        >
                          {tx.initials}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#1D1D1F' }}>{tx.name}</span>
                      </div>
                    </td>
                    {/* Method */}
                    <td className="px-6 py-4">
                      <span style={{ fontSize: 14, color: '#6E6E73' }}>{tx.method}</span>
                    </td>
                    {/* Amount */}
                    <td className="px-6 py-4">
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F' }}>{tx.price}</span>
                    </td>
                    {/* Date */}
                    <td className="px-6 py-4">
                      <span style={{ fontSize: 13, color: '#6E6E73' }}>{tx.date}</span>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${tx.statusColor}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <button
                        className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer transition-colors"
                        style={{ color: '#6E6E73', background: 'transparent', border: 'none' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </main>

        {/* ── Right Panel ─────────────────────────────────────────────── */}
        <aside
          className="shrink-0 flex flex-col gap-4 p-5 overflow-y-auto"
          style={{
            width: 272,
            background: '#F5F5F7',
            borderLeft: '1px solid #E5E5EA',
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          {/* Bell */}
          <div className="flex items-center justify-between mb-1">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>Overview</p>
            <button
              className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-colors"
              style={{ background: '#fff', border: '1px solid #E5E5EA' }}
            >
              <Bell size={16} style={{ color: '#1D1D1F' }} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: '#FF3B30' }}
              />
            </button>
          </div>

          {/* Academy card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            {/* Top banner */}
            <div
              className="h-20 relative"
              style={{ background: 'linear-gradient(135deg, #0071E3 0%, #0051A2 100%)' }}
            >
              <div
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl overflow-hidden border-2 border-white"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
              >
                <Image src="/martial-logo.png" alt="Academy" width={48} height={48} className="object-contain p-1" />
              </div>
            </div>

            <div className="pt-8 pb-5 px-5 text-center">
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1D1D1F' }}>Roger Gracie Malaga</p>
              <p style={{ fontSize: 12, color: '#6E6E73', marginTop: 2 }}>Jiu Jitsu Academy</p>
            </div>

            {/* Info */}
            <div className="px-5 pb-4 space-y-2.5" style={{ borderTop: '1px solid #F5F5F7', paddingTop: 14 }}>
              {[
                { icon: Mail,    text: userEmail,          truncate: true },
                { icon: Phone,   text: '+34 654 804 155',  truncate: false },
                { icon: MapPin,  text: 'Calle Polifemo 3, Málaga', truncate: false },
              ].map(({ icon: Icon, text, truncate }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={13} style={{ color: '#0071E3', flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 12,
                      color: '#6E6E73',
                      ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-2" style={{ paddingTop: 12, borderTop: '1px solid #F5F5F7' }}>
              {[UserPlus, Send, Grid3x3, MoreHorizontal].map((Icon, i) => (
                <button
                  key={i}
                  className="flex-1 h-9 flex items-center justify-center rounded-xl cursor-pointer transition-all"
                  style={{ background: '#F5F5F7', border: '1px solid #E5E5EA' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EBF5FF'; (e.currentTarget as HTMLElement).style.borderColor = '#0071E3'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F5F5F7'; (e.currentTarget as HTMLElement).style.borderColor = '#E5E5EA'; }}
                >
                  <Icon size={15} style={{ color: '#6E6E73' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{ background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1D1D1F' }}>Quick Stats</p>
            {[
              { label: 'Avg Attendance', value: '78%',  color: '#30D158' },
              { label: 'Open Leads',     value: '4',    color: '#FF9F0A' },
              { label: 'Gradings',       value: '167',  color: '#BF5AF2' },
              { label: 'Notifications',  value: '35',   color: '#0071E3' },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span style={{ fontSize: 13, color: '#6E6E73' }}>{s.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Joined */}
          <p style={{ fontSize: 11, color: '#6E6E73', textAlign: 'center' }}>
            Academy since January 2021
          </p>
        </aside>
      </div>
    </div>
  )
}
