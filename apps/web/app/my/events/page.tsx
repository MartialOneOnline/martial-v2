'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Clock, MapPin, Ticket, CheckCircle2, X, Minus, Plus, AlertCircle, QrCode, MessageCircle, Mail, Globe } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useT } from '../../../lib/i18n/LanguageContext'
import { fmtPrice } from '../../../lib/format'
import { isStudentContextRequired, chooseProfileUrl } from '../../../lib/studentContext'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

/* ── Types ── */
type TicketOption = { id: string; name: string; description: string | null; price: number; currency: string; capacity: number | null; booked: number }

type EventItem = {
  id: string
  title: string
  description: string | null
  type: string
  location: string | null
  startAt: string
  endAt: string | null
  capacity: number | null
  coverUrl: string | null
  booked: number
  paymentMethods: string[]
  school: { name: string; slug: string; logoUrl: string | null; city: string | null }
  instructor: { name: string; photoUrl: string | null } | null
  tickets: TicketOption[]
}

type MyBooking = {
  id: string
  quantity: number
  status: string
  amountPaid: number | null
  currency: string
  ticketName: string
  paymentMethod: string
  createdAt: string
  qrToken: string | null
  checkedIn: boolean
  checkedInAt: string | null
  buyerName: string
  event: { id: string; title: string; startAt: string; location: string | null; coverUrl: string | null; school: { name: string; slug: string; phone: string | null; email: string | null; website: string | null; instagram: string | null } }
}

