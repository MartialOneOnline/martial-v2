'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CalendarCheck } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'
import ReportsTabs from '../ReportsTabs'

interface ReportData {
  stats: { totalPeriod: number; confirmedPeriod: number; cancelledPeriod: number; noShowPeriod: number; attendanceRate: number }
  monthlyTrend: { month: string; count: number }[]
  bySchool: { schoolId: string; schoolName: string; total: number; confirmed: number; attendanceRate: number }[]
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
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

export default function AttendanceClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/reports/attendance')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Attendance</h1>
          <p className="text-xs text-gray-400">Booking attendance across all schools — last 12 months</p>
        </div>
        <div className="flex items-center gap-3">
          <ReportsTabs active="/admin/reports/attendance" />
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Bookings (12mo)" value={data.stats.totalPeriod} color="#0870E2" />
            <StatCard label="Attendance rate" value={`${data.stats.attendanceRate}%`} color="#10B981" />
            <StatCard label="Cancelled" value={data.stats.cancelledPeriod} color="#F59E0B" />
            <StatCard label="No-shows" value={data.stats.noShowPeriod} color="#EF4444" />
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Confirmed bookings</p>
            <p className="text-xs text-gray-400 mb-5">Monthly total, all schools</p>
            {data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0870E2" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0870E2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="count" stroke="#0870E2" strokeWidth={2.5} fill="url(#ag)"
                    dot={{ r: 3, fill: '#0870E2', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-300">
                <CalendarCheck className="w-10 h-10" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-4">By school</p>
            <div className="space-y-3">
              {data.bySchool.length === 0 && <p className="text-xs text-gray-400">No data yet</p>}
              {data.bySchool.map(s => (
                <div key={s.schoolId} className="flex items-center gap-3">
                  <span className="w-40 text-xs font-medium text-gray-600 shrink-0 truncate">{s.schoolName}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#0870E2]" style={{ width: `${s.attendanceRate}%` }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-10 text-right">{s.attendanceRate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
