'use client'

import { useState } from 'react'
import {
  Bell,
  Menu, X, Search, Check, TrendingUp, TrendingDown,
  MoreHorizontal, Eye, Plus, Users, Award,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'
type Filter = string

type StaffRole = 'Head Instructor' | 'Instructor' | 'Assistant' | 'Admin' | 'Receptionist'
type StaffStatus = 'Active' | 'On Leave' | 'Inactive'

interface StaffMember {
  id: number
  avatar: string
  name: string
  email: string
  role: StaffRole
  belt: string
  classes: string[]
  salary: string
  since: string
  status: StaffStatus
}

const STAFF: StaffMember[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?u=s1',  name:'Carlos Silva',      email:'carlos.s@academy.com',  role:'Head Instructor', belt:'Black',  classes:['Mon 7pm','Wed 7pm','Fri 7pm'], salary:'€3,500',  since:'Jan 2018', status:'Active'   },
  { id:2,  avatar:'https://i.pravatar.cc/32?u=s2',  name:'Ana Rodrigues',     email:'ana.r@academy.com',     role:'Instructor',      belt:'Black',  classes:['Tue 6pm','Thu 6pm'],           salary:'€2,800',  since:'Mar 2019', status:'Active'   },
  { id:3,  avatar:'https://i.pravatar.cc/32?u=s3',  name:'Marcos Freitas',    email:'marcos.f@academy.com',  role:'Instructor',      belt:'Brown',  classes:['Sat 10am','Sun 10am'],         salary:'€2,200',  since:'Jun 2021', status:'Active'   },
  { id:4,  avatar:'https://i.pravatar.cc/32?u=s4',  name:'Sofia Lopes',       email:'sofia.l@academy.com',   role:'Assistant',       belt:'Purple', classes:['Mon 6pm','Wed 6pm'],           salary:'€1,500',  since:'Sep 2022', status:'Active'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?u=s5',  name:'Diego Almeida',     email:'diego.a@academy.com',   role:'Assistant',       belt:'Blue',   classes:['Tue 5pm'],                     salary:'€1,200',  since:'Jan 2023', status:'Active'   },
  { id:6,  avatar:'https://i.pravatar.cc/32?u=s6',  name:'Laura Torres',      email:'laura.t@academy.com',   role:'Admin',           belt:'White',  classes:[],                              salary:'€1,800',  since:'Feb 2020', status:'Active'   },
  { id:7,  avatar:'https://i.pravatar.cc/32?u=s7',  name:'Pedro Gomes',       email:'pedro.g@academy.com',   role:'Receptionist',    belt:'White',  classes:[],                              salary:'€1,200',  since:'Apr 2022', status:'On Leave' },
  { id:8,  avatar:'https://i.pravatar.cc/32?u=s8',  name:'Inês Carvalho',     email:'ines.c@academy.com',    role:'Admin',           belt:'White',  classes:[],                              salary:'€1,800',  since:'Jul 2021', status:'Active'   },
  { id:9,  avatar:'https://i.pravatar.cc/32?u=s9',  name:'Tiago Mendes',      email:'tiago.m@academy.com',   role:'Instructor',      belt:'Brown',  classes:['Thu 7pm','Sat 12pm'],          salary:'€2,400',  since:'Nov 2020', status:'Inactive' },
  { id:10, avatar:'https://i.pravatar.cc/32?u=s10', name:'Beatriz Santos',    email:'beatriz.s@academy.com', role:'Assistant',       belt:'Purple', classes:['Fri 6pm'],                     salary:'€1,400',  since:'Mar 2023', status:'Active'   },
]

const ROLE_MAP: Record<StaffRole, { bg: string; color: string }> = {
  'Head Instructor': { bg: '#FDF2F8', color: '#9D174D' },
  'Instructor':      { bg: '#EFF6FF', color: '#2563EB' },
  'Assistant':       { bg: '#F5F3FF', color: '#6D28D9' },
  'Admin':           { bg: '#F0FDF4', color: '#15803D' },
  'Receptionist':    { bg: '#FFFBEB', color: '#D97706' },
}

const BELT_MAP: Record<string, { bg: string; color: string }> = {
  'White':  { bg: '#F9FAFB', color: '#374151' },
  'Blue':   { bg: '#EFF6FF', color: '#2563EB' },
  'Purple': { bg: '#F5F3FF', color: '#6D28D9' },
  'Brown':  { bg: '#FEF3C7', color: '#92400E' },
  'Black':  { bg: '#F3F4F6', color: '#111827' },
}

const STATUS_MAP: Record<StaffStatus, { bg: string; color: string; border: string }> = {
  'Active':   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'On Leave': { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  'Inactive': { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
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

function AddStaffDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [memberQuery, setMemberQuery]       = useState('')
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null)
  const [showDropdown, setShowDropdown]     = useState(false)
  const [role, setRole]                     = useState<StaffRole | ''>('')
  const [belt, setBelt]                     = useState('')
  const [salary, setSalary]                 = useState('')
  const [startDate, setStartDate]           = useState('')
  const [notes, setNotes]                   = useState('')

  const filteredMembers = MEMBERS.filter(m =>
    memberQuery === '' ||
    m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(memberQuery.toLowerCase())
  )

  function reset() {
    setMemberQuery(''); setSelectedMember(null); setShowDropdown(false)
    setRole(''); setBelt(''); setSalary(''); setStartDate(''); setNotes('')
  }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = selectedMember && role && belt && startDate

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>Add Staff Member</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Add a new staff member to your academy</p>
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
              <label style={labelStyle}>Role</label>
              <select value={role} onChange={e => setRole(e.target.value as StaffRole)} style={inputStyle}>
                <option value="">Select role…</option>
                {(['Head Instructor','Instructor','Assistant','Admin','Receptionist'] as StaffRole[]).map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Belt</label>
              <select value={belt} onChange={e => setBelt(e.target.value)} style={inputStyle}>
                <option value="">Select belt…</option>
                {['White','Blue','Purple','Brown','Black'].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Monthly Salary (€)</label>
              <input type="number" placeholder="2000" min={0} value={salary} onChange={e => setSalary(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Notes about this staff member…" value={notes} onChange={e => setNotes(e.target.value)}
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
            <Plus size={14} />Add Staff
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

export default function StaffClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = STAFF.filter(s => {
    const matchFilter = activeFilter === 'All'
      ? true
      : activeFilter === 'Instructors'
        ? ['Head Instructor','Instructor','Assistant'].includes(s.role)
        : ['Admin','Receptionist'].includes(s.role)
    const q = search.toLowerCase()
    const matchSearch = search === '' || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalStaff    = STAFF.length
  const instructors   = STAFF.filter(s => ['Head Instructor','Instructor'].includes(s.role)).length
  const activeCount   = STAFF.filter(s => s.status === 'Active').length
  const avgClasses    = Math.round(STAFF.filter(s => s.classes.length > 0).reduce((sum, s) => sum + s.classes.length, 0) / STAFF.filter(s => s.classes.length > 0).length)

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.school.totalStaff,   value: String(totalStaff),  icon: Users,       color: '#0071E3', bg: '#EFF6FF', trend: '+1',  trendUp: true  },
    { label: t.school.instructors,  value: String(instructors), icon: Award,       color: '#6D28D9', bg: '#F5F3FF', trend: '+1',  trendUp: true  },
    { label: t.common.active,       value: String(activeCount), icon: Check,       color: '#16A34A', bg: '#F0FDF4', trend: '+1',  trendUp: true  },
    { label: 'Avg Classes/Week',    value: String(avgClasses),  icon: TrendingUp,  color: '#D97706', bg: '#FFFBEB', trend: '~3',  trendUp: true  },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',         label: t.common.all          },
    { id: 'Instructors', label: t.school.instructors  },
    { id: 'Admin',       label: t.school.admin        },
  ]

  return (
    <>
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder={t.school.searchStaff} value={search}
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
              <Plus size={15} />{t.school.addStaff}
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.staffTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.school.staffSubtitle}</p>
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
                  const count = f.id === 'All' ? STAFF.length
                    : f.id === 'Instructors' ? STAFF.filter(s => ['Head Instructor','Instructor','Assistant'].includes(s.role)).length
                    : STAFF.filter(s => ['Admin','Receptionist'].includes(s.role)).length
                  const isActive = activeFilter === f.id
                  return (
                    <button key={f.id} onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer relative"
                      style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                        background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                      {f.label}
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                        background: isActive ? '#EFF6FF' : '#F3F4F6',
                        color: isActive ? '#2563EB' : '#9CA3AF' }}>
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
                      { label: t.common.member,       cls: '' },
                      { label: t.school.colRole,      cls: '' },
                      { label: 'Belt',                cls: 'hidden sm:table-cell' },
                      { label: t.school.colClasses,   cls: 'hidden lg:table-cell' },
                      { label: t.common.startDate,    cls: 'hidden md:table-cell' },
                      { label: t.common.status,       cls: '' },
                      { label: t.common.actions,      cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((member, idx) => {
                    const rolec = ROLE_MAP[member.role]
                    const beltc = BELT_MAP[member.belt] ?? { bg: '#F3F4F6', color: '#374151' }
                    const sc    = STATUS_MAP[member.status]
                    return (
                      <tr key={member.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <img src={member.avatar} alt={member.name} className="rounded-full shrink-0" style={{ width: 32, height: 32 }} />
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{member.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: rolec.bg, color: rolec.color, whiteSpace: 'nowrap' }}>
                            {member.role}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                            background: beltc.bg, color: beltc.color }}>
                            {member.belt}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-5 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {member.classes.slice(0,2).map(cls => (
                              <span key={cls} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999,
                                background: '#F3F4F6', color: '#374151' }}>
                                {cls}
                              </span>
                            ))}
                            {member.classes.length > 2 && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 999,
                                background: '#F3F4F6', color: '#9CA3AF' }}>
                                +{member.classes.length - 2}
                              </span>
                            )}
                            {member.classes.length === 0 && (
                              <span style={{ fontSize: 11, color: '#9CA3AF' }}>—</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{member.since}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                            {member.status}
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
                            <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === member.id ? null : member.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === member.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                {['View profile','Edit details','Remove staff'].map((label, i) => (
                                  <button key={label} onClick={() => setOpenMenuId(null)}
                                    className="w-full text-left px-4 py-2.5 cursor-pointer"
                                    style={{ fontSize: 13, color: i === 2 ? '#DC2626' : '#374151',
                                      background: 'transparent', border: 'none' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = i === 2 ? '#FEF2F2' : '#F9FAFB'}
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
                        <Users size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noStaff}</p>
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
      </main>

    <AddStaffDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message="Staff member added successfully" onClose={() => setToast(false)} />}
    </>
  )
}
