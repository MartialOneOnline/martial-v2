'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CreditCard, CheckCircle2, Clock, Calendar, Zap, Building2, RefreshCw } from 'lucide-react'

type Membership = {
  id: string
  planName: string
  price: number
  currency: string
  status: string
  startDate: string
  endDate: string | null
  classesUsed: number
  paymentMethod: string
  school: { id: string; name: string; slug: string; logoUrl: string | null; city: string | null }
  plan: { classAccess: Record<string, unknown> } | null
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  PAUSED:    { label: 'Paused',    cls: 'bg-amber-50 text-amber-700 border border-amber-100' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  EXPIRED:   { label: 'Expired',   cls: 'bg-red-50 text-red-500 border border-red-100' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function MyMembershipPage() {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => { setMemberships(d.user?.memberships ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const active = memberships.filter(m => m.status === 'ACTIVE')
  const past = memberships.filter(m => m.status !== 'ACTIVE')

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#101828]">Membership</h1>
        <p className="text-xs text-gray-400">Your active plans and subscriptions</p>
      </div>

      <div className="p-6 space-y-5 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : memberships.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-500 mb-1">No active membership</p>
            <p className="text-xs text-gray-400 mb-4">Join a school to get started</p>
            <Link href="/explore"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#0870E2' }}>
              Find a school
            </Link>
          </div>
        ) : (
          <>
            {/* Active memberships */}
            {active.map(m => {
              const days = m.endDate ? daysLeft(m.endDate) : null

              return (
                <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#0870E2]/8 flex items-center justify-center overflow-hidden shrink-0">
                        {m.school.logoUrl
                          ? <img src={m.school.logoUrl} alt="" className="w-10 h-10 object-cover" />
                          : <Building2 className="w-5 h-5 text-[#0870E2]" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#101828]">{m.school.name}</p>
                        {m.school.city && <p className="text-xs text-gray-400">{m.school.city}</p>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[m.status]?.cls}`}>
                      {STATUS_CONFIG[m.status]?.label}
                    </span>
                  </div>

                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold text-[#101828]">{m.planName}</p>
                        <p className="text-xl font-bold text-[#0870E2] mt-0.5">
                          {m.currency === 'EUR' ? '€' : m.currency}{m.price.toFixed(0)}
                          <span className="text-xs font-normal text-gray-400"> /month</span>
                        </p>
                      </div>
                      <Zap className="w-5 h-5 text-[#0870E2] mt-1" />
                    </div>

                    {/* Class usage bar */}
                    {m.classesUsed > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs text-gray-500">Classes used</p>
                          <p className="text-xs font-semibold text-gray-700">{m.classesUsed}</p>
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Started</p>
                        <p className="text-xs font-semibold text-gray-700">{fmtDate(m.startDate)}</p>
                      </div>
                      {m.endDate && (
                        <div className={`rounded-xl p-3 ${days! < 14 ? 'bg-amber-50' : 'bg-gray-50'}`}>
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Expires</p>
                          <p className={`text-xs font-semibold ${days! < 14 ? 'text-amber-700' : 'text-gray-700'}`}>
                            {fmtDate(m.endDate)}
                          </p>
                          {days !== null && (
                            <p className={`text-[10px] mt-0.5 ${days < 14 ? 'text-amber-600' : 'text-gray-400'}`}>
                              {days === 0 ? 'Expires today' : `${days} days left`}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-1">
                      <Link
                        href={`/school/${m.school.slug}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#0870E2] text-[#0870E2] text-xs font-semibold hover:bg-[#0870E2] hover:text-white transition-colors"
                      >
                        View school
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Past memberships */}
            {past.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50">
                  <p className="text-sm font-bold text-[#101828]">Past memberships</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {past.map(m => (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-600 truncate">{m.planName}</p>
                        <p className="text-[11px] text-gray-400">{m.school.name}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[m.status]?.cls}`}>
                        {STATUS_CONFIG[m.status]?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
