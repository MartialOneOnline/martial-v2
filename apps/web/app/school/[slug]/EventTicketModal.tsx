'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { X, Calendar, MapPin, CheckCircle, LogIn, Loader2, Minus, Plus, CreditCard, Banknote } from 'lucide-react'
import { fmtPrice } from '@/lib/format'
import type { EventForCta } from './EventTicketCTA'

const FALLBACK_HERO = 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&h=300&fit=crop&q=80'

type Props = {
  event: EventForCta
  schoolSlug: string
  // Defaults to the school profile's events section when not given.
  redirectPath?: string
  onClose: () => void
}

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'
type BookingState = 'idle' | 'booking' | 'success' | 'error'

const PAYMENT_LABELS: Record<string, { label: string; icon: typeof CreditCard }> = {
  STRIPE:  { label: 'Card', icon: CreditCard },
  REVOLUT: { label: 'Card (Revolut)', icon: CreditCard },
  CASH:    { label: 'Cash at the door', icon: Banknote },
}

// Only offer payment methods with a working purchase path (BANK_TRANSFER has no
// reservation endpoint yet, so it's intentionally left out here).
const SUPPORTED_METHODS = ['STRIPE', 'REVOLUT', 'CASH']

export default function EventTicketModal({ event, schoolSlug, redirectPath, onClose }: Props) {
  const router = useRouter()
  const backTo = redirectPath ?? `/school/${schoolSlug}#events`
  const [auth, setAuth] = useState<AuthStatus>('loading')
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [bookingId, setBookingId] = useState<string | null>(null)

  const availableMethods = event.paymentMethods.filter(m => SUPPORTED_METHODS.includes(m))
  const [ticketId, setTicketId] = useState(event.tickets[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState(availableMethods[0] ?? '')

  const ticket = event.tickets.find(t => t.id === ticketId)
  const remaining = ticket?.capacity != null ? Math.max(0, ticket.capacity - ticket.booked) : null
  const maxQuantity = Math.min(10, remaining ?? 10)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => setAuth(r.ok ? 'authenticated' : 'unauthenticated'))
      .catch(() => setAuth('unauthenticated'))
  }, [])

  async function submit() {
    if (!ticket || !paymentMethod) return
    setBookingState('booking')
    try {
      const endpoint = paymentMethod === 'CASH' ? '/api/my/events/reserve' : '/api/my/events/checkout'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, ticketId: ticket.id, quantity, provider: paymentMethod }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creating booking')

      if (data.url) {
        window.location.href = data.url
        return
      }
      setBookingId(data.bookingId ?? null)
      setBookingState('success')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setBookingState('error')
    }
  }

  const dateLabel = new Date(event.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[480px] bg-white rounded-t-[28px] md:rounded-[28px] shadow-2xl overflow-hidden isolate transform-gpu"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        <div className="md:hidden flex justify-center absolute top-2 left-0 right-0 z-20">
          <div className="w-10 h-1.5 rounded-full bg-white/70" />
        </div>

        {/* Hero */}
        <div className="relative h-24">
          <Image src={event.coverUrl ?? FALLBACK_HERO} alt={event.title} fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/60" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/45 hover:bg-black/60 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="absolute left-4 md:left-5 bottom-3 right-16 text-white">
            <h2 className="text-base font-bold leading-tight truncate">{event.title}</h2>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-white/85">
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{dateLabel}</span>
              {event.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{event.location}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {auth === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0870E2]" />
            </div>
          )}

          {bookingState === 'success' && (
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-[#111827] mb-1">
                {paymentMethod === 'CASH' ? 'Reservation confirmed' : 'Ticket confirmed'}
              </h3>
              <p className="text-sm text-[#6B7280] mb-5">
                {paymentMethod === 'CASH'
                  ? `Pay ${fmtPrice((ticket?.price ?? 0) * quantity, ticket?.currency ?? 'EUR')} in cash at the door.`
                  : `You're booked for ${event.title}.`}
              </p>

              <div className="grid grid-cols-2 gap-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl px-4 py-3.5 mb-5 text-left">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-0.5">Booking ref</p>
                  <p className="text-sm font-bold text-[#111827] truncate">{bookingId ?? '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] mb-0.5">Date</p>
                  <p className="text-sm font-bold text-[#111827]">{dateLabel}</p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button onClick={onClose} className="flex-1 border border-[#E5E7EB] text-[#374151] font-semibold py-3 rounded-2xl transition-colors hover:border-[#D1D5DB]">
                  Close
                </button>
                <Link href="/my/events" className="flex-1 bg-[#0870E2] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors">
                  View my tickets
                </Link>
              </div>
            </div>
          )}

          {bookingState === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <X className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-sm text-[#6B7280] text-center">{errorMsg}</p>
              <button onClick={() => setBookingState('idle')} className="text-sm text-[#0870E2] underline">Try again</button>
            </div>
          )}

          {auth === 'unauthenticated' && bookingState === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl p-4">
                <LogIn className="w-5 h-5 text-[#0870E2] shrink-0" />
                <p className="text-sm text-[#0369A1]">You need to be logged in to buy a ticket.</p>
              </div>
              <button
                onClick={() => router.push(`/login?redirect=${encodeURIComponent(backTo)}`)}
                className="w-full bg-[#0870E2] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors"
              >
                Log In to Book
              </button>
              <button
                onClick={() => router.push(`/register?type=student&lock=1&redirect=${encodeURIComponent(backTo)}`)}
                className="w-full border border-[#0870E2] text-[#0870E2] hover:bg-[#e8f7ff] font-semibold py-3 rounded-2xl transition-colors"
              >
                Create Free Account
              </button>
            </div>
          )}

          {auth === 'authenticated' && bookingState !== 'success' && bookingState !== 'error' && (
            <div className="space-y-5">
              {/* Ticket selection */}
              <div className="space-y-2">
                {event.tickets.map(t => {
                  const left = t.capacity != null ? Math.max(0, t.capacity - t.booked) : null
                  const soldOut = left !== null && left <= 0
                  const selected = ticketId === t.id
                  return (
                    <button
                      key={t.id}
                      disabled={soldOut}
                      onClick={() => { setTicketId(t.id); setQuantity(1) }}
                      className={`w-full flex items-center gap-3 border-[1.5px] rounded-2xl px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected ? 'border-[#0870E2] bg-[#f0f9ff]' : 'border-[#E5E7EB]'
                      }`}
                    >
                      <span className={`w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#0870E2]' : 'border-[#E5E7EB]'}`}>
                        {selected && <span className="w-2 h-2 rounded-full bg-[#0870E2]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[#111827]">{t.name}</div>
                        {t.description && <div className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{t.description}</div>}
                        {left !== null && (
                          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{soldOut ? 'Sold out' : `${left} left`}</div>
                        )}
                      </div>
                      <div className="text-base font-bold text-[#0870E2] shrink-0">{fmtPrice(t.price, t.currency)}</div>
                    </button>
                  )
                })}
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#374151]">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-40"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-4 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
                    disabled={quantity >= maxQuantity}
                    className="w-8 h-8 rounded-full border border-[#E5E7EB] flex items-center justify-center disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Payment method */}
              {availableMethods.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-sm font-medium text-[#374151]">Payment method</span>
                  <div className="space-y-2">
                    {availableMethods.map(m => {
                      const meta = PAYMENT_LABELS[m]
                      if (!meta) return null
                      const Icon = meta.icon
                      const selected = paymentMethod === m
                      return (
                        <button
                          key={m}
                          onClick={() => setPaymentMethod(m)}
                          className={`w-full flex items-center gap-3 border-[1.5px] rounded-2xl px-4 py-3 text-left transition-colors ${
                            selected ? 'border-[#0870E2] bg-[#f0f9ff]' : 'border-[#E5E7EB]'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selected ? 'bg-[#0870E2] text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-sm font-semibold text-[#111827] flex-1">{meta.label}</span>
                          <span className={`w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-[#0870E2]' : 'border-[#E5E7EB]'}`}>
                            {selected && <span className="w-2 h-2 rounded-full bg-[#0870E2]" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#6B7280]">No payment method available for this event.</p>
              )}

              {/* Total + submit */}
              {ticket && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 flex items-center justify-between text-sm">
                  <span className="text-[#6B7280]">Total</span>
                  <span className="font-bold text-[#111827]">{fmtPrice(ticket.price * quantity, ticket.currency)}</span>
                </div>
              )}

              <button
                onClick={submit}
                disabled={bookingState === 'booking' || !ticket || !paymentMethod}
                className="w-full bg-[#0870E2] hover:bg-[#005080] disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {bookingState === 'booking' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  paymentMethod === 'CASH' ? 'Reserve Ticket' : 'Continue to Payment'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
