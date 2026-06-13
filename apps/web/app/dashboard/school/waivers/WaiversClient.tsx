'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, Check, TrendingUp, TrendingDown, MoreHorizontal, Eye, Plus, FileText, Download, Send} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'

type WaiverType = 'Liability' | 'Medical' | 'Photo Release' | 'Minor'
type WaiverStatus = 'Signed' | 'Pending' | 'Expired'

interface Waiver {
  id: number
  avatar: string
  name: string
  email: string
  type: WaiverType
  signedDate: string
  expiryDate: string
  status: WaiverStatus
}

const WAIVERS: Waiver[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=fn',  name:'Fernanda Neves',    email:'fernanda@mail.com',  type:'Liability',    signedDate:'01 Jan 2025', expiryDate:'01 Jan 2027', status:'Signed'  },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=pm',  name:'Patricia Mancera',  email:'patricia@mail.com',  type:'Medical',      signedDate:'15 Feb 2025', expiryDate:'15 Feb 2027', status:'Signed'  },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=mt',  name:'Matias Toloza',     email:'matias@mail.com',    type:'Liability',    signedDate:'',            expiryDate:'',            status:'Pending' },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=fw',  name:'Florian Walter',    email:'florian@mail.com',   type:'Photo Release',signedDate:'10 Mar 2024', expiryDate:'10 Mar 2025', status:'Expired' },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=ad',  name:'Alejandro DB',      email:'alejandro@mail.com', type:'Liability',    signedDate:'20 Apr 2025', expiryDate:'20 Apr 2027', status:'Signed'  },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=rg',  name:'Rafael Gonzalez',   email:'rafael@mail.com',    type:'Medical',      signedDate:'',            expiryDate:'',            status:'Pending' },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=ma',  name:'Miguel Ángel Ruiz', email:'miguel@mail.com',    type:'Liability',    signedDate:'05 May 2025', expiryDate:'05 May 2027', status:'Signed'  },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=ls',  name:'Laura Sánchez',     email:'laura@mail.com',     type:'Minor',        signedDate:'12 Jun 2024', expiryDate:'12 Jun 2025', status:'Expired' },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=jk',  name:'James Kim',         email:'james@mail.com',     type:'Liability',    signedDate:'18 Jul 2025', expiryDate:'18 Jul 2027', status:'Signed'  },
  { id:10, avatar:'https://i.pravatar.cc/32?u=sg',  name:'Sara García',       email:'sara@mail.com',      type:'Photo Release',signedDate:'22 Aug 2025', expiryDate:'22 Aug 2027', status:'Signed'  },
  { id:11, avatar:'https://i.pravatar.cc/32?u=dt',  name:'Diego Torres',      email:'diego@mail.com',     type:'Medical',      signedDate:'',            expiryDate:'',            status:'Pending' },
  { id:12, avatar:'https://i.pravatar.cc/32?u=ab',  name:'Ana Belén López',   email:'ana@mail.com',       type:'Minor',        signedDate:'30 Sep 2025', expiryDate:'30 Sep 2027', status:'Signed'  },
  { id:13, avatar:'https://i.pravatar.cc/32?u=cr',  name:'Carlos Romero',     email:'carlos@mail.com',    type:'Liability',    signedDate:'05 Oct 2024', expiryDate:'05 Oct 2025', status:'Expired' },
  { id:14, avatar:'https://i.pravatar.cc/32?u=vp',  name:'Valeria Pérez',     email:'valeria@mail.com',   type:'Liability',    signedDate:'11 Nov 2025', expiryDate:'11 Nov 2027', status:'Signed'  },
  { id:15, avatar:'https://i.pravatar.cc/32?u=hm',  name:'Hugo Martínez',     email:'hugo@mail.com',      type:'Medical',      signedDate:'20 Dec 2025', expiryDate:'20 Dec 2027', status:'Signed'  },
  { id:16, avatar:'https://i.pravatar.cc/32?u=io',  name:'Irina Okonkwo',     email:'irina@mail.com',     type:'Photo Release',signedDate:'',            expiryDate:'',            status:'Pending' },
]

const STATUS_MAP: Record<WaiverStatus, { bg: string; color: string; border: string }> = {
  Signed:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Pending: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  Expired: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
}

