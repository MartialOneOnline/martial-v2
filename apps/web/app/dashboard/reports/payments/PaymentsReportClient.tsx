'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState } from 'react'
import {Users, Calendar, CreditCard, BarChart2, Settings, Bell, ChevronRight, ChevronDown, Menu, X, Search, ChevronLeft} from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 10

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

const REVENUE_DATA: Record<string, { date: string; revenue: number }[]> = {
  '7d': [
    { date: 'Mon', revenue: 340 }, { date: 'Tue', revenue: 520 }, { date: 'Wed', revenue: 480 },
    { date: 'Thu', revenue: 610 }, { date: 'Fri', revenue: 570 }, { date: 'Sat', revenue: 720 },
    { date: 'Sun', revenue: 290 },
  ],
  '30d': [
    { date: 'May 6',  revenue: 1200 }, { date: 'May 9',  revenue: 1540 }, { date: 'May 12', revenue: 1380 },
    { date: 'May 15', revenue: 1720 }, { date: 'May 18', revenue: 1650 }, { date: 'May 21', revenue: 1900 },
    { date: 'May 24', revenue: 1780 }, { date: 'May 27', revenue: 2100 }, { date: 'May 30', revenue: 1960 },
    { date: 'Jun 2',  revenue: 2240 },
  ],
  '90d': [
    { date: 'Mar',   revenue: 5800 }, { date: 'Mar 2', revenue: 6200 }, { date: 'Apr',   revenue: 7100 },
    { date: 'Apr 2', revenue: 6800 }, { date: 'May',   revenue: 7600 }, { date: 'May 2', revenue: 8100 },
  ],
  '12m': [
    { date: 'Jun', revenue: 9800 }, { date: 'Jul', revenue: 10200 }, { date: 'Aug', revenue: 9600 },
    { date: 'Sep', revenue: 11000 }, { date: 'Oct', revenue: 11800 }, { date: 'Nov', revenue: 10900 },
    { date: 'Dec', revenue: 9400 }, { date: 'Jan', revenue: 12100 }, { date: 'Feb', revenue: 11700 },
    { date: 'Mar', revenue: 12600 }, { date: 'Apr', revenue: 13200 }, { date: 'May', revenue: 13800 },
  ],
}

const METHOD_DATA = [
  { name: 'Stripe',   amount: 8420, fill: '#6D28D9' },
  { name: 'Cash',     amount: 1230, fill: '#16A34A' },
  { name: 'Transfer', amount: 680,  fill: '#0071E3' },
  { name: 'Free',     amount: 0,    fill: '#9CA3AF' },
]

const METHOD_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  'Stripe':   { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
  'Cash':     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Transfer': { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' },
  'Free':     { bg: '#F9FAFB', color: '#9CA3AF', border: '#E5E7EB' },
}

type TxStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded'

