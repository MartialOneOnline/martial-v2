'use client'

/**
 * PlanPurchaseSheet — buy one membership plan online.
 *
 * Buying a plan never books a class: the buyer pays, the webhook activates the
 * membership, and classes are booked afterwards from the app like any member.
 *
 * Everything shown here comes from the server (public plan listing + the
 * buyer's own precheck) and is re-validated by POST /api/my/checkout. Opening
 * the sheet always re-fetches, so a sheet reopened after login reflects the
 * current state, never a stale one.
 */

import { useCallback, useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle, Info, CreditCard, LogIn } from 'lucide-react'
import { fmtPrice } from '@/lib/format'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { Translations } from '@/lib/i18n/translations'

type Offer = { provider: 'STRIPE' | 'REVOLUT'; renews: boolean }
type Validity = { kind: 'renews'; billingCycle: string } | { kind: 'days'; days: number } | { kind: 'no_expiry' }
type ClassCheck =
  | { status: 'not_included' }
  | { status: 'no_upcoming_session' }
  | { status: 'subscription'; nextSession: string }
  | { status: 'covered'; nextSession: string; accessEndsAt: string | null }
  | { status: 'expires_before_session'; nextSession: string; accessEndsAt: string }

export type PublicPlan = {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  planType: string
  billingCycle: string
  validityDays: number | null
  isPopular: boolean
  purchase: 'online' | 'manual' | 'unavailable'
  offers: Offer[]
  validity: Validity
  classCheck: ClassCheck | null
  offerableForClass: boolean | null
}

export type PublicPlansResponse = {
  school: { id: string; name: string; slug: string }
  class: { id: string; name: string; nextSession: string | null } | { id: string; unavailable: true } | null
  plans: PublicPlan[]
}

type Precheck = {
  archived: boolean
  alreadyHasPlan: boolean
  pausedMembership: { planName: string; recurring: boolean } | null
}

type Props = {
  schoolSlug: string
  planId: string
  /** Class the buyer came from, if any — only used to re-check coverage. */
  classId?: string | null
  onClose: () => void
}

export function plansUrl(schoolSlug: string, classId?: string | null) {
  return `/api/public/schools/${encodeURIComponent(schoolSlug)}/plans${classId ? `?classId=${encodeURIComponent(classId)}` : ''}`
}

