'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Check, Download,
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
const ACTIVE_HREF = '/dashboard/subscription'

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

const INVOICES = [
  { id: 'INV-006', date: 'Jun 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-005', date: 'May 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-004', date: 'Apr 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-003', date: 'Mar 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-002', date: 'Feb 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
  { id: 'INV-001', date: 'Jan 1, 2026',  desc: 'Starter Plan — Monthly',   amount: '€49.00', status: 'Paid' },
]

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    monthly: 0,
    yearly: 0,
    features: ['Up to 30 members', '1 instructor', 'Basic booking', 'Email support'],
    badge: null,
    current: false,
  },
  {
    key: 'starter',
    name: 'Starter',
    monthly: 49,
    yearly: 39,
    features: ['Up to 150 members', '5 instructors', 'Payments + Stripe', 'Basic reports', 'Priority email'],
    badge: 'current',
    current: true,
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 99,
    yearly: 79,
    features: ['Up to 500 members', 'Unlimited instructors', 'Full reports + charts', 'Grading system', 'Custom branding', 'Chat support'],
    badge: 'popular',
    current: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 249,
    yearly: 199,
    features: ['Unlimited everything', 'White-label', 'API access', 'Dedicated account manager', 'SLA guarantee', 'Phone support'],
    badge: null,
    current: false,
  },
]

export default function SubscriptionClient() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

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
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>Subscription</span>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Current Plan Card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '20px 24px' }}>
              <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', color: '#0071E3', border: '1px solid #BFDBFE' }}>STARTER</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Martial Academy</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#6B7280' }}>Billed monthly · Next charge €49 on 01 Jul 2026</span>
                </div>
                <div className="flex items-center gap-3">
                  <button style={{ padding: '8px 18px', borderRadius: 10, background: '#0071E3', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Upgrade
                  </button>
                  <Link href="#" style={{ fontSize: 13, color: '#0071E3', fontWeight: 500, textDecoration: 'none' }}>Manage billing</Link>
                </div>
              </div>
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1" style={{ background: '#F3F4F6', borderRadius: 12, padding: 4 }}>
                <button onClick={() => setBilling('monthly')}
                  style={{ padding: '6px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: billing === 'monthly' ? '#fff' : 'transparent',
                    color: billing === 'monthly' ? '#111827' : '#6B7280',
                    boxShadow: billing === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  Monthly
                </button>
                <button onClick={() => setBilling('yearly')}
                  style={{ padding: '6px 18px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    background: billing === 'yearly' ? '#fff' : 'transparent',
                    color: billing === 'yearly' ? '#111827' : '#6B7280',
                    boxShadow: billing === 'yearly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                  Yearly
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#ECFDF5', color: '#16A34A', border: '1px solid #BBF7D0' }}>-20%</span>
                </button>
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {PLANS.map(plan => {
                const price = billing === 'monthly' ? plan.monthly : plan.yearly
                const isCurrent = plan.current
                const isPopular = plan.badge === 'popular'
                return (
                  <div key={plan.key} style={{
                    background: '#fff', borderRadius: 16,
                    border: isCurrent ? '2px solid #0071E3' : '1px solid #E5E7EB',
                    padding: '20px 20px 20px',
                    display: 'flex', flexDirection: 'column', gap: 16, position: 'relative',
                  }}>
                    {(isCurrent || isPopular) && (
                      <span style={{
                        position: 'absolute', top: 14, right: 14,
                        fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                        background: isCurrent ? '#EFF6FF' : '#F5F3FF',
                        color: isCurrent ? '#0071E3' : '#6D28D9',
                        border: `1px solid ${isCurrent ? '#BFDBFE' : '#DDD6FE'}`,
                      }}>
                        {isCurrent ? 'CURRENT' : 'POPULAR'}
                      </span>
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 8 }}>{plan.name}</div>
                      <div className="flex items-baseline gap-1">
                        <span style={{ fontSize: 28, fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>
                          {price === 0 ? 'Free' : `€${price}`}
                        </span>
                        {price > 0 && <span style={{ fontSize: 13, color: '#9CA3AF' }}>/mo</span>}
                      </div>
                      {price === 0 && <span style={{ fontSize: 13, color: '#9CA3AF' }}>Forever free</span>}
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2">
                          <Check size={14} style={{ color: '#16A34A', flexShrink: 0, marginTop: 1 }} />
                          <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <button disabled={isCurrent} style={{
                      padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isCurrent ? 'default' : 'pointer',
                      background: isCurrent ? '#F3F4F6' : plan.key === 'enterprise' ? 'transparent' : '#0071E3',
                      color: isCurrent ? '#9CA3AF' : plan.key === 'enterprise' ? '#111827' : '#fff',
                      border: plan.key === 'enterprise' ? '1px solid #E5E7EB' : 'none',
                      width: '100%',
                    }}>
                      {isCurrent ? 'Current plan' : plan.key === 'enterprise' ? 'Contact sales' : 'Upgrade'}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Invoice History */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Invoice history</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB' }}>
                    {['Date', 'Description', 'Amount', 'Status', 'Download'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {INVOICES.map((inv, i) => (
                    <tr key={inv.id} style={{ borderBottom: i < INVOICES.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#6B7280' }}>{inv.date}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827', fontWeight: 500 }}>{inv.desc}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#111827', fontWeight: 600 }}>{inv.amount}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>Paid</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: '#6B7280', fontSize: 12 }}>
                          <Download size={13} />
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}
