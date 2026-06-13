'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, ChevronLeft} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 10

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const BELT_COLORS: Record<string, string> = {
  'White':  '#E5E7EB',
  'Blue':   '#1D4ED8',
  'Purple': '#6D28D9',
  'Brown':  '#92400E',
  'Black':  '#111827',
}

const BELT_TEXT: Record<string, string> = {
  'White':  '#374151',
  'Blue':   '#fff',
  'Purple': '#fff',
  'Brown':  '#fff',
  'Black':  '#fff',
}

const PROMOTIONS_BAR = [
  { name: 'W→B', label: 'White→Blue',   count: 18, fill: '#1D4ED8' },
  { name: 'B→P', label: 'Blue→Purple',  count: 11, fill: '#6D28D9' },
  { name: 'P→Br',label: 'Purple→Brown', count: 6,  fill: '#92400E' },
  { name: 'Br→Bl',label: 'Brown→Black', count: 2,  fill: '#111827' },
]

const BELT_DISTRIBUTION = [
  { name: 'White',  value: 48, fill: '#E5E7EB' },
  { name: 'Blue',   value: 61, fill: '#1D4ED8' },
  { name: 'Purple', value: 29, fill: '#6D28D9' },
  { name: 'Brown',  value: 14, fill: '#92400E' },
  { name: 'Black',  value: 7,  fill: '#111827' },
]

interface Promotion {
  id: number
  avatar: string
  name: string
  from: string
  to: string
  date: string
  instructor: string
  event: string
}

const PROMOTIONS: Promotion[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?img=1',  name:'Carlos Mendez',    from:'White',  to:'Blue',   date:'May 28', instructor:'Pablo Cabo',  event:'Spring Grading 2026' },
  { id:2,  avatar:'https://i.pravatar.cc/32?img=2',  name:'Ana García',       from:'Blue',   to:'Purple', date:'May 28', instructor:'Pablo Cabo',  event:'Spring Grading 2026' },
  { id:3,  avatar:'https://i.pravatar.cc/32?img=3',  name:'Miguel López',     from:'White',  to:'Blue',   date:'May 28', instructor:'Pablo Cabo',  event:'Spring Grading 2026' },
  { id:4,  avatar:'https://i.pravatar.cc/32?img=4',  name:'Laura Martínez',   from:'Purple', to:'Brown',  date:'Feb 10', instructor:'Pablo Cabo',  event:'Winter Grading 2026' },
  { id:5,  avatar:'https://i.pravatar.cc/32?img=5',  name:'David Sánchez',    from:'Blue',   to:'Purple', date:'Feb 10', instructor:'Rafa Torres', event:'Winter Grading 2026' },
  { id:6,  avatar:'https://i.pravatar.cc/32?img=6',  name:'Sofía Fernández',  from:'White',  to:'Blue',   date:'Feb 10', instructor:'Pablo Cabo',  event:'Winter Grading 2026' },
  { id:7,  avatar:'https://i.pravatar.cc/32?img=7',  name:'Javier Romero',    from:'Brown',  to:'Black',  date:'Nov 15', instructor:'Pablo Cabo',  event:'Fall Grading 2025' },
  { id:8,  avatar:'https://i.pravatar.cc/32?img=8',  name:'Elena Díaz',       from:'White',  to:'Blue',   date:'Nov 15', instructor:'Rafa Torres', event:'Fall Grading 2025' },
  { id:9,  avatar:'https://i.pravatar.cc/32?img=9',  name:'Pedro Jiménez',    from:'Blue',   to:'Purple', date:'Nov 15', instructor:'Pablo Cabo',  event:'Fall Grading 2025' },
  { id:10, avatar:'https://i.pravatar.cc/32?img=10', name:'Isabel Moreno',    from:'White',  to:'Blue',   date:'Aug 22', instructor:'Pablo Cabo',  event:'Summer Grading 2025' },
  { id:11, avatar:'https://i.pravatar.cc/32?img=11', name:'Antonio Ruiz',     from:'Purple', to:'Brown',  date:'Aug 22', instructor:'Rafa Torres', event:'Summer Grading 2025' },
  { id:12, avatar:'https://i.pravatar.cc/32?img=12', name:'Carmen Álvarez',   from:'Blue',   to:'Purple', date:'May 20', instructor:'Pablo Cabo',  event:'Spring Grading 2025' },
]

