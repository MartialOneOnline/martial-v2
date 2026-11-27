'use client'

/**
 * /checkout/return — where Stripe / Revolut send the buyer back after a plan
 * checkout. Lives outside /my on purpose: it must not depend on the student's
 * selected school, nor be interrupted by the /my → /complete-profile gate.
 *
 * The URL alone proves nothing (anyone can type ?checkout=success). The state
 * shown always comes from GET /api/my/checkout/status for THIS attempt, and
 * this page never claims a payment did or didn't happen without evidence.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Loader2, AlertTriangle, Info } from 'lucide-react'
import { useT } from '@/lib/i18n/LanguageContext'

type Status = {
  payment: 'paid' | 'not_completed' | 'unconfirmed' | 'unknown'
  access: 'none' | 'pending_activation' | 'active' | 'paused' | 'ended'
  incident: null | 'needs_school'
  school: { id: string; name: string; slug: string }
  planName: string
}

const POLL_MS = 2000
const POLL_LIMIT_MS = 60_000

function isFinal(s: Status) {
  return !!s.incident || s.payment === 'not_completed'
    || s.access === 'active' || s.access === 'paused' || s.access === 'ended'
}

function ReturnContent() {
  const t = useT().checkoutReturn
  const router = useRouter()
  const sp = useSearchParams()
  const provider = sp.get('provider')
  const cancelled = sp.get('cancelled') === '1'
  const sessionId = sp.get('session_id')
  const planId = sp.get('plan')
  const attempt = sp.get('attempt')

  const statusUrl = provider === 'stripe' && sessionId && planId
    ? `/api/my/checkout/status?provider=stripe&session_id=${encodeURIComponent(sessionId)}&plan=${encodeURIComponent(planId)}`
    : provider === 'revolut' && attempt
      ? `/api/my/checkout/status?provider=revolut&attempt=${encodeURIComponent(attempt)}`
      : null

  const [status, setStatus] = useState<Status | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [polling, setPolling] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState(false)
  const startedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async () => {
    if (!statusUrl) return
    let next: Status | null = null
    try {
      const res = await fetch(statusUrl, { cache: 'no-store' })
      if (res.status === 401) {
        const back = window.location.pathname + window.location.search
        router.replace(`/login?redirect=${encodeURIComponent(back)}`)
        return
      }
      if (res.status === 404) { setNotFound(true); setPolling(false); return }
      if (res.ok) {
        next = await res.json() as Status
        setStatus(next)
      }
      // 429 / 5xx / network: keep the last known state and try again.
    } catch { /* same */ }

    if (next && isFinal(next)) { setPolling(false); return }
    if (Date.now() - startedAt.current >= POLL_LIMIT_MS) { setTimedOut(true); setPolling(false); return }
    timer.current = setTimeout(() => { void poll() }, POLL_MS)
  }, [statusUrl, router])

  const start = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    startedAt.current = Date.now()
    setTimedOut(false)
    setNotFound(false)
    setPolling(true)
    void poll()
  }, [poll])

  useEffect(() => {
    if (statusUrl) start()
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [statusUrl, start])

  async function goToClasses() {
    if (!status) return
    setSwitching(true)
    setSwitchError(false)
    try {
      // Select the purchased school as the student context (authorised
      // server-side) BEFORE navigating, so "Mis clases" shows this school.
      const res = await fetch('/api/auth/context/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'student', schoolId: status.school.id }),
      })
      if (!res.ok) { setSwitchError(true); return }
      // /complete-profile forwards straight to `next` when the profile is
      // already complete, and after saving it otherwise.
      router.push(`/complete-profile?next=${encodeURIComponent('/my/classes')}`)
    } catch {
      setSwitchError(true)
    } finally {
      setSwitching(false)
    }
  }

  const schoolHref = status ? `/school/${status.school.slug}#memberships` : '/explore'

  // ── Views ─────────────────────────────────────────────────────────────────
  let tone: 'ok' | 'wait' | 'warn' = 'wait'
  let title = t.checking
  let body: string | null = null

  if (!statusUrl) {
    tone = 'warn'
    title = cancelled ? t.leftCheckout : t.cannotConfirm
    body = cancelled ? t.leftCheckoutBody : t.cannotConfirmBody
  } else if (notFound) {
    tone = 'warn'
    title = t.notFound
    body = t.notFoundBody
  } else if (status?.incident === 'needs_school') {
    tone = 'warn'
    title = t.needsSchool
    body = t.needsSchoolBody.replace('{school}', status.school.name)
  } else if (status?.access === 'active') {
    tone = 'ok'
    title = t.active.replace('{school}', status.school.name)
    body = t.activeBody.replace('{plan}', status.planName)
  } else if (status?.access === 'paused') {
    tone = 'warn'
    title = t.paidPaused
    body = t.contactSchoolBody.replace('{school}', status.school.name)
  } else if (status?.access === 'ended') {
    tone = 'warn'
    title = t.paidEnded
    body = t.contactSchoolBody.replace('{school}', status.school.name)
  } else if (status?.payment === 'not_completed') {
    tone = 'warn'
    title = t.notCompleted
    body = null
  } else if (status?.payment === 'paid') {
    tone = timedOut ? 'warn' : 'wait'
    title = t.paidActivating
    body = timedOut ? t.paidActivatingSlow : null
  } else if (cancelled && !polling) {
    tone = 'warn'
    title = t.leftCheckout
    body = t.cannotConfirmBody
  } else if (timedOut || status?.payment === 'unknown') {
    tone = 'warn'
    title = t.cannotConfirm
    body = t.cannotConfirmBody
  } else if (cancelled) {
    title = t.leftCheckout
  }

  const Icon = tone === 'ok' ? CheckCircle : tone === 'warn' ? AlertTriangle : Info
  const showRetry = !!statusUrl && !polling && !notFound && !(status && isFinal(status))

  return (
    <main className="min-h-dvh bg-[#F9FAFB] flex items-center justify-center px-5 py-10" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" }}>
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E5E7EB] shadow-sm p-6 text-center space-y-4">
        <div className="flex justify-center">
          {polling && tone === 'wait'
            ? <Loader2 className="w-12 h-12 animate-spin text-[#0870E2]" />
            : <Icon className={`w-12 h-12 ${tone === 'ok' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : 'text-[#0870E2]'}`} />}
        </div>
        <h1 className="text-lg font-bold text-[#111827]" role="status" aria-live="polite">{title}</h1>
        {body && <p className="text-sm text-[#6B7280]">{body}</p>}

        {status?.access === 'active' && (
          <>
            <button
              onClick={goToClasses}
              disabled={switching}
              className="w-full bg-[#0870E2] hover:bg-[#005080] disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              {switching && <Loader2 className="w-4 h-4 animate-spin" />}
              {t.goToClasses}
            </button>
            {switchError && (
              <p role="alert" className="text-sm text-red-600">
                {t.switchFailed}{' '}
                <Link href="/my/classes" className="underline font-semibold">{t.goToClasses}</Link>
              </p>
            )}
          </>
        )}

        {showRetry && (
          <button onClick={start} className="w-full border border-[#0870E2] text-[#0870E2] font-semibold py-3 rounded-2xl">
            {t.checkAgain}
          </button>
        )}

        <div className="flex flex-col gap-2 text-sm">
          <Link href="/my/membership" className="text-[#0870E2] underline">{t.viewMembership}</Link>
          {status && status.access !== 'active' && (
            <Link href={schoolHref} className="text-[#6B7280] underline">{t.backToSchool.replace('{school}', status.school.name)}</Link>
          )}
        </div>
      </div>
    </main>
  )
}

export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<main className="min-h-dvh flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#0870E2]" /></main>}>
      <ReturnContent />
    </Suspense>
  )
}
