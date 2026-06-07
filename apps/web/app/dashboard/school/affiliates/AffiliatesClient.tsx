'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, Check, TrendingUp, TrendingDown, MoreHorizontal, Eye, Plus, Globe} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'

type AffiliateStatus = 'Active' | 'Inactive' | 'Pending'

interface Affiliate {
  id: number
  name: string
  country: string
  city: string
  contact: string
  email: string
  students: number
  since: string
  status: AffiliateStatus
}

const AFFILIATES: Affiliate[] = [
  { id:1,  name:'BJJ Lisboa Academy',     country:'Portugal',    city:'Lisbon',      contact:'João Ferreira',   email:'joao@bjjlisboa.com',    students:45,  since:'Jan 2020', status:'Active'   },
  { id:2,  name:'Madrid Grappling Club',  country:'Spain',       city:'Madrid',      contact:'Luis Moreno',     email:'luis@madridgrappling.es',students:38,  since:'Mar 2021', status:'Active'   },
  { id:3,  name:'Paris BJJ Squad',        country:'France',      city:'Paris',       contact:'Pierre Laurent',  email:'pierre@parisbj.fr',      students:62,  since:'Jun 2019', status:'Active'   },
  { id:4,  name:'Berlin Jiu-Jitsu',       country:'Germany',     city:'Berlin',      contact:'Klaus Braun',     email:'klaus@berlinbjj.de',     students:29,  since:'Sep 2022', status:'Active'   },
  { id:5,  name:'Amsterdam Fight Lab',    country:'Netherlands', city:'Amsterdam',   contact:'Pieter van Dam',  email:'pieter@afightlab.nl',    students:0,   since:'Nov 2023', status:'Pending'  },
  { id:6,  name:'Rome Submission Arts',   country:'Italy',       city:'Rome',        contact:'Marco Rossi',     email:'marco@romesub.it',       students:33,  since:'Feb 2021', status:'Active'   },
  { id:7,  name:'Zurich Ground Zero',     country:'Switzerland', city:'Zurich',      contact:'Stefan Meier',    email:'stefan@groundzero.ch',   students:21,  since:'Jul 2022', status:'Active'   },
  { id:8,  name:'London BJJ Hub',         country:'UK',          city:'London',      contact:'James Wright',    email:'james@londonbjj.co.uk',  students:0,   since:'Jan 2024', status:'Pending'  },
  { id:9,  name:'Warsaw Combat Sports',   country:'Poland',      city:'Warsaw',      contact:'Piotr Kowalski',  email:'piotr@warsawcombat.pl',  students:0,   since:'Apr 2021', status:'Inactive' },
  { id:10, name:'Stockholm Grappling',    country:'Sweden',      city:'Stockholm',   contact:'Erik Lindqvist',  email:'erik@stockholmgrpl.se',  students:18,  since:'Aug 2023', status:'Active'   },
]

const STATUS_MAP: Record<AffiliateStatus, { bg: string; color: string; border: string }> = {
  Active:   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  Inactive: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  Pending:  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
}

function AddAffiliateDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useT()
  const [name, setName]       = useState('')
  const [city, setCity]       = useState('')
  const [country, setCountry] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail]     = useState('')
  const [notes, setNotes]     = useState('')

  function reset() { setName(''); setCity(''); setCountry(''); setContact(''); setEmail(''); setNotes('') }
  function handleClose() { reset(); onClose() }
  function handleSuccess() { reset(); onSuccess() }

  const canSubmit = name && city && country && contact && email

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{t.school.addAffiliate}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.school.affiliatesSubtitle}</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>School Name</label>
            <input type="text" placeholder="e.g. Berlin Jiu-Jitsu" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>City</label>
              <input type="text" placeholder="Berlin" value={city} onChange={e => setCity(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Country</label>
              <input type="text" placeholder="Germany" value={country} onChange={e => setCountry(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Contact Name</label>
              <input type="text" placeholder="Klaus Braun" value={contact} onChange={e => setContact(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Contact Email</label>
              <input type="email" placeholder="email@school.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span></label>
            <textarea rows={3} placeholder="Additional notes…" value={notes} onChange={e => setNotes(e.target.value)}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
        </div>
        <div className="px-6 py-4 flex items-center gap-3 justify-end shrink-0"
          style={{ background: '#fff', borderTop: '1px solid #E5E7EB' }}>
          <button onClick={handleClose} className="px-5 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            {t.common.cancel}
          </button>
          <button onClick={handleSuccess} disabled={!canSubmit} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />{t.school.addAffiliate}
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

type Filter = 'All' | AffiliateStatus

export default function AffiliatesClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [activeFilter, setActiveFilter] = useState<Filter>('All')
  const [search, setSearch]             = useState('')
  const [currentPage, setCurrentPage]   = useState(1)
  const [openMenuId, setOpenMenuId]     = useState<number | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toast, setToast]               = useState(false)

  const filtered = AFFILIATES.filter(a => {
    const matchFilter = activeFilter === 'All' || a.status === activeFilter
    const q = search.toLowerCase()
    const matchSearch = search === '' || a.name.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.country.toLowerCase().includes(q)
    return matchFilter && matchSearch
  })

  const totalAffiliates = AFFILIATES.length
  const activeCount     = AFFILIATES.filter(a => a.status === 'Active').length
  const pendingCount    = AFFILIATES.filter(a => a.status === 'Pending').length
  const totalStudents   = AFFILIATES.reduce((s, a) => s + a.students, 0)

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage   = Math.min(currentPage, totalPages)
  const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages      = getPaginationPages(safePage, totalPages)

  const STATS = [
    { label: t.school.totalAffiliates, value: String(totalAffiliates), icon: Globe,      color: '#0071E3', bg: '#EFF6FF', trend: '+1',  trendUp: true  },
    { label: t.common.active,          value: String(activeCount),     icon: Check,      color: '#16A34A', bg: '#F0FDF4', trend: '+1',  trendUp: true  },
    { label: t.common.pending,         value: String(pendingCount),    icon: TrendingDown, color: '#D97706', bg: '#FFFBEB', trend: String(pendingCount), trendUp: false },
    { label: 'Total Students',         value: String(totalStudents),   icon: Users,      color: '#6D28D9', bg: '#F5F3FF', trend: '+12', trendUp: true  },
  ]

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'All',      label: t.common.all      },
    { id: 'Active',   label: t.common.active   },
    { id: 'Pending',  label: t.common.pending  },
    { id: 'Inactive', label: t.common.inactive },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: "100%", overflow: "auto" }}>
          <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20 flex-wrap"
            style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
            <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
              <Menu size={16} style={{ color: '#374151' }} />
            </button>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
              style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input type="text" placeholder={t.school.searchAffiliates} value={search}
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
              <Plus size={15} />{t.school.addAffiliate}
            </button>
          </div>

          <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.affiliatesTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.school.affiliatesSubtitle}</p>
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
                  const count = f.id === 'All' ? AFFILIATES.length : AFFILIATES.filter(a => a.status === f.id).length
                  const isActive = activeFilter === f.id
                  const sc = f.id !== 'All' ? STATUS_MAP[f.id as AffiliateStatus] : null
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
                      { label: t.school.colSchool,   cls: '' },
                      { label: t.common.email,       cls: 'hidden md:table-cell' },
                      { label: 'Students',           cls: '' },
                      { label: t.common.startDate,   cls: '' },
                      { label: t.common.status,      cls: '' },
                      { label: t.common.actions,     cls: '' },
                    ].map(h => (
                      <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                        style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((aff, idx) => {
                    const sc = STATUS_MAP[aff.status]
                    return (
                      <tr key={aff.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                              <Globe size={16} style={{ color: '#2563EB' }} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{aff.name}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{aff.city}, {aff.country}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-5 py-3">
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{aff.contact}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{aff.email}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{aff.students}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{aff.since}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5"
                            style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                            {aff.status}
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
                            <button onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === aff.id ? null : aff.id) }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                              style={{ color: '#9CA3AF', background: 'transparent', border: 'none' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F9FAFB'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                          {openMenuId === aff.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                              <div className="absolute right-4 rounded-xl z-20 py-1 overflow-hidden"
                                style={{ background: '#fff', border: '1px solid #E5E7EB',
                                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 160, top: '100%' }}>
                                {['View details','Edit affiliate','Remove affiliate'].map((label, i) => (
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
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                        <Globe size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                        <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noAffiliates}</p>
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
      <AddAffiliateDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); setTimeout(() => setToast(false), 3500) }}
    />
      {toast && <SuccessToast message="Affiliate added successfully" onClose={() => setToast(false)} />}
    </main>
  )
}
