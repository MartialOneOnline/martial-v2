'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Search, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, RefreshCw, Filter, Users, Plus, X, Loader2,
} from 'lucide-react'

type School = {
  id: string
  name: string
  slug: string
  status: string
  type: string
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

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  SCHOOL:   { label: 'School',   cls: 'bg-gray-100 text-gray-500' },
  CAMP:     { label: 'Camp',     cls: 'bg-amber-50 text-amber-700' },
  BUSINESS: { label: 'Business', cls: 'bg-purple-50 text-purple-700' },
}

const STATUSES = ['', 'VERIFIED', 'CLAIMED', 'UNVERIFIED', 'PARTNER', 'SUSPENDED']

const COUNTRIES = [
  ['ES','Spain'],['GB','United Kingdom'],['FR','France'],['DE','Germany'],['IT','Italy'],
  ['PT','Portugal'],['NL','Netherlands'],['BE','Belgium'],['SE','Sweden'],['NO','Norway'],
  ['DK','Denmark'],['IE','Ireland'],['CH','Switzerland'],['AT','Austria'],['PL','Poland'],
  ['GR','Greece'],['TR','Turkey'],['AE','UAE'],['US','United States'],['AU','Australia'],['BR','Brazil'],
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Create School Modal ───────────────────────────────────────────────────────
function CreateSchoolModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', email: '', city: '', country: 'ES',
    type: 'SCHOOL', status: 'VERIFIED',
    website: '', instagram: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const res = await fetch('/api/admin/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to create'); return }
    onCreated()
    onClose()
  }

  const field = 'w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#101828]">New School / Camp</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Type selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(['SCHOOL', 'CAMP', 'BUSINESS'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`h-9 rounded-xl border-2 text-xs font-semibold transition-all ${
                    form.type === t
                      ? 'border-[#0870E2] bg-[#EFF6FF] text-[#0870E2]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t === 'SCHOOL' ? '🏫 School' : t === 'CAMP' ? '🥋 Camp' : '🏢 Business'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Name *</label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder={form.type === 'CAMP' ? 'Martial Camps' : 'Roger Gracie Málaga'}
              className={field}
            />
          </div>

          {/* City + Country */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">City</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Marbella"
                className={field}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Country</label>
              <select
                value={form.country}
                onChange={e => set('country', e.target.value)}
                className={field}
              >
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="info@martialcamps.com"
              className={field}
            />
          </div>

          {/* Website + Instagram */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="martialcamps.com" className={field} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Instagram</label>
              <input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@martialcamps" className={field} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={field}>
              <option value="VERIFIED">Verified</option>
              <option value="CLAIMED">Claimed</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="PARTNER">Partner</option>
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-10 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
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
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, status, country, page: String(page) })
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
      {showCreate && (
        <CreateSchoolModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">All Schools</h1>
          <p className="text-xs text-gray-400">{total} schools on the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#0870E2] text-white text-xs font-semibold hover:bg-[#0660c8] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New School
          </button>
        </div>
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
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Type</th>
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
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[school.type]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                        {TYPE_BADGE[school.type]?.label ?? school.type}
                      </span>
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
