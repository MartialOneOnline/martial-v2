'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Flame, Users, Calendar, CreditCard, Award,
  BarChart2, Settings, Bell, HelpCircle, LogOut,
  School, ShoppingBag, ChevronRight, ChevronDown,
  Menu, X, Search, ChevronLeft, Check, X as XIcon,
  Clock, Download, TrendingUp, TrendingDown,
  AlertCircle, RefreshCw, MoreHorizontal, Eye, Plus,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type TxStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded'
type TxMethod = 'Stripe' | 'Cash' | 'Transfer' | 'Free'

interface Transaction {
  id: number
  avatar: string
  name: string
  email: string
  membership: string
  method: TxMethod
  amount: string
  amountRaw: number
  date: string
  status: TxStatus
  ref: string
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const TRANSACTIONS: Transaction[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',     email:'fernanda@mail.com',  membership:'Kids Family',         method:'Free',     amount:'€0.00',   amountRaw:0,   date:'01 Jun 2026', status:'Paid',     ref:'TXN-001' },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',   email:'patricia@mail.com',  membership:'Kids Family',         method:'Free',     amount:'€0.00',   amountRaw:0,   date:'28 May 2026', status:'Paid',     ref:'TXN-002' },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',      email:'matias@mail.com',    membership:'Jiu Jitsu Mensual',   method:'Stripe',   amount:'€65.00',  amountRaw:65,  date:'27 May 2026', status:'Pending',  ref:'TXN-003' },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',     email:'florian@mail.com',   membership:'Jiu Jitsu Mensual',   method:'Stripe',   amount:'€65.00',  amountRaw:65,  date:'27 May 2026', status:'Paid',     ref:'TXN-004' },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',       email:'alejandro@mail.com', membership:'Jiu Jitsu Mensual',   method:'Cash',     amount:'€65.00',  amountRaw:65,  date:'26 May 2026', status:'Failed',   ref:'TXN-005' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',    email:'rafael@mail.com',    membership:'Jiu Jitsu Mensual',   method:'Stripe',   amount:'€65.00',  amountRaw:65,  date:'25 May 2026', status:'Paid',     ref:'TXN-006' },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz',  email:'miguel@mail.com',    membership:'Jiu Jitsu Trimestral',method:'Transfer', amount:'€180.00', amountRaw:180, date:'24 May 2026', status:'Paid',     ref:'TXN-007' },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',      email:'laura@mail.com',     membership:'Jiu Jitsu Infantil',  method:'Stripe',   amount:'€50.00',  amountRaw:50,  date:'23 May 2026', status:'Paid',     ref:'TXN-008' },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=jk',  name:'James Kim',          email:'james@mail.com',     membership:'Family Jiu Jitsu',    method:'Stripe',   amount:'€100.00', amountRaw:100, date:'22 May 2026', status:'Refunded', ref:'TXN-009' },
  { id:10, avatar:'https://i.pravatar.cc/32?u=sg',  name:'Sara García',        email:'sara@mail.com',      membership:'Jiu Jitsu Mensual',   method:'Cash',     amount:'€65.00',  amountRaw:65,  date:'21 May 2026', status:'Paid',     ref:'TXN-010' },
  { id:11, avatar:'https://i.pravatar.cc/32?u=dt',  name:'Diego Torres',       email:'diego@mail.com',     membership:'2 Semanas',           method:'Stripe',   amount:'€35.00',  amountRaw:35,  date:'20 May 2026', status:'Paid',     ref:'TXN-011' },
  { id:12, avatar:'https://i.pravatar.cc/32?u=ab',  name:'Ana Belén López',    email:'ana@mail.com',       membership:'Jiu Jitsu Mensual',   method:'Stripe',   amount:'€65.00',  amountRaw:65,  date:'19 May 2026', status:'Paid',     ref:'TXN-012' },
  { id:13, avatar:'https://i.pravatar.cc/32?u=cr',  name:'Carlos Romero',      email:'carlos@mail.com',    membership:'Jiu Jitsu Mensual',   method:'Cash',     amount:'€65.00',  amountRaw:65,  date:'18 May 2026', status:'Pending',  ref:'TXN-013' },
  { id:14, avatar:'https://i.pravatar.cc/32?u=vp',  name:'Valeria Pérez',      email:'valeria@mail.com',   membership:'Jiu Jitsu Trimestral',method:'Transfer', amount:'€180.00', amountRaw:180, date:'17 May 2026', status:'Paid',     ref:'TXN-014' },
  { id:15, avatar:'https://i.pravatar.cc/32?u=hm',  name:'Hugo Martínez',      email:'hugo@mail.com',      membership:'Jiu Jitsu Mensual',   method:'Stripe',   amount:'€65.00',  amountRaw:65,  date:'16 May 2026', status:'Failed',   ref:'TXN-015' },
  { id:16, avatar:'https://i.pravatar.cc/32?u=io',  name:'Irina Okonkwo',      email:'irina@mail.com',     membership:'Family Jiu Jitsu',    method:'Stripe',   amount:'€100.00', amountRaw:100, date:'15 May 2026', status:'Paid',     ref:'TXN-016' },
  { id:17, avatar:'https://i.pravatar.cc/32?u=bw',  name:'Bruno Weber',        email:'bruno@mail.com',     membership:'Jiu Jitsu Infantil',  method:'Stripe',   amount:'€50.00',  amountRaw:50,  date:'14 May 2026', status:'Paid',     ref:'TXN-017' },
  { id:18, avatar:'https://i.pravatar.cc/32?u=np',  name:'Nadia Portillo',     email:'nadia@mail.com',     membership:'Jiu Jitsu Mensual',   method:'Cash',     amount:'€65.00',  amountRaw:65,  date:'13 May 2026', status:'Refunded', ref:'TXN-018' },
]

