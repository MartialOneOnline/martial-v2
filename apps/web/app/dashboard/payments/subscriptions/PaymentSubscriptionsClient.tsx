'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Bell,
  Menu, X, Search, Check, Clock,
  TrendingUp, TrendingDown, RefreshCw, MoreHorizontal,
  Eye, PauseCircle, XCircle, Zap, Plus,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

// ── Types ──────────────────────────────────────────────────────────────────────
type SubStatus = 'Active' | 'Paused' | 'Cancelled' | 'Trial'

interface Subscription {
  id: number
  avatar: string
  name: string
  email: string
  belt: string
  plan: string
  planColor: string
  planBg: string
  amount: string
  amountRaw: number
  startDate: string
  nextBilling: string
  status: SubStatus
  daysLeft?: number
}

// ── Mock data ──────────────────────────────────────────────────────────────────
const SUBSCRIPTIONS: Subscription[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=rg2', name:'Rafael Gonzalez',   email:'rafael@mail.com',   belt:'Blue',   plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'01 Sep 2025', nextBilling:'01 Jul 2026', status:'Active'    },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=fw2', name:'Florian Walter',    email:'florian@mail.com',  belt:'White',  plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'15 Oct 2025', nextBilling:'15 Jun 2026', status:'Active'    },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=sg2', name:'Sara García',       email:'sara@mail.com',     belt:'Purple', plan:'Jiu Jitsu Trimestral', planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€180.00', amountRaw:180, startDate:'01 Apr 2026', nextBilling:'01 Jul 2026', status:'Active'    },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=ls2', name:'Laura Sánchez',     email:'laura@mail.com',    belt:'White',  plan:'Jiu Jitsu Infantil',   planColor:'#15803D', planBg:'#F0FDF4', amount:'€50.00',  amountRaw:50,  startDate:'08 Sep 2025', nextBilling:'08 Jul 2026', status:'Active'    },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=jk2', name:'James Kim',         email:'james@mail.com',    belt:'Blue',   plan:'Family Jiu Jitsu',     planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€100.00', amountRaw:100, startDate:'01 Nov 2025', nextBilling:'—',           status:'Cancelled' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=dt2', name:'Diego Torres',      email:'diego@mail.com',    belt:'White',  plan:'2 Semanas',            planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€35.00',  amountRaw:35,  startDate:'01 Jun 2026', nextBilling:'15 Jun 2026', status:'Active'    },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ab2', name:'Ana Belén López',   email:'ana@mail.com',      belt:'Brown',  plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'01 Jan 2025', nextBilling:'01 Jul 2026', status:'Active'    },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=vp2', name:'Valeria Pérez',     email:'valeria@mail.com',  belt:'Blue',   plan:'Jiu Jitsu Trimestral', planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€180.00', amountRaw:180, startDate:'01 May 2026', nextBilling:'01 Aug 2026', status:'Active'    },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=mt2', name:'Matias Toloza',     email:'matias@mail.com',   belt:'White',  plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'01 Jun 2026', nextBilling:'01 Jul 2026', status:'Paused'    },
  { id:10, avatar:'https://i.pravatar.cc/32?u=io2', name:'Irina Okonkwo',     email:'irina@mail.com',    belt:'Blue',   plan:'Family Jiu Jitsu',     planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€100.00', amountRaw:100, startDate:'15 Jan 2026', nextBilling:'15 Jun 2026', status:'Active'    },
  { id:11, avatar:'https://i.pravatar.cc/32?u=bw2', name:'Bruno Weber',       email:'bruno@mail.com',    belt:'White',  plan:'Jiu Jitsu Infantil',   planColor:'#15803D', planBg:'#F0FDF4', amount:'€50.00',  amountRaw:50,  startDate:'01 Mar 2026', nextBilling:'01 Jul 2026', status:'Active'    },
  { id:12, avatar:'https://i.pravatar.cc/32?u=cr2', name:'Carlos Romero',     email:'carlos@mail.com',   belt:'Purple', plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'01 Jun 2026', nextBilling:'01 Jul 2026', status:'Trial', daysLeft: 12  },
  { id:13, avatar:'https://i.pravatar.cc/32?u=hm2', name:'Hugo Martínez',     email:'hugo@mail.com',     belt:'White',  plan:'7-Day Free Trial',     planColor:'#6D28D9', planBg:'#F5F3FF', amount:'€0.00',   amountRaw:0,   startDate:'28 May 2026', nextBilling:'04 Jun 2026', status:'Trial', daysLeft: 4   },
  { id:14, avatar:'https://i.pravatar.cc/32?u=np2', name:'Nadia Portillo',    email:'nadia@mail.com',    belt:'Blue',   plan:'Jiu Jitsu Mensual',    planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€65.00',  amountRaw:65,  startDate:'01 Apr 2025', nextBilling:'—',           status:'Cancelled' },
  { id:15, avatar:'https://i.pravatar.cc/32?u=ma2', name:'Miguel Ángel Ruiz', email:'miguel@mail.com',   belt:'Black',  plan:'Jiu Jitsu Trimestral', planColor:'#1D4ED8', planBg:'#EFF6FF', amount:'€180.00', amountRaw:180, startDate:'01 Jan 2024', nextBilling:'01 Sep 2026', status:'Active'    },
]

const STATUS_MAP: Record<SubStatus, { bg: string; color: string; border: string; icon: React.ElementType; label: string }> = {
  Active:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: Check,       label: 'Active'    },
  Paused:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', icon: PauseCircle, label: 'Paused'    },
  Cancelled: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle,     label: 'Cancelled' },
  Trial:     { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE', icon: Zap,         label: 'Trial'     },
}

