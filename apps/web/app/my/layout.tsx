'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Search, User,
  LogOut, X, ChevronRight, CreditCard, Award,
  DollarSign, Settings, HelpCircle, Shield, QrCode,
  BookOpen, School, Medal,
} from 'lucide-react'

/* ── Bottom nav (4 items — mobile primary navigation) ── */
const BOTTOM_NAV = [
  { label: 'Home',     href: '/my',           icon: LayoutDashboard },
  { label: 'Schedule', href: '/my/classes',    icon: CalendarDays },
  { label: 'Search',   href: '/explore',       icon: Search },
  { label: 'Profile',  href: '/my/profile',    icon: User },
]

/* ── Sidebar sections ── */
const SIDEBAR_NAV = [
  {
    items: [
      { label: 'Dashboard',    href: '/my',              icon: LayoutDashboard },
      { label: 'Schedule',     href: '/my/classes',       icon: CalendarDays },
      { label: 'Ranking',      href: '/my/progress',      icon: Medal },
      { label: 'Explore',      href: '/explore',          icon: Search },
    ],
  },
  {
    label: 'Academy',
    items: [
      { label: 'Membership',   href: '/my/membership',    icon: School },
      { label: 'Bookings',     href: '/my/classes',       icon: BookOpen },
      { label: 'Subscription', href: '/my/membership',    icon: CreditCard },
      { label: 'Transactions', href: '/my/payments',      icon: DollarSign },
      { label: 'Ranks',        href: '/my/progress',      icon: Award },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile',           href: '/my/profile',   icon: User },
      { label: 'Settings',          href: '/my/settings',  icon: Settings },
      { label: 'QR Code Scanner',   href: '/my/qr',        icon: QrCode },
      { label: 'Payment Method',    href: '/my/payments',  icon: CreditCard },
      { label: 'Help & Support',    href: '/my/help',      icon: HelpCircle },
      { label: 'Privacy',           href: '/my/privacy',   icon: Shield },
    ],
  },
]

function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden">
      {BOTTOM_NAV.map(item => {
        const active = pathname === item.href || (item.href !== '/my' && item.href !== '/explore' && pathname.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
              active ? 'text-[#0870E2]' : 'text-gray-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className={`text-[10px] font-medium ${active ? 'font-semibold' : ''}`}>{item.label}</span>
            {active && <div className="absolute bottom-0 w-8 h-0.5 bg-[#0870E2] rounded-full" />}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="w-60 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center justify-between border-b border-gray-50">
        <Link href="/my" onClick={onClose} className="flex items-center gap-2.5">
          <Image src="/logo.svg" alt="Martial" width={28} height={28} />
          <div>
            <p className="text-sm font-bold text-[#101828] leading-tight">Martial</p>
            <p className="text-[10px] text-gray-400 leading-tight">My Account</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto py-3">
        {SIDEBAR_NAV.map((section, si) => (
          <div key={si} className="mb-1">
            {section.label && (
              <p className="px-5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                {section.label}
              </p>
            )}
            <div className="px-2.5 space-y-0.5">
              {section.items.map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      active
                        ? 'bg-[#0870E2]/8 text-[#0870E2] font-semibold'
                        : 'text-gray-500 hover:text-[#101828] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0870E2]' : 'text-gray-400'}`} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active && <ChevronRight className="w-3.5 h-3.5 text-[#0870E2]/40 shrink-0" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-50">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </Link>
      </div>
    </div>
  )
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 fixed top-0 left-0 h-screen z-40">
        <SidebarContent />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent onClose={() => setDrawerOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
