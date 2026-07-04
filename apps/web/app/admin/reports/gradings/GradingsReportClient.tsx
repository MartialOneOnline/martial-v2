'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'
import ReportsTabs from '../ReportsTabs'

interface ReportData {
  stats: { totalPeriod: number }
  monthlyTrend: { month: string; count: number }[]
  topTransitions: { label: string; count: number }[]
  bySchool: { schoolId: string; schoolName: string; count: number }[]
}

export default function GradingsReportClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/reports/gradings')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Gradings</h1>
          <p className="text-xs text-gray-400">Belt promotions across all schools — last 12 months</p>
        </div>
        <div className="flex items-center gap-3">
          <ReportsTabs active="/admin/reports/gradings" />
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Promotions (12mo)</p>
              <p className="text-3xl font-bold text-[#101828]">{data.stats.totalPeriod}</p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Promotions per month</p>
            <p className="text-xs text-gray-400 mb-5">All schools</p>
            {data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-gray-300">
                <Award className="w-10 h-10" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-bold text-[#101828] mb-4">Top belt transitions</p>
              <div className="space-y-3">
                {data.topTransitions.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
                {data.topTransitions.map(t => (
                  <div key={t.label} className="flex items-center gap-3">
                    <span className="flex-1 text-xs font-medium text-gray-600 truncate">{t.label}</span>
                    <span className="text-xs font-bold text-gray-500">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <p className="text-sm font-bold text-[#101828] mb-4">By school</p>
              <div className="space-y-3">
                {data.bySchool.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
                {data.bySchool.map(s => (
                  <div key={s.schoolId} className="flex items-center gap-3">
                    <span className="flex-1 text-xs font-medium text-gray-600 truncate">{s.schoolName}</span>
                    <span className="text-xs font-bold text-gray-500">{s.count}</span>
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