const BELT_COLORS: Record<string, { bg: string; color: string }> = {
  White:  { bg: '#F9FAFB', color: '#374151' },
  Blue:   { bg: '#EFF6FF', color: '#1D4ED8' },
  Purple: { bg: '#F5F3FF', color: '#6D28D9' },
  Brown:  { bg: '#FFF7ED', color: '#C2410C' },
  Black:  { bg: '#111827', color: '#F9FAFB' },
}

// ── Members for picker ─────────────────────────────────────────────────────────
const MEMBERS = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',     email:'fernanda@mail.com',  belt:'Blue'   },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',   email:'patricia@mail.com',  belt:'White'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',      email:'matias@mail.com',    belt:'Purple' },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',     email:'florian@mail.com',   belt:'Blue'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',       email:'alejandro@mail.com', belt:'Brown'  },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',    email:'rafael@mail.com',    belt:'White'  },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz',  email:'miguel@mail.com',    belt:'Black'  },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',      email:'laura@mail.com',     belt:'White'  },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=jk',  name:'James Kim',          email:'james@mail.com',     belt:'Blue'   },
  { id:10, avatar:'https://i.pravatar.cc/32?u=sg',  name:'Sara García',        email:'sara@mail.com',      belt:'Purple' },
  { id:11, avatar:'https://i.pravatar.cc/32?u=dt',  name:'Diego Torres',       email:'diego@mail.com',     belt:'White'  },
  { id:12, avatar:'https://i.pravatar.cc/32?u=ab',  name:'Ana Belén López',    email:'ana@mail.com',       belt:'Brown'  },
  { id:13, avatar:'https://i.pravatar.cc/32?u=cr',  name:'Carlos Romero',      email:'carlos@mail.com',    belt:'Purple' },
  { id:14, avatar:'https://i.pravatar.cc/32?u=vp',  name:'Valeria Pérez',      email:'valeria@mail.com',   belt:'Blue'   },
  { id:15, avatar:'https://i.pravatar.cc/32?u=hm',  name:'Hugo Martínez',      email:'hugo@mail.com',      belt:'White'  },
]

const PLAN_OPTIONS = [
  { name: 'Jiu Jitsu Mensual',    price: '€65.00',  billing: 'Every Month'     },
  { name: 'Jiu Jitsu Trimestral', price: '€180.00', billing: 'Every 3 Months'  },
  { name: 'Jiu Jitsu Infantil',   price: '€50.00',  billing: 'Every Month'     },
  { name: 'Family Jiu Jitsu',     price: '€100.00', billing: 'Every Month'     },
  { name: '2 Semanas',            price: '€35.00',  billing: 'Every 2 Weeks'   },
  { name: 'Kids Family',          price: '€0.00',   billing: 'Every Month'     },
  { name: '7-Day Free Trial',     price: '€0.00',   billing: '7 Days'          },
  { name: '30-Day Trial',         price: '€29.00',  billing: '30 Days'         },
]

