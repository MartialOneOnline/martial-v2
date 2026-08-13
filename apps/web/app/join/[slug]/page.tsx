'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Loader2, Mail } from 'lucide-react'
import { SocialAuthButtons } from '@/components/SocialAuthButtons'

interface SchoolInfo {
  name: string
  city: string | null
  logoUrl: string | null
  tagline: string | null
  disciplines: string[]
}

type SessionState =
  | { state: 'loading' }
  | { state: 'anonymous' }
  | { state: 'already_member' }
  | { state: 'pending' }
  | { state: 'confirm'; name: string | null; email: string | null }
  | { state: 'requested' }

function JoinPageInner() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const welcome = searchParams.get('welcome') === '1'
  const [school, setSchool] = useState<SchoolInfo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [session, setSession] = useState<SessionState>({ state: 'loading' })
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    fetch(`/api/public/schools/${slug}/info`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => setSchool(d.school))
      .catch(() => setNotFound(true))
  }, [slug])

  useEffect(() => {
    Promise.all([
      fetch(`/api/schools/${slug}/membership-check`).then(r => r.json()),
      fetch('/api/auth/me').then(r => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([check, me]) => {
      if (!check.authenticated) { setSession({ state: 'anonymous' }); return }
      if (check.memberStatus === 'ACTIVE') { setSession({ state: 'already_member' }); return }
      if (check.memberStatus === 'LEAD' || check.memberStatus === 'PENDING') { setSession({ state: 'pending' }); return }
      if (check.memberStatus) { setSession({ state: 'already_member' }); return } // FROZEN/ARCHIVED/INACTIVE — already has a relationship with this school
      setSession({ state: 'confirm', name: me?.user?.name ?? null, email: me?.user?.email ?? null })
    }).catch(() => setSession({ state: 'anonymous' }))
  }, [slug])

  const handleConfirmJoin = useCallback(async () => {
    setConfirmError('')
    setConfirming(true)
    try {
      const res = await fetch(`/api/schools/${slug}/join`, { method: 'POST' })
      if (res.status === 409) {
        setSession({ state: 'pending' })
        return
      }
      if (!res.ok) { setConfirmError('Algo salió mal. Inténtalo de nuevo.'); return }
      setSession({ state: 'requested' })
    } finally {
      setConfirming(false)
    }
  }, [slug])

  // Coming straight back from account creation (register -> confirm email ->
  // redirected here with ?welcome=1) — join automatically instead of making
  // the student click "Confirmar solicitud" a second time.
  useEffect(() => {
    if (welcome && session.state === 'confirm') handleConfirmJoin()
  }, [welcome, session.state, handleConfirmJoin])

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#6B7280', fontSize: 15 }}>School not found.</p>
      </div>
    )
  }

  if (!school || session.state === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: '#0870E2', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const header = (
    <div style={{ background: '#fff', borderBottom: '1px solid #F3F4F6', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      {school.logoUrl ? (
        <Image src={school.logoUrl} alt={school.name} width={44} height={44} style={{ borderRadius: 12, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#0870E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>
          {school.name.charAt(0)}
        </div>
      )}
      <div>
        <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>{school.name}</p>
        {school.city && <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{school.city}</p>}
      </div>
    </div>
  )

  // Already an active member — nothing to request
  if (session.state === 'already_member') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
        {header}
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} style={{ color: '#22C55E' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Ya eres miembro
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 24px', lineHeight: 1.6 }}>
            Ya perteneces a <strong>{school.name}</strong>.
          </p>
          <Link href="/my/membership" style={{ display: 'inline-block', padding: '12px 24px', borderRadius: 12, background: '#0870E2', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            Ver mi membresía
          </Link>
        </div>
      </div>
    )
  }

  // Already has a pending/lead request at this school — don't let them duplicate it
  if (session.state === 'pending') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
        {header}
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '64px 16px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Loader2 size={28} style={{ color: '#CA8A04' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            Solicitud pendiente
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
            Ya tienes una solicitud enviada a <strong>{school.name}</strong>. El equipo la revisará en breve.
          </p>
        </div>
      </div>
    )
  }

  // Request sent
  if (session.state === 'requested') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'sans-serif' }}>
        <div style={{ maxWidth: 420, width: '100%', background: '#fff', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} style={{ color: '#22C55E' }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            ¡Solicitud enviada!
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
            El equipo de <strong>{school.name}</strong> se pondrá en contacto contigo pronto.
          </p>
        </div>
      </div>
    )
  }

  // Logged in, no membership yet — just ask for confirmation, no re-typed data
  if (session.state === 'confirm') {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
        {header}
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '48px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
              Únete a {school.name}
            </p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
              Confirma tu solicitud para unirte con tu cuenta.
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
            <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 4px' }}>Solicitando como</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{session.name ?? session.email}</p>
              {session.name && session.email && (
                <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>{session.email}</p>
              )}
            </div>

            {confirmError && (
              <p style={{ fontSize: 13, color: '#EF4444', margin: '0 0 16px', background: '#FEF2F2', borderRadius: 8, padding: '8px 12px' }}>{confirmError}</p>
            )}

            <button
              onClick={handleConfirmJoin}
              disabled={confirming}
              style={{ width: '100%', padding: '12px 0', borderRadius: 12, background: '#0870E2', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', opacity: confirming ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {confirming ? <><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Enviando…</> : 'Confirmar solicitud'}
            </button>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

            <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', margin: '12px 0 0' }}>
              El equipo de {school.name} revisará tu solicitud.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Anonymous visitor — create-account CTA is the only path in
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'sans-serif' }}>
      {header}

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px' }}>
        {/* Hero text */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            Únete a {school.name}
          </p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
            Crea tu cuenta para unirte.
          </p>
        </div>

        {/* Create account — registers + auto-joins the school in one flow.
            Social buttons up front (redirect straight back here) so signup
            doesn't need a detour through /register for the common case;
            "Continuar con email" is the fallback into the full form there. */}
        <SocialAuthButtons redirectPath={`/join/${slug}?welcome=1`} />

        <Link
          href={`/register?type=student&lock=1&redirect=${encodeURIComponent(`/join/${slug}?welcome=1`)}`}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            height: 52, border: '1px solid #E5E7EB', borderRadius: 12, background: '#fff',
            fontSize: 14, fontWeight: 600, color: '#101828', textDecoration: 'none', boxSizing: 'border-box',
          }}
        >
          <Mail size={18} />
          Continuar con email
        </Link>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6B7280' }}>
          ¿Ya tienes cuenta?{' '}
          <Link href={`/login?redirect=/join/${slug}`} style={{ color: '#0870E2', fontWeight: 600, textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={24} style={{ color: '#0870E2', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <JoinPageInner />
    </Suspense>
  )
}
