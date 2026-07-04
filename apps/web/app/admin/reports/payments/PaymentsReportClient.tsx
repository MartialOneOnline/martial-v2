'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Wallet } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'
import { fmtPrice } from '@/lib/format'
import ReportsTabs from '../ReportsTabs'

interface ReportData {
  currency: string
  stats: { income: number; expense: number; net: number; otherCurrencyCount: number }
  byCategory: { category: string; total: number; count: number }[]
  byStatus: { status: string; count: number }[]
  monthlyTrend: { month: string; income: number; expense: number }[]
  bySchool: { schoolId: string; schoolName: string; income: number }[]
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold text-[#101828]">{value}</p>
      <div className="mt-3 h-1 rounded-full" style={{ background: color + '30' }}>
        <div className="h-1 rounded-full w-full" style={{ background: color }} />
      </div>
    </div>
  )
}

export default function PaymentsReportClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/reports/payments')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Payments</h1>
          <p className="text-xs text-gray-400">School income & expenses — last 12 months, EUR only</p>
        </div>
        <div className="flex items-center gap-3">
          <ReportsTabs active="/admin/reports/payments" />
          <button onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-8 space-y-6">
          {data.stats.otherCurrencyCount > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
              {data.stats.otherCurrencyCount} transaction(s) in a currency other than EUR are excluded from these totals to avoid mixing currencies.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Income (12mo)" value={fmtPrice(data.stats.income, data.currency)} color="#10B981" />
            <StatCard label="Expenses (12mo)" value={fmtPrice(data.stats.expense, data.currency)} color="#EF4444" />
            <StatCard label="Net" value={fmtPrice(data.stats.net, data.currency)} color="#0870E2" />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Income vs expenses</p>
            <p className="text-xs text-gray-400 mb-5">Monthly total, all schools ({data.currency})</p>
            {data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} name="Income" />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }} name="Expense" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-300">
                <Wallet className="w-10 h-10" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-bold text-[#101828] mb-4">By category</p>
              <div className="space-y-3">
                {data.byCategory.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
                {data.byCategory.map(c => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-medium text-gray-500 shrink-0 capitalize truncate">{c.category.replace('_', ' ').toLowerCase()}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#0870E2]" style={{
                        width: `${(c.total / (data.byCategory[0]?.total || 1)) * 100}%`,
                      }} />
                    </div>
                    <span className="text-xs font-bold text-gray-500 w-20 text-right">{fmtPrice(c.total, data.currency)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-bold text-[#101828] mb-4">Top schools by income</p>
              <div className="space-y-3">
                {data.bySchool.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
                {data.bySchool.map(s => (
                  <div key={s.schoolId} className="flex items-center gap-3">
                    <span className="flex-1 text-xs font-medium text-gray-600 truncate">{s.schoolName}</span>
                    <span className="text-xs font-bold text-gray-500">{fmtPrice(s.income, data.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
