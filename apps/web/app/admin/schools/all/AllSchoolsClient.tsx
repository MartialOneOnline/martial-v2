'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Search, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, RefreshCw, Filter, Users,
} from 'lucide-react'

type School = {
  id: string
  name: string
  slug: string
  status: string
  source: string
  city: string | null
  country: string | null
  email: string | null
  createdAt: string
  _count: { members: number }
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED:   { label: 'Verified',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  CLAIMED:    { label: 'Claimed',    cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  UNVERIFIED: { label: 'Unverified', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PARTNER:    { label: 'Partner',    cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  SUSPENDED:  { label: 'Suspended',  cls: 'bg-red-50 text-red-600 border border-red-100' },
}

const STATUSES = ['', 'VERIFIED', 'CLAIMED', 'UNVERIFIED', 'PARTNER', 'SUSPENDED']

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AllSchoolsClient() {
  const [schools, setSchools] = useState<School[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [countries, setCountries] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [country, setCountry] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      search, status, country, page: String(page),
    })
    fetch(`/api/admin/schools/all?${params}`)
      .then(r => r.json())
      .then(d => {
        setSchools(d.schools ?? [])
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
        setCountries(d.countries ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, status, country, page])

  useEffect(() => { setPage(1) }, [search, status, country])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">All Schools</h1>
          <p className="text-xs text-gray-400">{total} schools on the platform</p>
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
              placeholder="Search schools…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 h-9 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] w-64"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>{s || 'All statuses'}</option>
              ))}
            </select>
          </div>

          {countries.length > 0 && (
            <select
              value={country}
              onChange={e => setCountry(e.target.value)}
              className="h-9 px-3 rounded-xl border border-gray-200 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2] bg-white"
            >
              <option value="">All countries</option>
              {countries.map(c => (
                <option key={c} value={c!}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : schools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Building2 className="w-10 h-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No schools found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">School</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Members</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schools.map(school => (
                  <tr key={school.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-[#0870E2]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#101828]">{school.name}</p>
                          {school.email && <p className="text-[11px] text-gray-400">{school.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                        {[school.city, school.country].filter(Boolean).join(', ') || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[school.status]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_BADGE[school.status]?.label ?? school.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3 text-gray-300" />
                        {school._count.members}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(school.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/school/${school.slug}`}
                        target="_blank"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-semibold text-[#0870E2] hover:underline"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-gray-500 px-3">
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
