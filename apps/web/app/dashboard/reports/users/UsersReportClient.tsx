'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, ChevronLeft} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 10

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

const GROWTH_DATA: Record<string, { date: string; members: number }[]> = {
  '7d': [
    { date: 'Mon', members: 154 }, { date: 'Tue', members: 155 }, { date: 'Wed', members: 155 },
    { date: 'Thu', members: 157 }, { date: 'Fri', members: 157 }, { date: 'Sat', members: 159 }, { date: 'Sun', members: 159 },
  ],
  '30d': [
    { date: 'May 6',  members: 140 }, { date: 'May 12', members: 143 }, { date: 'May 18', members: 147 },
    { date: 'May 24', members: 151 }, { date: 'May 30', members: 155 }, { date: 'Jun 5',  members: 159 },
  ],
  '90d': [
    { date: 'Mar',   members: 120 }, { date: 'Apr',   members: 132 }, { date: 'May',   members: 143 }, { date: 'Jun',   members: 159 },
  ],
  '12m': [
    { date: 'Jun', members: 80 },  { date: 'Jul', members: 88 },  { date: 'Aug', members: 95 },
    { date: 'Sep', members: 103 }, { date: 'Oct', members: 112 }, { date: 'Nov', members: 118 },
    { date: 'Dec', members: 122 }, { date: 'Jan', members: 130 }, { date: 'Feb', members: 138 },
    { date: 'Mar', members: 145 }, { date: 'Apr', members: 152 }, { date: 'May', members: 159 },
  ],
}

const BELT_DIST = [
  { name: 'White',  value: 48, fill: '#E5E7EB' },
  { name: 'Blue',   value: 61, fill: '#1D4ED8' },
  { name: 'Purple', value: 29, fill: '#6D28D9' },
  { name: 'Brown',  value: 14, fill: '#92400E' },
  { name: 'Black',  value: 7,  fill: '#111827' },
]

const BELT_COLORS: Record<string, string> = {
  'White': '#E5E7EB', 'Blue': '#1D4ED8', 'Purple': '#6D28D9', 'Brown': '#92400E', 'Black': '#111827',
}
const BELT_TEXT: Record<string, string> = {
  'White': '#374151', 'Blue': '#fff', 'Purple': '#fff', 'Brown': '#fff', 'Black': '#fff',
}

type MemberStatus = 'Active' | 'Inactive' | 'New'