export function fmtSession(iso: string, locale: string) {
  // Keeps the exact instant; only the presentation is local.
  return new Date(iso).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function cycleLabel(t: Translations['planPurchase'], cycle: string) {
  switch (cycle) {
    case 'quarterly': return t.cycleQuarterly
    case 'annual': return t.cycleAnnual
    case 'two-weekly': return t.cycleTwoWeekly
    default: return t.cycleMonthly
  }
}

function errorMessage(t: Translations['planPurchase'], code: string | undefined) {
  switch (code) {
    case 'member_archived': return t.errArchived
    case 'already_has_plan': return t.errAlreadyHasPlan
    case 'class_not_included': return t.errClassNotIncluded
    case 'expires_before_session': return t.errExpiresBeforeSession
    case 'no_upcoming_session': return t.errNoUpcomingSession
    case 'class_unavailable': return t.errClassUnavailable
    case 'method_not_allowed':
    case 'method_not_offered':
    case 'provider_not_configured': return t.errMethod
    default: return t.errGeneric
  }
}

export default function PlanPurchaseSheet({ schoolSlug, planId, classId, onClose }: Props) {
  const { t: all, locale } = useLanguage()
  const t = all.planPurchase

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [data, setData] = useState<PublicPlansResponse | null>(null)
  const [precheck, setPrecheck] = useState<Precheck | null>(null)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [provider, setProvider] = useState<'STRIPE' | 'REVOLUT' | null>(null)
  const [ackPaused, setAckPaused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [plansRes, preRes] = await Promise.all([
        fetch(plansUrl(schoolSlug, classId)),
        fetch(`/api/my/checkout/precheck?planId=${encodeURIComponent(planId)}`),
      ])
      if (!plansRes.ok) throw new Error('plans')
      const plansData = await plansRes.json() as PublicPlansResponse
      setData(plansData)
      if (preRes.status === 401) {
        setAuthenticated(false)
        setPrecheck(null)
      } else if (preRes.ok) {
        setAuthenticated(true)
        setPrecheck(await preRes.json() as Precheck)
      } else {
        setAuthenticated(true)
        setPrecheck(null)
      }
      const plan = plansData.plans.find(p => p.id === planId)
      setProvider(plan?.offers[0]?.provider ?? null)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [schoolSlug, classId, planId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  const plan = data?.plans.find(p => p.id === planId) ?? null
  const cls = data?.class && !('unavailable' in data.class) ? data.class : null
  const classUnavailable = !!(data?.class && 'unavailable' in data.class)
  const check = plan?.classCheck ?? null
  const classBlocks = !!check && (check.status === 'not_included' || check.status === 'expires_before_session' || check.status === 'no_upcoming_session')

  const canPay = !!plan && plan.purchase === 'online' && !!provider && authenticated === true
    && !!precheck && !precheck.archived && !precheck.alreadyHasPlan
    && !classBlocks && !classUnavailable
    && (!precheck.pausedMembership || ackPaused)

  async function pay() {
    if (!plan || !provider) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/my/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          provider,
          ...(classId && cls ? { classId } : {}),
          acknowledgePausedMembership: ackPaused,
        }),
      })
      const body = await res.json().catch(() => ({})) as { url?: string; code?: string }
      if (res.status === 401) { setAuthenticated(false); return }
      if (!res.ok || !body.url) {
        setSubmitError(errorMessage(t, body.code))
        // Server state may have changed (e.g. paused membership appeared) — refresh.
        if (body.code === 'paused_membership_ack_required') void load()
        return
      }
      window.location.href = body.url
    } catch {
      setSubmitError(t.errNetwork)
    } finally {
      setSubmitting(false)
    }
  }

  const loginHref = `/login?redirect=${encodeURIComponent(
    `/school/${schoolSlug}?buy=${planId}${classId ? `&class=${classId}` : ''}`,
  )}`

  return (
    <div className="fixed inset-0 z-[260] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
        className="relative w-full md:w-[480px] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90dvh] flex flex-col overflow-hidden"
      >
        <div className="shrink-0 flex items-start justify-between px-6 pt-5 pb-4 border-b border-[#F3F4F6]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{t.title}</p>
            <h2 className="text-lg font-bold text-[#111827] truncate">{plan?.name ?? '…'}</h2>
            {plan && (
              <p className="text-base font-bold text-[#0870E2] mt-0.5">{fmtPrice(plan.price, plan.currency)}</p>
            )}
          </div>
          <button onClick={onClose} aria-label={all.common.close} className="w-8 h-8 rounded-full bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-[#374151]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          {loading && (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#0870E2]" /></div>
          )}

          {!loading && (loadError || !plan) && (
            <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
              {loadError ? t.errLoad : t.errPlanUnavailable}
            </div>
          )}

          {!loading && plan && (
            <>
              {/* Terms — tied to the real checkout, not to the plan's name */}
              <div className="rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] p-4 space-y-1 text-[#374151]">
                {plan.purchase === 'online' && plan.validity.kind === 'renews' && (
                  <p>{t.termsRenews.replace('{cycle}', cycleLabel(t, plan.validity.billingCycle))}</p>
                )}
                {plan.validity.kind === 'days' && (
                  <p>{t.termsDays.replace('{days}', String(plan.validity.days))}</p>
                )}
                {plan.validity.kind === 'no_expiry' && <p>{t.termsNoExpiry}</p>}
                <p className="text-[#6B7280]">{cls ? t.noBookingClass : t.noBookingGeneric}</p>
              </div>

              {/* Class-specific estimate (only when we know which class) */}
              {cls && check && (
                <div className={`rounded-2xl border p-4 flex gap-3 ${classBlocks ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-[#F0F9FF] border-[#BAE6FD] text-[#0369A1]'}`}>
                  {classBlocks ? <AlertTriangle className="w-5 h-5 shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
                  <div className="space-y-1">
                    {check.status === 'covered' && (
                      <p>{t.nextSession.replace('{class}', cls.name).replace('{date}', fmtSession(check.nextSession, locale))}</p>
                    )}
                    {check.status === 'subscription' && (
                      <p>{t.subscriptionAccess.replace('{class}', cls.name).replace('{date}', fmtSession(check.nextSession, locale))}</p>
                    )}
                    {check.status === 'expires_before_session' && (
                      <p>{t.expiresBefore.replace('{class}', cls.name).replace('{date}', fmtSession(check.nextSession, locale))}</p>
                    )}
                    {check.status === 'not_included' && <p>{t.notIncluded.replace('{class}', cls.name)}</p>}
                    {check.status === 'no_upcoming_session' && <p>{t.noUpcoming.replace('{class}', cls.name)}</p>}
                    {(check.status === 'covered' || check.status === 'subscription') && (
                      <p className="text-xs opacity-80">{t.estimateNote}</p>
                    )}
                  </div>
                </div>
              )}
              {classUnavailable && (
                <div className="rounded-2xl border p-4 bg-amber-50 border-amber-200 text-amber-800">{t.errClassUnavailable}</div>
              )}

              {plan.purchase === 'manual' && (
                <div className="rounded-2xl border p-4 bg-[#F9FAFB] border-[#E5E7EB] text-[#374151]">{t.payAtSchool}</div>
              )}
              {plan.purchase === 'unavailable' && (
                <div className="rounded-2xl border p-4 bg-[#F9FAFB] border-[#E5E7EB] text-[#374151]">{t.contactSchool}</div>
              )}

              {plan.purchase === 'online' && authenticated === true && !precheck && (
                <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{t.errLoad}</div>
              )}
              {plan.purchase === 'online' && authenticated === true && precheck && (
                <>
                  {precheck.archived && (
                    <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{t.errArchived}</div>
                  )}
                  {precheck.alreadyHasPlan && (
                    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                      {t.errAlreadyHasPlan}{' '}
                      <a href="/my/membership" className="underline font-semibold">{t.viewMyMembership}</a>
                    </div>
                  )}
                  {precheck.pausedMembership && !precheck.archived && !precheck.alreadyHasPlan && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-amber-800 space-y-2">
                      <p>
                        {(precheck.pausedMembership.recurring ? t.pausedRecurring : t.pausedPlain)
                          .replace('{plan}', precheck.pausedMembership.planName)}
                      </p>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" className="mt-0.5" checked={ackPaused} onChange={e => setAckPaused(e.target.checked)} />
                        <span>{t.pausedAck}</span>
                      </label>
                    </div>
                  )}
                  {plan.offers.length > 1 && (
                    <fieldset className="space-y-2">
                      <legend className="text-xs font-semibold text-[#6B7280] mb-1">{t.chooseMethod}</legend>
                      {plan.offers.map(o => (
                        <label key={o.provider} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="provider" checked={provider === o.provider} onChange={() => setProvider(o.provider)} />
                          <span>{o.provider === 'STRIPE' ? t.methodStripe : t.methodRevolut}</span>
                        </label>
                      ))}
                    </fieldset>
                  )}
                </>
              )}

              {submitError && (
                <div role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{submitError}</div>
              )}
            </>
          )}
        </div>

        {!loading && plan && plan.purchase === 'online' && (
          <div className="shrink-0 border-t border-[#F3F4F6] px-6 pt-3 bg-white" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
            {authenticated === false ? (
              <a
                href={loginHref}
                className="w-full bg-[#0870E2] hover:bg-[#005080] text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" /> {t.loginToBuy}
              </a>
            ) : (
              <button
                onClick={pay}
                disabled={!canPay || submitting}
                className="w-full bg-[#0870E2] hover:bg-[#005080] disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {provider === 'REVOLUT' ? t.payRevolut : t.payStripe}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
