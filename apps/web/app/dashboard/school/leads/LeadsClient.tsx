'use client'

import { useState } from 'react'
import {
  Bell, Filter, ChevronDown,
  Menu, X, Search, Check, TrendingUp, TrendingDown,
  MoreHorizontal, Eye, Plus, UserPlus,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'

type Filter = 'All' | LeadStatus
type LeadStatus = 'New' | 'Contacted' | 'Trial' | 'Converted' | 'Lost'
type LeadSource = 'Instagram' | 'Referral' | 'Walk-in' | 'Website' | 'Google'

interface Lead {
  id: number
  avatar: string
  name: string
  email: string
  phone: string
  source: LeadSource
  status: LeadStatus
  date: string
  notes: string
}

const LEADS: Lead[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=l1',  name:'Carlos Mendez',      email:'carlos.m@mail.com',    phone:'+34 611 222 333', source:'Instagram', status:'New',       date:'02 Jun 2026', notes:'Interested in adults BJJ' },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=l2',  name:'Sofia Reyes',         email:'sofia.r@mail.com',     phone:'+34 622 333 444', source:'Referral',  status:'Trial',     date:'01 Jun 2026', notes:'Friend of Fernanda Neves' },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=l3',  name:'Marco Bianchi',       email:'marco.b@mail.com',     phone:'+39 331 444 555', source:'Google',    status:'Contacted', date:'31 May 2026', notes:'Trial booked for Thursday' },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=l4',  name:'Ana Lima',            email:'ana.l@mail.com',       phone:'+34 633 555 666', source:'Website',   status:'Converted', date:'30 May 2026', notes:'Signed up for Mensual plan' },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=l5',  name:'Pedro Alves',         email:'pedro.a@mail.com',     phone:'+34 644 666 777', source:'Walk-in',   status:'New',       date:'29 May 2026', notes:'Walked in, interested in NoGi' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=l6',  name:'Lucia Fernandez',     email:'lucia.f@mail.com',     phone:'+34 655 777 888', source:'Instagram', status:'Contacted', date:'28 May 2026', notes:'DM on Instagram, replied' },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=l7',  name:'Andrei Popescu',      email:'andrei.p@mail.com',    phone:'+40 721 888 999', source:'Google',    status:'Lost',      date:'27 May 2026', notes:'No response after 2 follow-ups' },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=l8',  name:'Mei Chen',            email:'mei.c@mail.com',       phone:'+34 666 999 000', source:'Referral',  status:'Converted', date:'26 May 2026', notes:'Referred by Rafael Gonzalez' },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=l9',  name:'Ivan Petrov',         email:'ivan.p@mail.com',      phone:'+7 900 111 222',  source:'Website',   status:'Trial',     date:'25 May 2026', notes:'Trial next Monday' },
  { id:10, avatar:'https://i.pravatar.cc/32?u=l10', name:'Amira Hassan',        email:'amira.h@mail.com',     phone:'+34 677 000 111', source:'Instagram', status:'New',       date:'24 May 2026', notes:'Saw reel on Instagram' },
  { id:11, avatar:'https://i.pravatar.cc/32?u=l11', name:'Tomas Novak',         email:'tomas.n@mail.com',     phone:'+34 688 111 222', source:'Walk-in',   status:'Contacted', date:'23 May 2026', notes:'Left contact info at desk' },
  { id:12, avatar:'https://i.pravatar.cc/32?u=l12', name:'Elena Vasquez',       email:'elena.v@mail.com',     phone:'+34 699 222 333', source:'Referral',  status:'Converted', date:'22 May 2026', notes:'Joined Kids Family plan' },
  { id:13, avatar:'https://i.pravatar.cc/32?u=l13', name:'David Müller',        email:'david.m@mail.com',     phone:'+49 151 333 444', source:'Google',    status:'New',       date:'21 May 2026', notes:'Found via Google Maps' },
  { id:14, avatar:'https://i.pravatar.cc/32?u=l14', name:'Clara Dubois',        email:'clara.d@mail.com',     phone:'+33 612 444 555', source:'Website',   status:'Lost',      date:'20 May 2026', notes:'Chose another school' },
  { id:15, avatar:'https://i.pravatar.cc/32?u=l15', name:'Rui Santos',          email:'rui.s@mail.com',       phone:'+34 600 555 666', source:'Referral',  status:'Trial',     date:'19 May 2026', notes:'Coming in this week' },
]

