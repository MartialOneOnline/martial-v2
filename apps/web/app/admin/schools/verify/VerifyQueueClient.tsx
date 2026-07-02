'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Building2, CheckCircle2, XCircle, Clock, MapPin, Mail, Phone,
  Globe, ExternalLink, RefreshCw, AlertTriangle, AtSign,
} from 'lucide-react'
import { adminFetch } from '@/lib/api/adminFetch'

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
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    adminFetch('/api/admin/schools/verify')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSchools(d?.schools ?? []); setLoading(false) })
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

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-[#101828]">Verification Queue</h1>
          <p className="text-xs text-gray-400">Schools that have claimed their listing and are awaiting approval</p>
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
        ) : schools.length === 0 ? (
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

            {schools.map(school => (
              <div key={school.id} className="bg-white border border-amber-100 rounded-2xl shadow-sm overflow-hidden">
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
                          <h3 className="text-sm font-bold text-[#101828]">{school.name}</h3>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {school.city && (
                              <span className="flex items-center gap-1 text-xs text-gray-400">
                                <MapPin className="w-3 h-3" /> {school.city}{school.country ? `, ${school.country}` : ''}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" /> Claimed {fmtDate(school.updatedAt)}
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
