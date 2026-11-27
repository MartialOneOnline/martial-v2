'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, Calendar, CheckCircle, LogIn, CreditCard, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { nextOccurrence, type ScheduleSlot } from '@/lib/scheduling'
import { fmtPrice } from '@/lib/format'
import { useT } from '@/lib/i18n/LanguageContext'
import PlanPurchaseSheet, { plansUrl, type PublicPlansResponse } from './PlanPurchaseSheet'

type Session = {
  classId: string
  className: string
  level: string
  startTime: string
  endTime: string
  dayLabel: string
  /** dayOfWeek matching the schedule slot (0=Sun…6=Sat) */
  dayOfWeek: number
  schedule?: ScheduleSlot[]
}

type Props = {
  session: Session
  schoolSlug: string
  onClose: () => void
  /** Back to the class chooser this modal was opened from, if any. */
  onBack?: () => void
}

type AuthStatus =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'no_membership'; schoolId: string; userId: string; hasFreeTrialCls: boolean }
  | { state: 'has_membership'; schoolId: string; userId: string }

type BookingState = 'idle' | 'booking' | 'success' | 'error'

const CURRENCY_SYM: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

export default function ClassBookingModal({ session, schoolSlug, onClose, onBack }: Props) {
  const router = useRouter()
  const t = useT()
  const tp = t.planPurchase
  const [auth, setAuth] = useState<AuthStatus>({ state: 'loading' })
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  // Plans that can be bought online AND cover this class (server-evaluated).
  const [plansData, setPlansData] = useState<PublicPlansResponse | null>(null)
  const [plansError, setPlansError] = useState(false)
  const [buyPlanId, setBuyPlanId] = useState<string | null>(null)

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

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

  const needsPlans = auth.state === 'no_membership' || auth.state === 'unauthenticated'
  useEffect(() => {
    if (!needsPlans) return
    let cancelled = false
    fetch(plansUrl(schoolSlug, session.classId))
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('plans'))))
      .then((d: PublicPlansResponse) => { if (!cancelled) setPlansData(d) })
      .catch(() => { if (!cancelled) setPlansError(true) })
    return () => { cancelled = true }
  }, [needsPlans, schoolSlug, session.classId])

  const offerable = plansData?.plans.filter(p => p.offerableForClass) ?? []

  function showAllPlans() {
    const el = document.getElementById('memberships')
    if (el) {
      // Already on the school profile: close (restores page scroll) and go there.
      onClose()
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } else {
      router.push(`/school/${schoolSlug}#memberships`)
    }
  }

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
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setBookingState('error')
    }
  }

  async function confirmBooking() {
    setBookingState('booking')
    try {
      // Calculate the next real occurrence of this class slot (UTC).
      // NOTE: School.timezone is not yet stored in the DB. Until it is,
      // we calculate in UTC which is safe and deterministic.
      const now = new Date()
      const scheduledDate = nextOccurrence(now, session.dayOfWeek, session.startTime)
      const scheduledAt = scheduledDate.toISOString()

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: session.classId, scheduledAt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creating booking')
      setBookingState('success')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
      setBookingState('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[480px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90dvh] md:max-h-[85dvh] flex flex-col overflow-hidden"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1.5 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-6 pt-4 pb-4 border-b border-[#F3F4F6]">
          <div className="min-w-0">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-1 text-sm text-[#0870E2] mb-1">
                <ChevronLeft className="w-4 h-4" /> {tp.back}
              </button>
            )}
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
          <button onClick={onClose} aria-label={t.common.close} className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-[#374151]" />
          </button>
        </div>

        {/* Body — scrolls independently so a long plan list never pushes the
            primary CTA (in the sticky footer below) off-screen on mobile */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
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
                You are booked for <strong>{session.className}</strong> on <strong>{session.dayLabel}</strong> at <strong>{session.startTime}</strong>.
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
              {/* Plans can be chosen before signing in — the purchase sheet
                  sends the visitor to login and back to this plan. */}
              <PlanChoices
                loading={!plansData && !plansError}
                error={plansError}
                plans={offerable}
                onPick={setBuyPlanId}
              />
            </div>
          )}

          {/* No membership */}
          {auth.state === 'no_membership' && bookingState === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-[#6B7280]">{tp.needPlan}</p>

              {/* Free trial CTA — only ever shown when the school explicitly enabled
                  hasFreeTrialCls; never inferred from class/schedule data. */}
              {auth.hasFreeTrialCls && (
                <button
                  onClick={() => activateTrial(auth.schoolId)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3.5 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Reservar prueba gratis
                </button>
              )}

              <PlanChoices
                loading={!plansData && !plansError}
                error={plansError}
                plans={offerable}
                onPick={setBuyPlanId}
              />
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
            </div>
          )}
        </div>

        {/* Sticky footer — keeps the primary CTA reachable without scrolling,
            even when the plans list above is long. Safe-area padding clears the
            home-indicator bar on iPhone. */}
        {(auth.state === 'no_membership' || auth.state === 'unauthenticated') && bookingState === 'idle' && (
          <div
            className="shrink-0 border-t border-[#F3F4F6] px-6 pt-3 bg-white"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={showAllPlans}
              className="w-full border border-[#0870E2] text-[#0870E2] hover:bg-[#e8f7ff] font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              {tp.seeAllPlans}
            </button>
          </div>
        )}

        {auth.state === 'has_membership' && bookingState !== 'success' && bookingState !== 'error' && (
          <div
            className="shrink-0 border-t border-[#F3F4F6] px-6 pt-3 bg-white"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
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
                  Confirmar reserva
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {buyPlanId && (
        <div onClick={e => e.stopPropagation()}>
          <PlanPurchaseSheet
            schoolSlug={schoolSlug}
            planId={buyPlanId}
            classId={session.classId}
            onClose={() => setBuyPlanId(null)}
          />
        </div>
      )}
    </div>
  )
}

function PlanChoices({ loading, error, plans, onPick }: {
  loading: boolean
  error: boolean
  plans: PublicPlansResponse['plans']
  onPick: (planId: string) => void
}) {
  const tp = useT().planPurchase
  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-[#0870E2]" /></div>
  }
  if (error) {
    return <p role="alert" className="text-sm text-red-600">{tp.errLoad}</p>
  }
  if (plans.length === 0) {
    return <p className="text-sm text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4">{tp.noPlansForClass}</p>
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-[#6B7280]">{tp.pickPlanHint}</p>
      {plans.map(plan => {
        const suffix = plan.validity.kind === 'renews'
          ? (plan.billingCycle === 'quarterly' ? '/qtr' : plan.billingCycle === 'annual' ? '/yr' : plan.billingCycle === 'two-weekly' ? '/2wk' : '/mo')
          : ''
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onPick(plan.id)}
            className={`w-full flex items-center justify-between gap-3 border rounded-xl px-4 py-3 text-left transition-colors hover:border-[#0870E2] ${plan.isPopular ? 'border-[#0870E2] bg-[#f0f9ff]' : 'border-[#E5E7EB]'}`}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#111827] flex items-center gap-2">
                <span className="truncate">{plan.name}</span>
                {plan.isPopular && <span className="text-[10px] font-bold bg-[#0870E2] text-white px-2 py-0.5 rounded-full uppercase shrink-0">Popular</span>}
              </div>
              <div className="text-xs text-[#6B7280] mt-0.5">
                {plan.validity.kind === 'renews' ? tp.shortRenews
                  : plan.validity.kind === 'days' ? tp.shortDays.replace('{days}', String(plan.validity.days))
                  : tp.shortNoExpiry}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base font-bold text-[#0870E2]">{fmtPrice(plan.price, plan.currency)}<span className="text-xs font-normal text-[#6B7280]">{suffix}</span></span>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
            </div>
          </button>
        )
      })}
    </div>
  )
}