const TYPE_MAP: Record<WaiverType, { bg: string; color: string }> = {
  'Liability':    { bg: '#EFF6FF', color: '#2563EB' },
  'Medical':      { bg: '#F0FDF4', color: '#15803D' },
  'Photo Release':{ bg: '#FDF2F8', color: '#9D174D' },
  'Minor':        { bg: '#FFFBEB', color: '#D97706' },
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

function AddWaiverDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [memberQuery, setMemberQuery]       = useState('')
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [waiverType, setWaiverType]         = useState<WaiverType | ''>('')
  const [sendMethod, setSendMethod]         = useState('Email')
  const [notes, setNotes]                   = useState('')

  const filteredMembers = MEMBERS.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setWaiverType(''); setSendMethod('Email'); setNotes('')
  }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = selectedMember && waiverType

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Send Waiver</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Send a waiver to a member for signature</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
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
                  <input type="text" placeholder="Search member…"
                    value={memberQuery}
                    onChange={e => { setMemberQuery(e.target.value); setShowDropdown(true) }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
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
                          <img src={m.avatar} alt={m.name} className="rounded-full shrink-0" style={{ width: 28, height: 28 }} />
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Waiver Type</label>
              <select value={waiverType} onChange={e => setWaiverType(e.target.value as WaiverType)} style={inputStyle}>
                <option value="">Select type…</option>
                {(['Liability','Medical','Photo Release','Minor'] as WaiverType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Send Method</label>
              <select value={sendMethod} onChange={e => setSendMethod(e.target.value)} style={inputStyle}>
                <option value="Email">Email</option>
                <option value="SMS">SMS</option>
                <option value="In Person">In Person</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Notes about this waiver…" value={notes} onChange={e => setNotes(e.target.value)}
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
            <Send size={14} />Send Waiver
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

type Filter = 'All' | WaiverStatus

export default function WaiversClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = WAIVERS.filter(w => {
    const matchFilter = activeFilter === 'All' || w.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || w.name.toLowerCase().includes(q) || w.email.toLowerCase().includes(q) || w.type.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalWaivers  = WAIVERS.length
  const signed        = WAIVERS.filter(w => w.status === 'Signed').length
  const pending       = WAIVERS.filter(w => w.status === 'Pending').length
  const expired       = WAIVERS.filter(w => w.status === 'Expired').length

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.school.totalWaivers, value: String(totalWaivers), icon: FileText,    color: '#0071E3', bg: '#EFF6FF', trend: '+4',  trendUp: true  },
    { label: t.school.signed,       value: String(signed),       icon: Check,       color: '#16A34A', bg: '#F0FDF4', trend: '+3',  trendUp: true  },
    { label: t.common.pending,      value: String(pending),      icon: TrendingDown, color: '#D97706', bg: '#FFFBEB', trend: String(pending), trendUp: false },
    { label: 'Expired',             value: String(expired),      icon: TrendingDown, color: '#DC2626', bg: '#FEF2F2', trend: String(expired), trendUp: false },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',     label: t.common.all     },
    { id: 'Signed',  label: t.school.signed  },
    { id: 'Pending', label: t.common.pending },
    { id: 'Expired', label: 'Expired'        },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder={t.school.searchWaivers} value={search}
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
              <Plus size={15} />Send Waiver
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.waiversTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Track member waivers and signatures</p>
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
                  const count = f.id === 'All' ? WAIVERS.length : WAIVERS.filter(w => w.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as WaiverStatus] : null
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
                    {[
                      { label: 'Member',      cls: '' },
                      { label: 'Type',        cls: '' },
                      { label: 'Signed',      cls: 'hidden md:table-cell' },
                      { label: 'Expires',     cls: 'hidden md:table-cell' },
                      { label: 'Status',      cls: '' },
                      { label: 'Actions',     cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((waiver, idx) => {
                    const sc  = STATUS_MAP[waiver.status]
                    const tc  = TYPE_MAP[waiver.type]
                    return (
                      <tr key={waiver.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={waiver.avatar} alt={waiver.name} className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{waiver.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{waiver.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: tc.bg, color: tc.color, whiteSpace: 'nowrap' }}>
                            {waiver.type}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{waiver.signedDate || '—'}</span>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{waiver.expiryDate || '—'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                            {waiver.status}
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
                            <button className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <Download size={14} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === waiver.id ? null : waiver.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === waiver.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                {['View waiver','Download PDF','Resend','Delete'].map((label, i) => (
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
                        <FileText size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noWaivers}</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                              color: p === safePage ? '#111827' : '#6B7280' }}>
                            {p}
                          </button>
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
      <AddWaiverDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
      {toast && <SuccessToast message="Waiver sent successfully" onClose={() => setToast(false)} />}
    </main>
  )
}
