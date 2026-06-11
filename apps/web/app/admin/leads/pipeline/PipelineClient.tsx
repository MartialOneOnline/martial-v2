'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Clock, Send, Eye, CheckCircle2, XCircle, RefreshCw,
  MapPin, Mail, ArrowLeft,
} from 'lucide-react'

type Invitation = {
  id: string
  name: string
  email: string
  city: string | null
  country: string | null
  activities: string | null
  status: string
  sentAt: string | null
  createdAt: string
  school: { slug: string; name: string } | null
}

const COLUMNS = [
  { key: 'PENDING',    label: 'Pending',    icon: Clock,         color: '#9CA3AF', bg: 'bg-gray-50',    border: 'border-gray-200' },
  { key: 'SENT',       label: 'Sent',       icon: Send,          color: '#3B82F6', bg: 'bg-blue-50',   border: 'border-blue-100' },
  { key: 'OPENED',     label: 'Opened',     icon: Eye,           color: '#F59E0B', bg: 'bg-amber-50',  border: 'border-amber-100' },
  { key: 'REGISTERED', label: 'Registered', icon: CheckCircle2,  color: '#10B981', bg: 'bg-emerald-50',border: 'border-emerald-100' },
  { key: 'DECLINED',   label: 'Declined',   icon: XCircle,       color: '#EF4444', bg: 'bg-red-50',    border: 'border-red-100' },
]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function PipelineClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/invitations?limit=500&page=1')
      .then(r => r.json())
      .then(d => { setInvitations(d.invitations ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const byStatus = (key: string) => invitations.filter(i => i.status === key)

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin/leads" className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
          <div className="h-4 w-px bg-gray-200" />
          <div>
            <h1 className="text-lg font-bold text-[#0D1B2A]">Pipeline</h1>
            <p className="text-xs text-gray-400">{invitations.length} total leads</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-gray-200 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1 h-64">
          <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-6 min-w-max h-full">
            {COLUMNS.map(col => {
              const cards = byStatus(col.key)
              const Icon = col.icon
              return (
                <div key={col.key} className="w-64 flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${col.border} ${col.bg}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: col.color }} />
                    <span className="text-xs font-semibold" style={{ color: col.color }}>{col.label}</span>
                    <span className="ml-auto text-xs font-bold" style={{ color: col.color }}>{cards.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-160px)] pr-1">
                    {cards.length === 0 ? (
                      <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
                        <p className="text-xs text-gray-300">Empty</p>
                      </div>
                    ) : cards.map(inv => (
                      <div key={inv.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-xs font-semibold text-[#0D1B2A] truncate">{inv.name}</p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{inv.email}</p>
                        {(inv.city || inv.country) && (
                          <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-400">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {[inv.city, inv.country].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {inv.activities && (
                          <p className="mt-1.5 text-[10px] text-gray-400 line-clamp-1">{inv.activities}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                          <span className="text-[10px] text-gray-300">{fmtDate(inv.createdAt)}</span>
                          {inv.school ? (
                            <Link href={`/school/${inv.school.slug}`} target="_blank"
                              className="text-[10px] font-semibold text-[#006197] hover:underline">
                              View →
                            </Link>
                          ) : (
                            <Mail className="w-3 h-3 text-gray-200" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
