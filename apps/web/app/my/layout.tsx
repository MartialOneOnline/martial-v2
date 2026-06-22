'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CalendarDays, User,
  LogOut, X, CreditCard, DollarSign, Settings,
  HelpCircle, Shield, QrCode, Medal, Menu,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type NavItem = { label: string; href: string; icon: React.ElementType; exact?: boolean }
type NavSection = { label?: string; schoolLabel?: boolean; items: NavItem[] }
type School = { name: string; logoUrl: string | null } | null

// ── Navigation ───────────────────────────────────────────────────────────────
// Explore is intentionally absent — students stay within their school's space.
// They can discover other schools from the public homepage.

const SIDEBAR_NAV: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', href: '/my',          icon: LayoutDashboard, exact: true },
      { label: 'Classes',   href: '/my/classes',  icon: CalendarDays },
      { label: 'Ranking',   href: '/my/progress', icon: Medal },
    ],
  },
  {
    schoolLabel: true, // replaced at render time with the student's school name
    items: [
      { label: 'Membership',   href: '/my/membership', icon: CreditCard },
      { label: 'Transactions', href: '/my/payments',   icon: DollarSign },
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

const BOTTOM_NAV: NavItem[] = [
  { label: 'Home',     href: '/my',          icon: LayoutDashboard, exact: true },
  { label: 'Classes',  href: '/my/classes',  icon: CalendarDays },
  { label: 'Profile',  href: '/my/profile',  icon: User },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

// ── Bottom nav ───────────────────────────────────────────────────────────────

function BottomNav() {
  const pathname = usePathname()

  const leftItems  = BOTTOM_NAV.slice(0, 2)
  const rightItems = BOTTOM_NAV.slice(2)
  const qrActive   = isActive(pathname, '/my/qr')

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{ background: 'rgba(248,248,250,.96)', borderTop: '.5px solid rgba(60,60,67,.18)' }}
    >
      {/* Left items */}
      {leftItems.map(item => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ padding: '8px 0 14px', color: active ? '#007AFF' : '#8E8E93' }}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 32, height: 2, background: '#007AFF' }} />
            )}
            <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </Link>
        )
      })}

      {/* Center QR FAB */}
      <Link
        href="/my/qr"
        prefetch={false}
        className="flex flex-col items-center gap-1"
        style={{ flex: 1, paddingBottom: 14, color: qrActive ? '#007AFF' : '#8E8E93' }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: 46,
            height: 46,
            background: '#007AFF',
            marginTop: -20,
            border: '3px solid rgba(248,248,250,.96)',
            boxShadow: '0 4px 18px rgba(0,122,255,.38)',
          }}
        >
          <QrCode className="w-5 h-5 text-white" />
        </div>
        <span style={{ fontSize: 10, fontWeight: qrActive ? 600 : 400 }}>QR</span>
      </Link>

      {/* Right items */}
      {rightItems.map(item => {
        const active = isActive(pathname, item.href, item.exact)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ padding: '8px 0 14px', color: active ? '#007AFF' : '#8E8E93' }}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full" style={{ width: 32, height: 2, background: '#007AFF' }} />
            )}
            <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function SidebarContent({ school, onClose }: { school: School; onClose?: () => void }) {
  const pathname = usePathname()

  return (
    <div className="w-60 bg-white border-r border-gray-100 flex flex-col h-full">

      {/* School header — shows the student's school, not generic branding */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
        <Link href="/my" onClick={onClose} prefetch={false} className="flex items-center gap-3 min-w-0">
          {school?.logoUrl ? (
            <img
              src={school.logoUrl}
              alt={school.name}
              className="w-8 h-8 rounded-xl object-cover shrink-0 border border-gray-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[#0870E2]/10 flex items-center justify-center shrink-0">
              <span className="text-[#0870E2] font-bold text-sm">
                {school?.name?.[0] ?? 'M'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#101828] leading-tight truncate">
              {school?.name ?? 'My Academy'}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">Student portal</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 md:hidden p-1 shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <div className="flex-1 overflow-y-auto py-3">
        {SIDEBAR_NAV.map((section, si) => (
          <div key={si} className="mb-1">
            {(section.label || section.schoolLabel) && (
              <p className="px-5 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest truncate">
                {section.schoolLabel ? (school?.name ?? 'Academy') : section.label}
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
                    prefetch={false}
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
        <button
          onClick={() => { window.location.href = '/api/auth/signout' }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [school, setSchool] = useState<School>(null)

  // Fetch the student's primary school for sidebar branding
  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => {
        const membership = d.user?.memberships?.find((m: { status: string }) => m.status === 'ACTIVE')
          ?? d.user?.memberships?.[0]
        if (membership?.school) {
          setSchool({ name: membership.school.name, logoUrl: membership.school.logoUrl })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex" style={{ background: '#F2F2F7' }}>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 fixed top-0 left-0 h-screen z-40">
        <SidebarContent school={school} />
      </aside>

      {/* Mobile topbar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-100 flex items-center px-4 z-40 md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 text-gray-500 hover:text-[#101828] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex-1 flex items-center justify-center gap-2">
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name} className="w-6 h-6 rounded-lg object-cover" />
          ) : (
            <Image src="/logo.svg" alt="Martial" width={20} height={20} />
          )}
          <span className="text-sm font-bold text-[#101828] truncate max-w-[160px]">
            {school?.name ?? 'Martial'}
          </span>
        </div>
        <div className="w-9" />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-60 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <SidebarContent school={school} onClose={() => setDrawerOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen pt-12 md:pt-0 pb-28 md:pb-0 overflow-x-hidden">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
