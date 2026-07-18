'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2 } from 'lucide-react'
import { safeConfirmRedirect } from '@/lib/authConfirmRedirect'
import { useT, useLanguage } from '@/lib/i18n/LanguageContext'

const BLUE = '#0870E2'
const BORDER = '#E5E7EB'
const MUTED = '#6B7280'
const TEXT = '#101828'

function interpolateEmail(template: string, email: string) {
  return template
    .split('{email}')
    .flatMap((part, i) => i === 0 ? [part] : [<strong key={i} style={{ color: TEXT }}>{email}</strong>, part])
}

function VerifyPendingInner() {
  const t = useT()
  const { locale } = useLanguage()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const redirect = safeConfirmRedirect(searchParams.get('redirect'))

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleResend() {
    if (!email || sending) return
    setSending(true)
    try {
      await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect, lang: locale }),
      })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center', background: '#fff', borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', padding: 32 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: '#EFF6FF', marginBottom: 20 }}>
          <Mail size={26} color={BLUE} />
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: TEXT }}>
          {t.authVerify.pendingTitle}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: MUTED, lineHeight: 1.6 }}>
          {email
            ? interpolateEmail(t.authVerify.pendingBody, email)
            : t.authVerify.pendingBodyFallback}
        </p>

        <button
          type="button"
          onClick={handleResend}
          disabled={!email || sending || sent}
          style={{ width: '100%', padding: '13px', fontSize: 15, fontWeight: 700, background: sent ? '#EFF6FF' : (sending ? '#93C5FD' : BLUE), color: sent ? BLUE : '#fff', border: 'none', borderRadius: 12, cursor: (!email || sending || sent) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          {sending && <Loader2 size={16} className="animate-spin" />}
          {sent ? t.authVerify.resent : sending ? t.authVerify.resending : t.authVerify.resend}
        </button>

        <a href="/login" style={{ display: 'block', fontSize: 13, color: MUTED, textDecoration: 'underline' }}>
          {t.authVerify.backToLogin}
        </a>
      </div>
    </div>
  )
}

export default function VerifyPendingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" color={BLUE} />
      </div>
    }>
      <VerifyPendingInner />
    </Suspense>
  )
}
