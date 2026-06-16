'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu, Bell, Search, ChevronLeft, ChevronRight, Filter, MoreVertical } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 15

const BELT_BG: Record<string, string> = {
  Blanco: '#F3F4F6', White: '#F3F4F6', Azul: '#1D4ED8', Blue: '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9', Marrón: '#92400E', Brown: '#92400E',
  Negro: '#111827',  Black: '#111827',
}
const BELT_TEXT: Record<string, string> = {
  Blanco: '#374151', White: '#374151', Azul: '#fff', Blue: '#fff',
  Morado: '#fff', Purple: '#fff', Marrón: '#fff', Brown: '#fff', Negro: '#fff', Black: '#fff',
}
const BELT_CHART_FILL: Record<string, string> = {
  Blanco: '#E5E7EB', White: '#E5E7EB', Azul: '#1D4ED8', Blue: '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9', Marrón: '#92400E', Brown: '#92400E',
  Negro: '#111827',  Black: '#111827',
}
const BELT_OPTIONS = ['Blanco', 'Azul', 'Morado', 'Marrón', 'Negro']

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Active'   },
  INACTIVE: { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB', label: 'Inactive' },
  FROZEN:   { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: 'Frozen'   },
  LEAD:     { bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA', label: 'Lead'     },
}

function Avatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (avatarUrl) return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'linear-gradient(135deg,#0870E2,#7DE7EC)', color: '#fff', fontSize: size * 0.33, fontWeight: 700 }}>
      {initials}
    </div>
  )
}

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const INP: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#111827', background: '#fff', outline: 'none' }
const SEC: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block' }

interface FiltersState { belt: string; dateFrom: string; dateTo: string }
const EMPTY_FILTERS: FiltersState = { belt: '', dateFrom: '', dateTo: '' }

