'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu,
} from 'lucide-react'

type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }

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
  { label: 'Subscription',  icon: ShoppingBag, href: '/dashboard/subscription' },
  { label: 'Notifications', icon: Bell,        href: '/dashboard/notifications' },
  { label: 'Support',       icon: HelpCircle,  href: '/dashboard/support' },
]
const ACTIVE_HREF = '/dashboard/notifications'

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

type NotifCategory = 'Payments' | 'Members' | 'Classes' | 'System'
type FilterTab = 'All' | 'Unread' | NotifCategory

interface Notif {
  id: number
  title: string
  description: string
  category: NotifCategory
  time: string
  read: boolean
}

const INITIAL_NOTIFS: Notif[] = [
  { id:1,  title: 'Payment received from Florian Walter',     description: '€65.00 received for Jiu Jitsu Mensual subscription.',          category: 'Payments', time: '2m ago',    read: false },
  { id:2,  title: 'Failed payment for Matias Toloza',         description: 'Retry needed — card declined on subscription renewal.',          category: 'Payments', time: '18m ago',   read: false },
  { id:3,  title: 'New member registration: Carlos Mendez',   description: 'Carlos has signed up and selected the 7-Day Free Trial.',        category: 'Members',  time: '34m ago',   read: false },
  { id:4,  title: 'BJJ Advanced is 18/20 — almost full',     description: 'Consider adding a second session to meet demand.',               category: 'Classes',  time: '1h ago',    read: false },
  { id:5,  title: 'Stripe payout processed — €1,240',        description: '€1,240 has been sent to your linked bank account.',             category: 'Payments', time: '2h ago',    read: false },
  { id:6,  title: 'Ana García absent for 3 classes',          description: 'Consider reaching out to check in with her.',                   category: 'Members',  time: '3h ago',    read: true  },
  { id:7,  title: 'Open Mat cancelled',                       description: 'No instructor available — 12 bookings have been notified.',      category: 'Classes',  time: '4h ago',    read: true  },
  { id:8,  title: 'Backup completed successfully',            description: 'All academy data has been backed up to secure storage.',         category: 'System',   time: '5h ago',    read: true  },
  { id:9,  title: '5 member trials expire this week',         description: 'Trials for Carlos, Ana, Rafael, Lucia, and Pedro end Friday.',  category: 'Members',  time: '6h ago',    read: true  },
  { id:10, title: 'New booking: Rafael Gonzalez for NOGI',    description: 'Rafael booked the Thursday 19:00 NOGI class.',                  category: 'Classes',  time: 'Yesterday', read: true  },
  { id:11, title: 'Stripe webhook reconnected',               description: 'Webhook was briefly disconnected and has been restored.',        category: 'System',   time: 'Yesterday', read: true  },
  { id:12, title: 'Payment received from Lucia Torres',       description: '€49.00 received for Starter membership.',                       category: 'Payments', time: 'Yesterday', read: true  },
  { id:13, title: 'New app version available',                description: 'Version 2.4.0 includes grading improvements and bug fixes.',    category: 'System',   time: '2 days ago', read: true },
  { id:14, title: 'New member registration: Sofia Ruiz',      description: 'Sofia signed up for the 30-Day Trial.',                        category: 'Members',  time: '2 days ago', read: true },
  { id:15, title: 'BJJ Kids is 10/12 — almost full',         description: 'The Saturday morning kids class is nearly at capacity.',        category: 'Classes',  time: '2 days ago', read: true },
  { id:16, title: 'Payout processed — €890',                 description: 'Weekly Stripe payout sent to bank.',                            category: 'Payments', time: '3 days ago', read: true },
  { id:17, title: 'Member at risk: Jorge Pérez',              description: 'Jorge has missed 5 consecutive classes.',                      category: 'Members',  time: '3 days ago', read: true },
  { id:18, title: 'New booking: Maria Lopez for Wrestling',   description: 'Maria booked Tuesday 18:00 Wrestling.',                        category: 'Classes',  time: '4 days ago', read: true },
  { id:19, title: 'System maintenance scheduled',             description: 'Brief maintenance window Sunday 03:00–03:30 UTC.',             category: 'System',   time: '4 days ago', read: true },
  { id:20, title: 'Payment received from Diego Santos',       description: '€100.00 for Family Jiu Jitsu subscription.',                  category: 'Payments', time: '5 days ago', read: true },
]

const CATEGORY_STYLES: Record<NotifCategory, { bg: string; color: string; border: string }> = {
  Payments: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  Members:  { bg: '#EFF6FF', color: '#0071E3', border: '#BFDBFE' },
  Classes:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  System:   { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

const NOTIF_ICONS: Record<NotifCategory, React.ElementType> = {
  Payments: CreditCard,
  Members:  Users,
  Classes:  Calendar,
  System:   Settings,
}

const PREF_GROUPS = [
  {
    label: 'Payments',
    items: [
      { key: 'pay_received', label: 'Payment received', desc: 'Notify when a payment is successfully processed' },
      { key: 'pay_failed',   label: 'Failed payment',   desc: 'Notify when a payment fails or is declined' },
      { key: 'pay_payout',   label: 'Payout processed', desc: 'Notify when Stripe sends a payout to your bank' },
    ],
  },
  {
    label: 'Members',
    items: [
      { key: 'mem_new',   label: 'New member',     desc: 'Notify when a new member registers' },
      { key: 'mem_risk',  label: 'Member at risk', desc: 'Notify when a member misses several classes' },
      { key: 'mem_trial', label: 'Trial expiring', desc: 'Notify when member trials are about to expire' },
    ],
  },
  {
    label: 'Classes',
    items: [
      { key: 'cls_full',    label: 'Class almost full', desc: 'Notify when a class is near capacity' },
      { key: 'cls_cancel',  label: 'Class cancelled',   desc: 'Notify when a class is cancelled' },
      { key: 'cls_booking', label: 'New booking',       desc: 'Notify when a member books a class' },
    ],
  },
  {
    label: 'System',
    items: [
      { key: 'sys_updates',  label: 'System updates',  desc: 'Notify about new app versions and maintenance' },
      { key: 'sys_security', label: 'Security alerts', desc: 'Notify about security-related events' },
    ],
  },
]

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4" style={{ padding: '12px 0', borderBottom: '1px solid #F3F4F6' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{desc}</div>
      </div>
      <button onClick={onChange} style={{
        width: 40, height: 22, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: value ? '#0071E3' : '#E5E7EB', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }} />
      </button>
    </div>
  )
}

