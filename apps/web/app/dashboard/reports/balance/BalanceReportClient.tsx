'use client'

import { useDashboard } from '../../../../components/DashboardShell'
import { useState, useEffect, useCallback } from 'react'
import { Menu, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { useT } from '../../../../lib/i18n/LanguageContext'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const ITEMS_PER_PAGE = 20

function getPaginationPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
  if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}

type TxType = 'INCOME' | 'EXPENSE'
type FilterTab = 'ALL' | TxType

const TYPE_STYLES: Record<TxType, { bg: string; color: string; border: string; label: string }> = {
  INCOME:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Income'  },
  EXPENSE: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Expense' },
}

const CAT_LABELS: Record<string, string> = {
  MEMBERSHIP: 'Membership', SALARY: 'Salary', RENT: 'Rent',
  EQUIPMENT: 'Equipment', UTILITIES: 'Utilities', MARKETING: 'Marketing',
  INSURANCE: 'Insurance', OTHER: 'Other',
}

interface Entry {
  id: string
  date: string
  description: string | null
  category: string
  type: TxType
  amount: number
  currency: string
}

interface ChartPoint { date: string; income: number; expenses: number }

function fmtAmt(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function BalanceReportClient() {
  const { setMenuOpen } = useDashboard()
  const t = useT()

  const [entries,       setEntries]       = useState<Entry[]>([])
  const [total,         setTotal]         = useState(0)
  const [totalIncome,   setTotalIncome]   = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [netBalance,    setNetBalance]    = useState(0)
  const [chartData,     setChartData]     = useState<ChartPoint[]>([])
  const [loading,       setLoading]       = useState(true)

  const [filterTab, setFilterTab] = useState<FilterTab>('ALL')
  const [search,    setSearch]    = useState('')
  const [page,      setPage]      = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(ITEMS_PER_PAGE),
      ...(filterTab !== 'ALL' ? { type: filterTab } : {}),
      ...(search ? { search } : {}),
    })
    const res = await fetch(`/api/dashboard/balance?${params}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setEntries(data.entries)
    setTotal(data.total)
    setTotalIncome(data.totalIncome)
    setTotalExpenses(data.totalExpenses)
    setNetBalance(data.netBalance)
    setChartData(data.chartData)
    setLoading(false)
  }, [page, filterTab, search])

  useEffect(() => { load() }, [load])

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE))
  const pages = getPaginationPages(page, totalPages)
  const profitMargin = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0

  const STATS = [
    { label: 'Total Income',   value: fmtAmt(totalIncome),   color: '#16A34A' },
    { label: 'Total Expenses', value: fmtAmt(totalExpenses), color: '#DC2626' },
    { label: 'Net Balance',    value: fmtAmt(netBalance),    color: '#0071E3' },
    { label: 'Profit Margin',  value: profitMargin + '%',    color: '#6D28D9' },
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
          <input type="text" placeholder="Search ledger…" value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151', width: '100%' }} />
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', margin: 0 }}>{t.reports.balanceTitle}</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>Income, expenses and net balance</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map(stat => (
            <div key={stat.label} className="rounded-2xl" style={{ background: '#fff', border: '1px solid #E5E7EB', padding: '18px 20px' }}>
              <div className="w-2 h-2 rounded-full mb-3" style={{ background: stat.color }} />
              <p style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>
                {loading ? '—' : stat.value}
              </p>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#6B7280' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {chartData.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Income vs Expenses</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => '€' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: unknown) => [fmtAmt(v as number)]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="#16A34A" fill="#16A34A" fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#DC2626" fill="#DC2626" fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Monthly P&amp;L</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => '€' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: unknown) => [fmtAmt(v as number)]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map(tab => {
              const isOn = filterTab === tab
              const label = tab === 'ALL' ? 'All' : TYPE_STYLES[tab].label
              return (
                <button key={tab} onClick={() => { setFilterTab(tab); setPage(1) }} className="cursor-pointer"
                  style={{ fontSize: 12, fontWeight: isOn ? 600 : 400, padding: '5px 14px', borderRadius: 8,
                    background: isOn ? '#111827' : '#fff', color: isOn ? '#fff' : '#6B7280',
                    border: isOn ? '1.5px solid #111827' : '1.5px solid #E5E7EB' }}>
                  {label}
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E5E7EB' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  {['Date', 'Description', 'Category', 'Amount'].map(h => (
                    <th key={h} className="px-5 py-3 text-left"
                      style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>Loading…</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-10 text-center" style={{ fontSize: 13, color: '#9CA3AF' }}>No entries found</td></tr>
                ) : entries.map((e, idx) => {
                  const ts = TYPE_STYLES[e.type]
                  const isIncome = e.type === 'INCOME'
                  return (
                    <tr key={e.id} className="hover:bg-[#FAFAFA] transition-colors"
                      style={{ borderBottom: idx < entries.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 13, color: '#6B7280' }}>{fmtDate(e.date)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 13, color: e.description ? '#111827' : '#D1D5DB', fontWeight: 500 }}>
                          {e.description ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          background: ts.bg, color: ts.color, border: '1px solid ' + ts.border }}>
                          {CAT_LABELS[e.category] ?? e.category}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
                          color: isIncome ? '#16A34A' : '#DC2626' }}>
                          {isIncome ? '+' : '−'}{fmtAmt(e.amount, e.currency)}
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
                  Showing <span style={{ fontWeight: 600, color: '#111827' }}>{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, total)}</span> of <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === 1 ? '#D1D5DB' : '#374151', cursor: page === 1 ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
                    <ChevronLeft size={14} />
                  </button>
                  {pages.map((p, i) =>
                    p === '...' ? <span key={'e' + i} style={{ fontSize: 13, color: '#9CA3AF', padding: '0 4px' }}>…</span> : (
                      <button key={p} onClick={() => setPage(p as number)}
                        className="w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer"
                        style={{ fontSize: 13, fontWeight: p === page ? 600 : 400, border: 'none',
                          background: p === page ? '#F3F4F6' : 'transparent', color: p === page ? '#111827' : '#6B7280' }}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    style={{ fontSize: 13, border: '1px solid #E5E7EB', background: '#fff', color: page === totalPages ? '#D1D5DB' : '#374151', cursor: page === totalPages ? 'not-allowed' : 'pointer', borderRadius: 8, padding: '6px 10px' }}>
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
