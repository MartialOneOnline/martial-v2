'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback } from 'react'
import { Menu, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 50

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

// Belt name normalisation: "Blanco" → "White", etc.
function normBelt(raw: string | null): string {
  if (!raw) return 'White'
  const m: Record<string, string> = {
    Blanco: 'White', Azul: 'Blue', Morado: 'Purple', 'Marrón': 'Brown', Marron: 'Brown', Negro: 'Black',
    White: 'White', Blue: 'Blue', Purple: 'Purple', Brown: 'Brown', Black: 'Black',
  }
  return m[raw] ?? raw
}

const BELT_COLORS: Record<string, string> = {
  White: '#E5E7EB', Blue: '#1D4ED8', Purple: '#6D28D9', Brown: '#92400E', Black: '#111827',
}
const BELT_TEXT: Record<string, string> = {
  White: '#374151', Blue: '#fff', Purple: '#fff', Brown: '#fff', Black: '#fff',
}
const BELT_FILL: Record<string, string> = {
  White: '#E5E7EB', Blue: '#1D4ED8', Purple: '#6D28D9', Brown: '#92400E', Black: '#111827',
}

interface Grading {
  id: string
  userName: string
  userAvatar: string | null
  fromBelt: string | null
  toBelt: string
  toDegree: number
  gradedAt: string
  instructor: string | null
  notes: string | null
}

interface BeltDist { belt: string; count: number }
interface Transition { label: string; count: number }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) return <img src={url} alt={name} width={28} height={28} className="rounded-full" style={{ flexShrink: 0 }} />
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center"
      style={{ width: 28, height: 28, background: '#E0E7FF', color: '#3730A3', fontSize: 10, fontWeight: 700 }}>
      {initials(name)}
    </div>
  )
}