// ── Add Subscription Drawer ────────────────────────────────────────────────────
function AddSubscriptionDrawer({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void
}) {
  const t = useT()
  const [memberQuery, setMemberQuery]       = useState('')
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [planName, setPlanName]             = useState('')
  const [amount, setAmount]                 = useState('')
  const [startDate, setStartDate]           = useState('')
  const [subStatus, setSubStatus]           = useState<SubStatus>('Active')
  const [notes, setNotes]                   = useState('')

  const filteredMembers = MEMBERS.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  const selectedPlan = PLAN_OPTIONS.find(p => p.name === planName)

  function handlePlanChange(name: string) {
    setPlanName(name)
    const p = PLAN_OPTIONS.find(p => p.name === name)
    if (p) setAmount(p.price.replace('€', ''))
  }

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setPlanName(''); setAmount(''); setStartDate(''); setSubStatus('Active'); setNotes('')
  }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = selectedMember && planName && startDate

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
              {t.paymentsPage.subscriptionsTitle}
            </h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
              {t.paymentsPage.subscriptionsSubtitle}
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
            <label style={labelStyle}>{t.paymentsPage.member}</label>
            {selectedMember ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ border: '1px solid #0071E3', background: '#EFF6FF' }}>
                <div className="flex items-center gap-2.5">
                  <img src={selectedMember.avatar} alt={selectedMember.name}
                    className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedMember.name}</p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                        background: BELT_COLORS[selectedMember.belt]?.bg ?? '#F9FAFB',
                        color: BELT_COLORS[selectedMember.belt]?.color ?? '#374151' }}>
                        {selectedMember.belt}
                      </span>
                    </div>
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
                    type="text" placeholder={t.paymentsPage.searchMember}
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
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                                background: BELT_COLORS[m.belt]?.bg ?? '#F9FAFB',
                                color: BELT_COLORS[m.belt]?.color ?? '#374151' }}>
                                {m.belt}
                              </span>
                            </div>
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
            <label style={labelStyle}>{t.paymentsPage.membershipPlan}</label>
            <select value={planName} onChange={e => handlePlanChange(e.target.value)} style={inputStyle}>
              <option value="">{t.paymentsPage.selectPlan}</option>
              {PLAN_OPTIONS.map(p => (
                <option key={p.name} value={p.name}>{p.name} — {p.price} / {p.billing}</option>
              ))}
            </select>
          </div>

          {/* Amount + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>{t.common.amount} (€)</label>
              <input type="number" placeholder="65.00" min={0} step={0.01}
                value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.common.status}</label>
              <select value={subStatus} onChange={e => setSubStatus(e.target.value as SubStatus)} style={inputStyle}>
                {(['Active', 'Trial', 'Paused'] as SubStatus[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label style={labelStyle}>{t.common.startDate}</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>{t.paymentsPage.notes} <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({t.common.optional})</span></label>
            <textarea rows={3} placeholder="Internal notes…"
              value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          {/* Summary */}
          {canSubmit && (
            <div className="rounded-xl p-4" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151',
                textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                {t.paymentsPage.summary}
              </p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Member',  value: selectedMember!.name },
                  { label: 'Plan',    value: planName },
                  { label: 'Amount',  value: '€' + parseFloat(amount || '0').toFixed(2) + (selectedPlan ? ' / ' + selectedPlan.billing : '') },
                  { label: 'Status',  value: subStatus },
                  { label: 'Starts',  value: startDate },
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
            {t.common.cancel}
          </button>
          <button onClick={handleSuccess} disabled={!canSubmit}
            className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />
            {t.paymentsPage.subscriptionsTitle}
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

// ── Main ───────────────────────────────────────────────────────────────────────
type Filter = 'All' | SubStatus

export default function PaymentSubscriptionsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = SUBSCRIPTIONS.filter(s => {
    const matchFilter = activeFilter === 'All' || s.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || s.name.toLowerCase().includes(q) || s.plan.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const mrr      = SUBSCRIPTIONS.filter(s => s.status === 'Active').reduce((sum, s) => sum + s.amountRaw, 0)
  const active   = SUBSCRIPTIONS.filter(s => s.status === 'Active').length
  const trials   = SUBSCRIPTIONS.filter(s => s.status === 'Trial').length
  const churned  = SUBSCRIPTIONS.filter(s => s.status === 'Cancelled').length

  const STATS = [
    { label: t.paymentsPage.activeNow,  value: String(active),   icon: Check,      color: '#16A34A', bg: '#F0FDF4', trend: '+3',  trendUp: true  },
    { label: t.paymentsPage.mrrLabel,   value: '€' + mrr.toLocaleString(), icon: TrendingUp, color: '#0071E3', bg: '#EFF6FF', trend: '+8%', trendUp: true  },
    { label: 'Trials',                  value: String(trials),   icon: Zap,        color: '#6D28D9', bg: '#F5F3FF', trend: String(trials), trendUp: true  },
    { label: t.paymentsPage.churn,      value: String(churned),  icon: TrendingDown,color: '#DC2626', bg: '#FEF2F2', trend: '-1',  trendUp: false },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',       label: t.common.all       },
    { id: 'Active',    label: t.common.active     },
    { id: 'Trial',     label: 'Trial'             },
    { id: 'Paused',    label: t.common.pending    },
    { id: 'Cancelled', label: t.common.cancelled  },
  ]

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  return (
    <>
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>

          {/* Topbar */}
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder={t.paymentsPage.searchSubs} value={search}
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
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} /><span className="hidden sm:inline">{t.paymentsPage.subscriptionsTitle}</span>
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">

            {/* Header */}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>
                {t.paymentsPage.subscriptionsTitle}
              </h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                {t.paymentsPage.subscriptionsSubtitle}
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

            {/* Filter tabs */}
            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-1">
                {FILTERS.map(f => {
                  const count = f.id === 'All' ? SUBSCRIPTIONS.length : SUBSCRIPTIONS.filter(s => s.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as SubStatus] : null
                  return (
                    <button key={f.id}
                      onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive && sc ? sc.bg : '#F3F4F6',
                        color: isActive && sc ? sc.color : '#9CA3AF' }}>
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
                      { label: t.common.member,                   cls: '' },
                      { label: t.paymentsPage.colPlan,            cls: 'hidden md:table-cell' },
                      { label: t.common.amount,                   cls: 'hidden sm:table-cell' },
                      { label: t.paymentsPage.colStarted,         cls: 'hidden lg:table-cell' },
                      { label: t.paymentsPage.colNextBilling,     cls: 'hidden lg:table-cell' },
                      { label: t.common.status,                   cls: '' },
                      { label: t.common.actions,                  cls: '' },
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
                  {paginated.map((sub, idx) => {
                    const sc  = STATUS_MAP[sub.status]
                    const bc  = BELT_COLORS[sub.belt] ?? BELT_COLORS['White']!
                    const StatusIcon = sc.icon
                    return (
                      <tr key={sub.id}
                        className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>

                        {/* Member */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={sub.avatar} alt={sub.name}
                              className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{sub.name}</p>
                                <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 99,
                                  background: bc.bg, color: bc.color, border: '1px solid ' + bc.bg,
                                  flexShrink: 0 }}>
                                  {sub.belt}
                                </span>
                              </div>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{sub.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan */}
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            background: sub.planBg, color: sub.planColor }}>
                            {sub.plan}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="hidden sm:table-cell px-5 py-3">
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>
                            {sub.amount}
                          </span>
                          <span style={{ fontSize: 11, color: '#9CA3AF' }}> /mo</span>
                        </td>

                        {/* Started */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{sub.startDate}</span>
                        </td>

                        {/* Next billing */}
                        <td className="hidden lg:table-cell px-5 py-3">
                          {sub.status === 'Trial' && sub.daysLeft !== undefined ? (
                            <span className="inline-flex items-center gap-1"
                              style={{ fontSize: 12, fontWeight: 600,
                                color: sub.daysLeft <= 3 ? '#DC2626' : '#D97706' }}>
                              <Clock size={11} />
                              {sub.daysLeft}d left
                            </span>
                          ) : (
                            <span style={{ fontSize: 13, color: sub.nextBilling === '—' ? '#D1D5DB' : '#374151' }}>
                              {sub.nextBilling}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border,
                              whiteSpace: 'nowrap' }}>
                            <StatusIcon size={9} strokeWidth={2.5} />
                            {sc.label}
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
                              onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === sub.id ? null : sub.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === sub.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 170, top: '100%' }}>
                                {[
                                  { label: 'View member',       danger: false },
                                  { label: 'Change plan',       danger: false },
                                  ...(sub.status === 'Active' ? [{ label: 'Pause subscription', danger: false }] : []),
                                  ...(sub.status === 'Paused'  ? [{ label: 'Resume',            danger: false }] : []),
                                  ...(sub.status === 'Trial'   ? [{ label: 'Convert to paid',   danger: false }] : []),
                                  { label: 'Cancel subscription', danger: true },
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <RefreshCw size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.paymentsPage.noSubscriptions}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  {t.common.showing}{' '}
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
                      borderRadius: 8, padding: '6px 12px' }}>{t.common.prev}</button>
                  <div className="flex items-center gap-1 mx-1">
                    {pages.map((p, i) =>
                      p === '...'
                        ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                        : (
                          <button key={p} onClick={() => setCurrentPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
                        )
                    )}
                  </div>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                      color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                      borderRadius: 8, padding: '6px 12px' }}>{t.common.next}</button>
                </div>
              </div>
            </div>
          </div>
      </main>

    <AddSubscriptionDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message={t.paymentsPage.txRecorded} onClose={() => setToast(false)} />}
    </>
  )
}
