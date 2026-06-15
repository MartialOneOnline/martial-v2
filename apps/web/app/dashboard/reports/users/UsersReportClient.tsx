'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback } from 'react'
import { Menu, Bell, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 15

// ── Belt colours ──────────────────────────────────────────────────────────────
const BELT_BG: Record<string, string> = {
  Blanco: '#F3F4F6', White:  '#F3F4F6',
  Azul:   '#1D4ED8', Blue:   '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9',
  Marrón: '#92400E', Brown:  '#92400E',
  Negro:  '#111827', Black:  '#111827',
}
const BELT_TEXT: Record<string, string> = {
  Blanco: '#374151', White: '#374151',
  Azul: '#fff', Blue: '#fff', Morado: '#fff', Purple: '#fff',
  Marrón: '#fff', Brown: '#fff', Negro: '#fff', Black: '#fff',
}
const BELT_CHART_FILL: Record<string, string> = {
  Blanco: '#E5E7EB', White: '#E5E7EB',
  Azul: '#1D4ED8',   Blue: '#1D4ED8',
  Morado: '#6D28D9', Purple: '#6D28D9',
  Marrón: '#92400E', Brown: '#92400E',
  Negro: '#111827',  Black: '#111827',
}

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

// ── Types ─────────────────────────────────────────────────────────────────────
interface MemberRow {
  id: string; name: string; email: string; avatarUrl: string | null
  belt: string; plan: string; status: string; joinedAt: string; isNew: boolean
}

interface ReportData {
  stats: { totalActive: number; newInPeriod: number; totalInactive: number; retentionRate: number }
  growthData: { date: string; members: number }[]
  beltDist:   { name: string; value: number }[]
  members:    MemberRow[]
  total:      number
  page:       number
  pageSize:   number
}

export default function UsersReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [period,    setPeriod]    = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'NEW'>('ALL')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)
  const [data,      setData]      = useState<ReportData | null>(null)
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ period, status: filterTab, search, page: String(page) })
    const res = await fetch(`/api/dashboard/reports/users?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }, [period, filterTab, search, page])

  useEffect(() => { load() }, [load])

  // Reset page on filter/search/period change
  useEffect(() => { setPage(1) }, [period, filterTab, search])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / ITEMS_PER_PAGE)) : 1
  const pages = getPaginationPages(page, totalPages)

  const stats = data?.stats
  const STAT_CARDS = [
    { label: 'Active Members',  value: stats?.totalActive   ?? '—', sub: 'currently active', color: '#0870E2' },
    { label: 'New This Period', value: stats?.newInPeriod   ?? '—', sub: 'joined',            color: '#16A34A' },
    { label: 'Inactive',        value: stats?.totalInactive ?? '—', sub: 'not active',        color: '#DC2626' },
    { label: 'Retention Rate',  value: stats ? stats.retentionRate + '%' : '—', sub: 'active vs total', color: '#6D28D9' },
  ]

  const totalBelt = (data?.beltDist ?? []).reduce((s, b) => s + b.value, 0)

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
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
                background: period === p ? '#fff' : 'transparent',
                color: period === p ? '#111827' : '#6B7280',
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

        {/* KPI cards */}
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

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Growth chart */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Member Growth</p>
            {loading ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
              </div>
            ) : (
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

          {/* Belt distribution */}
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Members by Belt</p>
            {loading ? (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</p>
              </div>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={data?.beltDist ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                        dataKey="value" paddingAngle={2} isAnimationActive={false}>
                        {(data?.beltDist ?? []).map((entry, i) => (
                          <Cell key={i} fill={BELT_CHART_FILL[entry.name] ?? '#9CA3AF'}
                            stroke={['Blanco', 'White'].includes(entry.name) ? '#D1D5DB' : (BELT_CHART_FILL[entry.name] ?? '#9CA3AF')} />
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
                      <div className="w-2.5 h-2.5 rounded-full"
                        style={{ background: BELT_CHART_FILL[b.name] ?? '#9CA3AF', border: ['Blanco','White'].includes(b.name) ? '1px solid #D1D5DB' : 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{b.name} ({b.value})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Member table */}
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {([
              { key: 'ALL',      label: 'All'      },
              { key: 'ACTIVE',   label: 'Active'   },
              { key: 'INACTIVE', label: 'Inactive' },
              { key: 'NEW',      label: 'New'      },
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
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Member', 'Belt', 'Plan', 'Joined', 'Status'].map(h => (
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
                ) : (data?.members ?? []).length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>No members found</td></tr>
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
                                {m.isNew && (
                                  <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 999,
                                    background: '#EFF6FF', color: '#0870E2', border: '1px solid #BFDBFE' }}>NEW</span>
                                )}
                              </div>
                              <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                            background: beltBg, color: beltText,
                            border: isWhite ? '1px solid #D1D5DB' : 'none' }}>
                            {m.belt}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{m.plan}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(m.joinedAt)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                            background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                            {ss.label}
                          </span>
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
                    style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                      <button key={p} onClick={() => setPage(p as number)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none',
                          background: p === page ? '#F3F4F6' : 'transparent',
                          color: p === page ? '#111827' : '#6B7280' }}>{p}</button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
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
