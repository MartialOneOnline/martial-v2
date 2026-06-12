'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Clock, CheckCircle2, XCircle, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'

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
    imageUrl?: string | null
    school: { name: string; slug: string; logoUrl: string | null; city: string | null }
  }
}

const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  PENDING:   { label: 'Booked',    dot: '#3B82F6' },
  ATTENDED:  { label: 'Attended',  dot: '#22C55E' },
  NO_SHOW:   { label: 'No show',   dot: '#EF4444' },
  CANCELLED: { label: 'Cancelled', dot: '#9CA3AF' },
}

const DISCIPLINE_COLORS: Record<string, string> = {
  BJJ: 'linear-gradient(135deg, #1e3a5f 0%, #0870E2 100%)',
  MMA: 'linear-gradient(135deg, #1a1a2e 0%, #e94560 100%)',
  Muay: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)',
  Boxing: 'linear-gradient(135deg, #1c1917 0%, #d97706 100%)',
  Judo: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 100%)',
  Kickboxing: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
}

function classGradient(name: string) {
  const key = Object.keys(DISCIPLINE_COLORS).find(k => name.toLowerCase().includes(k.toLowerCase()))
  return key ? DISCIPLINE_COLORS[key] : 'linear-gradient(135deg, #1e3a5f 0%, #0870E2 100%)'
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/* ── Date carousel ── */
function DateCarousel({ selected, onChange }: { selected: Date | null; onChange: (d: Date | null) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const days: Date[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (let i = -1; i <= 13; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i)
    days.push(d)
  }

  const DAY = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
  const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto scrollbar-none px-4 py-3">
        {/* All button */}
        <button
          onClick={() => onChange(null)}
          className={`flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-2xl text-xs font-semibold transition-all ${
            selected === null
              ? 'bg-[#0870E2] text-white shadow-md shadow-[#0870E2]/25'
              : 'bg-white border border-gray-100 text-gray-400 hover:border-[#0870E2]/30'
          }`}
        >
          <span className="text-[10px] font-medium">All</span>
        </button>

        {days.map(d => {
          const isActive = selected !== null && isSameDay(d, selected)
          const isToday = isSameDay(d, today)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onChange(isActive ? null : d)}
              className={`flex flex-col items-center justify-center shrink-0 w-14 h-14 rounded-2xl text-xs transition-all ${
                isActive
                  ? 'bg-[#0870E2] text-white shadow-md shadow-[#0870E2]/25 font-semibold'
                  : isToday
                  ? 'bg-[#0870E2]/8 text-[#0870E2] border border-[#0870E2]/20 font-semibold'
                  : 'bg-white border border-gray-100 text-gray-500 hover:border-[#0870E2]/30'
              }`}
            >
              <span className="text-[10px] font-medium mb-0.5">{DAY[d.getDay()]}</span>
              <span className="text-base font-bold leading-none">{d.getDate()}</span>
              {isToday && <span className="text-[8px] mt-0.5 font-semibold opacity-70">{MONTH_SHORT[d.getMonth()]}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Booking card (full-bleed photo style) ── */
function BookingCard({ booking }: { booking: Booking }) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, dot: '#9CA3AF' }
  const date = new Date(booking.scheduledAt)
  const gradient = classGradient(booking.class.name)

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-sm h-44 flex flex-col justify-end">
      {/* Background */}
      {booking.class.imageUrl ? (
        <img src={booking.class.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Status badge */}
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-[10px] font-semibold text-white">{cfg.label}</span>
        </div>
      </div>

      {/* School logo */}
      {booking.class.school.logoUrl && (
        <div className="absolute top-3 left-3">
          <img src={booking.class.school.logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-white/20" />
        </div>
      )}

      {/* Content */}
      <div className="relative px-4 pb-4">
        <p className="text-white font-bold text-base leading-tight mb-1">{booking.class.name}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <MapPin className="w-3 h-3" />
            {booking.class.school.name}
            {booking.class.school.city ? `, ${booking.class.school.city}` : ''}
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs">
            <Clock className="w-3 h-3" />
            {fmtTime(booking.scheduledAt)}
            {booking.class.duration && <span className="opacity-60">· {booking.class.duration}min</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Group bookings by date ── */
function groupByDate(bookings: Booking[]) {
  const groups: { label: string; date: Date; items: Booking[] }[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  for (const b of bookings) {
    const d = new Date(b.scheduledAt); d.setHours(0, 0, 0, 0)
    let label: string
    if (isSameDay(d, today)) label = 'Today'
    else if (isSameDay(d, tomorrow)) label = 'Tomorrow'
    else label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

    const existing = groups.find(g => g.label === label)
    if (existing) existing.items.push(b)
    else groups.push({ label, date: d, items: [b] })
  }
  return groups
}

export default function MyClassesPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/my/bookings?past=${tab === 'past'}&page=${page}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [load])

  const filtered = selectedDate
    ? bookings.filter(b => isSameDay(new Date(b.scheduledAt), selectedDate))
    : bookings

  const groups = groupByDate(filtered)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#101828]">Schedule</h1>
            <p className="text-xs text-gray-400 mt-0.5">{total} {tab === 'upcoming' ? 'upcoming' : 'past'} classes</p>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize ${
                  tab === t ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date carousel — upcoming only */}
      {tab === 'upcoming' && (
        <div className="bg-white border-b border-gray-50">
          <DateCarousel selected={selectedDate} onChange={setSelectedDate} />
        </div>
      )}

      <div className="px-4 py-4 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center mt-2">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#101828] mb-1">
              {selectedDate ? 'No classes on this day' : tab === 'upcoming' ? 'No upcoming classes' : 'No past classes yet'}
            </p>
            <p className="text-xs text-gray-400">
              {tab === 'upcoming' ? 'Book a class to see it here' : 'Classes you attend will appear here'}
            </p>
            {tab === 'upcoming' && (
              <Link
                href="/explore"
                className="inline-flex mt-4 px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#0870E2] hover:bg-[#005580] transition-colors"
              >
                Explore classes
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(g => (
              <div key={g.label}>
                <p className="text-xs font-bold text-[#101828] mb-2.5 uppercase tracking-widest px-1">{g.label}</p>
                <div className="space-y-3">
                  {g.items.map(b => <BookingCard key={b.id} booking={b} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2">
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