const STATUS_MAP: Record<TxStatus, { bg: string; color: string; border: string; icon: React.ElementType }> = {
  Paid:     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check        },
  Pending:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: Clock        },
  Failed:   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XIcon        },
  Refunded: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: RefreshCw    },
}

const METHOD_MAP: Record<TxMethod, { label: string; bg: string; color: string }> = {
  Stripe:   { label: 'Stripe',   bg: '#EFF6FF', color: '#2563EB' },
  Cash:     { label: 'Cash',     bg: '#F0FDF4', color: '#15803D' },
  Transfer: { label: 'Transfer', bg: '#F9FAFB', color: '#374151' },
  Free:     { label: 'Free',     bg: '#F3F4F6', color: '#6B7280' },
}

// ── Members for picker ─────────────────────────────────────────────────────────
const MEMBERS = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',     email:'fernanda@mail.com'  },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',   email:'patricia@mail.com'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',      email:'matias@mail.com'    },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',     email:'florian@mail.com'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',       email:'alejandro@mail.com' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',    email:'rafael@mail.com'    },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz',  email:'miguel@mail.com'    },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',      email:'laura@mail.com'     },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=jk',  name:'James Kim',          email:'james@mail.com'     },
  { id:10, avatar:'https://i.pravatar.cc/32?u=sg',  name:'Sara García',        email:'sara@mail.com'      },
  { id:11, avatar:'https://i.pravatar.cc/32?u=dt',  name:'Diego Torres',       email:'diego@mail.com'     },
  { id:12, avatar:'https://i.pravatar.cc/32?u=ab',  name:'Ana Belén López',    email:'ana@mail.com'       },
  { id:13, avatar:'https://i.pravatar.cc/32?u=cr',  name:'Carlos Romero',      email:'carlos@mail.com'    },
  { id:14, avatar:'https://i.pravatar.cc/32?u=vp',  name:'Valeria Pérez',      email:'valeria@mail.com'   },
  { id:15, avatar:'https://i.pravatar.cc/32?u=hm',  name:'Hugo Martínez',      email:'hugo@mail.com'      },
]

const PLAN_OPTIONS = [
  'Jiu Jitsu Mensual', 'Jiu Jitsu Trimestral', 'Jiu Jitsu Infantil',
  'Family Jiu Jitsu', '2 Semanas', 'Kids Family', 'Drop-in Class',
  'Open Mat Pass', 'Seminar Pass', '7-Day Free Trial', '30-Day Trial',
]