const STATUS_MAP: Record<LeadStatus, { bg: string; color: string; border: string }> = {
  New:       { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  Contacted: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  Trial:     { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  Converted: { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Lost:      { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}

const SOURCE_MAP: Record<LeadSource, { bg: string; color: string }> = {
  Instagram: { bg: '#FDF2F8', color: '#9D174D' },
  Referral:  { bg: '#F0FDF4', color: '#15803D' },
  'Walk-in': { bg: '#FFF7ED', color: '#C2410C' },
  Website:   { bg: '#EFF6FF', color: '#2563EB' },
  Google:    { bg: '#FEF2F2', color: '#DC2626' },
}

const MEMBERS = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',    email:'fernanda@mail.com'  },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',  email:'patricia@mail.com'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',     email:'matias@mail.com'    },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',    email:'florian@mail.com'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',      email:'alejandro@mail.com' },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',   email:'rafael@mail.com'    },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz', email:'miguel@mail.com'    },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',     email:'laura@mail.com'     },
]

function AddLeadDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [source, setSource] = useState<LeadSource | ''>('')
  const [notes, setNotes]   = useState('')

  function reset() { setName(''); setEmail(''); setPhone(''); setSource(''); setNotes('') }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = name && email && source

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
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Add Lead</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Track a new prospective member</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Full Name</label>
            <input type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="john@mail.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input type="tel" placeholder="+34 600 000 000" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Source</label>
            <select value={source} onChange={e => setSource(e.target.value as LeadSource)} style={inputStyle}>
              <option value="">Select source…</option>
              {(['Instagram','Referral','Walk-in','Website','Google'] as LeadSource[]).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Notes about this lead…" value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Cancel
          </button>
          <button onClick={handleSuccess} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />Add Lead
          </button>
        </div>
      </div>
    </>
  )
}

function SuccessToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#fff', border: '1px solid #BBF7D0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#F0FDF4' }}>
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

export default function LeadsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = LEADS.filter(l => {
    const matchFilter = activeFilter === 'All' || l.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || l.source.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalLeads     = LEADS.length
  const newThisMonth   = LEADS.filter(l => l.status === 'New').length
  const converted      = LEADS.filter(l => l.status === 'Converted').length
  const convRate       = Math.round((converted / totalLeads) * 100)

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: 'Total Leads',      value: String(totalLeads),    icon: UserPlus,    color: '#0071E3', bg: '#EFF6FF', trend: '+5',   trendUp: true  },
    { label: 'New This Month',   value: String(newThisMonth),  icon: TrendingUp,  color: '#6D28D9', bg: '#F5F3FF', trend: '+3',   trendUp: true  },
    { label: 'Converted',        value: String(converted),     icon: Check,       color: '#16A34A', bg: '#F0FDF4', trend: '+2',   trendUp: true  },
    { label: 'Conversion Rate',  value: convRate + '%',         icon: TrendingUp,  color: '#D97706', bg: '#FFFBEB', trend: '+4%',  trendUp: true  },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',       label: 'All' },
    { id: 'New',       label: 'New' },
    { id: 'Contacted', label: 'Contacted' },
    { id: 'Trial',     label: 'Trial' },
    { id: 'Converted', label: 'Converted' },
    { id: 'Lost',      label: 'Lost' },
  ]

  return (
    <>
    <main style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder="Search leads…" value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
            </div>
            <div className="flex-1" />
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Bell size={15} style={{ color: '#374151' }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
            </button>
            <button onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
              style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              <Plus size={15} />Add Lead
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>Leads</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Track and manage prospective members</p>
            </div>

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
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div className="flex items-center gap-1">
                {FILTERS.map(f => {
                  const count = f.id === 'All' ? LEADS.length : LEADS.filter(l => l.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as LeadStatus] : null
                  return (
                    <button key={f.id} onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive && sc ? sc.bg : '#F3F4F6',
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

            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {['Member','Phone','Source','Date','Status','Actions'].map(h => (
                      <th key={h} className={`px-5 py-3 text-left ${h === 'Phone' ? 'hidden md:table-cell' : ''}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((lead, idx) => {
                    const sc = STATUS_MAP[lead.status]
                    const src = SOURCE_MAP[lead.source]
                    return (
                      <tr key={lead.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={lead.avatar} alt={lead.name} className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{lead.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{lead.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#374151' }}>{lead.phone}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: src.bg, color: src.color }}>
                            {lead.source}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{lead.date}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 relative">
                          <div className="flex items-center gap-1">
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Eye size={14} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === lead.id ? null : lead.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === lead.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                {['View details','Edit lead','Convert to member','Delete lead'].map((label, i) => (
                                  <button key={label} onClick={() => setOpenMenuId(null)}
                                    className="w-full text-left px-4 py-2.5 cursor-pointer"
                                    style={{ fontSize: 13, color: i === 3 ? '#DC2626' : '#374151',
                                      background: 'transparent', border: 'none' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = i === 3 ? '#FEF2F2' : '#F9FAFB'}
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <UserPlus size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>No leads found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                      borderRadius: 8, padding: '6px 12px' }}>Prev</button>
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
                      borderRadius: 8, padding: '6px 12px' }}>Next</button>
                </div>
              </div>
            </div>
          </div>
      </main>

    <AddLeadDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message="Lead added successfully" onClose={() => setToast(false)} />}
    </>
  )
}