export default function GradingsReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('12m')
  const [filterBelt, setFilterBelt] = useState<'All' | string>('All')
  const [page, setPage] = useState(1)

  const filtered = filterBelt === 'All' ? PROMOTIONS : PROMOTIONS.filter(p => p.to === filterBelt)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const totalPromotions = PROMOTIONS.length
  const thisYear = PROMOTIONS.filter(p => p.date.includes('2026')).length
  const nextGrading = 'Sep 15, 2026'

  const STATS = [
    { label: 'Total Promotions', value: String(totalPromotions), sub: 'all time',      color: '#0071E3' },
    { label: 'This Year',        value: String(thisYear),        sub: 'in 2026',       color: '#16A34A' },
    { label: 'Belt Avg Time',    value: '14 mo',                 sub: 'avg per belt',  color: '#D97706' },
    { label: 'Next Grading',     value: nextGrading,             sub: 'upcoming date', color: '#6D28D9' },
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
              <input type="text" placeholder="Search promotions…"
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
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={PROMOTIONS_BAR}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(value, name, props) => [value, props.payload.label]} />
                    <Bar dataKey="count" isAnimationActive={false}>
                      {PROMOTIONS_BAR.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} radius={4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Current Belt Distribution</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart width={400} height={260}>
                    <Pie data={BELT_DISTRIBUTION} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} isAnimationActive={false}>
                      {BELT_DISTRIBUTION.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.name === 'White' ? '#D1D5DB' : entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 flex-wrap justify-center" style={{ marginTop: 8 }}>
                  {BELT_DISTRIBUTION.map(b => (
                    <div key={b.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: b.fill, border: b.name === 'White' ? '1px solid #D1D5DB' : 'none' }} />
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{b.name} ({b.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {(['All', 'White', 'Blue', 'Purple', 'Brown', 'Black'] as const).map(belt => {
                  const count = belt === 'All' ? PROMOTIONS.length : PROMOTIONS.filter(p => p.to === belt).length
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
                      {['Member', 'Promotion', 'Date', 'Instructor', 'Event'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors"
                        style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={p.avatar} alt={p.name} width={28} height={28} className="rounded-full" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                              background: BELT_COLORS[p.from], color: BELT_TEXT[p.from],
                              border: p.from === 'White' ? '1px solid #D1D5DB' : 'none' }}>
                              {p.from}
                            </span>
                            <ChevronRight size={12} style={{ color: '#9CA3AF' }} />
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999,
                              background: BELT_COLORS[p.to], color: BELT_TEXT[p.to],
                              border: p.to === 'White' ? '1px solid #D1D5DB' : 'none' }}>
                              {p.to}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 13, color: '#374151' }}>{p.date}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 13, color: '#6B7280' }}>{p.instructor}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span style={{ fontSize: 12, color: '#6B7280' }}>{p.event}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 13, color: '#6B7280' }}>
                      Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{filtered.length}</span>
                    </p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: safePage === 1 ? '#D1D5DB' : '#374151', cursor: safePage === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
                        <ChevronLeft size={14} />
                      </button>
                      {pages.map((pg, i) =>
                        pg === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                          <button key={pg} onClick={() => setPage(pg as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: pg === safePage ? 600 : 400, border: 'none',
                              background: pg === safePage ? '#F3F4F6' : 'transparent',
                              color: pg === safePage ? '#111827' : '#6B7280' }}>{pg}</button>
                        )
                      )}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                        style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: safePage === totalPages ? '#D1D5DB' : '#374151', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 12px' }}>
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