// ── Add Transaction Drawer ─────────────────────────────────────────────────────
function AddTransactionDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const [memberQuery, setMemberQuery]   = useState('')
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [plan, setPlan]       = useState('')
  const [method, setMethod]   = useState<TxMethod>('Stripe')
  const [amount, setAmount]   = useState('')
  const [date, setDate]       = useState('')
  const [status, setStatus]   = useState<TxStatus>('Paid')
  const [notes, setNotes]     = useState('')

  const filteredMembers = MEMBERS.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setPlan(''); setMethod('Stripe'); setAmount(''); setDate(''); setStatus('Paid'); setNotes('')
  }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = selectedMember && plan && amount && date

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E5E7EB', borderRadius: 10,
    padding: '9px 12px', fontSize: 13, color: '#111827', background: '#fff', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5,
  }

  return (
    <>
      <div className="fixed inset-0 z-40 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.35)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={handleClose} />

      <div className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: 'min(560px,96vw)', background: '#F9FAFB',
          boxShadow: '-4px 0 32px rgba(0,0,0,0.12)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
              Add Transaction
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              Record a payment manually for any member
            </p>
          </div>
          <button onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Member picker */}
          <div className="relative">
            <label style={labelStyle}>Member</label>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
                <div className="flex items-center gap-2.5">
                  <img src={selectedMember.avatar} alt={selectedMember.name}
                    className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMember.name}</p>
                    <p style={{ fontSize: 11, color: '#6B7280' }}>{selectedMember.email}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedMember(null); setMemberQuery('') }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ background: 'transparent', border: 'none' }}>
                  <X size={13} style={{ color: '#6B7280' }} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{ border: '1px solid #E5E7EB', background: '#fff' }}>
                  <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                  <input
                    type="text" placeholder="Search by name or email…"
                    value={memberQuery}
                    onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ border: 'none', background: 'transparent', outline: 'none',
                      fontSize: 13, color: '#374151', width: '100%' }} />
                </div>
                {showDropdown && filteredMembers.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                    <div className="absolute left-0 right-0 rounded-xl z-20 overflow-hidden mt-1"
                      style={{ background: '#fff', border: '1px solid #E5E7EB',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 220, overflowY: 'auto' }}>
                      {filteredMembers.map(m => (
                        <button key={m.id}
                          onClick={() => { setSelectedMember(m); setMemberQuery(''); setShowDropdown(false) }}
                          className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                          style={{ background: 'transparent', border: 'none' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                          <img src={m.avatar} alt={m.name}
                            className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                            <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Plan */}
          <div>
            <label style={labelStyle}>Membership Plan</label>
            <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
              <option value="">Select a plan…</option>
              {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Amount + Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Amount (€)</label>
              <input type="number" placeholder="65.00" min={0} step={0.01}
                value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={method} onChange={e => setMethod(e.target.value as TxMethod)} style={inputStyle}>
                {(['Stripe', 'Cash', 'Transfer', 'Free'] as TxMethod[]).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TxStatus)} style={inputStyle}>
                {(['Paid', 'Pending', 'Failed', 'Refunded'] as TxStatus[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Internal notes about this payment…"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          {/* Status preview */}
          {canSubmit && (
            <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                Summary
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Member', value: selectedMember!.name },
                  { label: 'Plan', value: plan },
                  { label: 'Amount', value: '€' + parseFloat(amount || '0').toFixed(2) },
                  { label: 'Method', value: method },
                  { label: 'Status', value: status },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{row.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose}
            className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleSuccess} disabled={!canSubmit}
            className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />
            Add Transaction
          </button>
        </div>
      </div>
    </>
  )
}

// ── Success toast ──────────────────────────────────────────────────────────────
function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: '#F0FDF4' }}>
        <Check size={14} style={{ color: '#16A34A' }} strokeWidth={3} />
      </div>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{message}</p>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}>
        <X size={13} style={{ color: '#9CA3AF' }} />
      </button>
    </div>
  )
}

const ITEMS_PER_PAGE = 10

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Nav ────────────────────────────────────────────────────────────────────────
type NavItem = { label: string; icon: React.ElementType; href?: string; children?: { label: string; href: string }[] }
const ACTIVE_HREF = '/dashboard/payments/transactions'

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
    { label: 'Transactions',   href: '/dashboard/payments/transactions' },
    { label: 'Subscriptions',  href: '/dashboard/payments/subscriptions' },
  ]},
  { label: 'School',      icon: School,     children: [
    { label: 'Leads', href: '#' }, { label: 'Store', href: '#' },
    { label: 'Curriculum', href: '#' }, { label: 'Affiliates', href: '#' },
    { label: 'Staff', href: '#' }, { label: 'Waivers', href: '#' }, { label: 'Gradings', href: '#' },
  ]},
  { label: 'Reports',     icon: BarChart2,  children: [
    { label: 'Bookings', href: '#' }, { label: 'Gradings', href: '#' },
    { label: 'Payments', href: '#' }, { label: 'Balance', href: '#' },
    { label: 'Absents', href: '#' }, { label: 'Users', href: '#' },
  ]},
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
]
const NAV_BOTTOM: NavItem[] = [
  { label: 'Subscription',  icon: ShoppingBag, href: '#' },
  { label: 'Notifications', icon: Bell,        href: '#' },
  { label: 'Support',       icon: HelpCircle,  href: '#' },
]

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

