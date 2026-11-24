'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, ShieldCheck, Mail, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { confirmAndComplete, postComplete, type CompleteResult } from '@/lib/claims/acceptClient'

// Owner invitation landing page. Opening it never accepts anything:
// acceptance is an explicit click, and only works while signed in with the
// invited address. Signed in with it → "Accept and continue" grants access.
// Not signed in → "Accept and continue" emails a confirmation link to the
// invited inbox (POST /verify); it brings the person back here with
// ?verify=<hashed token>&vt=<type>, and one click redeems it server-side
// (POST /session) and completes the acceptance (POST /complete) in a row.
// Either way the person lands straight on the dashboard.

type InvitationView = {
  schoolName: string
  city: string | null
  country: string | null
  logoUrl: string | null
  maskedEmail: string
  session: 'none' | 'match' | 'other'
}

type Phase =
  | { kind: 'loading' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'ready'; data: InvitationView }
  | { kind: 'entering' }
  // /complete gave no answer after the session was set: offer to repeat it.
  | { kind: 'retry' }

export default function ClaimInvitationPage() {
  const { token } = useParams<{ token: string }>()
  const { t, locale } = useLanguage()
  const c = t.claimFlow

  const [phase, setPhase] = useState<Phase>({ kind: 'loading' })
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  // One-time Supabase token from the verification email. Redeemed only on an
  // explicit click, so a mail scanner opening the link cannot consume it.
  const [verify, setVerify] = useState<{ tokenHash: string; type: string } | null>(null)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const tokenHash = q.get('verify'), type = q.get('vt')
    if (tokenHash && type) setVerify({ tokenHash, type })
  }, [])

  const dropVerifyParams = () => {
    setVerify(null)
    window.history.replaceState(null, '', window.location.pathname)
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPhase({ kind: 'invalid', reason: typeof data.error === 'string' ? data.error : 'NOT_FOUND' }); return }
      setPhase({ kind: 'ready', data })
    } catch {
      setPhase({ kind: 'invalid', reason: 'NOT_FOUND' })
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const errText = (code: string) => (c as Record<string, string>)[`err_${code}`] ?? c.err_generic

  async function sendLink() {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const res = await fetch(`/api/claim/${encodeURIComponent(token)}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 404 || res.status === 410) { setPhase({ kind: 'invalid', reason: data.error ?? 'NOT_FOUND' }); return }
        setError(errText(data.error ?? 'generic')); return
      }
      setLinkSent(true)
    } catch {
      setError(c.err_generic)
    } finally {
      inFlight.current = false; setBusy(false)
    }
  }

  async function confirmEmail() {
    if (inFlight.current || !verify) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const out = await confirmAndComplete(token, verify)
      dropVerifyParams()
      if (out.step === 'session') {
        if (out.result.kind === 'invalid') setPhase({ kind: 'invalid', reason: out.result.reason })
        else if (out.result.kind === 'error') setError(errText(out.result.code))
        return
      }
      // Signed in as the invited address: the person already chose "Accept
      // and continue" before the email was sent, so it was finished in the
      // same click. A definite refusal reloads into the signed-in state
      // (plain Accept button); an uncertain one keeps a retry on screen.
      if (!(await afterComplete(out.result))) {
        if (out.result.kind === 'error') await load()
      }
    } finally {
      inFlight.current = false; setBusy(false)
    }
  }

  // Applies a /complete result. true → access granted, leaving for the dashboard.
  async function afterComplete(r: CompleteResult): Promise<boolean> {
    switch (r.kind) {
      case 'ok':
        setPhase({ kind: 'entering' })
        // Full navigation, so the dashboard reads the new session and the
        // currentSchoolId cookie set by /complete.
        window.location.assign('/dashboard')
        return true
      case 'invalid': setPhase({ kind: 'invalid', reason: r.reason }); return false
      case 'reload': await load(); return false
      case 'error': setError(errText(r.code)); return false
      case 'uncertain':
        // The grant may have gone through: never reload the invitation (it
        // would read "already accepted" and drop the retry). Repeating
        // /complete is idempotent and needs no new email or token.
        setError(c.err_generic)
        setPhase(p => (p.kind === 'ready' && p.data.session === 'match' ? p : { kind: 'retry' }))
        return false
    }
  }

  async function accept() {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try {
      const r = await postComplete(token)
      const fromRetry = phase.kind === 'retry'
      // A definite refusal on the retry screen: back to the invitation state.
      if (!(await afterComplete(r)) && fromRetry && r.kind === 'error') await load()
    } finally {
      inFlight.current = false; setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    try { await createClient().auth.signOut() } finally { setBusy(false); setLinkSent(false); load() }
  }

  return (
    <main className="min-h-screen bg-[#F9FAFB] flex items-start sm:items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="text-center text-xs font-extrabold tracking-[0.18em] text-[#0E3A7A] mb-6">MARTIAL</p>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          {phase.kind === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" /> {c.loading}
            </div>
          )}

          {phase.kind === 'invalid' && (
            <div className="text-center py-6">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-[#101828]">
                {(c as Record<string, string>)[`invalid_${phase.reason}`] ?? c.invalid_NOT_FOUND}
              </p>
              {(phase.reason === 'USED' || phase.reason === 'LEGACY_USED') ? (
                <a href="/login?redirect=/dashboard" className="inline-flex items-center justify-center mt-5 h-11 px-6 rounded-full bg-[#0870E2] text-white text-sm font-semibold">{c.signIn}</a>
              ) : phase.reason !== 'SCHOOL_NOT_CLAIMABLE' && (
                <Link href="/claim" prefetch={false} className="inline-flex items-center justify-center mt-5 h-11 px-6 rounded-full bg-[#0870E2] text-white text-sm font-semibold">{c.requestNew}</Link>
              )}
              <p className="text-xs text-gray-400 mt-3">{c.contactSupport}</p>
            </div>
          )}

          {phase.kind === 'entering' && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" /> {c.entering}
            </div>
          )}

          {phase.kind === 'retry' && (
            <div className="text-center py-4">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              {error && <p className="text-sm text-gray-600 mb-4">{error}</p>}
              <button onClick={accept} disabled={busy}
                className="w-full h-11 rounded-full bg-[#0870E2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{c.accepting}</> : c.accept}
              </button>
              <p className="text-xs text-gray-400 mt-6">{c.contactSupport}</p>
            </div>
          )}

          {phase.kind === 'ready' && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {phase.data.logoUrl
                    ? <img src={phase.data.logoUrl} alt="" className="w-12 h-12 object-cover" />
                    : <ShieldCheck className="w-6 h-6 text-[#0870E2]" />}
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-[#101828] break-words">{c.inviteTitle.replace('{school}', phase.data.schoolName)}</h1>
                  {(phase.data.city || phase.data.country) && (
                    <p className="text-xs text-gray-400">{[phase.data.city, phase.data.country].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 break-words">{c.inviteFor.replace('{email}', phase.data.maskedEmail)}</p>

              {phase.data.session === 'match' && (
                <>
                  <p className="text-sm text-gray-600 mb-4">{c.signedInAs}</p>
                  <button onClick={accept} disabled={busy}
                    className="w-full h-11 rounded-full bg-[#0870E2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{c.accepting}</> : c.accept}
                  </button>
                </>
              )}

              {verify && phase.data.session !== 'match' && (
                <>
                  <p className="text-sm text-gray-600 mb-4">{c.confirmIntro}</p>
                  <button onClick={confirmEmail} disabled={busy}
                    className="w-full h-11 rounded-full bg-[#0870E2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{c.confirming}</> : c.confirmContinue}
                  </button>
                </>
              )}

              {!verify && phase.data.session === 'other' && (
                <>
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-4">{c.wrongAccount}</p>
                  <button onClick={signOut} disabled={busy}
                    className="w-full h-11 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-60">
                    {c.signOut}
                  </button>
                </>
              )}

              {!verify && phase.data.session === 'none' && (
                linkSent ? (
                  <div className="text-center">
                    <Mail className="w-8 h-8 text-[#0870E2] mx-auto mb-2" />
                    <p className="text-sm text-gray-600">{c.linkSent.replace('{email}', phase.data.maskedEmail)}</p>
                    <button onClick={sendLink} disabled={busy} className="mt-4 text-sm font-semibold text-[#0870E2] disabled:opacity-60">
                      {busy ? c.sending : c.resendLink}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 mb-4">{c.stepVerify}</p>
                    <button onClick={sendLink} disabled={busy}
                      className="w-full h-11 rounded-full bg-[#0870E2] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                      {busy ? <><Loader2 className="w-4 h-4 animate-spin" />{c.sending}</> : c.sendLink}
                    </button>
                  </>
                )
              )}

              {error && <p className="mt-4 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <p className="text-xs text-gray-400 mt-6 text-center">{c.contactSupport}</p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
