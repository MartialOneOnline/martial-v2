'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Building2, CheckCircle2, XCircle, Clock, MapPin, Mail, Phone,
  Globe, ExternalLink, RefreshCw, AlertTriangle, AtSign, Inbox, Menu, Search, ChevronRight,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'
import {
  INVITATION_STATE_BADGE, INVITATION_STATE_LABEL, REQUEST_STATUS_BADGE, REQUEST_STATUS_LABEL,
  type InvitationState, type RequestStatus,
} from '@/lib/claims/labels'

type ClaimRow = {
  id: string
  status: RequestStatus
  schoolName: string
  city: string | null
  contactName: string
  contactEmail: string
  createdAt: string
  resolvedAt: string | null
  rejectReason: string | null
  school: { id: string; name: string; status: string } | null
  invitationState: InvitationState | null
  needsAssociationReview: boolean
}
type ClaimView = 'pending' | 'in_progress' | 'legacy' | 'history'
const CLAIM_VIEWS: ClaimView[] = ['pending', 'in_progress', 'legacy', 'history']
type Counts = Record<ClaimView, number>

type School = {
  id: string
  name: string
  slug: string
  status: string
  source: string
  city: string | null
  country: string | null
  email: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  description: string | null
  logoUrl: string | null
  createdAt: string
  updatedAt: string
  _count: { members: number }
  invitation: { id: string; sentAt: string | null; registeredAt: string | null } | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function VerifyQueueClient() {
  const { menuOpen, setMenuOpen } = useAdminShell()
  const [tab, setTab] = useState<'ownership' | 'listings'>('ownership')
  const [schools, setSchools] = useState<School[]>([])
  const [schoolsError, setSchoolsError] = useState('')
  const [claims, setClaims] = useState<ClaimRow[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, in_progress: 0, legacy: 0, history: 0 })
  const [view, setView] = useState<ClaimView>('pending')
  const [q, setQ] = useState('')
  const [claimsError, setClaimsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const seq = useRef(0)

  const loadClaims = useCallback(async () => {
    const mine = ++seq.current
    setClaimsError('')
    try {
      const res = await adminFetch(`/api/admin/claim-requests?view=${view}&q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (mine !== seq.current) return // a newer filter/search already answered
      if (!res.ok || !data) { setClaimsError('Could not load ownership requests.'); return }
      setClaims(data.requests ?? [])
      setCounts(data.counts ?? { pending: 0, in_progress: 0, legacy: 0, history: 0 })
    } catch {
      if (mine === seq.current) setClaimsError('Could not load ownership requests — check your connection.')
    }
  }, [view, q])

  const loadSchools = useCallback(async () => {
    setSchoolsError('')
    try {
      const res = await adminFetch('/api/admin/schools/verify', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data) { setSchoolsError('Could not load listings to review.'); return }
      setSchools(data.schools ?? [])
    } catch {
      setSchoolsError('Could not load listings to review — check your connection.')
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.all([loadClaims(), loadSchools()])
    setLoading(false)
  }, [loadClaims, loadSchools])

  // Deep links from the dashboard counters: ?tab=listings, ?view=legacy …
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('tab') === 'listings') setTab('listings')
    const v = p.get('view') as ClaimView | null
    if (v && CLAIM_VIEWS.includes(v)) setView(v)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { loadClaims() }, q ? 250 : 0)
    return () => clearTimeout(t)
  }, [loadClaims, q])
  useEffect(() => { loadSchools().finally(() => setLoading(false)) }, [loadSchools])

  const act = async (id: string, action: 'verify' | 'suspend') => {
    if (acting) return
    setActing(id + action)
    try {
      const res = await adminFetch('/api/admin/schools/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) setSchoolsError(`Could not ${action} the school (HTTP ${res.status}). Nothing was changed.`)
    } catch {
      setSchoolsError('Network error — refresh to check whether the change was applied.')
    } finally {
      setActing(null)
      loadSchools()
    }
  }

  const fmtShort = (iso: string) => fmtDate(iso)

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
            <h1 className="text-lg font-bold text-[#101828]">Verification Queue</h1>
            <p className="text-xs text-gray-400">Ownership requests and listings awaiting your review</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      <div className="p-4 md:p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <>
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-full sm:w-fit">
          {([['ownership', `Ownership requests${counts.pending ? ` (${counts.pending})` : ''}`], ['listings', `Listing review${schools.length ? ` (${schools.length})` : ''}`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 sm:flex-none h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'ownership' && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div className="flex gap-1.5 flex-wrap">
                {([['pending', 'Pending'], ['in_progress', 'In progress'], ['legacy', 'Not reviewed'], ['history', 'History']] as const).filter(([key]) => key !== 'legacy' || counts.legacy > 0 || view === 'legacy').map(([key, label]) => (
                  <button key={key} onClick={() => setView(key)}
                    className={`h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${view === key ? 'bg-[#0E3A7A] text-white border-[#0E3A7A]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {label} <span className="opacity-70">{counts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="relative sm:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search school, city, contact…"
                  className="pl-9 pr-3 h-9 rounded-xl border border-gray-200 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#0870E2]/20 focus:border-[#0870E2]" />
              </div>
            </div>
            {claimsError && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between">{claimsError}<button onClick={loadClaims} className="font-semibold">Retry</button></p>}
            {claims.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-14">
                <Inbox className="w-10 h-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400">{q ? 'No requests match your search' : view === 'pending' ? 'No pending ownership requests' : view === 'in_progress' ? 'Nothing in progress' : view === 'legacy' ? 'No legacy requests left to review' : 'No closed requests yet'}</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-50">
                {claims.map(claim => (
                  <Link key={claim.id} href={`/admin/claims/${claim.id}`} className="flex items-center gap-3 p-4 hover:bg-gray-50/60 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-[#101828] break-words">{claim.schoolName}</h3>
                        {claim.city && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin className="w-3 h-3" /> {claim.city}</span>}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${REQUEST_STATUS_BADGE[claim.status]}`}>{REQUEST_STATUS_LABEL[claim.status]}</span>
                        {claim.invitationState && claim.status === 'IN_PROGRESS' && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${INVITATION_STATE_BADGE[claim.invitationState]}`}>{INVITATION_STATE_LABEL[claim.invitationState]}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-x-4 gap-y-1 mt-1.5 flex-wrap text-xs text-gray-500">
                        <span>{claim.contactName}</span>
                        <span className="flex items-center gap-1 break-all"><Mail className="w-3 h-3 shrink-0" /> {claim.contactEmail}</span>
                        <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" /> {fmtShort(claim.createdAt)}</span>
                        {claim.school && <span className="flex items-center gap-1 text-gray-500"><Building2 className="w-3 h-3" /> {claim.school.name}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'listings' && schoolsError && <p className="mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{schoolsError}</p>}
        {tab === 'listings' && (schools.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20">
            <CheckCircle2 className="w-12 h-12 text-emerald-200 mb-4" />
            <p className="text-base font-semibold text-gray-500">Queue is clear</p>
            <p className="text-sm text-gray-400 mt-1">No schools are waiting for verification</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-3 py-1.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" />
                {schools.length} pending
              </span>
            </div>

            {schools.map(school => {
              const readyForReview = school.status === 'UNDER_REVIEW'
              return (
              <div key={school.id} className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${readyForReview ? 'border-amber-100' : 'border-gray-100'}`}>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-[#0870E2]/8 flex items-center justify-center shrink-0">
                      {school.logoUrl
                        ? <img src={school.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
                        : <Building2 className="w-6 h-6 text-[#0870E2]" />
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-[#101828]">{school.name}</h3>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              readyForReview ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              {readyForReview ? 'Ready for review' : 'Claimed — setup stalled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {school.city && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" /> {school.city}{school.country ? `, ${school.country}` : ''}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" /> {readyForReview ? 'Ready since' : 'Claimed'} {fmtDate(school.updatedAt)}
                            </span>
                            <span className="text-xs text-gray-400">{school._count.members} member{school._count.members !== 1 ? 's' : ''}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/school/${school.slug}`}
                            target="_blank"
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                          </Link>
                          <button
                            onClick={() => act(school.id, 'suspend')}
                            disabled={!!acting}
                            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            {acting === school.id + 'suspend' ? '...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => act(school.id, 'verify')}
                            disabled={!!acting}
                            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
                            style={{ background: '#0870E2' }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {acting === school.id + 'verify' ? '...' : 'Verify'}
                          </button>
                        </div>
                      </div>

                      {/* Details row */}
                      {(school.email || school.phone || school.website || school.instagram) && (
                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                          {school.email && (
                            <a href={`mailto:${school.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0870E2]">
                              <Mail className="w-3 h-3" /> {school.email}
                            </a>
                          )}
                          {school.phone && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Phone className="w-3 h-3" /> {school.phone}
                            </span>
                          )}
                          {school.website && (
                            <a href={school.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0870E2]">
                              <Globe className="w-3 h-3" /> Website
                            </a>
                          )}
                          {school.instagram && (
                            <a href={`https://instagram.com/${school.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0870E2]">
                              <AtSign className="w-3 h-3" /> {school.instagram}
                            </a>
                          )}
                        </div>
                      )}

                      {school.description && (
                        <p className="mt-3 text-xs text-gray-500 line-clamp-2">{school.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        ))}
        </>
        )}
      </div>
    </div>
  )
}
