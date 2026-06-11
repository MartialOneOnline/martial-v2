'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Search, ChevronLeft, ChevronRight,
  RefreshCw, ExternalLink,
} from 'lucide-react'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  avatarUrl: string | null
  createdAt: string
  claimedSchools: { id: string; name: string; slug: string; status: string }[]
  _count: { memberships: number }
}

const SCH_STATUS: Record<string, { label: string; cls: string }> = {
  VERIFIED:   { label: 'Verified',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  CLAIMED:    { label: 'Claimed',    cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PARTNER:    { label: 'Partner',    cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  SUSPENDED:  { label: 'Suspended',  cls: 'bg-red-50 text-red-600 border border-red-100' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SchoolOwnersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, role: 'SCHOOL_OWNER', page: String(page) })
    fetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => {
        setUsers(d.users ?? [])
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, page])

  useEffect(() => { setPage(1) }, [search])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#0D1B2A]">School Owners</h1>
          <p className="text-xs text-gray-400">{total} registered owners</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="p-8 space-y-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search owners…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 h-9 w-full rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006197]/20 focus:border-[#006197]"
          />
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No school owners found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Owner</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#006197]/10 flex items-center justify-center text-[#006197] text-[11px] font-bold">
                          {(user.name || user.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#0D1B2A]">{user.name || '—'}</p>
                          <p className="text-[11px] text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.claimedSchools[0] ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#0D1B2A]">
                          <Building2 className="w-3 h-3 text-gray-300 shrink-0" />
                          {user.claimedSchools[0].name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">No school</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.claimedSchools[0] ? (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SCH_STATUS[user.claimedSchools[0].status]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                          {SCH_STATUS[user.claimedSchools[0].status]?.label ?? user.claimedSchools[0].status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {user.claimedSchools[0] && (
                        <Link
                          href={`/school/${user.claimedSchools[0].slug}`}
                          target="_blank"
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-semibold text-[#006197] hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
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