const STATUS_STYLES: Record<MemberStatus, { bg: string; color: string; border: string }> = {
  'Active':   { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Inactive': { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
  'New':      { bg: '#EFF6FF', color: '#0071E3', border: '#BFDBFE' },
}

interface MemberRow {
  id: number
  avatar: string
  name: string
  email: string
  belt: string
  plan: string
  classes: number
  lastSeen: string
  status: MemberStatus
}

const MEMBERS: MemberRow[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?img=1',  name:'Carlos Mendez',    email:'carlos@email.com',    belt:'Blue',   plan:'Jiu Jitsu Mensual',    classes:18, lastSeen:'Jun 5',  status:'Active'   },
  { id:2,  avatar:'https://i.pravatar.cc/32?img=2',  name:'Ana García',       email:'ana@email.com',       belt:'Purple', plan:'Jiu Jitsu Trimestral', classes:24, lastSeen:'Jun 4',  status:'Active'   },
  { id:3,  avatar:'https://i.pravatar.cc/32?img=3',  name:'Miguel López',     email:'miguel@email.com',    belt:'White',  plan:'7-Day Free Trial',     classes:3,  lastSeen:'Jun 1',  status:'New'      },
  { id:4,  avatar:'https://i.pravatar.cc/32?img=4',  name:'Laura Martínez',   email:'laura@email.com',     belt:'Blue',   plan:'Jiu Jitsu Infantil',   classes:12, lastSeen:'Jun 4',  status:'Active'   },
  { id:5,  avatar:'https://i.pravatar.cc/32?img=5',  name:'David Sánchez',    email:'david@email.com',     belt:'Brown',  plan:'Family Jiu Jitsu',     classes:9,  lastSeen:'Jun 3',  status:'Active'   },
  { id:6,  avatar:'https://i.pravatar.cc/32?img=6',  name:'Sofía Fernández',  email:'sofia@email.com',     belt:'White',  plan:'Jiu Jitsu Mensual',    classes:0,  lastSeen:'May 22', status:'Inactive' },
  { id:7,  avatar:'https://i.pravatar.cc/32?img=7',  name:'Javier Romero',    email:'javier@email.com',    belt:'Black',  plan:'Jiu Jitsu Mensual',    classes:21, lastSeen:'Jun 2',  status:'Active'   },
  { id:8,  avatar:'https://i.pravatar.cc/32?img=8',  name:'Elena Díaz',       email:'elena@email.com',     belt:'Blue',   plan:'30-Day Trial',         classes:7,  lastSeen:'Jun 1',  status:'New'      },
  { id:9,  avatar:'https://i.pravatar.cc/32?img=9',  name:'Pedro Jiménez',    email:'pedro@email.com',     belt:'Blue',   plan:'Jiu Jitsu Mensual',    classes:15, lastSeen:'Jun 1',  status:'Active'   },
  { id:10, avatar:'https://i.pravatar.cc/32?img=10', name:'Isabel Moreno',    email:'isabel@email.com',    belt:'White',  plan:'Jiu Jitsu Infantil',   classes:2,  lastSeen:'May 31', status:'Inactive' },
  { id:11, avatar:'https://i.pravatar.cc/32?img=11', name:'Antonio Ruiz',     email:'antonio@email.com',   belt:'Purple', plan:'Jiu Jitsu Mensual',    classes:19, lastSeen:'May 31', status:'Active'   },
  { id:12, avatar:'https://i.pravatar.cc/32?img=12', name:'Carmen Álvarez',   email:'carmen@email.com',    belt:'Blue',   plan:'Drop-in Class',        classes:4,  lastSeen:'May 30', status:'Inactive' },
  { id:13, avatar:'https://i.pravatar.cc/32?img=13', name:'Francisco Torres', email:'francisco@email.com', belt:'White',  plan:'7-Day Free Trial',     classes:5,  lastSeen:'May 30', status:'New'      },
  { id:14, avatar:'https://i.pravatar.cc/32?img=14', name:'Beatriz González', email:'beatriz@email.com',   belt:'Brown',  plan:'Family Jiu Jitsu',     classes:16, lastSeen:'May 29', status:'Active'   },
]

export default function UsersReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'All' | MemberStatus>('All')
  const [page, setPage] = useState(1)

  const filtered = filterTab === 'All' ? MEMBERS : MEMBERS.filter(m => m.status === filterTab)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const growthData = GROWTH_DATA[period]
  const totalMembers = 159
  const newThisPeriod = MEMBERS.filter(m => m.status === 'New').length
  const churned = 4
  const retentionRate = 94

  const STATS = [
    { label: 'Total Members',    value: String(totalMembers),    sub: 'current',         color: '#0071E3' },
    { label: 'New This Period',  value: String(newThisPeriod),   sub: 'joined',          color: '#16A34A' },
    { label: 'Churned',          value: String(churned),         sub: 'cancelled',       color: '#DC2626' },
    { label: 'Retention Rate',   value: retentionRate + '%',     sub: 'this period',     color: '#6D28D9' },
  ]

  const totalBeltMembers = BELT_DIST.reduce((s, b) => s + b.value, 0)

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
              <input type="text" placeholder="Search members…"
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

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Member Growth</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    <Area type="monotone" dataKey="members" name="Members" stroke="#0071E3" fill="#0071E3" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Members by Belt</p>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart width={400} height={260}>
                      <Pie data={BELT_DIST} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={2} isAnimationActive={false}>
                        {BELT_DIST.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.name === 'White' ? '#D1D5DB' : entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{totalBeltMembers}</p>
                      <p style={{ fontSize: 11, color: '#9CA3AF' }}>total</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap justify-center" style={{ marginTop: 8 }}>
                  {BELT_DIST.map(b => (
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
                {(['All', 'Active', 'Inactive', 'New'] as const).map(tab => {
                  const count = tab === 'All' ? MEMBERS.length : MEMBERS.filter(m => m.status === tab).length
                  const isOn = filterTab === tab
                  return (
                    <button key={tab} onClick={() => { setFilterTab(tab); setPage(1) }} className="cursor-pointer"
                      style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                        background: isOn ? '#111827' : '#fff',
                        color: isOn ? '#fff' : '#6B7280',
                        border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                      {tab} <span style={{ opacity: 0.7, marginLeft: 2 }}>{count}</span>
                    </button>
                  )
                })}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      {['Member', 'Belt', 'Plan', 'Classes', 'Last Seen', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((m, idx) => {
                      const ss = STATUS_STYLES[m.status]
                      const beltBg = BELT_COLORS[m.belt] ?? '#E5E7EB'
                      const beltColor = BELT_TEXT[m.belt] ?? '#374151'
                      return (
                        <tr key={m.id} className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={m.name} avatarUrl={m.avatar} size={32} />
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{m.name}</p>
                                <p style={{ fontSize: 11, color: '#9CA3AF' }}>{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999,
                              background: beltBg, color: beltColor,
                              border: m.belt === 'White' ? '1px solid #D1D5DB' : 'none' }}>
                              {m.belt}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{m.plan}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{m.classes}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#9CA3AF' }}>{m.lastSeen}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
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
                      {pages.map((p, i) =>
                        p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                          <button key={p} onClick={() => setPage(p as number)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                            style={{ fontSize: 13, fontWeight: p === safePage ? 600 : 400, border: 'none',
                              background: p === safePage ? '#F3F4F6' : 'transparent',
                              color: p === safePage ? '#111827' : '#6B7280' }}>{p}</button>
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