/* ── Helpers ── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function priceRange(tickets: TicketOption[], t: ReturnType<typeof useT>): string {
  if (tickets.length === 0) return t.my.freeEntry
  const prices = tickets.map(x => x.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === 0 && max === 0) return t.my.freeEntry
  const cur = tickets[0]?.currency ?? 'EUR'
  return min === max ? fmtPrice(min, cur) : `${fmtPrice(min, cur)} – ${fmtPrice(max, cur)}`
}

function getTicketStatusConfig(t: ReturnType<typeof useT>): Record<string, { label: string; color: string }> {
  return {
    PENDING:   { label: t.my.ticketStatusPending,   color: '#EAB308' },
    CONFIRMED: { label: t.my.ticketStatusConfirmed, color: '#22C55E' },
    CANCELLED: { label: t.my.ticketStatusCancelled, color: '#9CA3AF' },
  }
}

/* ── Event card ── */
function EventCard({ ev, onOpen }: { ev: EventItem; onOpen: (ev: EventItem) => void }) {
  const t = useT()
  const isFull = ev.capacity !== null && ev.booked >= ev.capacity
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="relative h-40 bg-gray-100">
        {ev.coverUrl ? (
          <img src={ev.coverUrl} alt={ev.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1e3a5f] to-[#0870E2] flex items-center justify-center">
            <Ticket className="w-12 h-12 text-white/30" />
          </div>
        )}
        {isFull && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="text-[10px] font-semibold text-white">{t.my.soldOutBtn}</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-[15px] font-bold text-[#061229] mb-1 leading-snug">{ev.title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
          <div className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fmtDate(ev.startAt)}</div>
          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(ev.startAt)}</div>
          {ev.location && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{ev.location}</div>}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-[#0870E2]">{priceRange(ev.tickets, t)}</span>
          <button
            onClick={() => onOpen(ev)}
            disabled={isFull}
            className="text-sm font-semibold rounded-xl px-4 py-2 transition-all disabled:opacity-50"
            style={{ background: isFull ? '#F5F5F5' : '#E8F4FF', color: isFull ? '#9E9E9E' : '#0870E2' }}
          >
            {isFull ? t.my.soldOutBtn : t.my.getTicketsBtn}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Ticket drawer ── */
function TicketDrawer({ ev, onClose }: { ev: EventItem; onClose: () => void }) {
  const t = useT()
  const purchasable = ev.tickets.filter(tk => tk.capacity === null || tk.booked < tk.capacity)
  const [ticketId, setTicketId] = useState(purchasable[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState<'online' | 'cash' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cashReserved, setCashReserved] = useState(false)

  const selected = ev.tickets.find(tk => tk.id === ticketId)
  const maxQty = selected?.capacity !== null && selected?.capacity !== undefined
    ? Math.max(1, Math.min(10, selected.capacity - selected.booked))
    : 10

  const hasOnline = ev.paymentMethods.includes('STRIPE') || ev.paymentMethods.includes('REVOLUT')
  const hasCash = ev.paymentMethods.includes('CASH')

  async function handleBuy() {
    if (!selected) return
    setLoading('online'); setError(null)
    try {
      const res = await fetch('/api/my/events/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.id, ticketId: selected.id, quantity }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t.my.checkoutFailedError); setLoading(null); return }
      window.location.href = data.url
    } catch {
      setError(t.my.checkoutFailedError)
      setLoading(null)
    }
  }

  async function handleReserveCash() {
    if (!selected) return
    setLoading('cash'); setError(null)
    try {
      const res = await fetch('/api/my/events/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: ev.id, ticketId: selected.id, quantity }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? t.my.checkoutFailedError); setLoading(null); return }
      setCashReserved(true)
    } catch {
      setError(t.my.checkoutFailedError)
    } finally {
      setLoading(null)
    }
  }

  if (cashReserved) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-base font-bold text-[#101828] mb-1">{t.my.cashReservedTitle}</h2>
          <p className="text-sm text-gray-500 mb-5">{t.my.cashReservedDesc}</p>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0558b0] transition-colors">
            {t.common.done}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-[#061229] leading-snug">{ev.title}</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{t.my.selectTicket}</p>
          <div className="flex flex-col gap-2 mb-5">
            {ev.tickets.map(tk => {
              const soldOut = tk.capacity !== null && tk.booked >= tk.capacity
              return (
                <button
                  key={tk.id}
                  disabled={soldOut}
                  onClick={() => { setTicketId(tk.id); setQuantity(1) }}
                  className="flex items-center justify-between p-3 rounded-2xl border text-left transition-colors disabled:opacity-40"
                  style={{ borderColor: ticketId === tk.id ? '#0870E2' : '#E5E7EB', background: ticketId === tk.id ? '#F0F7FF' : '#fff' }}
                >
                  <div>
                    <p className="text-sm font-semibold text-[#061229]">{tk.name}</p>
                    {tk.description && <p className="text-xs text-gray-400">{tk.description}</p>}
                    {soldOut && <p className="text-xs font-semibold text-red-500 mt-0.5">{t.my.soldOutBtn}</p>}
                  </div>
                  <span className="text-sm font-bold text-[#0870E2] shrink-0">{tk.price === 0 ? t.my.freeEntry : fmtPrice(tk.price, tk.currency)}</span>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-semibold text-gray-600">{t.my.quantityLabel}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold w-4 text-center">{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(maxQty, q + 1))} className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {hasOnline && (
            <button
              onClick={handleBuy}
              disabled={!selected || loading !== null}
              className="w-full py-3 rounded-2xl bg-[#0870E2] text-white text-sm font-semibold hover:bg-[#0558b0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'online' ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (
                selected ? `${t.my.getTicketsBtn} · ${selected.price === 0 ? t.my.freeEntry : fmtPrice(selected.price * quantity, selected.currency)}` : t.my.getTicketsBtn
              )}
            </button>
          )}

          {hasCash && (
            <button
              onClick={handleReserveCash}
              disabled={!selected || loading !== null}
              className="w-full py-3 rounded-2xl border border-gray-200 text-[#0870E2] text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ marginTop: hasOnline ? 8 : 0 }}
            >
              {loading === 'cash' ? <div className="w-4 h-4 border-2 border-[#0870E2] border-t-transparent rounded-full animate-spin" /> : t.my.payAtDoorBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Ticket QR modal ── */
function TicketQrModal({ booking, onClose }: { booking: MyBooking; onClose: () => void }) {
  const t = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl text-center my-8" onClick={e => e.stopPropagation()}>
        <div className="flex justify-end -mt-1 -mr-1 mb-1">
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <h2 className="text-base font-bold text-[#101828] mb-1">{booking.event.title}</h2>
        <p className="text-xs text-gray-400 mb-5">{booking.ticketName} × {booking.quantity}</p>
        {booking.checkedIn ? (
          <div className="py-6">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-emerald-600">{t.my.checkedInLabel}</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-gray-50 inline-block mb-4">
            <QRCodeSVG value={`martial:event:${booking.qrToken}`} size={200} level="M" />
          </div>
        )}
        <p className="text-sm font-semibold text-[#101828] mb-1">{booking.buyerName}</p>
        <p className="text-xs text-gray-500 mb-5">{t.my.ticketQrHint}</p>

        <div className="rounded-2xl border border-gray-100 overflow-hidden text-left">
          <p className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{t.my.ticketQrHowItWorks}</p>
          {[t.my.ticketQrStep1, t.my.ticketQrStep2, t.my.ticketQrStep3].map((text, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5" style={i > 0 ? { borderTop: '1px solid #F3F4F6' } : {}}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#E8F4FF]">
                <span className="text-[11px] font-semibold text-[#0870E2]">{i + 1}</span>
              </div>
              <p className="text-xs text-gray-600 leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Contact organizer sheet ── */
type OrganizerContact = { name: string; phone: string | null; email: string | null; website: string | null; instagram: string | null }

function ContactOrganizerSheet({ school, subject, onClose }: { school: OrganizerContact; subject: string; onClose: () => void }) {
  const t = useT()
  const items = [
    school.phone && {
      key: 'whatsapp', icon: MessageCircle, color: '#34C759', bg: 'rgba(52,199,89,.10)',
      label: t.my.contactWhatsappBtn, sub: school.phone,
      href: `https://wa.me/${school.phone.replace(/\D/g, '')}`,
    },
    school.email && {
      key: 'email', icon: Mail, color: '#007AFF', bg: 'rgba(0,122,255,.10)',
      label: t.my.contactEmailBtn, sub: school.email,
      href: `mailto:${school.email}?subject=${encodeURIComponent(subject)}`,
    },
    school.website && {
      key: 'website', icon: Globe, color: '#0870E2', bg: '#E8F4FF',
      label: t.my.contactWebsiteBtn, sub: school.website.replace(/^https?:\/\//, ''),
      href: school.website.startsWith('http') ? school.website : `https://${school.website}`,
    },
    school.instagram && {
      key: 'instagram', icon: InstagramIcon, color: '#E1306C', bg: 'rgba(225,48,108,.10)',
      label: t.my.contactInstagramBtn, sub: school.instagram.startsWith('@') ? school.instagram : `@${school.instagram}`,
      href: `https://instagram.com/${school.instagram.replace('@', '')}`,
    },
  ].filter((x): x is { key: string; icon: typeof MessageCircle; color: string; bg: string; label: string; sub: string; href: string } => Boolean(x))

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="px-5 pt-2 pb-1 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#061229]">{t.my.contactOrganizerLabel}</h2>
            <p className="text-xs text-gray-400">{school.name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="mx-5 mt-3 rounded-2xl border border-gray-100 overflow-hidden">
          {items.map((item, i) => (
            <a
              key={item.key}
              href={item.href}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3"
              style={i > 0 ? { borderTop: '1px solid #F3F4F6' } : {}}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: item.bg }}>
                <item.icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#061229]">{item.label}</p>
                <p className="text-xs text-gray-400 truncate">{item.sub}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── My ticket card ── */
function MyTicketCard({ booking }: { booking: MyBooking }) {
  const t = useT()
  const [showQr, setShowQr] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const isCashPending = booking.status === 'PENDING' && booking.paymentMethod === 'CASH'
  const cfg = booking.checkedIn
    ? { label: t.my.checkedInLabel, color: '#22C55E' }
    : isCashPending
    ? { label: t.my.payAtDoorBtn, color: '#EAB308' }
    : getTicketStatusConfig(t)[booking.status] ?? { label: booking.status, color: '#9CA3AF' }
  const canShowTicket = booking.qrToken && booking.status !== 'CANCELLED'
  const school = booking.event.school
  const hasContact = school.phone || school.email || school.website || school.instagram
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-[15px] font-bold text-[#061229] leading-snug">{booking.event.title}</h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
          <div className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{fmtDate(booking.event.startAt)}</div>
          <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{fmtTime(booking.event.startAt)}</div>
          {booking.event.location && <div className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{booking.event.location}</div>}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {booking.ticketName} × {booking.quantity} · {booking.amountPaid ? fmtPrice(booking.amountPaid, booking.currency) : t.my.freeEntry}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasContact && (
              <button
                onClick={() => setShowContact(true)}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 border border-gray-200 text-gray-500 hover:text-[#0870E2] hover:border-[#0870E2] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />{t.my.contactOrganizerLabel}
              </button>
            )}
            {canShowTicket && (
              <button
                onClick={() => setShowQr(true)}
                className="flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 shrink-0"
                style={{ background: '#E8F4FF', color: '#0870E2' }}
              >
                <QrCode className="w-3.5 h-3.5" />{t.my.showTicketBtn}
              </button>
            )}
          </div>
        </div>
      </div>
      {showQr && <TicketQrModal booking={booking} onClose={() => setShowQr(false)} />}
      {showContact && <ContactOrganizerSheet school={school} subject={booking.event.title} onClose={() => setShowContact(false)} />}
    </div>
  )
}

/* ── Main page ── */
export default function MyEventsPage() {
  return (
    <Suspense fallback={null}>
      <MyEventsPageInner />
    </Suspense>
  )
}

function MyEventsPageInner() {
  const t = useT()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [mainTab, setMainTab] = useState<'available' | 'mine'>('available')
  const [events, setEvents] = useState<EventItem[]>([])
  const [myBookings, setMyBookings] = useState<MyBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [openEvent, setOpenEvent] = useState<EventItem | null>(null)
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)
  const [hasSchool, setHasSchool] = useState(false)
  const tabInitialized = useRef(false)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/my/events')
      .then(r => r.json())
      .then(d => {
        // A dual-school student with no resolved active context can't be
        // served events/bookings without guessing which school it belongs
        // to — send them to pick one instead of rendering an empty page.
        if (isStudentContextRequired(d)) {
          router.replace(chooseProfileUrl(pathname))
          return
        }
        const bookings = d.myBookings ?? []
        setEvents(d.events ?? [])
        setMyBookings(bookings)
        setLoading(false)
        if (!tabInitialized.current) {
          tabInitialized.current = true
          setMainTab(bookings.length > 0 ? 'mine' : 'available')
        }
      })
      .catch(() => setLoading(false))
  }, [router, pathname])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/my')
      .then(r => r.json())
      .then(d => setHasSchool((d.user?.schoolMembers?.length ?? 0) > 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const checkout = searchParams.get('checkout')
    if (checkout === 'success' || checkout === 'cancelled') {
      setBanner(checkout)
      if (checkout === 'success') { tabInitialized.current = true; setMainTab('mine'); load() }
      const timer = setTimeout(() => setBanner(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [searchParams, load])

  return (
    <div className="min-h-screen">
      <div className="bg-white border-b border-gray-100 px-5 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-[#101828]">{t.my.eventsHeader}</h1>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(myBookings.length > 0
              ? (['mine', 'available'] as const)
              : (['available', 'mine'] as const)
            ).map(tab => (
              <button
                key={tab}
                onClick={() => setMainTab(tab)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: mainTab === tab ? '#fff' : 'transparent', color: mainTab === tab ? '#0870E2' : '#9CA3AF' }}
              >
                {tab === 'available' ? t.my.availableTab : t.my.myTicketsTab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {banner && (
        <div className="mx-5 mt-4 flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: banner === 'success' ? '#F0FDF4' : '#FEF2F2' }}>
          {banner === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
          <span className="text-sm font-medium" style={{ color: banner === 'success' ? '#166534' : '#991B1B' }}>
            {banner === 'success' ? t.my.bookingConfirmedTitle : t.my.checkoutFailedError}
          </span>
        </div>
      )}

      <div className="p-5">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: '#F3F4F6' }} />
            ))}
          </div>
        ) : mainTab === 'available' ? (
          events.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              {!hasSchool ? (
                <>
                  <p className="text-sm font-semibold text-gray-500">{t.my.findYourAcademy}</p>
                  <p className="text-xs text-gray-400 mt-1 mb-4">{t.my.searchNearYou}</p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold bg-[#0870E2] hover:bg-[#0558b0] transition-colors"
                  >
                    {t.my.exploreEvents}
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-500">{t.my.noEventsAvailable}</p>
                  <p className="text-xs text-gray-400 mt-1">{t.my.noEventsDesc}</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map(ev => <EventCard key={ev.id} ev={ev} onOpen={setOpenEvent} />)}
            </div>
          )
        ) : (
          myBookings.length === 0 ? (
            <div className="text-center py-16">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-500">{t.my.noTicketsYet}</p>
              <p className="text-xs text-gray-400 mt-1">{t.my.noTicketsDesc}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myBookings.map(b => <MyTicketCard key={b.id} booking={b} />)}
            </div>
          )
        )}
      </div>

      {openEvent && (
        <TicketDrawer
          ev={openEvent}
          onClose={() => { setOpenEvent(null); load() }}
        />
      )}
    </div>
  )
}
