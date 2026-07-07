'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Menu, Bell, Search, ChevronLeft, ChevronRight, Filter, MoreVertical } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import SharedRowMenu from '../../../../components/RowMenu'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 15

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string; label: string }> = {
  CONFIRMED:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Confirmed'  },
  COMPLETED:  { bg: '#EFF6FF', color: '#0870E2', border: '#BFDBFE', label: 'Completed'  },
  CANCELLED:  { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Cancelled'  },
}

function Avatar({ name, avatarUrl, size = 28 }: { name: string; avatarUrl: string | null; size?: number }) {
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
function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}

const INP: React.CSSProperties = { width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#111827', background: '#fff', outline: 'none' }
const SEC: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'block' }

interface FiltersState { className: string; dateFrom: string; dateTo: string }
const EMPTY_FILTERS: FiltersState = { className: '', dateFrom: '', dateTo: '' }

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
  const activeCount = [!!filters.className, !!filters.dateFrom || !!filters.dateTo].filter(Boolean).length
  function apply() { onChange(local); setOpen(false) }
  function clear() { setLocal(EMPTY_FILTERS); onChange(EMPTY_FILTERS); setOpen(false) }
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px', borderRadius: 8, cursor: 'pointer',
          border: activeCount ? '1.5px solid #0870E2' : '1px solid #E5E7EB', background: activeCount ? '#EFF6FF' : '#fff' }}>
        <Filter size={13} style={{ color: activeCount ? '#0870E2' : '#6B7280' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: activeCount ? '#0870E2' : '#6B7280' }}>Filters</span>
        {activeCount > 0 && <span style={{ background: '#0870E2', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{activeCount}</span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 40, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', width: 280, padding: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <span style={SEC}>Class name</span>
            <input type="text" placeholder="e.g. BJJ, Nogi…" value={local.className} onChange={e => setLocal(p => ({ ...p, className: e.target.value }))} style={INP} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <span style={SEC}>Date range</span>
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
  return (
    <SharedRowMenu trigger={({ onClick }) => (
      <button onClick={onClick} className="cursor-pointer"
        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MoreVertical size={13} style={{ color: '#6B7280' }} />
      </button>
    )}>
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', minWidth: 160, overflow: 'hidden' }}>
        {items.map(item => (
          <button key={item.label} onClick={item.onClick}
            className="w-full text-left cursor-pointer hover:bg-[#F9FAFB]"
            style={{ padding: '9px 14px', fontSize: 12, fontWeight: 500, color: item.variant === 'danger' ? '#DC2626' : '#374151', border: 'none', background: 'transparent', display: 'block' }}>
            {item.label}
          </button>
        ))}
      </div>
    </SharedRowMenu>
  )
}

interface BookingRow {
  id: string; userName: string; userEmail: string; userAvatar: string | null
  className: string; scheduledAt: string; status: string
}
interface ReportData {
  stats: { totalPeriod: number; confirmedPeriod: number; cancelledPeriod: number; attendanceRate: number }
  chartData:   { date: string; confirmed: number; cancelled: number }[]
  byClassData: { name: string; bookings: number; fill: string }[]
  bookings:    BookingRow[]
  total:       number
}

export default function BookingsReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [period,    setPeriod]    = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL')
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
    if (filters.className) params.set('className', filters.className)
    if (filters.dateFrom)  params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo)    params.set('dateTo', filters.dateTo)
    const res = await fetch(`/api/dashboard/reports/bookings?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [period, filterTab, search, page, filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [period, filterTab, search, filters])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ITEMS_PER_PAGE)) : 1
  const pages = getPaginationPages(page, totalPages)
  const stats = data?.stats

  const STAT_CARDS = [
    { label: 'Total Bookings',  value: stats?.totalPeriod     ?? '—', sub: 'this period',        color: '#0870E2' },
    { label: 'Confirmed',       value: stats?.confirmedPeriod ?? '—', sub: 'attended',            color: '#16A34A' },
    { label: 'Cancelled',       value: stats?.cancelledPeriod ?? '—', sub: 'cancelled',           color: '#DC2626' },
    { label: 'Attendance Rate', value: stats ? stats.attendanceRate + '%' : '—', sub: 'confirmed vs total', color: '#6D28D9' },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          background: '#111827', color: '#fff', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500 }}>
          {toast}
        </div>
      )}

      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder="Search member or class…" value={search} onChange={e => setSearch(e.target.value)}
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.bookingsTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Class attendance and booking activity</p>
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
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Bookings Over Time</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Confirmed vs cancelled per period</p>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.chartData ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="confirmed" name="Confirmed" stroke="#0870E2" fill="#0870E2" fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="cancelled" name="Cancelled" stroke="#DC2626" fill="#DC2626" fillOpacity={0.08} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Bookings by Class</p>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 16 }}>Top 6 classes by confirmed bookings</p>
            {loading ? <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p></div> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data?.byClassData ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                  <Bar dataKey="bookings" name="Bookings" radius={[0, 6, 6, 0]} fill="#0870E2" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {([
              { key: 'ALL', label: 'All' }, { key: 'CONFIRMED', label: 'Confirmed' },
              { key: 'COMPLETED', label: 'Completed' }, { key: 'CANCELLED', label: 'Cancelled' },
            ] as const).map(tab => {
              const isOn = filterTab === tab.key
              return (
                <button key={tab.key} onClick={() => setFilterTab(tab.key)} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                    background: isOn ? '#111827' : '#fff', color: isOn ? '#fff' : '#6B7280',
                    border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                  {tab.label}
                  {!loading && tab.key === 'ALL' && data && <span style={{ opacity: 0.6, marginLeft: 4 }}>{data.total}</span>}
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
                  {['Member', 'Class', 'Date & Time', 'Status', ''].map(h => (
                    <th key={h} className="px-5 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                ) : (data?.bookings ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>No bookings found</td></tr>
                ) : (
                  (data?.bookings ?? []).map((b, idx) => {
                    const ss = STATUS_STYLES[b.status] ?? STATUS_STYLES['CONFIRMED']!
                    return (
                      <tr key={b.id} className="hover:bg-[#FAFAFA] transition-colors"
                        style={{ borderBottom: idx < (data?.bookings.length ?? 0) - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={b.userName} avatarUrl={b.userAvatar} size={28} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{b.userName}</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{b.userEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3"><span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{b.className}</span></td>
                        <td className="px-5 py-3"><span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDateTime(b.scheduledAt)}</span></td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                            {ss.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <RowMenu items={[
                            { label: 'Copy member email', onClick: () => { navigator.clipboard.writeText(b.userEmail); showToast('Email copied') } },
                            { label: `Copy class: ${b.className}`, onClick: () => { navigator.clipboard.writeText(b.className); showToast('Class name copied') } },
                            { label: 'Copy date & time', onClick: () => { navigator.clipboard.writeText(fmtDateTime(b.scheduledAt)); showToast('Date copied') } },
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