function FiltersPanel({ filters, onChange }: { filters: FiltersState; onChange: (f: FiltersState) => void }) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<FiltersState>(filters)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { setLocal(filters) }, [filters])
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const activeCount = [!!filters.belt, !!filters.dateFrom || !!filters.dateTo].filter(Boolean).length
  function apply() { onChange(local); setOpen(false) }
  function clear() { setLocal(EMPTY_FILTERS); onChange(EMPTY_FILTERS); setOpen(false) }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
          border: activeCount ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
          background: activeCount ? '#EFF6FF' : '#fff' }}>
        <Filter size={13} style={{ color: activeCount ? '#0870E2' : '#6B7280' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: activeCount ? '#0870E2' : '#6B7280' }}>Filters</span>
        {activeCount > 0 && <span style={{ background: '#0870E2', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeCount}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 40, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 280, padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={SEC}>Belt</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {BELT_OPTIONS.map(b => (
                <button key={b} onClick={() => setLocal(p => ({ ...p, belt: p.belt === b ? '' : b }))}
                  style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: local.belt === b ? '1.5px solid #0870E2' : '1px solid #E5E7EB',
                    background: local.belt === b ? '#EFF6FF' : '#F9FAFB',
                    color: local.belt === b ? '#0870E2' : '#6B7280' }}>{b}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={SEC}>Joined date range</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>From</label>
                <input type="date" value={local.dateFrom} onChange={e => setLocal(p => ({ ...p, dateFrom: e.target.value }))} style={INP} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#6B7280', display: 'block', marginBottom: 4 }}>To</label>
                <input type="date" value={local.dateTo} onChange={e => setLocal(p => ({ ...p, dateTo: e.target.value }))} style={INP} />
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            <button onClick={clear} style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 500, color: '#6B7280', cursor: 'pointer' }}>Clear</button>
            <button onClick={apply} style={{ flex: 1, padding: 8, borderRadius: 8, border: 'none', background: '#111827', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Apply</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RowMenu({ items }: { items: { label: string; onClick: () => void; variant?: 'danger' }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} className="cursor-pointer"
        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoreVertical size={13} style={{ color: '#6B7280' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 50, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden' }}>
          {items.map(item => (
            <button key={item.label} onClick={() => { item.onClick(); setOpen(false) }}
              className="w-full text-left cursor-pointer hover:bg-[#F9FAFB]"
              style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: item.variant === 'danger' ? '#DC2626' : '#374151', border: 'none', background: 'transparent', display: 'block' }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberRow {
  id: string; name: string; email: string; avatarUrl: string | null
  belt: string; plan: string; status: string; joinedAt: string; isNew: boolean
  lastAttendedAt: string | null
}
interface ReportData {
  stats: { totalActive: number; newInPeriod: number; totalInactive: number; retentionRate: number }
  growthData: { date: string; members: number }[]
  beltDist:   { name: string; value: number }[]
  members:    MemberRow[]
  total:      number
}

export default function UsersReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [period,    setPeriod]    = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'NEW'>('ALL')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [filters,   setFilters]   = useState<FiltersState>(EMPTY_FILTERS)
  const [data,      setData]      = useState<ReportData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [toast,     setToast]     = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ period, status: filterTab, search, page: String(page) })
    if (filters.belt)     params.set('belt', filters.belt)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo)   params.set('dateTo', filters.dateTo)
    const res = await fetch(`/api/dashboard/reports/users?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [period, filterTab, search, page, filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [period, filterTab, search, filters])

  async function setMemberStatus(memberId: string, status: string) {
    await fetch(`/api/dashboard/members/${memberId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    showToast(`Status updated to ${status.toLowerCase()}`)
    load()
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ITEMS_PER_PAGE)) : 1
  const pages = getPaginationPages(page, totalPages)
  const stats = data?.stats
  const totalBelt = (data?.beltDist ?? []).reduce((s, b) => s + b.value, 0)

  const STAT_CARDS = [
    { label: 'Active Members',  value: stats?.totalActive   ?? '—', sub: 'currently active', color: '#0870E2' },
    { label: 'New This Period', value: stats?.newInPeriod   ?? '—', sub: 'joined',            color: '#16A34A' },
    { label: 'Inactive',        value: stats?.totalInactive ?? '—', sub: 'not active',        color: '#DC2626' },
    { label: 'Retention Rate',  value: stats ? stats.retentionRate + '%' : '—', sub: 'active vs total', color: '#6D28D9' },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: '#111827', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500 }}>
          {toast}
        </div>
      )}

      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: '#F3F4F6' }}>
          {(['7d', '30d', '90d', '12m'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className="cursor-pointer"
              style={{ fontSize: 12, fontWeight: period === p ? 600 : 400, padding: '5px 12px', borderRadius: 8, border: 'none',
                background: period === p ? '#fff' : 'transparent', color: period === p ? '#111827' : '#6B7280',
                boxShadow: period === p ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Bell size={15} style={{ color: '#374151' }} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
        </button>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.usersTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Member growth, retention and activity overview</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STAT_CARDS.map(stat => (
            <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
              </div>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '…' : stat.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Member Growth</p>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.growthData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="members" name="Members" stroke="#0870E2" fill="#0870E2" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Members by Belt</p>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data?.beltDist ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} isAnimationActive={false}>
                        {(data?.beltDist ?? []).map((entry, i) => (
                          <Cell key={i} fill={BELT_CHART_FILL[entry.name] ?? '#9CA3AF'}
                            stroke={['Blanco','White'].includes(entry.name) ? '#D1D5DB' : (BELT_CHART_FILL[entry.name] ?? '#9CA3AF')} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{totalBelt}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>active</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center" style={{ marginTop: 8 }}>
                  {(data?.beltDist ?? []).map(b => (
                    <div key={b.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: BELT_CHART_FILL[b.name] ?? '#9CA3AF', border: ['Blanco','White'].includes(b.name) ? '1px solid #D1D5DB' : 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{b.name} ({b.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {([
              { key: 'ALL', label: 'All' }, { key: 'ACTIVE', label: 'Active' },
              { key: 'INACTIVE', label: 'Inactive' }, { key: 'NEW', label: 'New' },
            ] as const).map(tab => {
              const isOn = filterTab === tab.key
              return (
                <button key={tab.key} onClick={() => setFilterTab(tab.key)} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                    background: isOn ? '#111827' : '#fff', color: isOn ? '#fff' : '#6B7280',
                    border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                  {tab.label}
                  {!loading && data && tab.key === 'ALL' && <span style={{ opacity: 0.6, marginLeft: 4 }}>{data.total}</span>}
                </button>
              )
            })}
            <div style={{ marginLeft: 'auto' }}>
              <FiltersPanel filters={filters} onChange={f => { setFilters(f); setPage(1) }} />
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Member', 'Belt', 'Plan', 'Joined', 'Last Attended', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                ) : (data?.members ?? []).length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>No members found</td></tr>
                ) : (
                  (data?.members ?? []).map((m, idx) => {
                    const ss = STATUS_STYLES[m.status] ?? STATUS_STYLES['INACTIVE']!
                    const beltBg   = BELT_BG[m.belt]   ?? '#E5E7EB'
                    const beltText = BELT_TEXT[m.belt]  ?? '#374151'
                    const isWhite  = ['Blanco','White'].includes(m.belt)
                    return (
                      <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors"
                        style={{ borderBottom: idx < (data?.members.length ?? 0) - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={m.name} avatarUrl={m.avatarUrl} size={32} />
                            <div>
                              <div className="flex items-center gap-2">
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                                {m.isNew && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: '#EFF6FF', color: '#0870E2', border: '1px solid #BFDBFE' }}>NEW</span>}
                              </div>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                            background: beltBg, color: beltText, border: isWhite ? '1px solid #D1D5DB' : 'none' }}>
                            {m.belt}
                          </span>
                        </td>
                        <td className="px-5 py-3"><span style={{ fontSize: 12, color: '#6B7280' }}>{m.plan}</span></td>
                        <td className="px-5 py-3"><span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(m.joinedAt)}</span></td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 12, color: m.lastAttendedAt ? '#6B7280' : '#D1D5DB' }}>
                            {m.lastAttendedAt ? fmtDate(m.lastAttendedAt) : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                            {ss.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <RowMenu items={[
                            { label: 'Copy email', onClick: () => { navigator.clipboard.writeText(m.email); showToast('Email copied') } },
                            ...(m.status !== 'ACTIVE'   ? [{ label: 'Activate',   onClick: () => setMemberStatus(m.id, 'ACTIVE')   }] : []),
                            ...(m.status === 'ACTIVE'   ? [{ label: 'Deactivate', onClick: () => setMemberStatus(m.id, 'INACTIVE'), variant: 'danger' as const }] : []),
                            ...(m.status !== 'FROZEN'   ? [{ label: 'Freeze',     onClick: () => setMemberStatus(m.id, 'FROZEN')   }] : []),
                            ...(m.status !== 'LEAD'     ? [{ label: 'Mark as lead', onClick: () => setMemberStatus(m.id, 'LEAD')   }] : []),
                          ]} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, data?.total ?? 0)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{data?.total ?? 0}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                      <button key={p} onClick={() => setPage(p as number)} className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none', background: p === page ? '#F3F4F6' : 'transparent', color: p === page ? '#111827' : '#6B7280' }}>{p}</button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