export default function GradingsReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [gradings, setGradings]         = useState<Grading[]>([])
  const [total, setTotal]               = useState(0)
  const [beltDist, setBeltDist]         = useState<BeltDist[]>([])
  const [transitions, setTransitions]   = useState<Transition[]>([])
  const [loading, setLoading]           = useState(true)
  const [filterBelt, setFilterBelt]     = useState('All')
  const [page, setPage]                 = useState(1)

  const fetchGradings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(ITEMS_PER_PAGE),
        ...(filterBelt !== 'All' ? { belt: filterBelt } : {}),
      })
      const res = await fetch(`/api/dashboard/gradings?${params}`)
      if (!res.ok) return
      const data = await res.json()
      setGradings(data.gradings)
      setTotal(data.total)
      setBeltDist(data.beltDistribution)
      setTransitions(data.promotionsByTransition)
    } finally {
      setLoading(false)
    }
  }, [page, filterBelt])

  useEffect(() => { fetchGradings() }, [fetchGradings])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pages = getPaginationPages(page, totalPages)

  // Charts — normalise belt names from Spanish
  const pieData = beltDist.map(b => ({
    name: normBelt(b.belt),
    value: b.count,
    fill: BELT_FILL[normBelt(b.belt)] ?? '#9CA3AF',
  }))

  const barData = transitions.slice(0, 6).map(tr => {
    const parts = tr.label.split('→')
    const to = normBelt(parts[1] ?? '')
    return {
      name: `${normBelt(parts[0] ?? '')?.[0]}→${to?.[0]}`,
      label: tr.label,
      count: tr.count,
      fill: BELT_FILL[to] ?? '#9CA3AF',
    }
  })

  const beltFilters = ['All', 'White', 'Blue', 'Purple', 'Brown', 'Black']
  const beltCounts: Record<string, number> = {}
  for (const b of beltDist) {
    beltCounts[normBelt(b.belt)] = (beltCounts[normBelt(b.belt)] ?? 0) + b.count
  }

  const STATS = [
    { label: 'Total Promotions', value: String(total),  color: '#0071E3' },
    { label: 'This Year',        value: String(gradings.filter(g => new Date(g.gradedAt).getFullYear() === new Date().getFullYear()).length), color: '#16A34A' },
    { label: 'Belt Avg Time',    value: '—',            color: '#D97706' },
    { label: 'Next Grading',     value: '—',            color: '#6D28D9' },
  ]

  return (
    <main style={{ flex: 1, minWidth: 0, width: '100%', overflow: 'auto' }}>
      <div className="flex items-center gap-3 px-4 md:px-8 py-3 sticky top-0 z-20"
        style={{ background: '#fff', borderBottom: '1px solid #E5E7EB' }}>
        <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(true)}>
          <Menu size={16} style={{ color: '#374151' }} />
        </button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 max-w-xs"
          style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <Search size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="text" placeholder="Search promotions…"
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
        <div className="flex-1" />
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.gradingsTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Belt promotions and grading history</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
              </div>
              <p style={{ fontSize: stat.label === 'Next Grading' ? 18 : 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Promotions by Belt Transition</p>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(value, _, props) => [value, props.payload.label]} />
                  <Bar dataKey="count" isAnimationActive={false}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.fill} radius={4} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>No data</div>
            )}
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Current Belt Distribution</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} isAnimationActive={false}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} stroke={entry.name === 'White' ? '#D1D5DB' : entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 flex-wrap justify-center" style={{ marginTop: 8 }}>
                  {pieData.map(b => (
                    <div key={b.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.fill, border: b.name === 'White' ? '1px solid #D1D5DB' : 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{b.name} ({b.value})</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>No data</div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {beltFilters.map(belt => {
              const count = belt === 'All' ? Object.values(beltCounts).reduce((a, b) => a + b, 0) : (beltCounts[belt] ?? 0)
              const isOn = filterBelt === belt
              const beltBg = belt === 'All' ? (isOn ? '#111827' : '#fff') : (isOn ? BELT_COLORS[belt] : '#fff')
              const beltColor = belt === 'All' ? (isOn ? '#fff' : '#6B7280') : (isOn ? BELT_TEXT[belt] : '#6B7280')
              return (
                <button key={belt} onClick={() => { setFilterBelt(belt); setPage(1) }} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                    background: beltBg, color: beltColor,
                    border: isOn ? '1.5px solid ' + (belt === 'All' ? '#111827' : BELT_COLORS[belt]) : '1.5px solid #E5E7EB' }}>
                  {belt} <span style={{ opacity: 0.7, marginLeft: 2 }}>{count}</span>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Member', 'Promotion', 'Date', 'Instructor', 'Notes'].map(h => (
                    <th key={h} className="px-5 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>Loading…</td></tr>
                ) : gradings.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: 14 }}>No gradings found</td></tr>
                ) : gradings.map((g, idx) => {
                  const from = normBelt(g.fromBelt)
                  const to   = normBelt(g.toBelt)
                  const date = new Date(g.gradedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                  return (
                    <tr key={g.id} className="hover:bg-[#FAFAFA] transition-colors"
                      style={{ borderBottom: idx < gradings.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={g.userName} url={g.userAvatar} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{g.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {from && (
                            <>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                                background: BELT_COLORS[from] ?? '#E5E7EB', color: BELT_TEXT[from] ?? '#374151',
                                border: from === 'White' ? '1px solid #D1D5DB' : 'none' }}>
                                {from}
                              </span>
                              <ChevronRight size={12} style={{ color: '#9CA3AF' }} />
                            </>
                          )}
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                            background: BELT_COLORS[to] ?? '#E5E7EB', color: BELT_TEXT[to] ?? '#374151',
                            border: to === 'White' ? '1px solid #D1D5DB' : 'none' }}>
                            {to}{g.toDegree > 0 ? ` ★${g.toDegree}` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 13, color: '#374151' }}>{date}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{g.instructor ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{g.notes ?? '—'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 13, color: '#6B7280' }}>
                  Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {pages.map((pg, i) =>
                    pg === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                      <button key={pg} onClick={() => setPage(pg as number)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: pg === page ? 600 : 400, border: 'none',
                          background: pg === page ? '#F3F4F6' : 'transparent',
                          color: pg === page ? '#111827' : '#6B7280' }}>{pg}</button>
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
