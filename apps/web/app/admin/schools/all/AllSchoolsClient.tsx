'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Building2, Search, MapPin, ChevronLeft, ChevronRight,
  ExternalLink, RefreshCw, Filter, Users, Plus, X, Loader2,
  MoreHorizontal, Pencil, Trash2, ShieldCheck, ShieldOff, Send, LogIn,
  AlertCircle, CheckCircle2, Archive, ArchiveRestore, Lock,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'

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
  claimedById: string | null
  createdAt: string
  _count: { members: number }
  subscription: { status: string } | null
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  VERIFIED:     { label: 'Verified',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  UNDER_REVIEW: { label: 'Under Review', cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  CLAIMED:      { label: 'Claimed',      cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  UNVERIFIED:   { label: 'Unverified',   cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PARTNER:      { label: 'Partner',      cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  SUSPENDED:    { label: 'Suspended',    cls: 'bg-red-50 text-red-600 border border-red-100' },
  ARCHIVED:     { label: 'Archived',     cls: 'bg-gray-100 text-gray-400 border border-gray-200' },
}

// Martial's SaaS billing status for this school (not the school's own listing status above)
const SUBSCRIPTION_BADGE: Record<string, { label: string; cls: string }> = {
  TRIALING:           { label: 'Trialing',   cls: 'bg-blue-50 text-blue-700 border border-blue-100' },
  ACTIVE:              { label: 'Active',     cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  INCOMPLETE:          { label: 'Incomplete', cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  INCOMPLETE_EXPIRED:  { label: 'Expired',    cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  PAST_DUE:            { label: 'Past due',   cls: 'bg-red-50 text-red-600 border border-red-100' },
  UNPAID:              { label: 'Unpaid',     cls: 'bg-red-50 text-red-600 border border-red-100' },
  PAUSED:              { label: 'Paused',     cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  CANCELED:            { label: 'Canceled',   cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  INACTIVE:            { label: 'No plan',    cls: 'bg-gray-100 text-gray-400 border border-gray-200' },
}

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  SCHOOL:   { label: 'School',   cls: 'bg-gray-100 text-gray-500' },
  CAMP:     { label: 'Camp',     cls: 'bg-amber-50 text-amber-700' },
  BUSINESS: { label: 'Business', cls: 'bg-purple-50 text-purple-700' },
}

const STATUSES = ['', 'VERIFIED', 'UNDER_REVIEW', 'CLAIMED', 'UNVERIFIED', 'PARTNER', 'SUSPENDED', 'ARCHIVED']

const COUNTRIES = [
  ['ES','Spain'],['GB','United Kingdom'],['FR','France'],['DE','Germany'],['IT','Italy'],
  ['PT','Portugal'],['NL','Netherlands'],['BE','Belgium'],['SE','Sweden'],['NO','Norway'],
  ['DK','Denmark'],['IE','Ireland'],['CH','Switzerland'],['AT','Austria'],['PL','Poland'],
  ['GR','Greece'],['TR','Turkey'],['AE','UAE'],['US','United States'],['AU','Australia'],['BR','Brazil'],
]

const field = 'w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10'
const label = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide'

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
            <label className={label}>Type</label>
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
            <label className={label}>Name *</label>
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
              <label className={label}>City</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Marbella"
                className={field}
              />
            </div>
            <div>
              <label className={label}>Country</label>
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
            <label className={label}>Email</label>
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
              <label className={label}>Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="martialcamps.com" className={field} />
            </div>
            <div>
              <label className={label}>Instagram</label>
              <input value={form.instagram} onChange={e => set('instagram', e.target.value)} placeholder="@martialcamps" className={field} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={label}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={field}>
              <option value="VERIFIED">Verified</option>
              <option value="UNDER_REVIEW">Under Review</option>
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

// ── Edit School Modal ─────────────────────────────────────────────────────────
type EditForm = {
  name: string; type: string; status: string
  city: string; country: string; address: string; postcode: string
  email: string; phone: string; website: string; instagram: string
  description: string; tagline: string
  hasFreeTrialCls: boolean; priceFrom: string
}

function AdminEditSchoolModal({ schoolId, onClose, onSaved }: {
  schoolId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<EditForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/api/admin/schools/${schoolId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setForm({
        name: d.school.name ?? '', type: d.school.type ?? 'SCHOOL', status: d.school.status ?? 'UNVERIFIED',
        city: d.school.city ?? '', country: d.school.country ?? '', address: d.school.address ?? '', postcode: d.school.postcode ?? '',
        email: d.school.email ?? '', phone: d.school.phone ?? '', website: d.school.website ?? '', instagram: d.school.instagram ?? '',
        description: d.school.description ?? '', tagline: d.school.tagline ?? '',
        hasFreeTrialCls: d.school.hasFreeTrialCls ?? false,
        priceFrom: d.school.priceFrom != null ? String(d.school.priceFrom) : '',
      }))
      .catch(() => setError('Could not load school'))
      .finally(() => setLoading(false))
  }, [schoolId])

  function set(k: keyof EditForm, v: string) { setForm(f => f && ({ ...f, [k]: v })) }
  function toggleFreeTrial() { setForm(f => f && ({ ...f, hasFreeTrialCls: !f.hasFreeTrialCls })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    const res = await adminFetch(`/api/admin/schools/${schoolId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error || 'Failed to save'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-[#101828]">Edit School</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : !form ? (
          <p className="text-xs text-red-500">{error || 'Could not load school'}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className={label}>Type</label>
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

            <div>
              <label className={label}>Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className={field} />
            </div>

            <div>
              <label className={label}>Tagline</label>
              <input value={form.tagline} onChange={e => set('tagline', e.target.value)} className={field} />
            </div>

            <div>
              <label className={label}>Address</label>
              <input value={form.address} onChange={e => set('address', e.target.value)} className={field} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Postcode</label>
                <input value={form.postcode} onChange={e => set('postcode', e.target.value)} className={field} />
              </div>
            </div>

            <div>
              <label className={label}>Country</label>
              <select value={form.country} onChange={e => set('country', e.target.value)} className={field}>
                <option value="">—</option>
                {COUNTRIES.map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Website</label>
                <input value={form.website} onChange={e => set('website', e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Instagram</label>
                <input value={form.instagram} onChange={e => set('instagram', e.target.value)} className={field} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={field} />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} className={field} />
              </div>
            </div>

            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={field}>
                <option value="VERIFIED">Verified</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CLAIMED">Claimed</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="PARTNER">Partner</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className={label}>Starting from (display only)</label>
                <input type="number" step="0.01" value={form.priceFrom} onChange={e => set('priceFrom', e.target.value)}
                  placeholder="e.g. 65" className={field} />
              </div>
              <label className="flex items-center gap-2 h-9 cursor-pointer">
                <input type="checkbox" checked={form.hasFreeTrialCls} onChange={toggleFreeTrial} className="rounded" />
                <span className="text-xs font-medium text-gray-600">Free trial (public)</span>
              </label>
            </div>

            <div>
              <label className={label}>Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#0870E2] focus:ring-2 focus:ring-[#0870E2]/10 resize-none" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0660c8] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Archive / Delete modal ────────────────────────────────────────────────────
// Offers a safe, reversible Archive path alongside a permanent Delete path.
// Delete requires the admin to re-enter their own password as a last check
// before the (cascading, irreversible) DELETE call fires.
function DeleteOrArchiveModal({ school, busy, error, onArchive, onDelete, onCancel }: {
  school: School
  busy: boolean
  error: string
  onArchive: () => void
  onDelete: (password: string) => void
  onCancel: () => void
}) {
  const [step, setStep] = useState<'choose' | 'archive' | 'delete'>('choose')
  const [password, setPassword] = useState('')

  if (step === 'choose') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
        <div className="rounded-2xl p-6 flex flex-col gap-3"
          style={{ background: '#fff', width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          onClick={e => e.stopPropagation()}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Remove {school.name}</h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Choose how to remove this school from the platform.</p>
          </div>
          <button onClick={() => setStep('archive')}
            className="w-full flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer hover:bg-blue-50/40"
            style={{ borderColor: '#E5E7EB' }}>
            <Archive size={18} style={{ color: '#0870E2', marginTop: 2, flexShrink: 0 }} />
            <span>
              <span className="block text-sm font-semibold text-gray-900">Archive (recommended)</span>
              <span className="block text-xs text-gray-500 mt-0.5">Hides it from Explore and public listings. All data is kept — restore it anytime.</span>
            </span>
          </button>
          <button onClick={() => setStep('delete')}
            className="w-full flex items-start gap-3 p-3 rounded-xl border text-left cursor-pointer hover:bg-red-50"
            style={{ borderColor: '#FCA5A5' }}>
            <Trash2 size={18} style={{ color: '#DC2626', marginTop: 2, flexShrink: 0 }} />
            <span>
              <span className="block text-sm font-semibold" style={{ color: '#DC2626' }}>Permanently delete</span>
              <span className="block text-xs text-gray-500 mt-0.5">Irreversibly deletes {school._count.members} members, classes, events, and transactions.</span>
            </span>
          </button>
          <button onClick={onCancel} className="w-full py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 cursor-pointer">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (step === 'archive') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
        <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
          style={{ background: '#fff', width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EFF6FF' }}>
            <Archive size={24} style={{ color: '#0870E2' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Archive {school.name}?</h3>
            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
              It will disappear from Explore and public listings. Nothing is deleted — you can restore it anytime from this table.
            </p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 w-full">
            <button onClick={() => setStep('choose')} className="flex-1 py-2.5 rounded-xl cursor-pointer"
              style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
              Back
            </button>
            <button onClick={onArchive} disabled={busy} className="flex-1 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
              style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#0870E2', color: '#fff', opacity: busy ? 0.6 : 1 }}>
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {busy ? 'Archiving…' : 'Archive'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onCancel}>
      <div className="rounded-2xl p-8 flex flex-col items-center text-center gap-4"
        style={{ background: '#fff', width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#FEF2F2' }}>
          <Trash2 size={24} style={{ color: '#DC2626' }} />
        </div>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>Permanently delete school?</h3>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>
            <strong>{school.name}</strong> and all of its data — <strong>{school._count.members} members</strong>,
            classes, events, and transactions — will be permanently deleted. This cannot be undone.
          </p>
        </div>
        <div className="w-full text-left">
          <label className={label}>Confirm your password</label>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your account password"
              autoFocus
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/10"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-3 w-full">
          <button onClick={() => setStep('choose')} className="flex-1 py-2.5 rounded-xl cursor-pointer"
            style={{ fontSize: 13, fontWeight: 500, border: '1px solid #E5E7EB', background: '#fff', color: '#374151' }}>
            Back
          </button>
          <button onClick={() => onDelete(password)} disabled={busy || !password} className="flex-1 py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
            style={{ fontSize: 13, fontWeight: 600, border: 'none', background: '#DC2626', color: '#fff', opacity: (busy || !password) ? 0.6 : 1 }}>
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {busy ? 'Deleting…' : 'Permanently delete'}
          </button>
        </div>
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

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editSchoolId, setEditSchoolId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'error' | 'success'; message: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ search, status, country, page: String(page) })
    adminFetch(`/api/admin/schools/all?${params}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        setSchools(d?.schools ?? [])
        setTotal(d?.total ?? 0)
        setPages(d?.pages ?? 1)
        setCountries(d?.countries ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [search, status, country, page])

  useEffect(() => { setPage(1) }, [search, status, country])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!banner) return
    const t = setTimeout(() => setBanner(null), 4000)
    return () => clearTimeout(t)
  }, [banner])

  async function handleStatusChange(school: School, newStatus: 'VERIFIED' | 'SUSPENDED') {
    setOpenMenuId(null)
    setActionId(school.id)
    const res = await adminFetch(`/api/admin/schools/${school.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setActionId(null)
    if (!res.ok) { setBanner({ type: 'error', message: 'Failed to update status' }); return }
    setBanner({ type: 'success', message: `${school.name} is now ${newStatus === 'VERIFIED' ? 'Verified' : 'Suspended'}` })
    load()
  }

  async function handleResendInvite(school: School) {
    setOpenMenuId(null)
    setActionId(school.id)
    const res = await adminFetch(`/api/admin/schools/${school.id}/resend-invite`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setActionId(null)
    if (!res.ok) { setBanner({ type: 'error', message: data.error || 'Failed to send invitation' }); return }
    setBanner({ type: 'success', message: `Claim invitation sent to ${school.email}` })
  }

  async function handleImpersonate(school: School) {
    setOpenMenuId(null)
    setActionId(school.id)
    const res = await adminFetch(`/api/admin/schools/${school.id}/impersonate`, { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setActionId(null)
    if (!res.ok || !data.actionLink) { setBanner({ type: 'error', message: data.error || 'Failed to log in as owner' }); return }
    window.open(data.actionLink, '_blank')
  }

  async function handleArchive() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError('')
    const res = await adminFetch(`/api/admin/schools/${deleteTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ARCHIVED' }),
    })
    setDeleteBusy(false)
    if (!res.ok) { setDeleteError('Failed to archive school'); return }
    setBanner({ type: 'success', message: `${deleteTarget.name} was archived` })
    setDeleteTarget(null)
    load()
  }

  async function handleDeleteConfirm(password: string) {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError('')
    const res = await adminFetch(`/api/admin/schools/${deleteTarget.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    const data = await res.json().catch(() => ({}))
    setDeleteBusy(false)
    if (!res.ok) { setDeleteError(data.error || 'Failed to delete school'); return }
    setBanner({ type: 'success', message: `${deleteTarget.name} was deleted` })
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="min-h-screen">
      {showCreate && (
        <CreateSchoolModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
      {editSchoolId && (
        <AdminEditSchoolModal
          schoolId={editSchoolId}
          onClose={() => setEditSchoolId(null)}
          onSaved={() => { setBanner({ type: 'success', message: 'School updated' }); load() }}
        />
      )}
      {deleteTarget && (
        <DeleteOrArchiveModal
          school={deleteTarget}
          busy={deleteBusy}
          error={deleteError}
          onArchive={handleArchive}
          onDelete={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
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

      {banner && (
        <div className="fixed top-4 right-4 z-[70] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
          style={banner.type === 'error'
            ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
            : { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
          {banner.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {banner.message}
        </div>
      )}

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
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-visible">
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
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Billing</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Members</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {schools.map(school => {
                  const canResendInvite = !school.claimedById && school.status !== 'SUSPENDED' && school.status !== 'ARCHIVED'
                  const canImpersonate = !!school.claimedById && school.status !== 'ARCHIVED'
                  const busy = actionId === school.id
                  return (
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
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SUBSCRIPTION_BADGE[school.subscription?.status ?? 'INACTIVE']?.cls ?? 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                        {SUBSCRIPTION_BADGE[school.subscription?.status ?? 'INACTIVE']?.label ?? 'No plan'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="w-3 h-3 text-gray-300" />
                        {school._count.members}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(school.createdAt)}</td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === school.id ? null : school.id)}
                        disabled={busy}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                      </button>
                      {openMenuId === school.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-6 top-9 rounded-xl z-20 py-1"
                            style={{ background: '#fff', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 190 }}>
                            <Link
                              href={`/school/${school.slug}`}
                              target="_blank"
                              onClick={() => setOpenMenuId(null)}
                              className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <ExternalLink size={13} /> View profile
                            </Link>
                            <button
                              onClick={() => { setEditSchoolId(school.id); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil size={13} /> Edit
                            </button>
                            {school.status === 'SUSPENDED' ? (
                              <button
                                onClick={() => handleStatusChange(school, 'VERIFIED')}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <ShieldCheck size={13} /> Reactivate
                              </button>
                            ) : school.status === 'ARCHIVED' ? (
                              <button
                                onClick={() => handleStatusChange(school, 'VERIFIED')}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <ArchiveRestore size={13} /> Restore
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusChange(school, 'SUSPENDED')}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <ShieldOff size={13} /> Suspend
                              </button>
                            )}
                            {canResendInvite && (
                              <button
                                onClick={() => handleResendInvite(school)}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <Send size={13} /> Resend claim invitation
                              </button>
                            )}
                            {canImpersonate && (
                              <button
                                onClick={() => handleImpersonate(school)}
                                className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <LogIn size={13} /> Log in as owner
                              </button>
                            )}
                            <div className="my-1 border-t border-gray-100" />
                            <button
                              onClick={() => { setDeleteError(''); setDeleteTarget(school); setOpenMenuId(null) }}
                              className="w-full flex items-center gap-2 text-left px-4 py-2 text-xs font-medium hover:bg-red-50"
                              style={{ color: '#DC2626' }}
                            >
                              <Trash2 size={13} /> Archive / Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                  )
                })}
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
