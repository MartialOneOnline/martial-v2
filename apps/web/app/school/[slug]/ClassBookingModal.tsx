'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Calendar, User, CheckCircle, LogIn, CreditCard, Loader2 } from 'lucide-react'

type Plan = { id: string; name: string; price: number; currency: string; billingCycle: string; isPopular: boolean }

type Session = {
  classId: string
  className: string
  level: string
  startTime: string
  endTime: string
  dayLabel: string
}

type Props = {
  session: Session
  schoolSlug: string
  plans: Plan[]
  onClose: () => void
}

type AuthStatus =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'no_membership'; schoolId: string; userId: string; hasFreeTrialCls: boolean }
  | { state: 'has_membership'; schoolId: string; userId: string }

type BookingState = 'idle' | 'booking' | 'success' | 'error'

const CURRENCY_SYM: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

export default function ClassBookingModal({ session, schoolSlug, plans, onClose }: Props) {
  const router = useRouter()
  const [auth, setAuth] = useState<AuthStatus>({ state: 'loading' })
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/schools/${schoolSlug}/membership-check`)
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated) {
          setAuth({ state: 'unauthenticated' })
        } else if (data.hasMembership) {
          setAuth({ state: 'has_membership', schoolId: data.schoolId, userId: data.userId })
        } else {
          setAuth({ state: 'no_membership', schoolId: data.schoolId, userId: data.userId, hasFreeTrialCls: data.hasFreeTrialCls })
        }
      })
      .catch(() => setAuth({ state: 'unauthenticated' }))
  }, [schoolSlug])

  async function activateTrial(schoolId: string) {
    setBookingState('booking')
    try {
      const res = await fetch('/api/memberships/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error activating trial')
      // After trial, create the booking
      await confirmBooking()
    } catch (e: any) {
      setErrorMsg(e.message)
      setBookingState('error')
    }
  }

  async function confirmBooking() {
    setBookingState('booking')
    try {
      // Build scheduledAt from next occurrence of this day
      const now = new Date()
      const scheduledAt = now.toISOString()

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: session.classId, scheduledAt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creating booking')
      setBookingState('success')
    } catch (e: any) {
      setErrorMsg(e.message)
      setBookingState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[480px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-4 pb-4 border-b border-[#F3F4F6]">
          <div>
            <h2 className="text-lg font-bold text-[#111827]">{session.className}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-[#6B7280]">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {session.dayLabel}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {session.startTime} – {session.endTime}
              </span>
            </div>
            {session.level && (
              <span className="inline-block mt-1.5 text-xs bg-[#F3F4F6] text-[#6B7280] px-2 py-0.5 rounded-full">{session.level}</span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center">
            <X className="w-4 h-4 text-[#374151]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Loading */}
          {auth.state === 'loading' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0870E2]" />
            </div>
          )}

          {/* Success */}
          {bookingState === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <CheckCircle className="w-14 h-14 text-emerald-500" />
              <h3 className="text-lg font-bold text-[#111827]">Booking Confirmed!</h3>
              <p className="text-sm text-[#6B7280] text-center">
                You're booked for <strong>{session.className}</strong> on <strong>{session.dayLabel}</strong> at <strong>{session.startTime}</strong>.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full bg-[#0870E2] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error */}
          {bookingState === 'error' && (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <X className="w-7 h-7 text-red-500" />
              </div>
              <p className="text-sm text-[#6B7280] text-center">{errorMsg}</p>
              <button onClick={() => setBookingState('idle')} className="text-sm text-[#0870E2] underline">Try again</button>
            </div>
          )}

          {/* Not authenticated */}
          {auth.state === 'unauthenticated' && bookingState === 'idle' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-[#F0F9FF] border border-[#BAE6FD] rounded-2xl p-4">
                <LogIn className="w-5 h-5 text-[#0870E2] shrink-0" />
                <p className="text-sm text-[#0369A1]">
                  You need to be logged in to book a class.
                </p>
              </div>
              <button
                onClick={() => router.push(`/login?redirect=/school/${schoolSlug}`)}
                className="w-full bg-[#0870E2] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors"
              >
                Log In to Book
              </button>
              <button
                onClick={() => router.push(`/register?redirect=/school/${schoolSlug}`)}
                className="w-full border border-[#0870E2] text-[#0870E2] hover:bg-[#e8f7ff] font-semibold py-3 rounded-2xl transition-colors"
              >
                Create Free Account
              </button>
            </div>
          )}

          {/* No membership */}
          {auth.state === 'no_membership' && bookingState === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7280]">
                You need a membership to book this class. Choose an option below:
              </p>

              {/* Free trial CTA */}
              {auth.hasFreeTrialCls && (
                <button
                  onClick={() => activateTrial(auth.schoolId)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Start Free 1-Week Trial
                </button>
              )}

              {/* Paid plans */}
              <div className="space-y-2">
                {plans.filter(p => p.price > 0).map(plan => {
                  const sym = CURRENCY_SYM[plan.currency] ?? '€'
                  const suffix = plan.billingCycle === 'monthly' ? '/mo' : plan.billingCycle === 'quarterly' ? '/qtr' : ''
                  return (
                    <div key={plan.id} className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 ${plan.isPopular ? 'border-[#0870E2] bg-[#f0f9ff]' : 'border-[#E5E7EB]'}`}>
                      <div>
                        <div className="text-sm font-semibold text-[#111827] flex items-center gap-2">
                          {plan.name}
                          {plan.isPopular && <span className="text-[10px] font-bold bg-[#0870E2] text-white px-2 py-0.5 rounded-full uppercase">Popular</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold text-[#0870E2]">{sym}{plan.price}<span className="text-xs font-normal text-[#6B7280]">{suffix}</span></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={() => router.push(`/school/${schoolSlug}#memberships`)}
                className="w-full border border-[#0870E2] text-[#0870E2] hover:bg-[#e8f7ff] font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                View All Plans
              </button>
            </div>
          )}

          {/* Has membership — confirm booking */}
          {auth.state === 'has_membership' && bookingState !== 'success' && bookingState !== 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-800 font-medium">
                  Your membership is active. Ready to book!
                </p>
              </div>

              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 space-y-2 text-sm text-[#374151]">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Class</span>
                  <span className="font-medium">{session.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Day</span>
                  <span className="font-medium">{session.dayLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Time</span>
                  <span className="font-medium">{session.startTime} – {session.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Price</span>
                  <span className="font-semibold text-emerald-600">Included in membership</span>
                </div>
              </div>

              <button
                onClick={confirmBooking}
                disabled={bookingState === 'booking'}
                className="w-full bg-[#0870E2] hover:bg-[#005080] disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {bookingState === 'booking' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Confirming...</>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
