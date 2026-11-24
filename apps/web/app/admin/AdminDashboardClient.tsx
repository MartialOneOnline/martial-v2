'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Building2, Users, Mail, Clock, CheckCircle2, AlertTriangle,
  ArrowUpRight, Plus, Send, Eye, RefreshCw, MapPin, TrendingUp, Menu,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from './AdminLayoutClient'
import type { InvitationIndicators } from '@/lib/claims/queue'

const AdminMap = dynamic(() => import('./AdminMap'), { ssr: false })

interface Stats {
  schools: { total: number; verified: number; claimed: number; underReview: number; unverified: number }
  users: { total: number }
  ownership: { pending: number; in_progress: number; legacy: number; history: number }
  listings: { total: number; readyForReview: number; ownerNotFinished: number }
  invitations: InvitationIndicators
  schoolsByCountry: { country: string; count: number }[]
  schoolsWithCoords: { id: string; name: string; city: string; country: string; lat: number; lng: number; status: string }[]
  recentSchools: { id: string; name: string; city: string; country: string; status: string; createdAt: string }[]
  invitationsByMonth: { month: string; count: number }[]
  membershipDrift: number
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED:     { label: 'Verified',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  UNDER_REVIEW: { label: 'Under Review',  cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  CLAIMED:      { label: 'Claimed',       cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  UNVERIFIED:   { label: 'Unverified',    cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PARTNER:      { label: 'Partner',       cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function AdminDashboardClient() {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/stats')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // All counters come from lib/claims/queue.ts (shared with the Verification
  // Queue): each value is the length of the list its link opens.
  const inv = stats?.invitations
  const total = inv?.total ?? 0
  const sent = inv?.sent ?? 0
  const accepted = inv?.accepted ?? 0
  const awaiting = inv?.awaitingAcceptance ?? 0
  const convRate = inv?.conversionRate ?? 0
  const own = stats?.ownership
  const ownershipToReview = (own?.pending ?? 0)
  const nb = inv?.needsActionBreakdown
  const needsActionSub = nb
    ? [nb.notSent && `${nb.notSent} not sent`, nb.failed && `${nb.failed} failed`, nb.uncertain && `${nb.uncertain} unknown outcome`, nb.expired && `${nb.expired} expired`, nb.legacyLink && `${nb.legacyLink} old link`].filter(Boolean).join(' · ')
    : ''

  // Needs attention items
  const attentionItems = [
    {
      icon: AlertTriangle,
      color: '#F59E0B',
      bg: 'bg-amber-50',
      label: 'Ownership requests to review',
      sub: (own?.in_progress ?? 0) > 0 ? `${own?.in_progress} more in progress` : '',
      value: ownershipToReview,
      href: '/admin/schools/verify?view=pending',
      cta: 'Review',
      urgent: ownershipToReview > 0,
    },
    ...((own?.legacy ?? 0) > 0 ? [{
      icon: AlertTriangle,
      color: '#DC2626',
      bg: 'bg-red-50',
      label: 'Closed without review (old “Mark resolved”)',
      sub: 'no school was ever linked',
      value: own?.legacy ?? 0,
      href: '/admin/schools/verify?view=legacy',
      cta: 'Review',
      urgent: true,
    }] : []),
    {
      icon: Building2,
      color: '#F59E0B',
      bg: 'bg-amber-50',
      label: 'Listings to review',
      sub: stats ? `${stats.listings.readyForReview} ready · ${stats.listings.ownerNotFinished} setup unfinished` : '',
      value: stats?.listings.total ?? 0,
      href: '/admin/schools/verify?tab=listings',
      cta: 'Review',
      urgent: (stats?.listings.readyForReview ?? 0) > 0,
    },
    {
      icon: Mail,
      color: '#3B82F6',
      bg: 'bg-blue-50',
      label: 'Owner invitations needing action',
      sub: (inv?.needsActionPipeline ?? 0) === 0 ? needsActionSub : 'from ownership requests',
      value: inv?.needsActionFromRequests ?? 0,
      href: '/admin/schools/verify?view=in_progress',
      cta: 'Open',
      urgent: (inv?.needsActionFromRequests ?? 0) > 0,
    },
    ...((inv?.needsActionPipeline ?? 0) > 0 ? [{
      icon: Send,
      color: '#3B82F6',
      bg: 'bg-blue-50',
      label: 'Direct invitations needing action',
      sub: 'not from a request',
      value: inv?.needsActionPipeline ?? 0,
      href: '/admin/schools',
      cta: 'Open',
      urgent: true,
    }] : []),
    {
      icon: CheckCircle2,
      color: '#10B981',
      bg: 'bg-emerald-50',
      label: 'Owners accepted this month',
      sub: 'since the 1st (UTC)',
      value: inv?.acceptedThisMonth ?? 0,
      href: '/admin/schools/verify?view=history',
      cta: 'View',
      urgent: false,
    },
    {
      icon: Users,
      color: '#8B5CF6',
      bg: 'bg-violet-50',
      label: 'Total users',
      sub: '',
      value: stats?.users.total ?? 0,
      href: '/admin/users',
      cta: 'Manage',
      urgent: false,
    },
    {
      icon: AlertTriangle,
      color: '#DC2626',
      bg: 'bg-red-50',
      label: 'Membership status drift',
      sub: '',
      value: stats?.membershipDrift ?? 0,
      href: '/admin/reports/membership-drift',
      cta: 'Investigate',
      urgent: (stats?.membershipDrift ?? 0) > 0,
    },
  ]

  return (
    <div className="min-h-screen">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer shrink-0"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }} onClick={() => setMenuOpen(!menuOpen)}>
            <Menu size={16} style={{ color: '#374151' }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#101828]">Dashboard</h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/schools"
            prefetch={false}
            className="flex items-center gap-2 h-9 px-3 sm:px-4 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#0870E2' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Invite School</span>
          </Link>
        </div>
      </div>

      <div className="p-4 md:p-8 space-y-6">

        {/* ── Row 1: KPI cards ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Schools',  value: stats?.schools.total ?? 0,    icon: Building2,   color: '#0870E2', sub: `${stats?.schools.verified ?? 0} verified` },
            { label: 'Verified',       value: stats?.schools.verified ?? 0, icon: CheckCircle2, color: '#10B981', sub: 'approved profiles' },
            { label: 'To review',      value: ownershipToReview + (own?.legacy ?? 0) + (stats?.listings.total ?? 0), icon: AlertTriangle, color: '#F59E0B', sub: `${ownershipToReview + (own?.legacy ?? 0)} ownership · ${stats?.listings.total ?? 0} listings`, alert: ownershipToReview + (own?.legacy ?? 0) + (stats?.listings.readyForReview ?? 0) > 0 },
            { label: 'Total Users',    value: stats?.users.total ?? 0,      icon: Users,        color: '#8B5CF6', sub: 'registered accounts' },
            { label: 'Conv. Rate',     value: `${convRate}%`,               icon: TrendingUp,   color: '#3B82F6', sub: `${accepted} accepted of ${sent} sent · all time` },
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
              <p className="text-3xl font-bold text-[#101828]">{card.value}</p>
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
                <p className="text-sm font-bold text-[#101828]">Invitations overview</p>
                <p className="text-xs text-gray-400 mt-0.5">Owner invitations created per month (UTC) · last 6 months · funnel all time</p>
              </div>
              <Link href="/admin/schools" prefetch={false} className="flex items-center gap-1 text-xs font-semibold text-[#0870E2] hover:underline mt-0.5">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Funnel pills */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-gray-50">
              {[
                { label: 'Created',  value: total,    color: '#0870E2' },
                { label: 'Sent',     value: sent,     color: '#3B82F6' },
                { label: 'Accepted', value: accepted, color: '#10B981' },
                { label: 'Awaiting', value: awaiting, color: '#F59E0B' },
              ].map((f, i) => (
                <div key={f.label} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-gray-200 text-xs">›</span>}
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="text-xs text-gray-500">{f.label}</span>
                    <span className="text-xs font-bold text-[#101828]">{f.value}</span>
                  </div>
                </div>
              ))}
              <div className="ml-auto bg-[#0870E2]/8 rounded-lg px-3 py-1.5">
                <span className="text-xs font-bold text-[#0870E2]">{convRate}% conv.</span>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4">
              {(stats?.invitationsByMonth.length ?? 0) > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats?.invitationsByMonth} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0870E2" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#0870E2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="count" stroke="#0870E2" strokeWidth={2.5} fill="url(#grad)"
                      dot={{ r: 4, fill: '#0870E2', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
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
              <p className="text-sm font-bold text-[#101828]">Needs attention</p>
              <p className="text-xs text-gray-400 mt-0.5">Actions that require your input</p>
            </div>
            <div className="flex-1 px-4 py-4 space-y-2">
              {attentionItems.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  prefetch={false}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50 group ${
                    item.urgent ? 'ring-1 ring-amber-200 bg-amber-50/40' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.bg}`}>
                    <item.icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#101828]">{item.label}</p>
                    <p className="text-xs text-gray-400 break-words">{item.sub || item.cta}</p>
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
                prefetch={false}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl border border-[#0870E2] text-[#0870E2] text-xs font-semibold hover:bg-[#0870E2] hover:text-white transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Invite a school
              </Link>
              <Link href="/admin/schools/verify"
                prefetch={false}
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
                <p className="text-sm font-bold text-[#101828]">Recent schools</p>
                <p className="text-xs text-gray-400 mt-0.5">Latest additions to the platform</p>
              </div>
              <Link href="/admin/schools/all" prefetch={false} className="flex items-center gap-1 text-xs font-semibold text-[#0870E2] hover:underline">
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="overflow-x-auto">
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
                        <div className="w-8 h-8 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-[#0870E2]" />
                        </div>
                        <span className="text-xs font-semibold text-[#101828]">{school.name}</span>
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
                        prefetch={false}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-semibold text-[#0870E2] hover:underline"
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
                      <Link href="/admin/schools" prefetch={false} className="text-xs text-[#0870E2] font-semibold hover:underline mt-1 inline-block">
                        Invite the first one →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Map + By country stacked */}
          <div className="flex flex-col gap-4">

            {/* Map */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-[#101828]">Schools map</p>
                <span className="text-xs text-gray-400">{stats?.schoolsWithCoords.length ?? 0} pins</span>
              </div>
              <div className="h-44">
                {stats && <AdminMap schools={stats.schoolsWithCoords} />}
              </div>
            </div>

            {/* By country */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex-1">
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-sm font-bold text-[#101828]">By country</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                {(stats?.schoolsByCountry ?? []).slice(0, 6).map(({ country, count }) => (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 w-8 uppercase shrink-0">{country}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-[#0870E2] h-1.5 rounded-full"
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