// ── Main ───────────────────────────────────────────────────────────────────────
type Filter = 'All' | TxStatus

export default function TransactionsClient() {
  const [menuOpen, setMenuOpen]         = useState(false)
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = TRANSACTIONS.filter(t => {
    const matchFilter = activeFilter === 'All' || t.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || t.name.toLowerCase().includes(q) || t.ref.toLowerCase().includes(q) || t.membership.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalRevenue = TRANSACTIONS.filter(t => t.status === 'Paid').reduce((s, t) => s + t.amountRaw, 0)
  const totalPaid    = TRANSACTIONS.filter(t => t.status === 'Paid').length
  const totalPending = TRANSACTIONS.filter(t => t.status === 'Pending').length
  const totalFailed  = TRANSACTIONS.filter(t => t.status === 'Failed').length

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: 'Total Revenue',  value: '€' + totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 }), icon: TrendingUp,  color: '#16A34A', bg: '#F0FDF4', trend: '+8%',  trendUp: true  },
    { label: 'Paid',           value: String(totalPaid),    icon: Check,        color: '#0071E3', bg: '#EFF6FF', trend: '+12',  trendUp: true  },
    { label: 'Pending',        value: String(totalPending), icon: Clock,        color: '#D97706', bg: '#FFFBEB', trend: '2',    trendUp: false },
    { label: 'Failed',         value: String(totalFailed),  icon: AlertCircle,  color: '#DC2626', bg: '#FEF2F2', trend: '2',    trendUp: false },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',      label: 'All' },
    { id: 'Paid',     label: 'Paid' },
    { id: 'Pending',  label: 'Pending' },
    { id: 'Failed',   label: 'Failed' },
    { id: 'Refunded', label: 'Refunded' },
  ]

  return (
    <>
    <div className="min-h-screen flex"
      style={{ background: '#F9FAFB', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter',sans-serif" }}>
      <style>{`@media(min-width:768px){.dashboard-sidebar{transform:translateX(0)!important}}`}</style>

      {menuOpen && <div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className="dashboard-sidebar fixed top-0 left-0 h-full flex flex-col z-50"
        style={{ width: 232, background: '#fff', borderRight: '1px solid #E5E7EB',
          transform: menuOpen ? 'translateX(0)' : 'translateX(-232px)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0">
              <Image src="/martial-logo.png" alt="Martial" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', letterSpacing: '-0.01em' }}>MARTIAL</p>
              <p style={{ fontSize: 10, fontWeight: 500, color: '#9CA3AF', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Academy</p>
            </div>
          </div>
          <button className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(false)}>
            <X size={14} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_MAIN.map(item => <NavGroup key={item.label} item={item} />)}
        </nav>
        <div style={{ borderTop: '1px solid #E5E7EB' }} className="px-3 py-3 space-y-0.5">
          {NAV_BOTTOM.map(item => (
            <Link key={item.label} href={item.href ?? '#'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl no-underline"
              style={{ color: '#374151', fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <item.icon size={16} style={{ color: '#9CA3AF' }} />{item.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
              style={{ color: '#374151', fontSize: 14, background: 'transparent', border: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
              <LogOut size={16} style={{ color: '#9CA3AF' }} />Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 min-w-0 md:ml-[232px]">
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(o => !o)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search by name, ref or plan…" value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>

            <div className="flex-1" />

            <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, color: '#374151', whiteSpace: 'nowrap' }}>
              <Clock size={13} style={{ color: '#9CA3AF' }} />04 Jun 2026
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 13, fontWeight: 500, color: '#374151' }}>
              <Download size={14} />Export
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />Add Transaction
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Header */}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                Transactions
              </h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                All payment activity for your academy
              </p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(s => (
                <div key={s.label} className="rounded-2xl"
                  style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                      <s.icon size={16} style={{ color: s.color }} />
                    </div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11, fontWeight: 600,
                      background: s.trendUp ? '#F0FDF4' : '#FEF2F2',
                      color: s.trendUp ? '#16A34A' : '#DC2626',
                      padding: '2px 7px', borderRadius: 999 }}>
                      {s.trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      {s.trend}
                    </span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter tabs — NZZL underline style */}
            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-1">
                {FILTERS.map(f => {
                  const count = f.id === 'All' ? TRANSACTIONS.length : TRANSACTIONS.filter(t => t.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as TxStatus] : null
                  return (
                    <button key={f.id}
                      onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive && sc ? sc.bg : isActive ? '#F3F4F6' : '#F3F4F6',
                        color: isActive && sc ? sc.color : isActive ? '#374151' : '#9CA3AF' }}>
                        {count}
                      </span>
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0"
                          style={{ height: 2, background: '#0071E3', borderRadius: '2px 2px 0 0' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {[
                      { label: 'Member',      cls: '' },
                      { label: 'Plan',        cls: 'hidden md:table-cell' },
                      { label: 'Method',      cls: 'hidden sm:table-cell' },
                      { label: 'Amount',      cls: '' },
                      { label: 'Date',        cls: 'hidden lg:table-cell' },
                      { label: 'Ref',         cls: 'hidden xl:table-cell' },
                      { label: 'Status',      cls: '' },
                      { label: 'Actions',     cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF',
                          textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((tx, idx) => {
                    const sc = STATUS_MAP[tx.status]
                    const mc = METHOD_MAP[tx.method]
                    const StatusIcon = sc.icon
                    return (
                      <tr key={tx.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                        {/* Member */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={tx.avatar} alt={tx.name}
                              className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{tx.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{tx.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#374151' }}>{tx.membership}</span>
                        </td>

                        {/* Method */}
                        <td className="hidden sm:table-cell px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px',
                            borderRadius: 999, background: mc.bg, color: mc.color }}>
                            {mc.label}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                            {tx.amount}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{tx.date}</span>
                        </td>

                        {/* Ref */}
                        <td className="hidden xl:table-cell px-5 py-3">
                          <span style={{ fontSize: 11, color: '#C4C9D4', fontFamily: 'monospace' }}>{tx.ref}</span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border,
                              whiteSpace: 'nowrap' }}>
                            <StatusIcon size={9} strokeWidth={3} />
                            {tx.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3 relative">
                          <div className="flex items-center gap-1">
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === tx.id ? null : tx.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === tx.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                {[
                                  { label: 'View details',  danger: false },
                                  { label: 'Download receipt', danger: false },
                                  ...(tx.status === 'Paid' ? [{ label: 'Refund', danger: true }] : []),
                                  ...(tx.status === 'Failed' ? [{ label: 'Retry payment', danger: false }] : []),
                                ].map(({ label, danger }) => (
                                  <button key={label} onClick={() => setOpenMenuId(null)}
                                    className="w-full text-left px-4 py-2.5 cursor-pointer flex items-center gap-2"
                                    style={{ fontSize: 13, color: danger ? '#DC2626' : '#374151',
                                      background: 'transparent', border: 'none' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = danger ? '#FEF2F2' : '#F9FAFB'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <CreditCard size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>No transactions found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing{' '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {filtered.length === 0 ? 0 : (safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                  </span>
                  {' of '}
                  <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>
                    Prev
                  </button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                        : (
                          <button key={p} onClick={() => setCurrentPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>
                            {p}
                          </button>
                        )
                    )}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <AddTransactionDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message="Transaction recorded successfully" onClose={() => setToast(false)} />}
    </>
  )
}
