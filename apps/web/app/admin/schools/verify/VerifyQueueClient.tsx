'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, CheckCircle2, XCircle, Clock, MapPin, Mail, Phone,
  Globe, ExternalLink, RefreshCw, AlertTriangle, AtSign, Inbox, Menu,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'
import { useAdminShell } from '../../AdminLayoutClient'

type ClaimRequest = {
  id: string
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
  schoolName: string
  city: string | null
  contactName: string
  contactEmail: string
  phone: string | null
  message: string | null
  createdAt: string
  resolvedAt: string | null
}

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
  const [schools, setSchools] = useState<School[]>([])
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      adminFetch('/api/admin/schools/verify').then(r => r.ok ? r.json() : null),
      adminFetch('/api/admin/claim-requests').then(r => r.ok ? r.json() : null),
    ])
      .then(([schoolsData, claimsData]) => {
        setSchools(schoolsData?.schools ?? [])
        setClaims(claimsData?.requests ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'verify' | 'suspend') => {
    setActing(id + action)
    await fetch('/api/admin/schools/verify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setActing(null)
    load()
  }

  const actClaim = async (id: string, action: 'resolve' | 'dismiss') => {
    setActing('claim' + id + action)
    await fetch('/api/admin/claim-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    setActing(null)
    load()
  }

  const pendingClaims = claims.filter(c => c.status === 'PENDING')

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
            <p className="text-xs text-gray-400">Schools awaiting your review — finished setup, or just claimed and stalled</p>
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

      <div className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
        <>
        {pendingClaims.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Inbox className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-bold text-[#101828]">Claim requests</h2>
              <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                {pendingClaims.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {pendingClaims.map(claim => (
                <div key={claim.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#101828]">{claim.schoolName}</h3>
                        {claim.city && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="w-3 h-3" /> {claim.city}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="text-xs text-gray-500">{claim.contactName}</span>
                        <a href={`mailto:${claim.contactEmail}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#0870E2]">
                          <Mail className="w-3 h-3" /> {claim.contactEmail}
                        </a>
                        {claim.phone && (
                          <span className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3" /> {claim.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" /> {fmtDate(claim.createdAt)}
                        </span>
                      </div>
                      {claim.message && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">{claim.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href="/admin/schools/all"
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        Find school
                      </Link>
                      <button
                        onClick={() => actClaim(claim.id, 'dismiss')}
                        disabled={!!acting}
                        className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {acting === 'claim' + claim.id + 'dismiss' ? '...' : 'Dismiss'}
                      </button>
                      <button
                        onClick={() => actClaim(claim.id, 'resolve')}
                        disabled={!!acting}
                        className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-50 hover:opacity-90"
                        style={{ background: '#0870E2' }}
                      >
                        {acting === 'claim' + claim.id + 'resolve' ? '...' : 'Mark resolved'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {schools.length === 0 ? (
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
        )}
        </>
        )}
      </div>
    </div>
  )
}
