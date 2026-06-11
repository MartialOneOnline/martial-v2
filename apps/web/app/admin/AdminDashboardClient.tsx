'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Building2, Users, Mail, Clock, CheckCircle2, AlertTriangle,
  ArrowUpRight, Plus, Send, Eye, RefreshCw, MapPin, TrendingUp,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

const AdminMap = dynamic(() => import('./AdminMap'), { ssr: false })

interface Stats {
  schools: { total: number; verified: number; claimed: number; unverified: number }
  users: { total: number }
  invitations: { total: number; sent: number; registered: number; pending: number }
  schoolsByCountry: { country: string; count: number }[]
  schoolsWithCoords: { id: string; name: string; city: string; country: string; lat: number; lng: number; status: string }[]
  recentSchools: { id: string; name: string; city: string; country: string; status: string; createdAt: string }[]
  invitationsByMonth: { month: string; count: number }[]
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED:   { label: 'Verified',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  CLAIMED:    { label: 'Claimed',    cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PARTNER:    { label: 'Partner',    cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Funnel conversion
  const total = stats?.invitations.total ?? 0
  const sent = stats?.invitations.sent ?? 0
  const registered = stats?.invitations.registered ?? 0
  const pending = stats?.invitations.pending ?? 0
  const convRate = total > 0 ? Math.round((registered / total) * 100) : 0

  // Needs attention items
  const attentionItems = [
    {
      icon: AlertTriangle,
      color: '#F59E0B',
      bg: 'bg-amber-50',
      label: 'Pending verification',
      value: stats?.schools.claimed ?? 0,
      href: '/admin/schools/verify',
      cta: 'Review queue',
      urgent: (stats?.schools.claimed ?? 0) > 0,
    },
    {
      icon: Mail,
      color: '#3B82F6',
      bg: 'bg-blue-50',
      label: 'Invites not yet sent',
      value: pending,
      href: '/admin/schools',
      cta: 'Send now',
      urgent: pending > 0,
    },
    {
      icon: CheckCircle2,
      color: '#10B981',
      bg: 'bg-emerald-50',
      label: 'Registered this month',
      value: registered,
      href: '/admin/schools/all',
      cta: 'View all',
      urgent: false,
    },
    {
      icon: Users,
      color: '#8B5CF6',
      bg: 'bg-violet-50',
      label: 'Total users',
      value: stats?.users.total ?? 0,
      href: '/admin/users',
      cta: 'Manage',
      urgent: false,
    },
  ]

  return (
    <div className="min-h-screen">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">Dashboard</h1>
          <p className="text-xs text-gray-400">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            href="/admin/schools"
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#006197' }}
          >
            <Plus className="w-4 h-4" />
            Invite School
          </Link>
        </div>
      </div>

      <div className="p-8 space-y-6">

        {/* ── Row 1: KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Schools',  value: stats?.schools.total ?? 0,    icon: Building2,   color: '#006197', sub: `${stats?.schools.verified ?? 0} verified` },
            { label: 'Verified',       value: stats?.schools.verified ?? 0, icon: CheckCircle2, color: '#10B981', sub: 'approved profiles' },
            { label: 'Pending Review', value: stats?.schools.claimed ?? 0,  icon: AlertTriangle, color: '#F59E0B', sub: 'needs attention', alert: (stats?.schools.claimed ?? 0) > 0 },
            { label: 'Total Users',    value: stats?.users.total ?? 0,      icon: Users,        color: '#8B5CF6', sub: 'registered accounts' },
            { label: 'Conv. Rate',     value: `${convRate}%`,               icon: TrendingUp,   color: '#3B82F6', sub: `${registered} of ${total} invited` },
          ].map(card => (
            <div
              key={card.label}
              className={`bg-white border rounded-2xl p-5 shadow-sm relative ${card.alert ? 'border-amber-200' : 'border-gray-100'}`}
            >
              {card.alert && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: card.color + '18' }}>
                  <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                </div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{card.label}</p>
              </div>
              <p className="text-3xl font-bold text-[#0D1B2A]">{card.value}</p>
              <p className="text-[11px] text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Row 2: Chart + Needs Attention ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Invitations area chart */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-50">
              <div>
                <p className="text-sm font-bold text-[#0D1B2A]">Invitations overview</p>
                <p className="text-xs text-gray-400 mt-0.5">Schools invited per month · last 6 months</p>
              </div>
              <Link href="/admin/schools" className="flex items-center gap-1 text-xs font-semibold text-[#006197] hover:underline mt-0.5">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Funnel pills */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-50">
              {[
                { label: 'Invited',    value: total,      color: '#006197' },
                { label: 'Sent',       value: sent,       color: '#3B82F6' },
                { label: 'Registered', value: registered, color: '#10B981' },
                { label: 'Pending',    value: pending,    color: '#F59E0B' },
              ].map((f, i) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-gray-200 text-xs">›</span>}
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="text-xs text-gray-500">{f.label}</span>
                    <span className="text-xs font-bold text-[#0D1B2A]">{f.value}</span>
                  </div>
                </div>
              ))}
              <div className="ml-auto bg-[#006197]/8 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-[#006197]">{convRate}% conv.</span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4">
              {(stats?.invitationsByMonth.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats?.invitationsByMonth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#006197" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#006197" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="count" stroke="#006197" strokeWidth={2.5} fill="url(#grad)"
                      dot={{ r: 4, fill: '#006197', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center gap-2 text-gray-300">
                  <TrendingUp className="w-10 h-10" />
                  <p className="text-sm text-gray-400">No data yet — invite your first school</p>
                </div>
              )}
            </div>
          </div>

          {/* Needs Attention panel */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-50">
              <p className="text-sm font-bold text-[#0D1B2A]">Needs attention</p>
              <p className="text-xs text-gray-400 mt-0.5">Actions that require your input</p>
            </div>
            <div className="flex-1 px-4 py-4 space-y-2">
              {attentionItems.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50 group ${
                    item.urgent ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#0D1B2A]">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.cta}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>

            {/* Quick actions */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-50 space-y-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2">Quick actions</p>
              <Link href="/admin/schools"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-[#006197] text-[#006197] text-xs font-semibold hover:bg-[#006197] hover:text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Invite a school
              </Link>
              <Link href="/admin/schools/verify"
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Review verifications
              </Link>
            </div>
          </div>
        </div>

        {/* ── Row 3: Recent Schools table + Map ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Recent schools table */}
          <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
              <div>
                <p className="text-sm font-bold text-[#0D1B2A]">Recent schools</p>
                <p className="text-xs text-gray-400 mt-0.5">Latest additions to the platform</p>
              </div>
              <Link href="/admin/schools/all" className="flex items-center gap-1 text-xs font-semibold text-[#006197] hover:underline">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(stats?.recentSchools ?? []).map(school => (
                  <tr key={school.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#006197]/8 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-[#006197]" />
                        </div>
                        <span className="text-xs font-semibold text-[#0D1B2A]">{school.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                        {school.city}, {school.country}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[school.status]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_BADGE[school.status]?.label ?? school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(school.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/schools/verify`}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-[#006197] hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
                {(stats?.recentSchools.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <Building2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No schools yet</p>
                      <Link href="/admin/schools" className="text-xs text-[#006197] font-semibold hover:underline mt-1 inline-block">
                        Invite the first one →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Map + By country stacked */}
          <div className="flex flex-col gap-4">

            {/* Map */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-[#0D1B2A]">Schools map</p>
                <span className="text-xs text-gray-400">{stats?.schoolsWithCoords.length ?? 0} pins</span>
              </div>
              <div className="h-44">
                {stats && <AdminMap schools={stats.schoolsWithCoords} />}
              </div>
            </div>

            {/* By country */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-[#0D1B2A]">By country</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(stats?.schoolsByCountry ?? []).slice(0, 6).map(({ country, count }) => (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-8 uppercase shrink-0">{country}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#006197] h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (count / (stats?.schools.total || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 w-4 text-right shrink-0">{count}</span>
                  </div>
                ))}
                {(stats?.schoolsByCountry.length ?? 0) === 0 && (
                  <p className="text-xs text-gray-400 py-4 text-center">No data yet</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}
