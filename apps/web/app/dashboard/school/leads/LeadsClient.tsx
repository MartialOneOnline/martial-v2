'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Menu, X, Search, Check, TrendingUp, TrendingDown,
  MoreHorizontal, Eye, Plus, UserPlus,
} from 'lucide-react'
import { useDashboard } from '../../../../components/DashboardShell'
import { useT } from '../../../../lib/i18n/LanguageContext'

type FilterTab = 'ALL' | 'NEW' | 'CONTACTED' | 'TRIAL_BOOKED' | 'CONVERTED' | 'LOST'

interface Lead {
  id: string
  name: string
  email: string | null
  phone: string | null
  source: string
  status: string
  createdAt: string
}

interface Stats {
  totalAll: number
  totalNew: number
  totalContacted: number
  totalTrial: number
  totalConverted: number
  totalLost: number
  conversionRate: number
}

const STATUS_DISPLAY: Record<string, string> = {
  NEW: 'New', CONTACTED: 'Contacted', TRIAL_BOOKED: 'Trial', CONVERTED: 'Converted', LOST: 'Lost',
}
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  NEW:          { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  CONTACTED:    { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  TRIAL_BOOKED: { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  CONVERTED:    { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  LOST:         { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
}
const SOURCE_DISPLAY: Record<string, string> = {
  INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook', WALK_IN: 'Walk-in',
  WEBSITE: 'Website', REFERRAL: 'Referral', PHONE: 'Phone', OTHER: 'Other',
}
const SOURCE_STYLE: Record<string, { bg: string; color: string }> = {
  INSTAGRAM: { bg: '#FDF2F8', color: '#9D174D' },
  FACEBOOK:  { bg: '#EFF6FF', color: '#1D4ED8' },
  WALK_IN:   { bg: '#FFF7ED', color: '#C2410C' },
  WEBSITE:   { bg: '#EFF6FF', color: '#2563EB' },
  REFERRAL:  { bg: '#F0FDF4', color: '#15803D' },
  PHONE:     { bg: '#F5F3FF', color: '#6D28D9' },
  OTHER:     { bg: '#F3F4F6', color: '#6B7280' },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center"
      style={{ width: 32, height: 32, background: '#E0E7FF', color: '#3730A3', fontSize: 11, fontWeight: 700 }}>
      {initials(name)}
    </div>
  )
}

function AddLeadDrawer({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const t = useT()
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [phone, setPhone]   = useState('')
  const [source, setSource] = useState('')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  function reset() { setName(''); setEmail(''); setPhone(''); setSource(''); setNotes('') }
  function handleClose() { reset(); onClose() }

  const canSubmit = !!name && !!source

  async function handleSubmit() {
    if (!canSubmit) return
    setSaving(true)
    try {
      await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, source, message: notes }),
      })
      reset()
      onSuccess()
    } finally {
      setSaving(false)
    }
  }

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
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{t.school.addLead}</h2>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{t.school.leadsSubtitle}</p>
          </div>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <X size={15} style={{ color: '#6B7280' }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
          <div>
            <label style={labelStyle}>Full Name *</label>
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
            <label style={labelStyle}>Source *</label>
            <select value={source} onChange={e => setSource(e.target.value)} style={inputStyle}>
              <option value="">Select source…</option>
              {Object.entries(SOURCE_DISPLAY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
            {t.common.cancel}
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || saving} className="px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none',
              background: canSubmit ? '#0071E3' : '#93C5FD', color: '#fff',
              cursor: canSubmit && !saving ? 'pointer' : 'not-allowed' }}>
            <Plus size={14} />{saving ? 'Saving…' : t.school.addLead}
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

const ITEMS_PER_PAGE = 50
function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function LeadsClient() {
  const { menuOpen, setMenuOpen } = useDashboard()
  const t = useT()

  const [leads, setLeads]           = useState<Lead[]>([])
  const [stats, setStats]           = useState<Stats>({ totalAll:0, totalNew:0, totalContacted:0, totalTrial:0, totalConverted:0, totalLost:0, conversionRate:0 })
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')
  const [search, setSearch]         = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toast, setToast]           = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(ITEMS_PER_PAGE),
        ...(search ? { search } : {}),
        ...(activeFilter !== 'ALL' ? { status: activeFilter } : {}),
      })
      const res = await fetch(`/api/dashboard/leads?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setLeads(data.leads)
      setTotal(data.total)
      setStats(data.stats)
    } finally {
      setLoading(false)
    }
  }, [currentPage, search, activeFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pages = getPaginationPages(currentPage, totalPages)

  const STAT_CARDS = [
    { label: t.school.totalLeads,  value: String(stats.totalAll),        icon: UserPlus,   color: '#0071E3', bg: '#EFF6FF' },
    { label: t.school.newLead,     value: String(stats.totalNew),        icon: TrendingUp, color: '#6D28D9', bg: '#F5F3FF' },
    { label: t.school.won,         value: String(stats.totalConverted),  icon: Check,      color: '#16A34A', bg: '#F0FDF4' },
    { label: t.school.conversion,  value: stats.conversionRate + '%',    icon: TrendingUp, color: '#D97706', bg: '#FFFBEB' },
  ]

  const FILTERS: { id: FilterTab; label: string; count: number }[] = [
    { id: 'ALL',          label: t.common.all,       count: stats.totalAll       },
    { id: 'NEW',          label: t.school.newLead,   count: stats.totalNew       },
    { id: 'CONTACTED',    label: t.school.contacted, count: stats.totalContacted },
    { id: 'TRIAL_BOOKED', label: t.school.trial,     count: stats.totalTrial     },
    { id: 'CONVERTED',    label: t.school.won,       count: stats.totalConverted },
    { id: 'LOST',         label: t.school.lost,      count: stats.totalLost      },
  ]

  return (
    <>
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder={t.school.searchLeads} value={search ?? ''}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#0071E3', border: 'none', color: '#fff', fontSize: 13, fontWeight: 600 }}>
          <Plus size={15} />{t.school.addLead}
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.school.leadsTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{t.school.leadsSubtitle}</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="rounded-2xl"
              style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-1 overflow-x-auto">
            {FILTERS.map(f => {
              const isActive = activeFilter === f.id
              const sc = f.id !== 'ALL' ? STATUS_STYLE[f.id] : null
              return (
                <button key={f.id} onClick={() => { setActiveFilter(f.id); setCurrentPage(1) }}
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer relative shrink-0"
                  style={{ fontSize: 14, fontWeight: isActive ? 600 : 400, border: 'none',
                    background: 'transparent', color: isActive ? '#111827' : '#6B7280' }}>
                  {f.label}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
                    background: isActive && sc ? sc.bg : '#F3F4F6',
                    color: isActive && sc ? sc.color : isActive ? '#374151' : '#9CA3AF' }}>
                    {f.count}
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
                  { label: t.common.member,    cls: '' },
                  { label: t.common.phone,     cls: 'hidden md:table-cell' },
                  { label: t.school.colSource, cls: '' },
                  { label: t.common.date,      cls: '' },
                  { label: t.common.status,    cls: '' },
                  { label: t.common.actions,   cls: '' },
                ].map(h => (
                  <th key={h.label} className={`px-5 py-3 text-left ${h.cls}`}
                    style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>Loading…</td></tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 0' }}>
                    <UserPlus size={28} style={{ color: '#E5E7EB', margin: '0 auto 10px' }} />
                    <p style={{ fontSize: 14, color: '#9CA3AF' }}>{t.school.noLeads}</p>
                  </td>
                </tr>
              ) : leads.map((lead, idx) => {
                const sc  = STATUS_STYLE[lead.status]  ?? { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' }
                const src = SOURCE_STYLE[lead.source]  ?? { bg: '#F3F4F6', color: '#6B7280' }
                const date = new Date(lead.createdAt).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })
                return (
                  <tr key={lead.id} className="hover:bg-[#FAFAFA] transition-colors cursor-pointer"
                    style={{ borderBottom: idx < leads.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={lead.name} />
                        <div className="min-w-0">
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{lead.name}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>{lead.email ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-5 py-3">
                      <span style={{ fontSize: 13, color: '#374151' }}>{lead.phone ?? '—'}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                        background: src.bg, color: src.color }}>
                        {SOURCE_DISPLAY[lead.source] ?? lead.source}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span style={{ fontSize: 13, color: '#6B7280' }}>{date}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5"
                        style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                          background: sc.bg, color: sc.color, border: '1px solid ' + sc.border, whiteSpace: 'nowrap' }}>
                        {STATUS_DISPLAY[lead.status] ?? lead.status}
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
                            {['View details', 'Edit lead', 'Convert to member', 'Delete lead'].map((label, i) => (
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
            </tbody>
          </table>
          <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: 13, color: '#6B7280' }}>
              {t.common.showing}{' '}
              <span style={{ fontWeight: 600, color: '#111827' }}>
                {total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)}
              </span>
              {' of '}
              <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                  color: currentPage === 1 ? '#D1D5DB' : '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  borderRadius: 8, padding: '6px 12px' }}>{t.common.prev}</button>
              <div className="flex items-center gap-1 mx-1">
                {pages.map((p, i) =>
                  p === '...'
                    ? <span key={'e'+i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span>
                    : (
                      <button key={p} onClick={() => setCurrentPage(p as number)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: p === currentPage ? 600 : 400, border: 'none',
                          background: p === currentPage ? '#F3F4F6' : 'transparent',
                          color: p === currentPage ? '#111827' : '#6B7280' }}>
                        {p}
                      </button>
                    )
                )}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff',
                  color: currentPage === totalPages ? '#D1D5DB' : '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  borderRadius: 8, padding: '6px 12px' }}>{t.common.next}</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <AddLeadDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      onSuccess={() => { setDrawerOpen(false); setToast(true); fetchLeads(); setTimeout(() => setToast(false), 3500) }}
    />
    {toast && <SuccessToast message={t.school.addLead} onClose={() => setToast(false)} />}
    </>
  )
}
