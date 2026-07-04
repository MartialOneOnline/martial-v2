'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Users, Mail, TrendingUp, CheckCircle2, Clock,
  ArrowUpRight, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'
import ReportsTabs from './ReportsTabs'

interface ReportData {
  overview: {
    totalSchools: number; schoolsThisMonth: number; schoolsLastMonth: number
    totalUsers: number; usersThisMonth: number; usersLastMonth: number
    totalInvitations: number; invitationsThisMonth: number
    verifiedSchools: number; claimedSchools: number
  }
  schoolsByStatus: { status: string; count: number }[]
  schoolsBySource: { source: string; count: number }[]
  schoolsByCountry: { country: string; count: number }[]
  usersByRole: { role: string; count: number }[]
  invitationsByStatus: { status: string; count: number }[]
  schoolsPerMonth: { month: string; count: number }[]
  usersPerMonth: { month: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: '#10B981', CLAIMED: '#3B82F6', UNVERIFIED: '#9CA3AF',
  PARTNER: '#F59E0B', SUSPENDED: '#EF4444',
}
const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: '#8B5CF6', SCHOOL_OWNER: '#0870E2', INSTRUCTOR: '#F59E0B', STUDENT: '#10B981',
}

function pct(val: number, last: number) {
  if (!last) return null
  const d = ((val - last) / last) * 100
  return { val: Math.abs(d).toFixed(0), up: d >= 0 }
}

export default function ReportsOverviewClient() {
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

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { overview } = data
  const schoolPct = pct(overview.schoolsThisMonth, overview.schoolsLastMonth)
  const userPct = pct(overview.usersThisMonth, overview.usersLastMonth)

  const kpis = [
    {
      label: 'Total Schools', value: overview.totalSchools, icon: Building2, color: '#0870E2',
      sub: `${overview.schoolsThisMonth} this month`,
      change: schoolPct,
    },
    {
      label: 'Verified', value: overview.verifiedSchools, icon: CheckCircle2, color: '#10B981',
      sub: `${Math.round((overview.verifiedSchools / (overview.totalSchools || 1)) * 100)}% of total`,
      change: null,
    },
    {
      label: 'Pending Review', value: overview.claimedSchools, icon: Clock, color: '#F59E0B',
      sub: 'awaiting approval',
      change: null,
    },
    {
      label: 'Total Users', value: overview.totalUsers, icon: Users, color: '#8B5CF6',
      sub: `${overview.usersThisMonth} this month`,
      change: userPct,
    },
    {
      label: 'Total Invites', value: overview.totalInvitations, icon: Mail, color: '#3B82F6',
      sub: `${overview.invitationsThisMonth} this month`,
      change: null,
    },
  ]

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Reports Overview</h1>
          <p className="text-xs text-gray-400">Platform-wide metrics and growth</p>
        </div>
        <div className="flex items-center gap-3">
          <ReportsTabs active="/admin/reports" />
          <button onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: k.color + '18' }}>
                  <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{k.label}</p>
              </div>
              <p className="text-3xl font-bold text-[#101828]">{k.value}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[11px] text-gray-400">{k.sub}</p>
                {k.change && (
                  <span className={`text-[10px] font-bold ${k.change.up ? 'text-emerald-600' : 'text-red-500'}`}>
                    {k.change.up ? '↑' : '↓'}{k.change.val}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Schools per month */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">Schools growth</p>
            <p className="text-xs text-gray-400 mb-4">New schools per month (last 12 months)</p>
            {data.schoolsPerMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.schoolsPerMonth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0870E2" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#0870E2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Area type="monotone" dataKey="count" stroke="#0870E2" strokeWidth={2.5} fill="url(#sg)"
                    dot={{ r: 3, fill: '#0870E2', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            )}
          </div>

          {/* Users per month */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-1">User registrations</p>
            <p className="text-xs text-gray-400 mb-4">New users per month (last 12 months)</p>
            {data.usersPerMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.usersPerMonth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            )}
          </div>
        </div>

        {/* Breakdown row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Schools by status */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-4">Schools by status</p>
            <div className="space-y-3">
              {data.schoolsByStatus.map(r => (
                <div key={r.status} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-gray-500 shrink-0 capitalize">{r.status.toLowerCase()}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{
                      width: `${(r.count / (overview.totalSchools || 1)) * 100}%`,
                      background: STATUS_COLORS[r.status] ?? '#9CA3AF',
                    }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Users by role */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-4">Users by role</p>
            <div className="space-y-3">
              {data.usersByRole.map(r => (
                <div key={r.role} className="flex items-center gap-3">
                  <span className="w-28 text-xs font-medium text-gray-500 shrink-0 truncate">
                    {r.role.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{
                      width: `${(r.count / (overview.totalUsers || 1)) * 100}%`,
                      background: ROLE_COLORS[r.role] ?? '#9CA3AF',
                    }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top countries */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <p className="text-sm font-bold text-[#101828] mb-4">Top countries</p>
            <div className="space-y-3">
              {data.schoolsByCountry.slice(0, 6).map(r => (
                <div key={r.country} className="flex items-center gap-3">
                  <span className="w-24 text-xs font-medium text-gray-500 shrink-0 truncate">{r.country}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#0870E2]" style={{
                      width: `${(r.count / (data.schoolsByCountry[0]?.count || 1)) * 100}%`,
                    }} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 w-6 text-right">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
