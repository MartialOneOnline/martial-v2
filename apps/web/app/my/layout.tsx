'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, Search, User,
  LogOut, X, CreditCard, DollarSign, Settings,
  HelpCircle, Shield, QrCode, Medal, Menu,
} from 'lucide-react'

// ── Navigation structure ─────────────────────────────────────────────────────
// Rule: one entry per destination. No duplicates.

type NavItem = { label: string; href: string; icon: React.ElementType; exact?: boolean }
type NavSection = { label?: string; items: NavItem[] }

const SIDEBAR_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/my',           icon: LayoutDashboard, exact: true },
      { label: 'Classes',   href: '/my/classes',   icon: CalendarDays },
      { label: 'Ranking',   href: '/my/progress',  icon: Medal },
      { label: 'Explore',   href: '/explore',      icon: Search,          exact: true },
    ],
  },
  {
    label: 'Academy',
    items: [
      { label: 'Membership',    href: '/my/membership', icon: CreditCard },
      { label: 'Transactions',  href: '/my/payments',   icon: DollarSign },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile',        href: '/my/profile',  icon: User },
      { label: 'Settings',       href: '/my/settings', icon: Settings },
      { label: 'QR Scanner',     href: '/my/qr',       icon: QrCode },
      { label: 'Help & Support', href: '/my/help',     icon: HelpCircle },
      { label: 'Privacy',        href: '/my/privacy',  icon: Shield },
    ],
  },
]

// Bottom nav: 4 items max, most-used actions on mobile
const BOTTOM_NAV: NavItem[] = [
  { label: 'Home',     href: '/my',          icon: LayoutDashboard, exact: true },
  { label: 'Classes',  href: '/my/classes',  icon: CalendarDays },
  { label: 'Explore',  href: '/explore',     icon: Search,          exact: true },
  { label: 'Profile',  href: '/my/profile',  icon: User },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

// ── Components ───────────────────────────────────────────────────────────────

function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 flex md:hidden safe-area-pb">
      {BOTTOM_NAV.map(item => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
              active ? 'text-[#0870E2]' : 'text-gray-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
            <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
              {item.label}
            </span>
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#0870E2] rounded-full" />
            )}
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

      {/* Nav */}
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
                const active = isActive(pathname, item.href, item.exact)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
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
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0870E2] shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sign out */}
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

// ── Layout ───────────────────────────────────────────────────────────────────

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-[#F8F9FB]">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 fixed top-0 left-0 h-screen z-40">
        <SidebarContent />
      </aside>

      {/* Mobile topbar — burger only, sidebar is drawer */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 text-gray-500 hover:text-[#101828] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 flex justify-center">
          <Link href="/my" className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Martial" width={22} height={22} />
            <span className="text-sm font-bold text-[#101828]">Martial</span>
          </Link>
        </div>
        {/* Spacer to center the logo */}
        <div className="w-9" />
      </div>

      {/* Mobile drawer */}
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

      {/* Main content — top padding on mobile for the topbar */}
      <main className="flex-1 md:ml-60 min-h-screen pt-12 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
