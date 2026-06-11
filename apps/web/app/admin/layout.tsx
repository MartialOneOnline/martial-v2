'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Settings,
  ChevronDown, ChevronRight, Target, GraduationCap,
  TrendingUp, LogOut,
} from 'lucide-react'

const NAV = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  {
    label: 'Schools', icon: Building2,
    children: [
      { label: 'Invitations',        href: '/admin/schools' },
      { label: 'Verification Queue', href: '/admin/schools/verify' },
      { label: 'All Schools',        href: '/admin/schools/all' },
    ],
  },
  {
    label: 'CRM', icon: Target,
    children: [
      { label: 'Leads',    href: '/admin/leads' },
      { label: 'Pipeline', href: '/admin/leads/pipeline' },
    ],
  },
  {
    label: 'Users', icon: Users,
    children: [
      { label: 'All Users',      href: '/admin/users' },
      { label: 'School Owners',  href: '/admin/users/owners' },
    ],
  },
  {
    label: 'Reports', icon: TrendingUp,
    children: [
      { label: 'Overview', href: '/admin/reports' },
      { label: 'Growth',   href: '/admin/reports/growth' },
    ],
  },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

function NavItem({ item }: { item: typeof NAV[number] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(() => {
    if (!('children' in item)) return false
    return item.children?.some(c => pathname.startsWith(c.href)) ?? false
  })

  if (!('children' in item) || !item.children) {
    const active = pathname === item.href
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          active
            ? 'bg-[#006197]/10 text-[#006197] font-semibold'
            : 'text-gray-500 hover:text-[#0D1B2A] hover:bg-gray-50'
        }`}
      >
        {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
        {item.label}
      </Link>
    )
  }

  const anyChildActive = item.children.some(c => pathname.startsWith(c.href))

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
          anyChildActive
            ? 'text-[#0D1B2A] font-semibold'
            : 'text-gray-500 hover:text-[#0D1B2A] hover:bg-gray-50'
        }`}
      >
        {item.icon && <item.icon className="w-4 h-4 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown className="w-3.5 h-3.5 opacity-40" />
          : <ChevronRight className="w-3.5 h-3.5 opacity-40" />
        }
      </button>
      {open && (
        <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
          {item.children.map(child => {
            const active = pathname === child.href || pathname.startsWith(child.href + '/')
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block px-2 py-1.5 rounded-md text-xs transition-colors ${
                  active
                    ? 'text-[#006197] font-semibold'
                    : 'text-gray-400 hover:text-[#0D1B2A]'
                }`}
              >
                {child.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside className="w-52 bg-white border-r border-gray-100 flex flex-col shrink-0 fixed top-0 left-0 h-screen z-40">

        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="Martial" width={30} height={30} />
            <div>
              <p className="text-sm font-bold text-[#0D1B2A] leading-none">Martial</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Academy</p>
            </div>
          </Link>
          <div className="mt-3">
            <span className="text-[9px] font-bold tracking-widest text-[#006197] uppercase bg-[#006197]/8 px-2 py-0.5 rounded-full">
              Super Admin
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5">
          {NAV.map(item => (
            <NavItem key={item.label} item={item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            School Dashboard
          </Link>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-52 min-h-screen overflow-auto bg-[#F8F9FB]">
        {children}
      </main>
    </div>
  )
}
