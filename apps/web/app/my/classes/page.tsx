'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Users, CheckCircle2, X, Info, CalendarDays } from 'lucide-react'

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
  description?: string | null
  school: { name: string; slug: string; logoUrl: string | null; city: string | null }
  instructor: { name: string; photoUrl: string | null } | null
  booked: number
  alreadyBooked: boolean
}

/* ── Helpers ── */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Booked',    color: '#3B82F6' },
  CONFIRMED: { label: 'Confirmed', color: '#3B82F6' },
  ATTENDED:  { label: 'Attended',  color: '#22C55E' },
  NO_SHOW:   { label: 'No show',   color: '#EF4444' },
  CANCELLED: { label: 'Cancelled', color: '#9CA3AF' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
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
  )
}

/* ── Class card (bookable) ── */
function OccurrenceCard({ occ, onBook, onDetail, onCancelBooking }: {
  occ: Occurrence
  onBook: (occ: Occurrence) => void
  onDetail: (occ: Occurrence) => void
  onCancelBooking?: () => void
}) {
  const isFull = occ.capacity !== null && occ.booked >= occ.capacity
  const spotsLeft = occ.capacity !== null ? occ.capacity - occ.booked : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Image */}
      <div className="relative h-44 bg-gray-100">
        {occ.coverUrl ? (
          <img src={occ.coverUrl} alt={occ.className} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0870E2] flex items-center justify-center">
            <CalendarDays className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Capacity badge */}
        {occ.capacity !== null && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-xs font-semibold text-white">{occ.booked}/{occ.capacity}</span>
          </div>
        )}
        {/* Booked badge */}
        {occ.alreadyBooked && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3 text-white" />
            <span className="text-[10px] font-semibold text-white">Booked</span>
          </div>
        )}
        {/* Full badge */}
        {isFull && !occ.alreadyBooked && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-[10px] font-semibold text-white">Full</span>
          </div>
        )}
        {/* Low spots warning */}
        {!isFull && !occ.alreadyBooked && spotsLeft !== null && spotsLeft <= 5 && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-amber-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-[10px] font-semibold text-white">{spotsLeft} spots left</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-[15px] font-bold text-[#061229] mb-1 leading-snug">{occ.className}</h3>
        {occ.description && (
          <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{occ.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 flex-wrap">
          {occ.level && (
            <span className="font-semibold text-[#0870E2]">{occ.level}</span>
          )}
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {fmtDate(occ.scheduledAt)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {fmtTime(occ.scheduledAt)}
            {occ.duration && <span className="text-gray-400">· {occ.duration}min</span>}
          </div>
          {occ.capacity !== null && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {occ.booked}/{occ.capacity}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onDetail(occ)}
            className="flex-1 flex items-center justify-center text-sm font-medium rounded-xl transition-colors"
            style={{ background: '#ECEAEA', color: '#000', padding: '8px 0' }}
          >
            Details
          </button>
          {occ.alreadyBooked ? (
            <button
              onClick={onCancelBooking}
              className="flex-1 flex items-center justify-center text-sm font-medium rounded-xl"
              style={{ background: '#FFEBEE', color: '#C62828', padding: '8px 0' }}
            >
              Cancel
            </button>
          ) : !isFull ? (
            <button
              onClick={() => onBook(occ)}
              className="flex-1 flex items-center justify-center text-sm font-medium rounded-xl transition-all hover:opacity-90"
              style={{ background: '#E8F7FF', color: '#006197', padding: '8px 0' }}
            >
              Book Now
            </button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm font-medium rounded-xl" style={{ background: '#F5F5F5', color: '#9E9E9E', padding: '8px 0' }}>
              Full
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Booking card (my bookings) ── */
function BookingCard({ booking, onCancel }: { booking: Booking; onCancel?: () => void }) {
  const cfg = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: '#9CA3AF' }
  const isCancellable = ['PENDING', 'CONFIRMED'].includes(booking.status) && new Date(booking.scheduledAt) > new Date()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {booking.class.imageUrl && (
        <div className="h-36 bg-gray-100 relative">
          <img src={booking.class.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-[15px] font-bold text-[#061229] leading-snug">{booking.class.name}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-4 flex-wrap">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {booking.class.school.name}
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            {fmtDate(booking.scheduledAt)}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {fmtTime(booking.scheduledAt)}
            {booking.class.duration && <span className="text-gray-400">· {booking.class.duration}min</span>}
          </div>
        </div>

        {isCancellable && onCancel && (
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-500 text-sm font-semibold py-2.5 rounded-xl hover:bg-red-500 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
            Cancel booking
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

/* ── Detail drawer ── */
function DetailDrawer({ occ, onClose, onBook }: {
  occ: Occurrence
  onClose: () => void
  onBook: (occ: Occurrence) => void
}) {
  const isFull = occ.capacity !== null && occ.booked >= occ.capacity
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Image */}
        {occ.coverUrl && (
          <div className="mx-4 mt-2 rounded-2xl overflow-hidden h-48">
            <img src={occ.coverUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-lg font-bold text-[#061229] leading-snug">{occ.className}</h2>
            {occ.capacity !== null && (
              <span className="text-sm font-semibold text-gray-400 shrink-0">{occ.booked}/{occ.capacity}</span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              {fmtDate(occ.scheduledAt)}
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {fmtTime(occ.scheduledAt)}
              {occ.duration && <span>· {occ.duration}min</span>}
            </div>
            <span className="text-gray-300">·</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {occ.school.name}
            </div>
          </div>

          {/* Description */}
          {occ.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-5">{occ.description}</p>
          )}

          {/* Instructor */}
          {occ.instructor && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl mb-5">
              {occ.instructor.photoUrl ? (
                <img src={occ.instructor.photoUrl} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#0870E2]/10 flex items-center justify-center">
                  <span className="text-[#0870E2] font-bold text-sm">{occ.instructor.name[0]}</span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-[#061229]">{occ.instructor.name}</p>
                <p className="text-xs text-gray-400">Instructor</p>
              </div>
            </div>
          )}

          {/* Level */}
          {occ.level && (
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#0870E2] bg-[#E8F4FF] px-3 py-1 rounded-full">
                {occ.level}
              </span>
            </div>
          )}

          {/* CTA */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {!occ.alreadyBooked && !isFull ? (
              <button
                onClick={() => { onClose(); onBook(occ) }}
                className="flex-1 py-3 rounded-2xl bg-[#E8F4FF] text-[#0870E2] text-sm font-semibold hover:bg-[#0870E2] hover:text-white transition-all"
              >
                Book Now
              </button>
            ) : occ.alreadyBooked ? (
              <div className="flex-1 py-3 rounded-2xl bg-emerald-50 text-emerald-600 text-sm font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Already booked
              </div>
            ) : (
              <div className="flex-1 py-3 rounded-2xl bg-gray-50 text-gray-400 text-sm font-semibold flex items-center justify-center">
                Class full
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Confirm booking modal ── */
function ConfirmModal({ occ, onConfirm, onCancel, booking, success }: {
  occ: Occurrence
  onConfirm: () => void
  onCancel: () => void
  booking: boolean
  success: boolean
}) {
  const dateStr = new Date(occ.scheduledAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-base font-bold text-[#101828] mb-1">Booking confirmed!</h2>
          <p className="text-sm text-gray-500 mb-1">{occ.className}</p>
          <p className="text-xs text-gray-400 mb-5">{dateStr} · {fmtTime(occ.scheduledAt)}</p>
          <button onClick={onCancel} className="w-full py-3 rounded-2xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0558b0] transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-base font-bold text-[#101828] mb-1">Confirm booking</h2>
        <p className="text-sm text-gray-500 mb-4">{occ.className} · {dateStr} at {fmtTime(occ.scheduledAt)}</p>
        {occ.instructor && <p className="text-xs text-gray-400 mb-4">Instructor: {occ.instructor.name}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={booking}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={booking}
            className="flex-1 py-3 rounded-2xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0558b0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {booking ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Cancel confirm modal ── */
function CancelModal({ booking, onConfirm, onClose, cancelling }: {
  booking: Booking
  onConfirm: () => void
  onClose: () => void
  cancelling: boolean
}) {
  const dateStr = new Date(booking.scheduledAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
        <h2 className="text-base font-bold text-[#101828] mb-1">Cancel booking?</h2>
        <p className="text-sm text-gray-500 mb-5">{booking.class.name} · {dateStr} at {fmtTime(booking.scheduledAt)}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={cancelling}
            className="flex-1 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            Keep it
          </button>
          <button onClick={onConfirm} disabled={cancelling}
            className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {cancelling ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Cancel booking'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */
export default function MyClassesPage() {
  const [mainTab, setMainTab] = useState<'book' | 'schedule'>('book')

  // Book tab state
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [loadingOcc, setLoadingOcc] = useState(true)
  const [occDate, setOccDate] = useState<Date | null>(null)
  const [detailOcc, setDetailOcc] = useState<Occurrence | null>(null)
  const [confirmOcc, setConfirmOcc] = useState<Occurrence | null>(null)
  const [booking, setBooking] = useState(false)
  const [bookSuccess, setBookSuccess] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  // My bookings tab state
  const [scheduleSubTab, setScheduleSubTab] = useState<'upcoming' | 'past'>('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const loadBookings = useCallback(() => {
    setLoadingBookings(true)
    fetch(`/api/my/bookings?past=${scheduleSubTab === 'past'}&page=${page}`)
      .then(r => r.json())
      .then(d => { setBookings(d.bookings ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); setLoadingBookings(false) })
      .catch(() => setLoadingBookings(false))
  }, [scheduleSubTab, page])

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

  const filteredOcc = occDate ? occurrences.filter(o => isSameDay(new Date(o.scheduledAt), occDate)) : occurrences
  const filteredBookings = selectedDate ? bookings.filter(b => isSameDay(new Date(b.scheduledAt), selectedDate)) : bookings
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
      setOccurrences(prev => prev.map(o =>
        o.classId === confirmOcc.classId && o.scheduledAt === confirmOcc.scheduledAt
          ? { ...o, alreadyBooked: true, booked: o.booked + 1 }
          : o
      ))
      setBooking(false)
      setBookSuccess(true)
      loadBookings()
    } catch {
      setBookError('Network error. Try again.')
      setBooking(false)
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await fetch(`/api/my/bookings/${cancelTarget.id}`, { method: 'DELETE' })
      setBookings(prev => prev.filter(b => b.id !== cancelTarget.id))
      setCancelTarget(null)
    } catch {
      // silent
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10 md:top-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#101828]">Classes</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {mainTab === 'book' ? `${occurrences.length} upcoming sessions` : `${total} ${scheduleSubTab} bookings`}
            </p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setMainTab('book')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${mainTab === 'book' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Book
            </button>
            <button
              onClick={() => setMainTab('schedule')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${mainTab === 'schedule' ? 'bg-white text-[#101828] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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
                    <div className="space-y-4">
                      {g.items.map(o => {
                        const matchedBooking = bookings.find(
                          b => b.class.id === o.classId && b.scheduledAt === o.scheduledAt && ['PENDING','CONFIRMED'].includes(b.status)
                        )
                        return (
                        <OccurrenceCard
                          key={`${o.classId}:${o.scheduledAt}`}
                          occ={o}
                          onBook={setConfirmOcc}
                          onDetail={setDetailOcc}
                          onCancelBooking={matchedBooking ? () => setCancelTarget(matchedBooking) : undefined}
                        />
                        )
                      })}
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
          <div className="bg-white border-b border-gray-50 px-5 py-2.5 flex gap-3">
            {(['upcoming', 'past'] as const).map(t => (
              <button
                key={t}
                onClick={() => setScheduleSubTab(t)}
                className={`text-sm font-semibold pb-1.5 border-b-2 transition-all capitalize ${
                  scheduleSubTab === t ? 'border-[#0870E2] text-[#0870E2]' : 'border-transparent text-gray-400 hover:text-gray-600'
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
                    <div className="space-y-4">
                      {g.items.map(b => (
                        <BookingCard key={b.id} booking={b} onCancel={() => setCancelTarget(b)} />
                      ))}
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

      {/* Detail drawer */}
      {detailOcc && (
        <DetailDrawer occ={detailOcc} onClose={() => setDetailOcc(null)} onBook={setConfirmOcc} />
      )}

      {/* Confirm booking modal */}
      {confirmOcc && (
        <ConfirmModal
          occ={confirmOcc}
          booking={booking}
          success={bookSuccess}
          onConfirm={handleBook}
          onCancel={() => { setConfirmOcc(null); setBookError(null); setBookSuccess(false) }}
        />
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          cancelling={cancelling}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
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
