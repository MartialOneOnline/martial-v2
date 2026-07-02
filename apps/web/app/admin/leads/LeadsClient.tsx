'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Mail, Search, Filter, RefreshCw, Send, Clock,
  CheckCircle2, XCircle, Eye, ChevronLeft, ChevronRight,
  Globe, MapPin,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'

type Invitation = {
  id: string
  name: string
  email: string
  phone: string | null
  city: string | null
  country: string | null
  activities: string | null
  status: string
  source: string
  sentAt: string | null
  createdAt: string
  school: { id: string; slug: string; name: string; status: string } | null
  invitedBy: { name: string; email: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:    { label: 'Pending',    cls: 'bg-gray-100 text-gray-600 border border-gray-200',     icon: Clock },
  SENT:       { label: 'Sent',       cls: 'bg-blue-50 text-blue-700 border border-blue-100',      icon: Send },
  OPENED:     { label: 'Opened',     cls: 'bg-amber-50 text-amber-700 border border-amber-100',   icon: Eye },
  REGISTERED: { label: 'Registered', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: CheckCircle2 },
  DECLINED:   { label: 'Declined',   cls: 'bg-red-50 text-red-500 border border-red-100',         icon: XCircle },
}

const STATUSES = ['', 'PENDING', 'SENT', 'OPENED', 'REGISTERED', 'DECLINED']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LeadsClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [sending, setSending] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, status, page: String(page) })
    adminFetch(`/api/admin/invitations?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setInvitations(d?.invitations ?? [])
        setTotal(d?.total ?? 0)
        setPages(d?.pages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, status, page])

  useEffect(() => { setPage(1) }, [search, status])
  useEffect(() => { load() }, [load])

  const sendInvite = async (id: string) => {
    setSending(id)
    await fetch('/api/admin/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'send' }),
    })
    setSending(null)
    load()
  }

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Leads</h1>
          <p className="text-xs text-gray-400">School invitations and outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link href="/admin/leads/pipeline"
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Pipeline view →
          </Link>
          <Link href="/admin/schools"
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#0870E2' }}>
            <Mail className="w-3.5 h-3.5" /> New invite
          </Link>
        </div>
      </div>

      <div className="p-8 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] w-64"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
            >
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All statuses'}</option>)}
            </select>
          </div>

          {/* Status pills summary */}
          <div className="ml-auto flex items-center gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setStatus(status === key ? '' : key)}
                className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border transition-all ${
                  status === key ? cfg.cls : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                }`}
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Mail className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No invitations found</p>
              <Link href="/admin/schools" className="text-xs text-[#0870E2] font-semibold hover:underline mt-1">
                Create one →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Activities</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invitations.map(inv => {
                  const cfg = STATUS_CONFIG[inv.status]
                  const Icon = cfg?.icon ?? Clock
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-3">
                        <div>
                          <p className="text-xs font-semibold text-[#101828]">{inv.name}</p>
                          <p className="text-[11px] text-gray-400">{inv.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                          {[inv.city, inv.country].filter(Boolean).join(', ') || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[140px] truncate">
                        {inv.activities || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="w-3 h-3" />
                          {cfg?.label ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(inv.createdAt)}</td>
                      <td className="px-4 py-3">
                        {inv.status === 'PENDING' && (
                          <button
                            onClick={() => sendInvite(inv.id)}
                            disabled={sending === inv.id}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-[11px] font-semibold text-[#0870E2] hover:underline disabled:opacity-50 transition-opacity"
                          >
                            <Send className="w-3 h-3" />
                            {sending === inv.id ? 'Sending…' : 'Send'}
                          </button>
                        )}
                        {inv.school && (
                          <Link
                            href={`/school/${inv.school.slug}`}
                            target="_blank"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] font-semibold text-[#0870E2] hover:underline transition-opacity"
                          >
                            <Globe className="w-3 h-3" /> View
                          </Link>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
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
