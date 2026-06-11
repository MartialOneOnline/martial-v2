'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, CreditCard, Award,
  User, Settings, LogOut, Menu, X, ChevronRight,
  Search,
} from 'lucide-react'

const NAV = [
  { label: 'Home',        href: '/my',              icon: LayoutDashboard },
  { label: 'My Classes',  href: '/my/classes',       icon: Calendar },
  { label: 'Membership',  href: '/my/membership',    icon: CreditCard },
  { label: 'Progress',    href: '/my/progress',      icon: Award },
  { label: 'Payments',    href: '/my/payments',      icon: CreditCard },
  { label: 'Profile',     href: '/my/profile',       icon: User },
]

function NavItem({ item, onClick }: { item: typeof NAV[number]; onClick?: () => void }) {
  const pathname = usePathname()
  const active = pathname === item.href

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
        active
          ? 'bg-[#006197]/10 text-[#006197] font-semibold'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#006197]' : 'text-gray-400'}`} />
      {item.label}
      {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-[#006197]/50" />}
    </Link>
  )
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <div className="w-56 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100 flex items-center justify-between">
        <Link href="/my" className="flex items-center gap-2.5" onClick={onClose}>
          <Image src="/logo.svg" alt="Martial" width={28} height={28} />
          <div>
            <p className="text-sm font-bold text-[#0D1B2A] leading-none">Martial</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">My Account</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-gray-50">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-400">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">Find a school…</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {NAV.map(item => (
          <NavItem key={item.href} item={item} onClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <Link
          href="/explore"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Search className="w-3.5 h-3.5" /> Explore schools
        </Link>
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </Link>
      </div>
    </div>
  )
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed top-0 left-0 h-screen z-40">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-56 h-full shadow-2xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* Main */}
      <main className="flex-1 md:ml-56 min-h-screen">
        {/* Mobile topbar */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-500 hover:text-gray-900"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Image src="/logo.svg" alt="Martial" width={24} height={24} />
          <span className="text-sm font-bold text-[#0D1B2A]">Martial</span>
        </div>

        {children}
      </main>
    </div>
  )
}
