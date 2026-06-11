'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

type Booking = {
  id: string
  scheduledAt: string
  status: string
  attendedAt: string | null
  amountPaid: number | null
  currency: string
  class: {
    id: string
    name: string
    duration: number | null
    type: string | null
    school: { name: string; slug: string; logoUrl: string | null }
  }
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Booked',    cls: 'bg-blue-50 text-blue-700 border border-blue-100',    icon: Clock },
  ATTENDED:  { label: 'Attended',  cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', icon: CheckCircle2 },
  NO_SHOW:   { label: 'No show',   cls: 'bg-red-50 text-red-500 border border-red-100',       icon: XCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500 border border-gray-200',   icon: XCircle },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function MyClassesPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/my/bookings?past=${tab === 'past'}&page=${page}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 md:top-0">
        <h1 className="text-lg font-bold text-[#0D1B2A]">My Classes</h1>
        <p className="text-xs text-gray-400">{total} {tab === 'upcoming' ? 'upcoming' : 'past'} classes</p>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${
                tab === t
                  ? 'bg-white text-[#0D1B2A] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-[#006197] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {tab === 'upcoming' ? 'No upcoming classes booked' : 'No past classes yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const cfg = STATUS_CONFIG[b.status]
              const Icon = cfg?.icon ?? Clock
              return (
                <div key={b.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#006197]/8 flex items-center justify-center shrink-0">
                      {b.class.school.logoUrl
                        ? <img src={b.class.school.logoUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                        : <Calendar className="w-5 h-5 text-[#006197]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#0D1B2A]">{b.class.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{b.class.school.name}</p>
                        </div>
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="w-3 h-3" />
                          {cfg?.label ?? b.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar className="w-3 h-3 text-gray-300" />
                          {fmtDate(b.scheduledAt)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Clock className="w-3 h-3 text-gray-300" />
                          {fmtTime(b.scheduledAt)}
                          {b.class.duration && <span className="text-gray-300">· {b.class.duration}min</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400">{(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500 px-2">{page} / {pages}</span>
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
