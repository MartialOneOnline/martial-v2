'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Users, CheckCircle2, Plus } from 'lucide-react'

/* ── Types ── */
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

type Occurrence = {
  classId: string
  className: string
  scheduledAt: string
  duration: number | null
  level: string | null
  capacity: number | null
  coverUrl: string | null
  school: { name: string; slug: string; logoUrl: string | null; city: string | null }
  instructor: { name: string; photoUrl: string | null } | null
  booked: number
  alreadyBooked: boolean
}

/* ── Helpers ── */
const STATUS_CONFIG: Record<string, { label: string; dot: string }> = {
  PENDING:   { label: 'Booked',    dot: '#3B82F6' },
  CONFIRMED: { label: 'Confirmed', dot: '#3B82F6' },
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

/* ── Booking card ── */
function BookingCard({ booking }: { booking: Booking }) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, dot: '#9CA3AF' }
  const gradient = classGradient(booking.class.name)

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-sm h-44 flex flex-col justify-end">
      {booking.class.imageUrl ? (
        <img src={booking.class.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute top-3 right-3">
        <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
          <span className="text-[10px] font-semibold text-white">{cfg.label}</span>
        </div>
      </div>
      {booking.class.school.logoUrl && (
        <div className="absolute top-3 left-3">
          <img src={booking.class.school.logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-white/20" />
        </div>
      )}
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

/* ── Occurrence card (bookable class) ── */
function OccurrenceCard({ occ, onBook }: { occ: Occurrence; onBook: (occ: Occurrence) => void }) {
  const gradient = classGradient(occ.className)
  const isFull = occ.capacity !== null && occ.booked >= occ.capacity
  const spotsLeft = occ.capacity !== null ? occ.capacity - occ.booked : null

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-sm h-44 flex flex-col justify-end">
      {occ.coverUrl ? (
        <img src={occ.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: gradient }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Status badge */}
      <div className="absolute top-3 right-3">
        {occ.alreadyBooked ? (
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-semibold text-white">Booked</span>
          </div>
        ) : isFull ? (
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] font-semibold text-white">Full</span>
          </div>
        ) : spotsLeft !== null && spotsLeft <= 5 ? (
          <div className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[10px] font-semibold text-white">{spotsLeft} left</span>
          </div>
        ) : null}
      </div>

      {/* School logo */}
      {occ.school.logoUrl && (
        <div className="absolute top-3 left-3">
          <img src={occ.school.logoUrl} alt="" className="w-8 h-8 rounded-xl object-cover border border-white/20" />
        </div>
      )}

      {/* Content */}
      <div className="relative px-4 pb-4 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-bold text-base leading-tight mb-1 truncate">{occ.className}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{occ.school.name}{occ.school.city ? `, ${occ.school.city}` : ''}</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-xs">
              <Clock className="w-3 h-3 shrink-0" />
              {fmtTime(occ.scheduledAt)}
              {occ.duration && <span className="opacity-60">· {occ.duration}min</span>}
            </div>
            {occ.capacity !== null && (
              <div className="flex items-center gap-1 text-white/80 text-xs">
                <Users className="w-3 h-3 shrink-0" />
                {occ.booked}/{occ.capacity}
              </div>
            )}
          </div>
        </div>

        {/* Book button */}
        {!occ.alreadyBooked && !isFull && (
          <button
            onClick={() => onBook(occ)}
            className="shrink-0 flex items-center gap-1.5 bg-white text-[#0870E2] text-xs font-bold px-3 py-2 rounded-xl shadow hover:bg-[#0870E2] hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Book
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Group by date ── */
function groupByDate<T extends { scheduledAt: string }>(items: T[]) {
  const groups: { label: string; date: Date; items: T[] }[] = []
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  for (const item of items) {
    const d = new Date(item.scheduledAt); d.setHours(0, 0, 0, 0)
    let label: string
    if (isSameDay(d, today)) label = 'Today'
    else if (isSameDay(d, tomorrow)) label = 'Tomorrow'
    else label = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

    const existing = groups.find(g => g.label === label)
    if (existing) existing.items.push(item)
    else groups.push({ label, date: d, items: [item] })
  }
  return groups
}

/* ── Confirm modal ── */
function ConfirmModal({
  occ, onConfirm, onCancel, booking,
}: {
  occ: Occurrence
  onConfirm: () => void
  onCancel: () => void
  booking: boolean
}) {
  const date = new Date(occ.scheduledAt)
  const dateStr = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-base font-bold text-[#101828] mb-1">Confirm booking</h2>
        <p className="text-sm text-gray-500 mb-4">
          {occ.className} · {dateStr} at {fmtTime(occ.scheduledAt)}
        </p>
        {occ.instructor && (
          <p className="text-xs text-gray-400 mb-4">Instructor: {occ.instructor.name}</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={booking}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={booking}
            className="flex-1 py-3 rounded-2xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0558b0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {booking ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function MyClassesPage() {
  const [mainTab, setMainTab] = useState<'schedule' | 'book'>('book')

  // --- Schedule tab state ---
  const [scheduleSubTab, setScheduleSubTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // --- Book tab state ---
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [loadingOcc, setLoadingOcc] = useState(true)
  const [occDate, setOccDate] = useState<Date | null>(null)
  const [confirmOcc, setConfirmOcc] = useState<Occurrence | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  /* Load bookings */
  const loadBookings = useCallback(() => {
    setLoadingBookings(true)
    fetch(`/api/my/bookings?past=${scheduleSubTab === 'past'}&page=${page}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setLoadingBookings(false) })
      .catch(() => setLoadingBookings(false))
  }, [scheduleSubTab, page])

  /* Load occurrences */
  const loadOccurrences = useCallback(() => {
    setLoadingOcc(true)
    fetch('/api/my/school-classes')
      .then(r => r.json())
      .then(d => { setOccurrences(d.occurrences ?? []); setLoadingOcc(false) })
      .catch(() => setLoadingOcc(false))
  }, [])

  useEffect(() => { setPage(1) }, [scheduleSubTab])
  useEffect(() => { loadBookings() }, [loadBookings])
  useEffect(() => { loadOccurrences() }, [loadOccurrences])

  const filteredBookings = selectedDate
    ? bookings.filter(b => isSameDay(new Date(b.scheduledAt), selectedDate))
    : bookings

  const filteredOcc = occDate
    ? occurrences.filter(o => isSameDay(new Date(o.scheduledAt), occDate))
    : occurrences

  const bookingGroups = groupByDate(filteredBookings)
  const occGroups = groupByDate(filteredOcc)

  async function handleBook() {
    if (!confirmOcc) return
    setBooking(true)
    setBookError(null)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: confirmOcc.classId, scheduledAt: confirmOcc.scheduledAt }),
      })
      if (!res.ok) {
        const data = await res.json()
        setBookError(data.error ?? 'Booking failed')
        setBooking(false)
        return
      }
      // Mark as booked locally
      setOccurrences(prev => prev.map(o =>
        o.classId === confirmOcc.classId && o.scheduledAt === confirmOcc.scheduledAt
          ? { ...o, alreadyBooked: true, booked: o.booked + 1 }
          : o
      ))
      setConfirmOcc(null)
      setBooking(false)
      // Refresh bookings tab in background
      loadBookings()
    } catch {
      setBookError('Network error. Try again.')
      setBooking(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#101828]">Classes</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {mainTab === 'book' ? `${occurrences.length} upcoming sessions` : `${total} ${scheduleSubTab} classes`}
            </p>
          </div>
          {/* Main tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMainTab('book')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mainTab === 'book' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Book
            </button>
            <button
              onClick={() => setMainTab('schedule')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                mainTab === 'schedule' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My bookings
            </button>
          </div>
        </div>
      </div>

      {/* ── Book tab ── */}
      {mainTab === 'book' && (
        <>
          <div className="bg-white border-b border-gray-50">
            <DateCarousel selected={occDate} onChange={setOccDate} />
          </div>
          <div className="px-4 py-4 max-w-2xl">
            {loadingOcc ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredOcc.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center mt-2">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#101828] mb-1">
                  {occDate ? 'No classes on this day' : 'No classes available'}
                </p>
                <p className="text-xs text-gray-400">
                  {occDate ? 'Try another day' : 'Your school has no scheduled classes yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {occGroups.map(g => (
                  <div key={g.label}>
                    <p className="text-xs font-bold text-[#101828] mb-2.5 uppercase tracking-widest px-1">{g.label}</p>
                    <div className="space-y-3">
                      {g.items.map(o => (
                        <OccurrenceCard
                          key={`${o.classId}:${o.scheduledAt}`}
                          occ={o}
                          onBook={setConfirmOcc}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── My bookings tab ── */}
      {mainTab === 'schedule' && (
        <>
          {/* Sub-tabs */}
          <div className="bg-white border-b border-gray-50 px-5 py-2.5 flex gap-3">
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setScheduleSubTab(t)}
                className={`text-sm font-semibold pb-1.5 border-b-2 transition-all capitalize ${
                  scheduleSubTab === t
                    ? 'border-[#0870E2] text-[#0870E2]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {scheduleSubTab === 'upcoming' && (
            <div className="bg-white border-b border-gray-50">
              <DateCarousel selected={selectedDate} onChange={setSelectedDate} />
            </div>
          )}

          <div className="px-4 py-4 max-w-2xl">
            {loadingBookings ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-5 h-5 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-10 shadow-sm text-center mt-2">
                <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#101828] mb-1">
                  {selectedDate ? 'No classes on this day' : scheduleSubTab === 'upcoming' ? 'No upcoming classes' : 'No past classes yet'}
                </p>
                <p className="text-xs text-gray-400">
                  {scheduleSubTab === 'upcoming' ? 'Book a class to see it here' : 'Classes you attend will appear here'}
                </p>
                {scheduleSubTab === 'upcoming' && (
                  <button
                    onClick={() => setMainTab('book')}
                    className="inline-flex mt-4 px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#0870E2] hover:bg-[#005580] transition-colors"
                  >
                    Browse classes
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {bookingGroups.map(g => (
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
        </>
      )}

      {/* Confirm booking modal */}
      {confirmOcc && (
        <ConfirmModal
          occ={confirmOcc}
          booking={booking}
          onConfirm={handleBook}
          onCancel={() => { setConfirmOcc(null); setBookError(null) }}
        />
      )}

      {/* Error toast */}
      {bookError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-lg">
          {bookError}
        </div>
      )}
    </div>
  )
}
