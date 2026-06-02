'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  LayoutDashboard, Users, Calendar, CreditCard, BookOpen,
  Award, BarChart2, Settings, Bell, HelpCircle, LogOut,
  Search, ChevronDown, ChevronLeft, ChevronRight,
  MapPin, Mail, Phone, UserPlus, Send, Grid, MoreHorizontal,
  Eye, Edit2, TrendingUp, GraduationCap, X,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardClientProps {
  userName: string
  userEmail: string
  userRole: string
}

// ── Simulated data ─────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Users',            value: '665',   icon: Users,       color: 'text-sky-500',    href: '#' },
  { label: 'Upcoming Classes', value: '67',    icon: Calendar,    color: 'text-indigo-500', href: '#' },
  { label: 'Leads',            value: '4',     icon: TrendingUp,  color: 'text-emerald-500',href: '#' },
  { label: 'Payments',         value: '3,586', icon: CreditCard,  color: 'text-amber-500',  href: '#' },
  { label: 'Bookings',         value: '29,466',icon: BookOpen,    color: 'text-sky-500',    href: '#' },
  { label: 'Gradings',         value: '167',   icon: GraduationCap,color:'text-purple-500', href: '#' },
]

const TRANSACTIONS = [
  { id: 1, avatar: null,   initials: 'FN', color: 'bg-sky-500',    name: 'Fernanda Neves',  method: 'Free',   price: '€ 0.00',  date: '01 Jun 2026', status: 'Paid' },
  { id: 2, avatar: null,   initials: 'PM', color: 'bg-indigo-500', name: 'Patricia Mancera',method: 'Free',   price: '€ 0.00',  date: '28 May 2026', status: 'Paid' },
  { id: 3, avatar: null,   initials: 'MT', color: 'bg-emerald-500',name: 'Matias Toloza',   method: 'Free',   price: '€ 0.00',  date: '27 May 2026', status: 'Paid' },
  { id: 4, avatar: null,   initials: 'FW', color: 'bg-purple-500', name: 'Florian Walter',  method: 'Stripe', price: '€ 65.00', date: '27 May 2026', status: 'Paid' },
  { id: 5, avatar: null,   initials: 'AD', color: 'bg-rose-500',   name: 'Alejandro DB',    method: 'Cash',   price: '€ 65.00', date: '26 May 2026', status: 'Paid' },
]

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DATES = [1, 2, 3, 4, 5, 6, 7]