const STATUS_STYLES: Record<TxStatus, { bg: string; color: string; border: string }> = {
  'Paid':     { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
  'Pending':  { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  'Failed':   { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  'Refunded': { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' },
}

interface Transaction {
  id: number
  avatar: string
  member: string
  plan: string
  method: string
  amount: string
  date: string
  status: TxStatus
}

const TRANSACTIONS: Transaction[] = [
  { id:1,  avatar:'https://i.pravatar.cc/32?img=1',  member:'Carlos Mendez',    plan:'Jiu Jitsu Mensual',    method:'Stripe',   amount:'€65.00',  date:'Jun 5',  status:'Paid'     },
  { id:2,  avatar:'https://i.pravatar.cc/32?img=2',  member:'Ana García',       plan:'Jiu Jitsu Trimestral', method:'Stripe',   amount:'€180.00', date:'Jun 4',  status:'Paid'     },
  { id:3,  avatar:'https://i.pravatar.cc/32?img=3',  member:'Miguel López',     plan:'Jiu Jitsu Mensual',    method:'Cash',     amount:'€65.00',  date:'Jun 4',  status:'Paid'     },
  { id:4,  avatar:'https://i.pravatar.cc/32?img=4',  member:'Laura Martínez',   plan:'Jiu Jitsu Infantil',   method:'Stripe',   amount:'€50.00',  date:'Jun 3',  status:'Pending'  },
  { id:5,  avatar:'https://i.pravatar.cc/32?img=5',  member:'David Sánchez',    plan:'Family Jiu Jitsu',     method:'Transfer', amount:'€100.00', date:'Jun 3',  status:'Paid'     },
  { id:6,  avatar:'https://i.pravatar.cc/32?img=6',  member:'Sofía Fernández',  plan:'Drop-in Class',        method:'Stripe',   amount:'€12.00',  date:'Jun 2',  status:'Failed'   },
  { id:7,  avatar:'https://i.pravatar.cc/32?img=7',  member:'Javier Romero',    plan:'Jiu Jitsu Mensual',    method:'Stripe',   amount:'€65.00',  date:'Jun 2',  status:'Paid'     },
  { id:8,  avatar:'https://i.pravatar.cc/32?img=8',  member:'Elena Díaz',       plan:'7-Day Free Trial',     method:'Free',     amount:'€0.00',   date:'Jun 1',  status:'Paid'     },
  { id:9,  avatar:'https://i.pravatar.cc/32?img=9',  member:'Pedro Jiménez',    plan:'2 Semanas',            method:'Stripe',   amount:'€35.00',  date:'Jun 1',  status:'Refunded' },
  { id:10, avatar:'https://i.pravatar.cc/32?img=10', member:'Isabel Moreno',    plan:'Jiu Jitsu Infantil',   method:'Cash',     amount:'€50.00',  date:'May 31', status:'Paid'     },
  { id:11, avatar:'https://i.pravatar.cc/32?img=11', member:'Antonio Ruiz',     plan:'Jiu Jitsu Mensual',    method:'Stripe',   amount:'€65.00',  date:'May 31', status:'Paid'     },
  { id:12, avatar:'https://i.pravatar.cc/32?img=12', member:'Carmen Álvarez',   plan:'Drop-in Class',        method:'Cash',     amount:'€12.00',  date:'May 30', status:'Paid'     },
  { id:13, avatar:'https://i.pravatar.cc/32?img=13', member:'Francisco Torres', plan:'Jiu Jitsu Trimestral', method:'Stripe',   amount:'€180.00', date:'May 30', status:'Pending'  },
  { id:14, avatar:'https://i.pravatar.cc/32?img=14', member:'Beatriz González', plan:'Family Jiu Jitsu',     method:'Transfer', amount:'€100.00', date:'May 29', status:'Paid'     },
  { id:15, avatar:'https://i.pravatar.cc/32?img=15', member:'Roberto Herrera',  plan:'Jiu Jitsu Mensual',    method:'Stripe',   amount:'€65.00',  date:'May 29', status:'Failed'   },
]

export default function PaymentsReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [filterTab, setFilterTab] = useState<'All' | TxStatus>('All')
  const [page, setPage] = useState(1)

  const filtered = filterTab === 'All' ? TRANSACTIONS : TRANSACTIONS.filter(t => t.status === filterTab)
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE)
  const pages = getPaginationPages(safePage, totalPages)

  const revenueData = REVENUE_DATA[period] ?? []
  const totalRevenue = revenueData.reduce((s, d) => s + d.revenue, 0)
  const paid = TRANSACTIONS.filter(t => t.status === 'Paid')
  const avgTx = paid.length ? Math.round(paid.reduce((s, t) => s + parseFloat(t.amount.replace('€', '')), 0) / paid.length) : 0
  const failedRate = Math.round((TRANSACTIONS.filter(t => t.status === 'Failed').length / TRANSACTIONS.length) * 100)
  const mrr = 8420

  const STATS = [
    { label: 'Total Revenue',    value: '€' + totalRevenue.toLocaleString(), sub: 'this period',  color: '#16A34A' },
    { label: 'MRR',              value: '€' + mrr.toLocaleString(),          sub: 'monthly recur', color: '#0071E3' },
    { label: 'Avg Transaction',  value: '€' + avgTx,                          sub: 'per payment',   color: '#6D28D9' },
    { label: 'Failed Rate',      value: failedRate + '%',                      sub: 'of all txns',   color: '#DC2626' },
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
              <input type="text" placeholder="Search payments…"
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
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.paymentsTitle}</h1>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Revenue, transactions and payment method breakdown</p>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {STATS.map(stat => (
                <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: stat.color }} />
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{stat.sub}</span>
                  </div>
                  <p style={{ fontSize: 26, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Revenue Over Time</p>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: unknown) => ['€' + (v as number).toLocaleString(), 'Revenue']} />
                    <Area type="monotone" dataKey="revenue" stroke="#16A34A" fill="#16A34A" fillOpacity={0.15} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Revenue by Payment Method</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={METHOD_DATA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                      formatter={(v: unknown) => ['€' + (v as number).toLocaleString(), 'Amount']} />
                    <Bar dataKey="amount" isAnimationActive={false}>
                      {METHOD_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} radius={4} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {(['All', 'Paid', 'Pending', 'Failed', 'Refunded'] as const).map(tab => {
                  const count = tab === 'All' ? TRANSACTIONS.length : TRANSACTIONS.filter(t => t.status === tab).length
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
                      {['Member', 'Plan', 'Method', 'Amount', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left"
                          style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((t, idx) => {
                      const ms = METHOD_STYLES[t.method] ?? { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
                      const ss = STATUS_STYLES[t.status]
                      return (
                        <tr key={t.id} className="hover:bg-[#FAFAFA] transition-colors"
                          style={{ borderBottom: idx < paginated.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <img src={t.avatar} alt={t.member} width={28} height={28} className="rounded-full" style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.member}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 12, color: '#6B7280' }}>{t.plan}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                              background: ms.bg, color: ms.color, border: '1px solid ' + ms.border }}>
                              {t.method}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>{t.amount}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 13, color: '#6B7280' }}>{t.date}</span>
                          </td>
                          <td className="px-5 py-3">
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999,
                              background: ss.bg, color: ss.color, border: '1px solid ' + ss.border }}>
                              {t.status}
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
