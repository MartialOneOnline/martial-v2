'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'

interface ReportData {
  overview: {
    totalSchools: number; schoolsThisMonth: number; schoolsLastMonth: number
    totalUsers: number; usersThisMonth: number; usersLastMonth: number
  }
  schoolsPerMonth: { month: string; count: number }[]
  usersPerMonth: { month: string; count: number }[]
  invitationsByStatus: { status: string; count: number }[]
}

function GrowthCard({ label, value, sub, color }: { label: string; value: number; sub: string; color: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-3xl font-bold text-[#101828]">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
      <div className="mt-3 h-1 rounded-full" style={{ background: color + '30' }}>
        <div className="h-1 rounded-full w-full" style={{ background: color }} />
      </div>
    </div>
  )
}

export default function GrowthClient() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/reports')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  // Merge school + user data by month
  const combined = (() => {
    if (!data) return []
    const months = [...new Set([
      ...data.schoolsPerMonth.map(r => r.month),
      ...data.usersPerMonth.map(r => r.month),
    ])]
    return months.map(month => ({
      month,
      schools: data.schoolsPerMonth.find(r => r.month === month)?.count ?? 0,
      users: data.usersPerMonth.find(r => r.month === month)?.count ?? 0,
    }))
  })()

  const invTotal = data?.invitationsByStatus.reduce((a, r) => a + r.count, 0) ?? 0
  const invRegistered = data?.invitationsByStatus.find(r => r.status === 'REGISTERED')?.count ?? 0
  const convRate = invTotal > 0 ? Math.round((invRegistered / invTotal) * 100) : 0

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/reports" prefetch={false} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Overview
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <h1 className="text-lg font-bold text-[#101828]">Growth</h1>
            <p className="text-xs text-gray-400">Platform expansion metrics</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-8 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GrowthCard label="Schools this month" value={data.overview.schoolsThisMonth} sub={`vs ${data.overview.schoolsLastMonth} last month`} color="#0870E2" />
            <GrowthCard label="Users this month" value={data.overview.usersThisMonth} sub={`vs ${data.overview.usersLastMonth} last month`} color="#8B5CF6" />
            <GrowthCard label="Total schools" value={data.overview.totalSchools} sub="all time" color="#10B981" />
            <GrowthCard label="Invite conv. rate" value={convRate} sub={`${invRegistered} of ${invTotal} converted`} color="#F59E0B" />
          </div>

          {/* Combined growth chart */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Schools & users growth</p>
            <p className="text-xs text-gray-400 mb-5">Monthly new additions (last 12 months)</p>
            {combined.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={combined} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="schools" stroke="#0870E2" strokeWidth={2.5} dot={{ r: 3, fill: '#0870E2', stroke: '#fff', strokeWidth: 2 }} name="Schools" />
                  <Line type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3, fill: '#8B5CF6', stroke: '#fff', strokeWidth: 2 }} name="Users" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-300">
                <TrendingUp className="w-10 h-10" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>

          {/* Invitations funnel */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Invitation funnel</p>
            <p className="text-xs text-gray-400 mb-5">Breakdown by status — total {invTotal} invitations</p>
            {data.invitationsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.invitationsByStatus} layout="vertical" margin={{ top: 0, right: 40, left: 60, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="count" fill="#0870E2" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#6B7280' }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
