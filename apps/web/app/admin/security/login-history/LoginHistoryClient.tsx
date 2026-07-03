'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ShieldAlert, Search, ChevronLeft, ChevronRight,
  RefreshCw, Globe, Monitor,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'

type LoginEvent = {
  id: string
  userEmail: string | null
  userName: string | null
  userRole: string | null
  ipAddress: string | null
  country: string | null
  city: string | null
  userAgent: string | null
  browser: string | null
  os: string | null
  device: string | null
  createdAt: string
  user: { id: string; avatarUrl: string | null } | null
}

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  SUPERADMIN:   { label: 'Super Admin',    cls: 'bg-violet-50 text-violet-700 border border-violet-100' },
  SCHOOL_OWNER: { label: 'School Owner',   cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  INSTRUCTOR:   { label: 'Instructor',     cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  STUDENT:      { label: 'Student',        cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
}

const ROLES = ['', 'SUPERADMIN', 'SCHOOL_OWNER', 'INSTRUCTOR', 'STUDENT']

function fmtDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function isPrivateIp(ip: string): boolean {
  return /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|::1$|localhost$)/.test(ip)
}

function Avatar({ event }: { event: LoginEvent }) {
  const initials = (event.userName || event.userEmail || '?').slice(0, 2).toUpperCase()
  return event.user?.avatarUrl
    ? <img src={event.user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
    : (
      <div className="w-8 h-8 rounded-full bg-[#0870E2]/10 flex items-center justify-center text-[#0870E2] text-[11px] font-bold">
        {initials}
      </div>
    )
}

export default function LoginHistoryClient() {
  const [items, setItems] = useState<LoginEvent[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, role, startDate, endDate, page: String(page) })
    adminFetch(`/api/admin/login-history?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setItems(d?.items ?? [])
        setTotal(d?.total ?? 0)
        setPages(d?.pages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, role, startDate, endDate, page])

  useEffect(() => { setPage(1) }, [search, role, startDate, endDate])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Login History</h1>
          <p className="text-xs text-gray-400">{total} login events</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, email or IP…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] w-64"
            />
          </div>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
          >
            {ROLES.map(r => (
              <option key={r} value={r}>{r || 'All roles'}</option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ShieldAlert className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No login events found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">IP Address</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Device</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Browser / OS</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(event => (
                  <tr key={event.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar event={event} />
                        <div>
                          <p className="text-xs font-semibold text-[#101828]">{event.userName || '—'}</p>
                          <p className="text-[11px] text-gray-400">{event.userEmail || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {event.userRole ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_BADGE[event.userRole]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                          {ROLE_BADGE[event.userRole]?.label ?? event.userRole}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {event.ipAddress ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-600 font-mono">{event.ipAddress}</span>
                          {isPrivateIp(event.ipAddress) && (
                            <span className="text-[10px] text-gray-400">Local / private IP</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {event.country ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Globe className="w-3 h-3 text-gray-300 shrink-0" />
                          {[event.city, event.country].filter(Boolean).join(', ')}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{event.device || 'Unknown'}</td>
                    <td className="px-4 py-3">
                      {event.browser || event.os ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Monitor className="w-3 h-3 text-gray-300 shrink-0" />
                          {[event.browser, event.os].filter(Boolean).join(' / ')}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300 truncate max-w-[160px] block" title={event.userAgent ?? undefined}>
                          {event.userAgent ? 'Unrecognized UA' : 'Unknown'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(event.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-500 px-3">{page} / {pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
