'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase/client'
import {
  LayoutDashboard, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  ShoppingBag, School, Flame, X, ChevronRight, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { useT } from '../lib/i18n/LanguageContext'
import { useSchoolContext } from '../lib/auth/useSchoolContext'

type NavItem = {
  label: string
  icon: React.ElementType
  href?: string
  badge?: number
  children?: { label: string; href: string }[]
}

function NavGroup({ item, setMenuOpen }: { item: NavItem; setMenuOpen: (v: boolean) => void }) {
  const pathname = usePathname()

  const isActive = item.href
    ? pathname === item.href
    : item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')) ?? false

  const [open, setOpen] = useState(isActive)

  if (!item.children) {
    return (
      <Link
        href={item.href ?? '#'}
        prefetch={false}
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline transition-colors"
        style={{
          color: '#374151',
          fontSize: 14,
          fontWeight: isActive ? 600 : 400,
          background: isActive ? '#EFF6FF' : 'transparent',
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <item.icon size={16} strokeWidth={1.5} style={{ color: isActive ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && item.badge > 0 && (
          <span style={{
            background: '#EF4444',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            lineHeight: 1,
            padding: '2px 5px',
            borderRadius: 999,
            minWidth: 16,
            textAlign: 'center',
          }}>
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
        style={{
          color: '#374151',
          fontSize: 14,
          fontWeight: isActive ? 600 : 400,
          background: isActive && !open ? '#EFF6FF' : 'transparent',
          border: 'none',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isActive && !open ? '#EFF6FF' : 'transparent' }}
      >
        <item.icon size={16} strokeWidth={1.5} style={{ color: isActive ? '#0071E3' : '#9CA3AF', flexShrink: 0 }} />
        <span className="flex-1">{item.label}</span>
        {open
          ? <ChevronDown size={13} strokeWidth={1.5} style={{ color: '#9CA3AF' }} />
          : <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#9CA3AF' }} />
        }
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children.map(child => {
            const childActive = pathname === child.href
            return (
              <Link
                key={child.label}
                href={child.href}
                prefetch={false}
                onClick={() => setMenuOpen(false)}
                className="flex items-center px-3 py-2 rounded-lg no-underline transition-colors"
                style={{
                  fontSize: 13,
                  color: childActive ? '#0071E3' : '#6B7280',
                  fontWeight: childActive ? 600 : 400,
                  background: childActive ? '#EFF6FF' : 'transparent',
                }}
                onMouseEnter={e => { if (!childActive) { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#111827' }}}
                onMouseLeave={e => { if (!childActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6B7280' }}}
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

interface Props {
  menuOpen: boolean
  setMenuOpen: (v: boolean) => void
}

export default function DashboardSidebar({ menuOpen, setMenuOpen }: Props) {
  const router = useRouter()
  const { currentSchool, schools, switchSchool, loading: ctxLoading } = useSchoolContext()
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [pendingTransactions, setPendingTransactions] = useState(0)
  const t = useT()

  const fetchPendingTransactions = () => {
    fetch('/api/dashboard/transactions/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data != null) setPendingTransactions(data.pending ?? 0) })
      .catch(() => {})
  }

  useEffect(() => {
    fetchPendingTransactions()
  }, [currentSchool?.schoolId])

  useEffect(() => {
    window.addEventListener('transaction-pending-changed', fetchPendingTransactions)
    return () => window.removeEventListener('transaction-pending-changed', fetchPendingTransactions)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const NAV_MAIN: NavItem[] = [
    { label: t.sidebar.dashboard,   icon: Flame,      href: '/dashboard' },
    { label: t.sidebar.users,       icon: Users,      href: '/dashboard/users' },
    { label: t.sidebar.classes,     icon: Calendar,   children: [
      { label: t.sidebar.classes,   href: '/dashboard/classes' },
      { label: t.sidebar.events,    href: '/dashboard/classes/events' },
      { label: t.sidebar.registrations, href: '/dashboard/classes/events/registrations' },
      { label: t.sidebar.calendar,  href: '/dashboard/classes/calendar' },
      { label: t.sidebar.timetable, href: '/dashboard/classes/timetable' },
    ]},
    { label: t.sidebar.memberships, icon: Award,      href: '/dashboard/memberships' },
    { label: t.sidebar.payments,    icon: CreditCard, badge: pendingTransactions, children: [
      { label: t.sidebar.transactions,  href: '/dashboard/payments/transactions' },
      { label: t.sidebar.subscriptions, href: '/dashboard/payments/subscriptions' },
    ]},
    { label: t.sidebar.school,      icon: School,     children: [
      { label: t.sidebar.leads,      href: '/dashboard/school/leads' },
      { label: t.sidebar.store,      href: '/dashboard/school/store' },
      { label: t.sidebar.curriculum, href: '/dashboard/school/curriculum' },
      { label: t.sidebar.affiliates, href: '/dashboard/school/affiliates' },
      { label: t.sidebar.staff,      href: '/dashboard/school/staff' },
      { label: t.sidebar.waivers,    href: '/dashboard/school/waivers' },
      { label: t.sidebar.gradings,   href: '/dashboard/school/gradings' },
    ]},
    { label: t.sidebar.reports,     icon: BarChart2,  children: [
      { label: t.sidebar.bookings, href: '/dashboard/reports/bookings' },
      { label: t.sidebar.gradings, href: '/dashboard/reports/gradings' },
      { label: t.sidebar.payments, href: '/dashboard/reports/payments' },
      { label: t.sidebar.balance,  href: '/dashboard/reports/balance' },
      { label: t.sidebar.absents,  href: '/dashboard/reports/absents' },
      { label: t.sidebar.users,    href: '/dashboard/reports/users' },
    ]},
    { label: t.sidebar.settings,    icon: Settings,   href: '/dashboard/settings' },
  ]

  const NAV_BOTTOM: NavItem[] = [
    { label: t.sidebar.subscription,  icon: ShoppingBag, href: '/dashboard/subscription' },
    { label: t.sidebar.notifications, icon: Bell,        href: '/dashboard/notifications' },
    { label: t.sidebar.support,       icon: HelpCircle,  href: '/dashboard/support' },
  ]

  return (
    <>
      <style>{`@media (min-width: 768px) { .dashboard-sidebar { transform: translateX(0) !important; } }`}</style>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{
          width: 232,
          background: '#fff',
          borderRight: '1px solid #E5E7EB',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* School header + switcher */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between">
            {/* School identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 bg-[#0870E2]/10 flex items-center justify-center">
                <Image src="/martial-logo.png" alt="Martial" width={28} height={28} className="object-contain" />
              </div>
              <div className="min-w-0">
                {ctxLoading ? (
                  <>
                    <div style={{ height: 13, width: 100, borderRadius: 4, background: '#F3F4F6', marginBottom: 4 }} />
                    <div style={{ height: 10, width: 50, borderRadius: 4, background: '#F3F4F6' }} />
                  </>
                ) : (
                  <>
                    <p className="truncate" style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>
                      {currentSchool?.schoolName}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {currentSchool?.role}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* School switcher — only shown when user has multiple schools */}
              {schools.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setSwitcherOpen(v => !v)}
                    className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Switch school"
                  >
                    <ChevronsUpDown size={13} strokeWidth={1.5} style={{ color: '#9CA3AF' }} />
                  </button>
                  {switcherOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setSwitcherOpen(false)} />
                      <div className="absolute left-0 top-8 z-50 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-[180px]">
                        {schools.map(s => (
                          <button
                            key={s.schoolId}
                            onClick={async () => {
                              await switchSchool(s.schoolId)
                              setSwitcherOpen(false)
                              router.refresh()
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left transition-colors"
                          >
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.schoolId === currentSchool?.schoolId ? '#0870E2' : '#E5E7EB' }} />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-gray-800">{s.schoolName}</p>
                              <p className="text-[10px] text-gray-400">{s.role}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {/* Mobile close */}
              <button
                className="md:hidden flex items-center justify-center w-6 h-6 rounded-md cursor-pointer hover:bg-gray-100"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={14} strokeWidth={1.5} style={{ color: '#6B7280' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_MAIN.map(item => (
            <NavGroup key={item.label} item={item} setMenuOpen={setMenuOpen} />
          ))}
        </nav>

        {/* Bottom nav + Sign out */}
        <div style={{ borderTop: '1px solid #E5E7EB' }} className="px-3 py-3 space-y-0.5">
          {NAV_BOTTOM.map(item => (
            <NavGroup key={item.label} item={item} setMenuOpen={setMenuOpen} />
          ))}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left cursor-pointer"
            style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <LogOut size={16} strokeWidth={1.5} style={{ color: '#9CA3AF' }} />
            {t.sidebar.signOut}
          </button>
        </div>
      </aside>
    </>
  )
}