const TABS: FilterTab[] = ['All', 'Unread', 'Payments', 'Members', 'Classes', 'System']

export default function NotificationsClient() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>(INITIAL_NOTIFS)
  const [activeTab, setActiveTab] = useState<FilterTab>('All')
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREF_GROUPS.flatMap(g => g.items.map(i => [i.key, true])))
  )

  const unreadCount = notifs.filter(n => !n.read).length

  const filtered = notifs.filter(n => {
    if (activeTab === 'All') return true
    if (activeTab === 'Unread') return !n.read
    return n.category === activeTab
  })

  const tabCount = (tab: FilterTab) => {
    if (tab === 'All') return notifs.length
    if (tab === 'Unread') return unreadCount
    return notifs.filter(n => n.category === tab).length
  }

  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })))
  const toggleRead = (id: number) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n))
  const togglePref = (key: string) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="min-h-screen flex" style={{ background: '#F9FAFB', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <style>{`@media(min-width:768px){.dashboard-sidebar{transform:translateX(0)!important}}`}</style>
      {menuOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMenuOpen(false)} />}

      <aside className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{ width: 232, background: '#fff', borderRight: '1px solid #E5E7EB', transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)', transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6', minHeight: 60 }}>
          <Image src="/martial-logo.png" alt="Martial" width={28} height={28} className="object-contain" />
          <span style={{ fontWeight: 700, fontSize: 16, color: '#111827', letterSpacing: '-0.3px' }}>Martial</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV_MAIN.map(item => <NavGroup key={item.label} item={item} />)}
        </nav>
        <div className="px-3 py-3 space-y-0.5" style={{ borderTop: '1px solid #F3F4F6' }}>
          {NAV_BOTTOM.map(item => <NavGroup key={item.label} item={item} />)}
          <form action="/auth/logout" method="post">
            <button type="submit" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-left"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FEF2F2'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="md:hidden" onClick={() => setMenuOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <Menu size={20} style={{ color: '#374151' }} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>Notifications</span>
            <div style={{ flex: 1 }} />
            <Link href="/dashboard/notifications" style={{ position: 'relative', color: '#374151', display: 'flex', alignItems: 'center' }}>
              <Bell size={18} style={{ color: '#6B7280' }} />
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 style={{ fontWeight: 700, fontSize: 20, color: '#111827', margin: 0 }}>Notifications</h1>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: '#EFF6FF', color: '#0071E3', border: '1px solid #BFDBFE' }}>
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <button onClick={markAllRead} style={{ padding: '7px 14px', borderRadius: 9, background: 'transparent', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Mark all as read
              </button>
            </div>

            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #E5E7EB', overflowX: 'auto' }}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    color: activeTab === tab ? '#0071E3' : '#6B7280',
                    borderBottom: activeTab === tab ? '2px solid #0071E3' : '2px solid transparent',
                    marginBottom: -2, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                  }}>
                  {tab}
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 999, background: activeTab === tab ? '#EFF6FF' : '#F3F4F6', color: activeTab === tab ? '#0071E3' : '#9CA3AF', fontWeight: 600 }}>
                    {tabCount(tab)}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              {filtered.map((n, i) => {
                const Icon = NOTIF_ICONS[n.category]
                const catStyle = CATEGORY_STYLES[n.category]
                return (
                  <div key={n.id} onClick={() => toggleRead(n.id)} style={{
                    display: 'flex', gap: 14, padding: '14px 16px',
                    background: n.read ? '#fff' : '#F0F7FF',
                    borderLeft: n.read ? '3px solid transparent' : '3px solid #0071E3',
                    borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                    cursor: 'pointer',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: catStyle.bg, border: `1px solid ${catStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} style={{ color: catStyle.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-start justify-between gap-2">
                        <span style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: '#111827' }}>{n.title}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{n.description}</div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999, background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}>
                          {n.category}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No notifications</div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Preferences</div>
                <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Choose which notifications you receive</div>
              </div>
              <div style={{ padding: '0 24px' }}>
                {PREF_GROUPS.map(group => (
                  <div key={group.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', padding: '14px 0 4px' }}>{group.label.toUpperCase()}</div>
                    {group.items.map(item => (
                      <ToggleRow key={item.key} label={item.label} desc={item.desc} value={prefs[item.key] ?? true} onChange={() => togglePref(item.key)} />
                    ))}
                  </div>
                ))}
                <div style={{ height: 8 }} />
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