const CLASSES_TODAY = [
  { id: 1, name: 'Jiu Jitsu Todos',       time: '10:00–11:30', enrolled: 8,  capacity: 30, status: 'Active', image: '/roger-gracie-malaga.jpg' },
  { id: 2, name: 'Jiu Jitsu Avanzado',    time: '19:00–20:30', enrolled: 12, capacity: 30, status: 'Active', image: '/mathouse.jpg' },
  { id: 3, name: 'Jiu Jitsu Iniciación',  time: '20:30–21:30', enrolled: 1,  capacity: 30, status: 'Active', image: '/five-elements-jiu-jitsu.jpg' },
]

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard', active: true },
  { label: 'Users',         icon: Users,           href: '#' },
  { label: 'Classes',       icon: Calendar,        href: '#',          hasChevron: true },
  { label: 'Memberships',   icon: Award,           href: '#' },
  { label: 'Payments',      icon: CreditCard,      href: '#',          hasChevron: true },
  { label: 'School',        icon: BookOpen,        href: '#',          hasChevron: true },
  { label: 'Reports',       icon: BarChart2,       href: '#',          hasChevron: true },
  { label: 'Settings',      icon: Settings,        href: '#',          hasChevron: true },
  { label: 'Subscription',  icon: CreditCard,      href: '#' },
  { label: 'Notifications', icon: Bell,            href: '#' },
  { label: 'Support',       icon: HelpCircle,      href: '#' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardClient({ userName, userEmail }: DashboardClientProps) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[#f7f8fc] flex font-sans">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 bg-white border-r border-[#e8eaf0] flex flex-col fixed top-0 left-0 h-full z-30">

        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#e8eaf0]">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/martial-logo.png" alt="Martial" width={36} height={36} className="object-contain" />
            <div className="leading-tight">
              <p className="text-[13px] font-black text-[#061229] tracking-wider uppercase">MARTIAL</p>
              <p className="text-[9px] font-bold text-[#0092ff] tracking-widest uppercase">Take Control</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all group ${
                item.active
                  ? 'bg-[#e8f4ff] text-[#0092ff]'
                  : 'text-[#5a6a7a] hover:bg-[#f5f7fa] hover:text-[#061229]'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-4 h-4 ${item.active ? 'text-[#0092ff]' : 'text-[#9ca3af] group-hover:text-[#061229]'}`} />
                <span>{item.label}</span>
              </div>
              {item.hasChevron && <ChevronDown className="w-3 h-3 text-[#c0c8d0]" />}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#e8eaf0]">
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#5a6a7a] hover:bg-[#fff0f0] hover:text-[#e43535] transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="ml-[220px] flex-1 flex flex-col">

        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaf0] px-6 h-14 flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
            <input
              suppressHydrationWarning
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 text-[13px] text-[#4f4f4f] bg-[#f5f7fa] border border-[#e8eaf0] rounded-xl focus:outline-none focus:border-[#0092ff] transition-colors placeholder:text-[#b0b0b0]"
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9ca3af] pointer-events-none" />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[12px] font-semibold text-[#5a6a7a]">{dateStr} {timeStr}</span>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-[#f5f7fa] hover:bg-[#e8eaf0] transition-colors cursor-pointer">
              <Bell className="w-4 h-4 text-[#5a6a7a]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e43535] rounded-full" />
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#f5f7fa] hover:bg-[#e8eaf0] transition-colors cursor-pointer">
              <span className="text-[14px]">🇬🇧</span>
              <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 flex gap-6 p-6">

          {/* ── Centre column ───────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* 6 stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-[#e8eaf0] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-[13px] font-bold ${stat.color}`}>{stat.label}</p>
                      <p className="text-[26px] font-black text-[#061229] mt-1 leading-none">{stat.value}</p>
                    </div>
                    <div className={`p-2.5 rounded-xl bg-[#f5f7fa]`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                  <Link href={stat.href} className="text-[11px] font-bold text-[#0092ff] hover:underline mt-3 block">
                    View All
                  </Link>
                </div>
              ))}
            </div>

            {/* Latest transactions */}
            <div className="bg-white rounded-2xl border border-[#e8eaf0] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8eaf0]">
                <h2 className="text-[15px] font-black text-[#061229]">Latest Transactions</h2>
                <Link href="#" className="text-[12px] font-bold text-[#0092ff] hover:underline">View All</Link>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e8eaf0]">
                    {['Photo', 'User Name', 'Method', 'Price', 'Submitted', 'Details', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#9ca3af] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((tx, idx) => (
                    <tr key={tx.id} className={`border-b border-[#f5f7fa] hover:bg-[#f9fafb] transition-colors ${idx === TRANSACTIONS.length - 1 ? 'border-0' : ''}`}>
                      <td className="px-4 py-3.5">
                        <div className={`w-9 h-9 rounded-full ${tx.color} flex items-center justify-center text-white text-[11px] font-black shrink-0`}>
                          {tx.initials}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[13px] font-semibold text-[#061229] whitespace-nowrap">{tx.name}</td>
                      <td className="px-4 py-3.5 text-[13px] text-[#5a6a7a]">{tx.method}</td>
                      <td className="px-4 py-3.5 text-[13px] font-bold text-[#061229]">{tx.price}</td>
                      <td className="px-4 py-3.5 text-[12px] text-[#9ca3af]">{tx.date}</td>
                      <td className="px-4 py-3.5">
                        <button className="px-3 py-1 bg-[#061229] text-white text-[11px] font-bold rounded-lg hover:bg-[#0f2040] transition-colors cursor-pointer">
                          Details
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-1 bg-[#dcfce7] text-[#16a34a] text-[11px] font-bold rounded-full">
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button className="p-1.5 hover:bg-[#f5f7fa] rounded-lg transition-colors cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5 text-[#9ca3af]" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right panel ─────────────────────────────────────────── */}
          <div className="w-[280px] shrink-0 space-y-4">

            {/* Academy card */}
            <div className="bg-white rounded-2xl border border-[#e8eaf0] overflow-hidden">
              {/* Cover image */}
              <div className="relative h-28 bg-[#061229]">
                <Image src="/roger-gracie-malaga.jpg" alt="Academy" fill className="object-cover opacity-60" />
              </div>
              {/* Logo */}
              <div className="px-5 pb-5">
                <div className="w-14 h-14 rounded-2xl border-4 border-white bg-white shadow-md -mt-7 mb-3 overflow-hidden">
                  <Image src="/martial-logo.png" alt="Logo" width={56} height={56} className="object-contain" />
                </div>
                <p className="text-[14px] font-black text-[#061229]">Roger Gracie Malaga</p>
                <p className="text-[11px] text-[#9ca3af] mt-0.5">Calle Polifemo 3, Málaga</p>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-[#5a6a7a]">
                    <Mail className="w-3 h-3 text-[#0092ff]" />
                    <span className="truncate">{userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#5a6a7a]">
                    <Phone className="w-3 h-3 text-[#0092ff]" />
                    <span>+34 654 804 155</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-4">
                  {[UserPlus, Send, Grid, MoreHorizontal].map((Icon, i) => (
                    <button
                      key={i}
                      className="flex-1 h-9 flex items-center justify-center border border-[#e8eaf0] rounded-xl hover:bg-[#f5f7fa] hover:border-[#0092ff] transition-all cursor-pointer group"
                    >
                      <Icon className="w-4 h-4 text-[#9ca3af] group-hover:text-[#0092ff]" />
                    </button>
                  ))}
                </div>

                <p className="text-[10px] text-[#c0c8d0] mt-3 font-medium">Joined Jan, 2021</p>
              </div>
            </div>

            {/* Upcoming Classes */}
            <div className="bg-white rounded-2xl border border-[#e8eaf0] p-4">
              <h3 className="text-[13px] font-black text-[#0092ff] mb-3">Upcoming Classes</h3>

              {/* Day selector */}
              <div className="flex items-center justify-between mb-3">
                <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#f5f7fa] cursor-pointer">
                  <ChevronLeft className="w-3.5 h-3.5 text-[#9ca3af]" />
                </button>
                <div className="flex gap-1">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(i)}
                      className={`flex flex-col items-center px-1.5 py-1.5 rounded-xl cursor-pointer transition-all text-center ${
                        selectedDay === i ? 'bg-[#0092ff]' : 'hover:bg-[#f5f7fa]'
                      }`}
                    >
                      <span className={`text-[9px] font-bold ${selectedDay === i ? 'text-white/70' : 'text-[#9ca3af]'}`}>{day}</span>
                      <span className={`text-[12px] font-black mt-0.5 ${selectedDay === i ? 'text-white' : 'text-[#061229]'}`}>{DATES[i]}</span>
                    </button>
                  ))}
                </div>
                <button className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-[#f5f7fa] cursor-pointer">
                  <ChevronRight className="w-3.5 h-3.5 text-[#9ca3af]" />
                </button>
              </div>

              <p className="text-[11px] font-bold text-[#5a6a7a] mb-3">
                Classes on {DAYS[selectedDay]}, June 0{DATES[selectedDay]}
              </p>

              {/* Class list */}
              <div className="space-y-2.5">
                {CLASSES_TODAY.map(cls => (
                  <div key={cls.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#f5f7fa] shrink-0 relative">
                      <Image src={cls.image} alt={cls.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-[#061229] truncate">{cls.name}</p>
                      <p className="text-[10px] text-[#9ca3af] font-medium">{cls.time}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-[#5a6a7a] font-medium">{cls.enrolled}/{cls.capacity}</span>
                        <span className="text-[9px] font-black bg-[#dcfce7] text-[#16a34a] px-1.5 py-0.5 rounded-full">
                          {cls.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
